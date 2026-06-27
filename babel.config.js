// EAS builds from the repo root, so it loads babel config from here. Delegate to
// the app's config (babel-preset-expo + NativeWind + the expo-router transform).
module.exports = require('./apps/mobile/babel.config.js');
