/**
 * Firebase configuration and Google Auth helpers for Web platform.
 *
 * Uses Firebase JS SDK's signInWithPopup for web browsers.
 * Also exports the same Identity Toolkit REST helpers for compatibility.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';

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
 * Google OAuth Discovery Document — exported for API compatibility
 */
export const googleDiscovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

let app = null;
let auth = null;

if (isFirebaseConfigured && typeof window !== 'undefined') {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (err) {
    console.warn('[Firebase Web] Init warning:', err.message);
  }
}

/**
 * Web: Firebase popup-based Google Sign-In
 */
export async function signInWithGoogleWebPopup() {
  if (!auth) throw new Error('Firebase is not initialized.');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  return {
    idToken,
    credential: idToken,
    email: result.user.email,
    name: result.user.displayName,
    photoURL: result.user.photoURL,
    uid: result.user.uid,
  };
}

export async function signInWithGoogleWebRedirect() {
  if (!auth) throw new Error('Firebase is not initialized.');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithRedirect(auth, provider);
}

export async function checkRedirectResult() {
  if (!auth) return null;
  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) return null;
    const idToken = await result.user.getIdToken();
    return {
      idToken,
      credential: idToken,
      email: result.user.email,
      name: result.user.displayName,
      photoURL: result.user.photoURL,
      uid: result.user.uid,
    };
  } catch (err) {
    console.warn('[Firebase Web] checkRedirectResult:', err?.message);
    return null;
  }
}

/**
 * Exchange a Google ID Token or Access Token with Firebase Identity Toolkit
 */
export async function exchangeGoogleTokenWithFirebase({ idToken, accessToken }) {
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
    throw new Error(data.error?.message || 'Firebase Google Sign-In failed');
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
 * Stubs — not used on web, kept for import compatibility
 */
export async function getFirebaseGoogleAuthUri() {
  throw new Error('getFirebaseGoogleAuthUri is not used on web.');
}

export async function completeFirebaseGoogleAuth() {
  throw new Error('completeFirebaseGoogleAuth is not used on web.');
}

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
