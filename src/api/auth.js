import client from './client';

export const loginApi = async (email, password) => {
  const res = await client.post('/auth/login', {
    email: email.trim().toLowerCase(),
    password,
    website: '', // honeypot
  });
  return res.data;
};

export const registerApi = async (payload) => {
  const res = await client.post('/auth/register', {
    ...payload,
    website: '', // honeypot
  });
  return res.data;
};

export const firebaseAuthApi = async (payload) => {
  const res = await client.post('/auth/firebase', payload);
  return res.data;
};

export const googleAuthApi = firebaseAuthApi;

export const verifyEmailApi = async ({ registrationId, otp, email, phone }) => {
  const res = await client.post('/auth/verify-email', {
    registrationId,
    otp,
    email,
    phone,
  });
  return res.data;
};

export const resendVerificationApi = async ({ registrationId, email, phone }) => {
  const res = await client.post('/auth/resend-verification', {
    registrationId,
    email,
    phone,
    website: '',
  });
  return res.data;
};

export const forgotPasswordApi = async (email) => {
  const res = await client.post('/auth/forgot-password', {
    email: email.trim().toLowerCase(),
    website: '',
  });
  return res.data;
};

export const resetPasswordApi = async ({ email, otp, token, newPassword }) => {
  const res = await client.post('/auth/reset-password', {
    email: email?.trim().toLowerCase(),
    otp,
    token,
    password: newPassword,
  });
  return res.data;
};

export const changePasswordApi = async ({ currentPassword, newPassword }) => {
  const res = await client.post('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return res.data;
};

export const logoutApi = async (refreshToken) => {
  try {
    const res = await client.post('/auth/logout', { refreshToken });
    return res.data;
  } catch (_err) {
    // Ignore network error on logout
    return null;
  }
};

export const getProfileApi = async () => {
  const res = await client.get('/users/profile');
  return res.data;
};

export const updateProfileApi = async (userData) => {
  const res = await client.put('/users/profile', userData);
  return res.data;
};

export default {
  loginApi,
  registerApi,
  googleAuthApi,
  verifyEmailApi,
  resendVerificationApi,
  forgotPasswordApi,
  resetPasswordApi,
  changePasswordApi,
  logoutApi,
  getProfileApi,
  updateProfileApi,
};
