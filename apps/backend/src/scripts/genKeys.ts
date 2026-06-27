import { randomBytes } from 'node:crypto';

/**
 * Print fresh secrets for `.env`. Run: npm run gen:keys -w @endcard/backend
 * These are printed once and never stored — copy them into your local `.env`.
 */
const tokenEncKey = randomBytes(32).toString('base64');

// eslint-disable-next-line no-console
console.log(
  [
    '',
    '# Add to apps/backend/.env (keep secret, do not commit):',
    `TOKEN_ENC_KEY=${tokenEncKey}`,
    '',
    '# SUPABASE_JWT_SECRET must match your Supabase project',
    '# (Settings → API → JWT Settings → JWT Secret) — do not generate it here.',
    '',
  ].join('\n'),
);
