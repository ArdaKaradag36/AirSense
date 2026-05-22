/* eslint-env node */
/**
 * @param {import('expo/config').ConfigContext} ctx
 *
 * NOT: Hardcoded LAN IP fallback'i bilerek kaldirildi. EXPO_PUBLIC_API_BASE_URL
 * mobile-app/.env icine girilmelidir. Boylece IP degisikliklerinde tek nokta
 * (/.env) guncellenir; kaynak kod ve git gecmisine sabit IP yazilmaz.
 */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "",
  },
});
