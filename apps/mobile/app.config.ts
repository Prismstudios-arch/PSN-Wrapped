import appJson from './app.json';

/**
 * Dynamic Expo config. Everything lives in app.json; this layer injects the
 * backend URL from the build environment so production/TestFlight builds point
 * at your deployed backend instead of localhost. EAS sets API_BASE_URL per build
 * profile (see eas.json). In local dev it falls back to app.json's value (and
 * the app further rewrites localhost → your LAN IP for Expo Go — see api.ts).
 */
export default () => ({
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    apiBaseUrl: process.env.API_BASE_URL ?? appJson.expo.extra.apiBaseUrl,
  },
});
