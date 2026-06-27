import 'dotenv/config';
import { z } from 'zod';

/**
 * Validate and freeze environment configuration at boot. The process refuses to
 * start with a clear message if anything required is missing or malformed —
 * better than a confusing runtime failure mid-request.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:8081,http://localhost:19006')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_JWT_SECRET: z.string().min(20),

  // 32-byte key, base64-encoded → 44 chars with padding.
  TOKEN_ENC_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, {
      message: 'TOKEN_ENC_KEY must be a base64-encoded 32-byte key (run: npm run gen:keys -w @endcard/backend)',
    }),
  TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(43200),

  // ── AI commentary (optional). Pick a provider by setting its key. If both are
  // set, AI_PROVIDER decides; otherwise whichever key exists wins. With neither,
  // the app simply shows the (free, rule-based) persona and skips commentary.
  AI_PROVIDER: z.enum(['groq', 'anthropic']).optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  ANTHROPIC_API_KEY: z.string().optional(),

  // TestFlight helper: lets /pro/activate grant Pro even on a production backend
  // so testers can try Pro features before real IAP (RevenueCat) is wired.
  // MUST be false/unset for a real paid launch.
  ALLOW_DEV_PRO: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`\n✖ Invalid backend environment configuration:\n${issues}\n\nSee apps/backend/.env.example\n`);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
export const isProd = env.NODE_ENV === 'production';
