import { Router } from 'express';
import { logger } from '../lib/logger.js';

/**
 * TEMPORARY diagnostic endpoint. The mobile app posts startup beacons here so we
 * can debug a TestFlight build from the server logs. No auth (low-risk, no data
 * read/written to the DB). Remove once startup is confirmed healthy.
 *
 * POST /debug/log  — the app records a boot milestone or crash here.
 * GET  /debug/log  — read the recent beacons back (newest first) so we can see
 *                    exactly how far startup got without needing the Render logs.
 */
export const debugRouter = Router();

interface BeaconRecord {
  /** When the server received it (ISO). */
  at: string;
  /** Client-supplied event name, e.g. "boot:start". */
  event: unknown;
  /** Client-supplied payload. */
  data: unknown;
  /** Client-supplied timestamp (ms since epoch). */
  t: unknown;
  /** Coarse client fingerprint so multiple testers don't blur together. */
  from: string;
}

const MAX = 300;
const ring: BeaconRecord[] = [];

debugRouter.post('/log', (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const record: BeaconRecord = {
    at: new Date().toISOString(),
    event: body.event ?? null,
    data: body.data ?? null,
    t: body.t ?? null,
    from: `${req.ip ?? '?'} ${String(req.headers['user-agent'] ?? '').slice(0, 60)}`.trim(),
  };
  ring.push(record);
  if (ring.length > MAX) ring.splice(0, ring.length - MAX);

  logger.info({ clientBeacon: record }, '📡 CLIENT BEACON');
  res.status(204).end();
});

/**
 * Read recent beacons. `?n=50` limits the count; `?clear=1` empties the buffer
 * (handy before a fresh launch so you only see this run's beacons).
 */
debugRouter.get('/log', (req, res) => {
  if (req.query.clear === '1') {
    ring.length = 0;
    res.json({ ok: true, cleared: true, count: 0, beacons: [] });
    return;
  }
  const n = Math.min(MAX, Math.max(1, Number(req.query.n) || 100));
  const beacons = ring.slice(-n).reverse(); // newest first
  res.json({ ok: true, count: beacons.length, total: ring.length, beacons });
});
