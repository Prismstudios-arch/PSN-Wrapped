import type { DerivedStats } from '@endcard/shared';
import { env } from '../config/env.js';
import { HttpError } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';
import type { Persona } from './personaService.js';

/**
 * AI commentary — provider-agnostic, backend-only (never the app).
 *
 * Provider is chosen from env: GROQ (free, OpenAI-compatible, doesn't train on
 * inputs) or Anthropic (Claude). With no key configured the caller falls back to
 * the free rule-based persona and skips commentary entirely.
 *
 * Cost & safety guardrails: hard `max_tokens` cap, minimal non-identifying stats
 * in the prompt, a tightly-constrained system prompt, and per-recap caching by
 * the caller (so we hit the model at most once per refresh).
 */
const MAX_OUTPUT_TOKENS = 320;

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_FREE_MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_PRO_MODEL = 'claude-sonnet-4-6';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = [
  'You are the witty, warm friend narrating someone’s gaming year-in-review.',
  'Voice: playful, hype, a little cheeky — like a mate hyping up their stats. Never cruel, never sarcastic at their expense, never shaming.',
  'Rules:',
  '- 2 to 4 short, punchy sentences. No lists, no headings, no emoji spam (one emoji max, optional).',
  '- Reference their ACTUAL numbers/games from the data provided. Be specific.',
  '- Stay strictly on gaming. Never comment on health, relationships, money, politics, appearance, or anything personal/sensitive — even if the data hints at it (e.g. lots of late-night play is just "dedication", never a concern).',
  '- No profanity or slurs. Keep it shareable and kind.',
  '- Do not invent stats that aren’t in the data. Output only the commentary, nothing else.',
].join('\n');

export interface CommentaryResult {
  text: string;
  model: string;
  provider: 'groq' | 'anthropic';
  usage?: { inputTokens: number; outputTokens: number };
}

export function isAiConfigured(): boolean {
  return Boolean(env.GROQ_API_KEY || env.ANTHROPIC_API_KEY);
}

function selectProvider(): 'groq' | 'anthropic' | null {
  if (env.AI_PROVIDER === 'groq') return env.GROQ_API_KEY ? 'groq' : null;
  if (env.AI_PROVIDER === 'anthropic') return env.ANTHROPIC_API_KEY ? 'anthropic' : null;
  if (env.GROQ_API_KEY) return 'groq';
  if (env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}

/** Build a compact, non-identifying prompt from the recap. */
function buildPrompt(stats: DerivedStats, persona: Persona): string {
  const payload = {
    totalHours: Math.round(stats.totals.totalMinutes / 60),
    games: stats.totals.gameCount,
    trophies: stats.totals.achievementsEarned,
    platinums: stats.totals.platinums,
    topGames: stats.topGames.slice(0, 5).map((g) => ({
      name: g.game.name,
      hours: Math.round((g.playtime?.totalMinutes ?? 0) / 60),
    })),
    rarestTrophy: stats.rarestAchievement
      ? {
          name: stats.rarestAchievement.achievement.name,
          game: stats.rarestAchievement.gameName,
          rarityPercent: stats.rarestAchievement.achievement.rarityPercent,
        }
      : null,
    persona: persona.title,
  };
  return [
    'Here is the player’s gaming year-in-review data (JSON). Write the commentary as described.',
    '```json',
    JSON.stringify(payload, null, 2),
    '```',
  ].join('\n');
}

export async function generateCommentary(
  stats: DerivedStats,
  persona: Persona,
  options: { pro: boolean },
): Promise<CommentaryResult> {
  const provider = selectProvider();
  if (!provider) {
    throw new HttpError(503, 'AI_UNAVAILABLE', 'AI commentary isn’t configured right now.');
  }
  const prompt = buildPrompt(stats, persona);
  return provider === 'groq'
    ? callGroq(prompt)
    : callAnthropic(prompt, options.pro);
}

async function callGroq(prompt: string): Promise<CommentaryResult> {
  const model = env.GROQ_MODEL;
  const res = await safeFetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.85,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    }),
  });
  await assertOk(res, 'groq');
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = (data.choices?.[0]?.message?.content ?? '').trim();
  if (!text) throw new HttpError(502, 'AI_EMPTY', 'The AI returned nothing. Try again.');
  return {
    text,
    model,
    provider: 'groq',
    ...(data.usage
      ? { usage: { inputTokens: data.usage.prompt_tokens ?? 0, outputTokens: data.usage.completion_tokens ?? 0 } }
      : {}),
  };
}

async function callAnthropic(prompt: string, pro: boolean): Promise<CommentaryResult> {
  const model = pro ? ANTHROPIC_PRO_MODEL : ANTHROPIC_FREE_MODEL;
  const res = await safeFetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.85,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  await assertOk(res, 'anthropic');
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('').trim();
  if (!text) throw new HttpError(502, 'AI_EMPTY', 'The AI returned nothing. Try again.');
  return {
    text,
    model,
    provider: 'anthropic',
    ...(data.usage
      ? { usage: { inputTokens: data.usage.input_tokens ?? 0, outputTokens: data.usage.output_tokens ?? 0 } }
      : {}),
  };
}

async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    throw new HttpError(502, 'AI_UPSTREAM', 'Couldn’t reach the AI service. Try again shortly.', { cause: err });
  }
}

async function assertOk(res: Response, provider: string): Promise<void> {
  if (res.ok) return;
  const body = await res.text().catch(() => '');
  logger.error({ provider, status: res.status, body: body.slice(0, 500) }, 'AI provider error');
  if (res.status === 429) {
    throw new HttpError(429, 'AI_RATE_LIMITED', 'The AI is busy right now — try again in a moment.');
  }
  throw new HttpError(502, 'AI_UPSTREAM', 'The AI service had a problem. Try again shortly.');
}
