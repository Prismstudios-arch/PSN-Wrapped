// EAS builds this monorepo from the repo ROOT, so it reads the Expo app config
// from here (there is no app.json at the root). Without this, the native app got
// no name/icon/plugins → it installed as "endcard" with a blank icon and a white
// screen (expo-router/splash never configured). Re-use apps/mobile/app.json and
// rewrite asset paths to point into apps/mobile.
const appJson = require('./apps/mobile/app.json');

const expo = appJson.expo;
const A = './apps/mobile/assets';

module.exports = {
  ...expo,
  // Must match the linked Expo project ("endcard"). Home-screen name still comes
  // from `name` ("PSN Wrapped") — slug is just Expo's internal id.
  slug: 'endcard',
  icon: `${A}/icon.png`,
  ios: {
    ...expo.ios,
    bundleIdentifier: 'com.psnwrapped.app',
  },
  android: {
    ...expo.android,
    package: 'com.psnwrapped.app',
    adaptiveIcon: {
      foregroundImage: `${A}/adaptive-icon.png`,
      backgroundColor: '#0B0B12',
    },
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      { backgroundColor: '#0B0B12', resizeMode: 'contain', image: `${A}/splash-icon.png`, imageWidth: 200 },
    ],
    [
      'expo-media-library',
      {
        savePhotosPermission: 'PSN Wrapped saves your recap images to your photo library so you can share them.',
        photosPermission: 'PSN Wrapped needs photo access to save your recap images.',
        isAccessMediaLocationEnabled: false,
      },
    ],
  ],
  extra: {
    ...expo.extra,
    apiBaseUrl: process.env.API_BASE_URL ?? 'https://psn-wrapped-backend.onrender.com',
  },
};
