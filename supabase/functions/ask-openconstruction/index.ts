// Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
// SPDX-License-Identifier: Apache-2.0

type CatalogResource = {
  key?: string;
  type?: string;
  label?: string;
  title?: string;
  href?: string;
  dataUrl?: string;
  codeUrl?: string;
  meta?: string;
  summary?: string;
  evidence?: string;
};

type ChatMessage = {
  role?: string;
  text?: string;
};

type AskRequest = {
  query?: string;
  model?: string;
  candidates?: CatalogResource[];
  previousMessages?: ChatMessage[];
};

type ModelChoice = {
  provider: 'gemini' | 'qwen';
  model: string;
  label: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_QUERY_CHARS = 1200;
const MAX_CANDIDATES = 400;
const MAX_HISTORY = 6;
const MODEL_TIMEOUT_MS = Number(Deno.env.get('AI_MODEL_TIMEOUT_MS') || '12000');
const DAILY_LIMIT_ANONYMOUS = Number(Deno.env.get('AI_DAILY_LIMIT_ANONYMOUS') || '1');
const DAILY_LIMIT_AUTHENTICATED = Number(Deno.env.get('AI_DAILY_LIMIT_AUTHENTICATED') || '5');
const UNLIMITED_AI_ROLES = new Set(['admin', 'developer', 'tester', 'reviewer', 'contributor']);
const CONTRIBUTOR_BADGES = 'contributor,dataset_contributor,model_contributor,oer_contributor,workflow_contributor';
const configuredGeminiModel = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite';
const GEMINI_MODEL = configuredGeminiModel === 'gemini-2.5-flash-lite'
  ? 'gemini-3.5-flash-lite'
  : configuredGeminiModel;
const QWEN_MODEL = Deno.env.get('QWEN_MODEL') || 'qwen-3.6-27b';
const QWEN_BASE_URL = Deno.env.get('QWEN_BASE_URL')?.replace(/\/$/, '') || '';
const QWEN_API_KEY = Deno.env.get('QWEN_API_KEY') || '';

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function cleanText(value: unknown, max = 500): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function modelChoice(value: unknown): ModelChoice {
  const requested = cleanText(value, 80).toLowerCase();
  if (['qwen', 'qwen-local', 'qwen_local', 'local-qwen', 'qwen-3.6-27b'].includes(requested)) {
    return { provider: 'qwen', model: QWEN_MODEL, label: 'Qwen 3.6-27B' };
  }
  return { provider: 'gemini', model: GEMINI_MODEL, label: 'Gemini 3.5 Flash Lite' };
}

function modelConfigurationError(choice: ModelChoice): string {
  if (choice.provider === 'qwen' && !QWEN_BASE_URL) {
    return 'Qwen 3.6-27B is not configured. Set QWEN_BASE_URL in Supabase Edge Function secrets before enabling this model.';
  }
  if (choice.provider === 'gemini' && !Deno.env.get('GEMINI_API_KEY')) {
    return 'Gemini 3.5 Flash Lite is not configured. Set GEMINI_API_KEY in Supabase Edge Function secrets.';
  }
  return '';
}

function resourceKey(value: unknown): string {
  return cleanText(value, 260)
    .replace(/^\.?\//, '')
    .replace(/^https?:\/\/(?:www\.)?openconstruction\.org\//i, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

function compactResource(resource: CatalogResource): CatalogResource {
  const href = cleanText(resource.href, 240);
  const title = cleanText(resource.title, 160);
  return {
    key: cleanText(resource.key || resourceKey(href || title), 260),
    type: cleanText(resource.type, 40),
    label: cleanText(resource.label, 40),
    title,
    href,
    dataUrl: cleanText(resource.dataUrl, 240),
    codeUrl: cleanText(resource.codeUrl, 240),
    meta: cleanText(resource.meta, 240),
    summary: cleanText(resource.summary, 420),
    evidence: cleanText(resource.evidence, 700),
  };
}

function extractGeminiText(data: Record<string, unknown>): string {
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  const first = candidates[0] as Record<string, unknown> | undefined;
  const content = first?.content as Record<string, unknown> | undefined;
  const parts = Array.isArray(content?.parts) ? content?.parts : [];
  return parts
    .map((part) => cleanText((part as Record<string, unknown>).text, 6000))
    .filter(Boolean)
    .join('\n')
    .trim();
}

function extractOpenAiText(data: Record<string, unknown>): string {
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const first = choices[0] as Record<string, unknown> | undefined;
  const message = first?.message as Record<string, unknown> | undefined;
  return cleanText(message?.content || first?.text, 6000);
}

function parseModelJson(text: string): Record<string, unknown> {
  if (!text) return {};
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] || text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return { answer: text };
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return { answer: text };
  }
}

function errorDetail(data: unknown): string {
  try {
    const payload = data as Record<string, unknown>;
    return cleanText(JSON.stringify(payload.error || payload), 600);
  } catch {
    return '';
  }
}

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  return atob(padded);
}

function authPayload(request: Request): Record<string, unknown> {
  const header = request.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  const payload = token.split('.')[1];
  if (!payload) return {};
  try {
    return JSON.parse(base64UrlDecode(payload)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  const firstForwarded = forwarded.split(',')[0]?.trim();
  return firstForwarded ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    'unknown';
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function restRows(supabaseUrl: string, serviceKey: string, path: string): Promise<Record<string, unknown>[]> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!response.ok) return [];
  const data = await response.json().catch(() => []);
  return Array.isArray(data) ? data as Record<string, unknown>[] : [];
}

async function hasUnlimitedAiAccess(supabaseUrl: string, serviceKey: string, userId: string): Promise<boolean> {
  const user = encodeURIComponent(userId);
  const roleRows = await restRows(
    supabaseUrl,
    serviceKey,
    `user_roles?select=role&user_id=eq.${user}&role=in.(admin,developer,tester,reviewer,contributor)&limit=1`,
  );
  if (roleRows.some((row) => UNLIMITED_AI_ROLES.has(cleanText(row.role, 40)))) return true;

  const badgeRows = await restRows(
    supabaseUrl,
    serviceKey,
    `user_badges?select=badge_key&user_id=eq.${user}&badge_key=in.(${CONTRIBUTOR_BADGES})&limit=1`,
  );
  if (badgeRows.length) return true;

  const submissionRows = await restRows(
    supabaseUrl,
    serviceKey,
    `resource_suggestions?select=id&user_id=eq.${user}&status=eq.added&limit=1`,
  );
  return submissionRows.length > 0;
}

async function reserveAiSearch(request: Request): Promise<{
  allowed: boolean;
  subjectType: 'user' | 'ip';
  used: number;
  remaining: number;
  limit: number;
  error?: string;
}> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return {
      allowed: false,
      subjectType: 'ip',
      used: 0,
      remaining: 0,
      limit: 0,
      error: 'AI rate limiting is not configured',
    };
  }

  const claims = authPayload(request);
  const subject = cleanText(claims.sub, 160);
  const subjectType: 'user' | 'ip' = subject ? 'user' : 'ip';
  const subjectValue = subject || clientIp(request);
  const limit = subjectType === 'user' ? DAILY_LIMIT_AUTHENTICATED : DAILY_LIMIT_ANONYMOUS;
  if (subjectType === 'user' && await hasUnlimitedAiAccess(supabaseUrl, serviceKey, subject)) {
    return {
      allowed: true,
      subjectType,
      used: 0,
      remaining: Number.MAX_SAFE_INTEGER,
      limit: Number.MAX_SAFE_INTEGER,
    };
  }
  const subjectHash = await sha256Hex(`${subjectType}:${subjectValue}`);
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/reserve_ai_search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      p_usage_date: new Date().toISOString().slice(0, 10),
      p_subject_type: subjectType,
      p_subject_hash: subjectHash,
      p_limit: limit,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      allowed: false,
      subjectType,
      used: 0,
      remaining: 0,
      limit,
      error: errorDetail(data) || 'AI rate limit check failed',
    };
  }
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
  return {
    allowed: Boolean(row.allowed),
    subjectType,
    used: Number(row.used || 0),
    remaining: Number(row.remaining || 0),
    limit,
  };
}

function selectedResources(candidates: CatalogResource[], parsed: Record<string, unknown>): { hrefs: string[]; keys: string[] } {
  const refs = [
    ...(Array.isArray(parsed.resourceKeys) ? parsed.resourceKeys : []),
    ...(Array.isArray(parsed.resourceHrefs) ? parsed.resourceHrefs : []),
    ...(Array.isArray(parsed.resources) ? parsed.resources : []),
  ].map((ref) => {
    if (typeof ref === 'string') return ref;
    const row = ref as Record<string, unknown>;
    return row?.key || row?.href || row?.id || row?.url || row?.title || '';
  }).filter(Boolean);

  const byRef = new Map<string, CatalogResource>();
  candidates.forEach((candidate) => {
    byRef.set(resourceKey(candidate.key), candidate);
    byRef.set(resourceKey(candidate.href), candidate);
    byRef.set(resourceKey(candidate.title), candidate);
  });

  const picked: CatalogResource[] = [];
  refs.forEach((ref) => {
    const candidate = byRef.get(resourceKey(ref));
    if (candidate && !picked.includes(candidate)) picked.push(candidate);
  });

  return {
    hrefs: picked.map((candidate) => cleanText(candidate.href, 240)).filter(Boolean),
    keys: picked.map((candidate) => cleanText(candidate.key, 260)).filter(Boolean),
  };
}

function askPrompt(query: string, candidates: CatalogResource[], previousMessages: ChatMessage[]): string {
  const history = previousMessages
    .slice(-MAX_HISTORY)
    .map((message) => `${message.role === 'assistant' ? 'OpenConstruction' : 'User'}: ${cleanText(message.text, 500)}`)
    .filter(Boolean)
    .join('\n');

  return [
    'You are Ask OpenConstruction, a careful catalog assistant for open AEC resources.',
    'Use only the provided candidate records. Do not invent datasets, links, metadata, licenses, counts, code, or download details.',
    'Each candidate has a stable key. When you name or recommend a resource, include its exact key in resourceKeys.',
    'Never name a resource in answer unless its exact key appears in resourceKeys. Never include broad candidate counts as if they are selected resources.',
    'If the records are weak, say what is missing and return an empty resourceKeys array.',
    "Rank selected records by relevance to the user's question. Prefer the requested resource type when the user asks for datasets, models, workflows, or OERs.",
    'Return JSON only with this shape: {"answer":"short answer grounded in the selected records","resourceKeys":["exact key values in relevance order"],"followups":["short follow-up question"]}.',
    '',
    history ? `Recent conversation:\n${history}` : 'Recent conversation: none',
    '',
    `User question: ${query}`,
    '',
    `Candidate records:\n${JSON.stringify(candidates, null, 2)}`,
  ].join('\n');
}

function qwenChatCompletionsUrl(baseUrl: string): string {
  return /\/v1$/i.test(baseUrl) ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
}

async function fetchJsonWithTimeout(url: string, init: RequestInit, label: string): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`${label} request failed: ${response.status} ${errorDetail(data)}`);
    }
    return data as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateWithGemini(prompt: string): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  const data = await fetchJsonWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 900,
          responseMimeType: 'application/json',
        },
      }),
    },
    'Gemini',
  );
  return parseModelJson(extractGeminiText(data));
}

async function generateWithQwen(prompt: string): Promise<Record<string, unknown>> {
  if (!QWEN_BASE_URL) throw new Error('QWEN_BASE_URL is not configured');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (QWEN_API_KEY) headers.Authorization = `Bearer ${QWEN_API_KEY}`;
  const data = await fetchJsonWithTimeout(
    qwenChatCompletionsUrl(QWEN_BASE_URL),
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 900,
        stream: false,
      }),
    },
    'Qwen',
  );
  return parseModelJson(extractOpenAiText(data));
}

async function generateAnswer(prompt: string, choice: ModelChoice): Promise<Record<string, unknown>> {
  return choice.provider === 'qwen'
    ? generateWithQwen(prompt)
    : generateWithGemini(prompt);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  let payload: AskRequest;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const choice = modelChoice(payload.model);
  const configurationError = modelConfigurationError(choice);
  if (configurationError) {
    return jsonResponse({
      error: configurationError,
      source: choice.provider,
      model: choice.model,
      modelLabel: choice.label,
    }, 503);
  }

  const query = cleanText(payload.query, MAX_QUERY_CHARS);
  if (!query) return jsonResponse({ error: 'Missing query' }, 400);

  const candidates = (Array.isArray(payload.candidates) ? payload.candidates : [])
    .slice(0, MAX_CANDIDATES)
    .map(compactResource)
    .filter((resource) => resource.title && resource.href);

  if (!candidates.length) {
    return jsonResponse({
      answer: 'I could not find enough OpenConstruction catalog evidence for that question yet. Try broader terms such as safety monitoring, BIM, point clouds, construction progress, or OER.',
      resourceHrefs: [],
      resourceKeys: [],
      followups: [],
      source: choice.provider,
      model: choice.model,
    });
  }

  const usage = await reserveAiSearch(request);
  if (usage.error) {
    return jsonResponse({ error: usage.error }, 503);
  }
  if (!usage.allowed) {
    return jsonResponse({
      answer: usage.subjectType === 'user'
        ? 'AI-enhanced search limit reached for today. Normal search remains available.'
        : 'Anonymous visitors are limited to 1 AI-enhanced search each day. Sign in for more searches and saved sessions.',
      resourceHrefs: [],
      resourceKeys: [],
      followups: [],
      source: 'limit',
      limited: true,
      limit: {
        daily: usage.limit,
        used: usage.used,
        remaining: usage.remaining,
      },
    });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = await generateAnswer(
      askPrompt(query, candidates, Array.isArray(payload.previousMessages) ? payload.previousMessages : []),
      choice,
    );
  } catch (error) {
    return jsonResponse({
      error: `${choice.label} request failed`,
      detail: error instanceof Error ? error.message : 'Request could not be completed',
    }, 502);
  }

  const selected = selectedResources(candidates, parsed);
  const followups = Array.isArray(parsed.followups)
    ? parsed.followups.map((item) => cleanText(item, 180)).filter(Boolean).slice(0, 3)
    : [];

  return jsonResponse({
    answer: cleanText(parsed.answer, 1600),
    resourceHrefs: selected.hrefs,
    resourceKeys: selected.keys,
    followups,
    source: choice.provider,
    model: choice.model,
    modelLabel: choice.label,
  });
});
