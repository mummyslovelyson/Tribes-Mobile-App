import client from './client';

export const createOrderApi = async (orderData) => {
  const res = await client.post('/orders', orderData);
  return res.data;
};

export const getUserOrdersApi = async (params = {}) => {
  const res = await client.get('/orders/me', { params });
  return res.data;
};

export const getOrderApi = async (id) => {
  const res = await client.get(`/orders/${id}`);
  return res.data;
};

export const applyCouponApi = async (code, eventId) => {
  const res = await client.post('/orders/apply-coupon', { code, eventId });
  return res.data;
};

export const initiateOrderPaymentApi = async (id, paymentData = {}) => {
  const res = await client.post(`/orders/${id}/payment`, paymentData);
  return res.data;
};

export const verifyPaymentApi = async (reference) => {
  const res = await client.post('/orders/verify-payment', { reference });
  return res.data;
};

export const simulatePaymentApi = async (reference, orderId) => {
  const res = await client.post('/orders/webhook/test', { reference, orderId });
  return res.data;
};

export default {
  createOrderApi,
  getUserOrdersApi,
  getOrderApi,
  applyCouponApi,
  initiateOrderPaymentApi,
  verifyPaymentApi,
  simulatePaymentApi,
};
