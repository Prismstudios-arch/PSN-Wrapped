// Fire-and-forget startup tracer. Posts boot milestones + crashes to the backend
// so we can debug a TestFlight build from the server logs (no Xcode needed).
// TEMPORARY diagnostic — remove once startup is confirmed healthy.
const BASE = 'https://psn-wrapped-backend.onrender.com';

export function beacon(event: string, data?: unknown): void {
  try {
    void fetch(`${BASE}/debug/log`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event, data: data ?? null, t: Date.now() }),
    }).catch(() => undefined);
  } catch {
    // never let logging crash the app
  }
}
