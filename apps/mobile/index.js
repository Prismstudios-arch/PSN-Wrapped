// Entry point. We trace startup to the backend (see src/lib/beacon) so a crash
// before React mounts is still visible in the server logs. Uses require (not
// import) so execution order is sequential and a module-load throw in
// expo-router/entry is caught and reported instead of just black-screening.
const { beacon } = require('./src/lib/beacon');

beacon('boot:start');

try {
  require('expo-router/entry');
  beacon('boot:entry-loaded');
} catch (e) {
  beacon('entry-throw', {
    message: e && e.message ? e.message : String(e),
    stack: e && e.stack ? String(e.stack).slice(0, 1800) : null,
  });
  throw e;
}
