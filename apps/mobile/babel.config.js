// babel-preset-expo wires up the Reanimated/Worklets plugin (when installed) and
// the expo-router transform automatically. No NativeWind (unused).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
