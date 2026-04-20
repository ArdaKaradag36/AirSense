/* eslint-env node */
/**
 * @param {import('expo/config').ConfigContext} ctx
 */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiBaseUrl:
      process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.1.105:8000",
  },
});
