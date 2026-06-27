/**
 * babel-preset-expo automatically wires up the Reanimated/Worklets plugin when
 * those packages are installed, so we do not add it manually. NativeWind v4 is
 * enabled via its babel preset + the jsxImportSource option below.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
