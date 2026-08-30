# Ask OpenConstruction Model Configuration

Ask OpenConstruction is called from `site/account.html`, but model provider routing runs in this Supabase Edge Function. Keep provider URLs and API keys in Supabase secrets; do not put them in browser code.

## What Should Be Public

Commit these files:

- `supabase/config.toml`
- `supabase/functions/ask-openconstruction/index.ts`
- `supabase/functions/ask-openconstruction/README.md`

Do not commit local Supabase state or secrets, including `.env`, `.env.local`, `supabase/.env`, `supabase/functions/.env`, `supabase/.temp/`, or `supabase/.branches/`.

## Add a Teammate in Supabase

In the Supabase Dashboard, invite the teammate to the project organization/team. They need enough access to:

- view the project
- deploy Edge Functions, if they will deploy code
- read and update Edge Function secrets, if they will configure Qwen

After they accept the invite, they can use the Dashboard secrets page or the Supabase CLI. If they use the CLI, they should run:

```bash
supabase login
supabase link --project-ref <project-ref>
```

## Configure Qwen 3.6-27B

The `Qwen 3.6-27B` UI option expects an OpenAI-compatible chat completions endpoint. The button can appear before the endpoint is configured, but the Edge Function returns a configuration error until it can reach the Qwen server. It should not return catalog results or reserve search usage for an unconfigured Qwen request.

Set these Supabase Edge Function secrets:

```bash
supabase secrets set QWEN_BASE_URL=https://your-qwen-host.example/v1
supabase secrets set QWEN_MODEL=qwen-3.6-27b
supabase secrets set QWEN_API_KEY=optional-api-key
```

`QWEN_MODEL` must match the exact model id served by the Qwen endpoint. If the server exposes a different id, set that exact value in Supabase secrets and update the UI label/id in `ASK_MODEL_OPTIONS` only if the displayed name should change.

`QWEN_API_KEY` can be omitted when the endpoint does not require bearer auth. `QWEN_BASE_URL` may be either the API root ending in `/v1` or the host root; the function appends `/chat/completions` as needed.

Important: hosted Supabase cannot reach `localhost` on your laptop. Use a URL reachable from the Supabase Edge Function runtime, such as a deployed Qwen server, a private network endpoint configured for your environment, or a self-hosted Supabase stack running near Qwen.

Dashboard setup:

1. Open the Supabase project.
2. Go to Edge Functions secrets.
3. Add `QWEN_BASE_URL`.
4. Add `QWEN_MODEL`.
5. Add `QWEN_API_KEY` only if the Qwen endpoint requires it.
6. Save the secrets.

CLI setup:

```bash
supabase secrets set QWEN_BASE_URL=https://your-qwen-host.example/v1 --project-ref <project-ref>
supabase secrets set QWEN_MODEL=qwen-3.6-27b --project-ref <project-ref>
supabase secrets set QWEN_API_KEY=optional-api-key --project-ref <project-ref>
```

Or load them from a local env file that is ignored by Git:

```bash
supabase secrets set --env-file supabase/.env --project-ref <project-ref>
```

Supabase makes updated secrets available to Edge Functions immediately. Redeploy only when the function code changes.

## Verify Qwen

After setting the secrets, select `Qwen 3.6-27B` in Ask OpenConstruction and send a small prompt such as:

```text
Find benchmark resources about bridge segmentation.
```

Expected result:

- the answer comes from `Qwen 3.6-27B`
- cited resources are real OpenConstruction catalog records
- if the endpoint is unreachable, the chatbot shows a Qwen configuration/reachability message instead of falling back to Gemini or keyword-only catalog results

## Add More Models

To add another selectable model:

1. Add an option in `ASK_MODEL_OPTIONS` in `site/account.html`.
2. Add the accepted id to `modelChoice()` in `supabase/functions/ask-openconstruction/index.ts`.
3. Add provider secrets in Supabase, for example `NEW_PROVIDER_BASE_URL`, `NEW_PROVIDER_MODEL`, and `NEW_PROVIDER_API_KEY`.
4. Add a `generateWithNewProvider()` function that returns the same parsed JSON contract as Gemini and Qwen.
5. Route the provider from `generateAnswer()`.
6. Deploy the function:

```bash
supabase functions deploy ask-openconstruction
```

The response contract should stay:

```json
{
  "answer": "short grounded answer",
  "resourceKeys": ["exact provided candidate key"],
  "followups": ["optional follow-up question"]
}
```

After deploying, verify with a small request for the new model id and confirm the response includes the expected `source` and `model`.
