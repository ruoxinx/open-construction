-- Workspace notifications are created by trusted database triggers and read by
-- the owning account only. The Supabase CLI is not installed in this workspace,
-- so this migration file was created manually and should be applied through the
-- normal migration review/deploy process.

create table if not exists public.workspace_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null check (
    notification_type in ('resource_submission', 'issue_report', 'credential', 'saved_resource_link')
  ),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  body text check (body is null or char_length(body) <= 1000),
  target_tab text not null default 'reports' check (target_tab in ('reports', 'credentials', 'library')),
  source_table text not null check (char_length(btrim(source_table)) between 1 and 80),
  source_id text not null check (char_length(btrim(source_id)) between 1 and 160),
  resource_type text,
  resource_id text,
  dedupe_key text not null check (char_length(btrim(dedupe_key)) between 1 and 320),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint workspace_notifications_resource_type_check check (
    resource_type is null or resource_type in ('dataset', 'model', 'workflow', 'oer', 'guide', 'tool', 'benchmark', 'resource')
  ),
  constraint workspace_notifications_resource_id_check check (
    (resource_type is null and resource_id is null) or
    (resource_type is not null and nullif(btrim(resource_id), '') is not null)
  ),
  constraint workspace_notifications_dedupe_key_unique unique (user_id, dedupe_key)
);

create index if not exists workspace_notifications_user_created_idx
  on public.workspace_notifications (user_id, created_at desc);

create index if not exists workspace_notifications_user_unread_idx
  on public.workspace_notifications (user_id, read_at, created_at desc);

alter table public.workspace_notifications enable row level security;

-- The table is intentionally not writable from the browser. New public-schema
-- tables also need explicit Data API grants in current Supabase projects.
revoke all on public.workspace_notifications from anon, authenticated;
grant select on public.workspace_notifications to authenticated;
grant update (read_at) on public.workspace_notifications to authenticated;

drop policy if exists "workspace notifications read own" on public.workspace_notifications;
create policy "workspace notifications read own"
  on public.workspace_notifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "workspace notifications mark own read" on public.workspace_notifications;
create policy "workspace notifications mark own read"
  on public.workspace_notifications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.enqueue_workspace_notification(
  p_user_id uuid,
  p_notification_type text,
  p_title text,
  p_body text,
  p_target_tab text,
  p_source_table text,
  p_source_id text,
  p_resource_type text,
  p_resource_id text,
  p_dedupe_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null or nullif(btrim(p_title), '') is null then
    return;
  end if;

  insert into public.workspace_notifications (
    user_id,
    notification_type,
    title,
    body,
    target_tab,
    source_table,
    source_id,
    resource_type,
    resource_id,
    dedupe_key,
    metadata
  ) values (
    p_user_id,
    p_notification_type,
    left(btrim(p_title), 160),
    left(nullif(btrim(coalesce(p_body, '')), ''), 1000),
    p_target_tab,
    left(btrim(p_source_table), 80),
    left(btrim(p_source_id), 160),
    nullif(btrim(p_resource_type), ''),
    nullif(btrim(p_resource_id), ''),
    left(btrim(p_dedupe_key), 320),
    case when jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) = 'object'
      then coalesce(p_metadata, '{}'::jsonb)
      else '{}'::jsonb
    end
  ) on conflict (user_id, dedupe_key) do nothing;
end;
$$;

-- Trigger-only helper: clients cannot call this function directly.
revoke all on function public.enqueue_workspace_notification(uuid, text, text, text, text, text, text, text, text, text, jsonb)
  from public, anon, authenticated;

create or replace function public.notify_workspace_resource_suggestion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  status_label text;
  event_key text;
  note_suffix text;
begin
  if tg_op = 'UPDATE' and not (
    new.status is distinct from old.status or
    new.maintainer_note is distinct from old.maintainer_note
  ) then
    return new;
  end if;

  status_label := case new.status
    when 'pending' then 'Pending review'
    when 'in_review' then 'In review'
    when 'needs_changes' then 'Needs changes'
    when 'approved' then 'Approved'
    when 'added' then 'Added to the catalog'
    when 'declined' then 'Declined'
    else 'Updated'
  end;
  note_suffix := case
    when nullif(btrim(new.maintainer_note), '') is not null
      then format(' Maintainer note: %s', left(btrim(new.maintainer_note), 700))
    else ''
  end;
  event_key := format(
    'resource_suggestions:%s:%s',
    new.id,
    case when tg_op = 'INSERT' then 'submitted' else coalesce(new.updated_at::text, clock_timestamp()::text) end
  );

  perform public.enqueue_workspace_notification(
    new.user_id,
    'resource_submission',
    case when tg_op = 'INSERT' then 'Resource submission received' else 'Resource submission updated' end,
    format('“%s” is now %s.%s', left(new.title, 180), status_label, note_suffix),
    'reports',
    'resource_suggestions',
    new.id::text,
    null,
    null,
    event_key,
    jsonb_build_object('status', new.status, 'title', new.title)
  );
  return new;
end;
$$;

drop trigger if exists workspace_resource_suggestion_notification on public.resource_suggestions;
create trigger workspace_resource_suggestion_notification
  after insert or update of status, maintainer_note on public.resource_suggestions
  for each row execute function public.notify_workspace_resource_suggestion();

create or replace function public.notify_workspace_issue_report()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  status_label text;
  event_key text;
  note_suffix text;
begin
  if tg_op = 'UPDATE' and not (
    new.status is distinct from old.status or
    new.maintainer_note is distinct from old.maintainer_note
  ) then
    return new;
  end if;

  status_label := case new.status
    when 'pending' then 'Pending review'
    when 'in_review' then 'In review'
    when 'resolved' then 'Resolved'
    when 'declined' then 'Declined'
    else 'Updated'
  end;
  note_suffix := case
    when nullif(btrim(new.maintainer_note), '') is not null
      then format(' Maintainer note: %s', left(btrim(new.maintainer_note), 700))
    else ''
  end;
  event_key := format(
    'site_issue_reports:%s:%s',
    new.id,
    case when tg_op = 'INSERT' then 'submitted' else coalesce(new.updated_at::text, clock_timestamp()::text) end
  );

  perform public.enqueue_workspace_notification(
    new.user_id,
    'issue_report',
    case when tg_op = 'INSERT' then 'Feedback report received' else 'Feedback report updated' end,
    format('“%s” is now %s.%s', left(new.summary, 180), status_label, note_suffix),
    'reports',
    'site_issue_reports',
    new.id::text,
    null,
    null,
    event_key,
    jsonb_build_object('status', new.status, 'summary', new.summary, 'issue_type', new.issue_type)
  );
  return new;
end;
$$;

drop trigger if exists workspace_issue_report_notification on public.site_issue_reports;
create trigger workspace_issue_report_notification
  after insert or update of status, maintainer_note on public.site_issue_reports
  for each row execute function public.notify_workspace_issue_report();

create or replace function public.notify_workspace_credential_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  status_label text;
  event_key text;
begin
  if new.requester_user_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and not (
    new.status is distinct from old.status or
    new.maintainer_note is distinct from old.maintainer_note or
    new.response_message is distinct from old.response_message
  ) then
    return new;
  end if;

  status_label := case new.status
    when 'pending' then 'Pending review'
    when 'in_review' then 'In review'
    when 'approved' then 'Approved'
    when 'fulfilled' then 'Fulfilled'
    when 'declined' then 'Declined'
    else 'Updated'
  end;
  event_key := format(
    'credential_requests:%s:%s',
    new.id,
    case when tg_op = 'INSERT' then 'submitted' else coalesce(new.updated_at::text, clock_timestamp()::text) end
  );

  perform public.enqueue_workspace_notification(
    new.requester_user_id,
    'credential',
    case when tg_op = 'INSERT' then 'Credential request received' else 'Credential request updated' end,
    format('Your %s credential request for “%s” is %s.%s',
      coalesce(new.contribution_type, 'OpenConstruction'),
      left(new.resource_title, 180),
      status_label,
      case when nullif(btrim(coalesce(new.maintainer_note, new.response_message, '')), '') is not null
        then format(' Response: %s', left(btrim(coalesce(new.maintainer_note, new.response_message)), 700))
        else '' end),
    'credentials',
    'credential_requests',
    new.id::text,
    null,
    null,
    event_key,
    jsonb_build_object('status', new.status, 'contribution_type', new.contribution_type, 'resource_title', new.resource_title)
  );
  return new;
end;
$$;

drop trigger if exists workspace_credential_request_notification on public.credential_requests;
create trigger workspace_credential_request_notification
  after insert or update of status, maintainer_note, response_message on public.credential_requests
  for each row execute function public.notify_workspace_credential_request();

create or replace function public.notify_workspace_badge_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    perform public.enqueue_workspace_notification(
      new.user_id,
      'credential',
      'Credential awarded',
      format('You received the “%s” OpenConstruction credential.', left(coalesce(new.badge_label, new.badge_key), 180)),
      'credentials',
      'user_badges',
      new.id::text,
      null,
      null,
      format('user_badges:%s:awarded', new.id),
      jsonb_build_object('badge_key', new.badge_key, 'badge_label', new.badge_label)
    );
    return new;
  end if;

  perform public.enqueue_workspace_notification(
    old.user_id,
    'credential',
    'Credential removed',
    format('The “%s” OpenConstruction credential is no longer active.', left(coalesce(old.badge_label, old.badge_key), 180)),
    'credentials',
    'user_badges',
    old.id::text,
    null,
    null,
    format('user_badges:%s:removed', old.id),
    jsonb_build_object('badge_key', old.badge_key, 'badge_label', old.badge_label)
  );
  return old;
end;
$$;

drop trigger if exists workspace_badge_notification on public.user_badges;
create trigger workspace_badge_notification
  after insert or delete on public.user_badges
  for each row execute function public.notify_workspace_badge_change();

create or replace function public.notify_workspace_saved_link_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  bookmark record;
  status_label text;
  event_key text;
begin
  if tg_op = 'UPDATE' and not (
    new.status_override is distinct from old.status_override or
    new.replacement_url is distinct from old.replacement_url or
    new.original_url is distinct from old.original_url
  ) then
    return new;
  end if;

  if coalesce(new.status_override, '') not in ('broken', 'needs_review')
    and nullif(btrim(coalesce(new.replacement_url, '')), '') is null then
    return new;
  end if;

  status_label := case new.status_override
    when 'broken' then 'broken'
    when 'needs_review' then 'needs review'
    else 'has a replacement URL'
  end;
  event_key := format('link_health_labels:%s:%s', new.id, coalesce(new.updated_at::text, clock_timestamp()::text));

  for bookmark in
    select user_id, resource_type, resource_id, resource_title
    from public.resource_bookmarks
    where resource_type = new.resource_type
      and resource_id = new.resource_id
      and (
        resource_url is null
        or resource_url = new.url
        or resource_url = new.original_url
      )
  loop
    perform public.enqueue_workspace_notification(
      bookmark.user_id,
      'saved_resource_link',
      'Saved resource link needs attention',
      format('The link for your saved %s “%s” %s.',
        bookmark.resource_type,
        left(coalesce(bookmark.resource_title, bookmark.resource_id), 180),
        status_label),
      'library',
      'link_health_labels',
      new.id::text,
      bookmark.resource_type,
      bookmark.resource_id,
      event_key || ':' || bookmark.user_id,
      jsonb_build_object('field', new.field, 'url', new.url, 'replacement_url', new.replacement_url, 'status', new.status_override)
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists workspace_saved_link_notification on public.link_health_labels;
create trigger workspace_saved_link_notification
  after insert or update of status_override, replacement_url, original_url on public.link_health_labels
  for each row execute function public.notify_workspace_saved_link_change();

revoke all on function public.notify_workspace_resource_suggestion() from public, anon, authenticated;
revoke all on function public.notify_workspace_issue_report() from public, anon, authenticated;
revoke all on function public.notify_workspace_credential_request() from public, anon, authenticated;
revoke all on function public.notify_workspace_badge_change() from public, anon, authenticated;
revoke all on function public.notify_workspace_saved_link_change() from public, anon, authenticated;
