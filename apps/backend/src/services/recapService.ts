import { supabaseAdmin } from '../lib/supabase.js';
import { HttpError } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';
import { getCachedStats } from './statsService.js';
import { derivePersona, type Persona } from './personaService.js';
import { generateCommentary } from './aiService.js';

/**
 * Orchestrates the AI recap commentary with caching — the key cost control.
 * Commentary is generated AT MOST ONCE per stats refresh: if we already have
 * commentary for the current `generatedAt`, we return it without calling Claude.
 */
export interface RecapCommentary {
  persona: Persona;
  commentary: string;
  model: string | null;
  cached: boolean;
}

interface RecapAiRow {
  stats_generated_at: string;
  persona_title: string | null;
  persona_blurb: string | null;
  commentary: string;
  model: string | null;
}

async function isPro(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('pro_status')
    .select('tier, expires_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data || data.tier !== 'pro') return false;
  if (data.expires_at && Date.parse(data.expires_at) < Date.now()) return false;
  return true;
}

export async function getOrGenerateCommentary(
  userId: string,
  opts: { regenerate?: boolean } = {},
): Promise<RecapCommentary> {
  const stats = await getCachedStats(userId);
  if (!stats) {
    throw HttpError.badRequest('Sync your stats first, then generate your recap.');
  }
  const persona = derivePersona(stats);

  // Cache hit: same recap snapshot → reuse, no Claude call.
  const { data: existing } = await supabaseAdmin
    .from('recap_ai')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  const row = existing as RecapAiRow | null;

  if (
    row &&
    !opts.regenerate &&
    Date.parse(row.stats_generated_at) === Date.parse(stats.generatedAt)
  ) {
    return {
      persona: { title: row.persona_title ?? persona.title, blurb: row.persona_blurb ?? persona.blurb },
      commentary: row.commentary,
      model: row.model,
      cached: true,
    };
  }

  const pro = await isPro(userId);
  const result = await generateCommentary(stats, persona, { pro });

  const { error } = await supabaseAdmin.from('recap_ai').upsert(
    {
      user_id: userId,
      stats_generated_at: stats.generatedAt,
      persona_title: persona.title,
      persona_blurb: persona.blurb,
      commentary: result.text,
      model: result.model,
    },
    { onConflict: 'user_id' },
  );
  if (error) logger.warn({ error }, 'failed to cache recap commentary');

  logger.info({ userId, model: result.model, usage: result.usage }, 'generated AI commentary');
  return { persona, commentary: result.text, model: result.model, cached: false };
}
