import client from './client';

/**
 * Fetches runtime remote configuration set by the Admin:
 * - banners: list of active promotional banners for the carousel
 * - announcement: global broadcast message with tone & optional link
 * - maintenance: remote maintenance mode flag, custom notice, support contacts
 */
export const getMobileConfig = async () => {
  try {
    const res = await client.get('/mobile/config');
    return res.data;
  } catch (err) {
    console.warn('[mobileApi.getMobileConfig] Failed to fetch remote config:', err?.message || err);
    return {
      maintenance: { enabled: false, message: '', minVersion: '1.0.0' },
      announcement: { enabled: false, text: '', type: 'info' },
      banners: [],
    };
  }
};
