// babel-preset-expo wires up the expo-router transform. We add the Worklets
// plugin EXPLICITLY because babel-preset-expo's auto-detection misses it in this
// monorepo (react-native-worklets is hoisted to the repo root, not apps/mobile),
// which left reanimated (pulled in by react-native-screens) un-transformed and
// crashed the app at startup. Must be the last plugin.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
