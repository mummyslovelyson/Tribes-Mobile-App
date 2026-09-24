/**
 * Firebase configuration and Google Auth helpers for React Native (mobile).
 *
 * Uses expo-auth-session with Google's OAuth discovery document to perform
 * the OAuth flow natively. The resulting Google id_token is exchanged with
 * Firebase Identity Toolkit's signInWithIdp endpoint.
 *
 * This avoids the auth/missing-initial-state error caused by Firebase's
 * web handler (handler.js) which requires sessionStorage.
 */

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCDJhySkTFz2E613-bLXeGs_bHwS_RUVHQ',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'tribes-aand-cliqs.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'tribes-aand-cliqs',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'tribes-aand-cliqs.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '493987932876',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:493987932876:web:b4c2b4e415474c01337069',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

/**
 * Google OAuth Discovery Document — used by expo-auth-session
 */
export const googleDiscovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

/**
 * Exchange a Google ID Token or Access Token with Firebase Identity Toolkit
 * to get a Firebase user session.
 */
export async function exchangeGoogleTokenWithFirebase({ idToken, accessToken }) {
  if (!firebaseConfig.apiKey) {
    throw new Error('Firebase API key is not configured.');
  }

  const postBodyParts = ['providerId=google.com'];
  if (idToken) postBodyParts.push(`id_token=${encodeURIComponent(idToken)}`);
  if (accessToken) postBodyParts.push(`access_token=${encodeURIComponent(accessToken)}`);

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${firebaseConfig.apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postBody: postBodyParts.join('&'),
      requestUri: `https://${firebaseConfig.authDomain}`,
      returnIdpCredential: true,
      returnSecureToken: true,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const errorMsg = data.error?.message || 'Firebase Google Sign-In failed';
    throw new Error(errorMsg);
  }

  return {
    idToken: data.idToken,
    credential: data.idToken,
    email: data.email,
    name: data.displayName || data.firstName || data.email?.split('@')[0],
    photoURL: data.photoUrl,
    uid: data.localId,
    refreshToken: data.refreshToken,
  };
}

/**
 * Fetch Firebase User Profile by ID Token
 */
export async function getFirebaseUserData(idToken) {
  if (!idToken || !firebaseConfig.apiKey) return null;
  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.users?.[0] || null;
    }
  } catch (err) {
    console.warn('[Firebase] Lookup warning:', err.message);
  }
  return null;
}

/**
 * Stub — createAuthUri flow is no longer used on mobile.
 * Kept for API compatibility; use expo-auth-session instead.
 */
export async function getFirebaseGoogleAuthUri() {
  throw new Error(
    'getFirebaseGoogleAuthUri is not used on mobile. Use expo-auth-session with googleDiscovery instead.',
  );
}

/**
 * Stub — completeFirebaseGoogleAuth is no longer used on mobile.
 * Kept for API compatibility.
 */
export async function completeFirebaseGoogleAuth() {
  throw new Error(
    'completeFirebaseGoogleAuth is not used on mobile. Use exchangeGoogleTokenWithFirebase instead.',
  );
}

/**
 * Stub — Web popup is only available on web platform
 */
export async function signInWithGoogleWebPopup() {
  throw new Error('Google Web Popup is only available on web.');
}

export async function signInWithGoogleWebRedirect() {
  throw new Error('Google Web Redirect is only available on web.');
}

export async function checkRedirectResult() {
  return null;
}

export default {
  firebaseConfig,
  isFirebaseConfigured,
  googleDiscovery,
  exchangeGoogleTokenWithFirebase,
  getFirebaseGoogleAuthUri,
  completeFirebaseGoogleAuth,
  getFirebaseUserData,
  signInWithGoogleWebPopup,
  signInWithGoogleWebRedirect,
  checkRedirectResult,
};
