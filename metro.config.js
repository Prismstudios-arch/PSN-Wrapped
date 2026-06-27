// EAS builds this monorepo from the repo root, so it loads metro config from
// here. Delegate to the app's config — which pins projectRoot to apps/mobile
// (via __dirname) and sets up NativeWind + monorepo resolution correctly.
module.exports = require('./apps/mobile/metro.config.js');
