import client from './client';

export const sendChatMessageApi = async (message, conversationHistory = [], context = {}, audioData = null) => {
  const payload = {
    message,
    conversationHistory,
    context: {
      ...context,
      platform: 'mobile',
      mode: context.mode || 'chat',
    },
  };
  if (audioData?.audioBase64) {
    payload.audioBase64 = audioData.audioBase64;
    payload.audioMimeType = audioData.audioMimeType || 'audio/m4a';
  }
  const res = await client.post('/chat/message', payload);
  return res.data;
};

export const createAgentBookingHoldApi = async (data) => {
  const res = await client.post('/chat/book', data);
  return res.data;
};

export const verifyAgentPaymentApi = async (reference, orderId) => {
  const res = await client.post('/chat/verify-payment', { reference, orderId });
  return res.data;
};

export const resendAgentTicketApi = async (ticketId, channel = 'email') => {
  const res = await client.post('/chat/resend', { ticketId, channel });
  return res.data;
};

export default {
  sendChatMessageApi,
  createAgentBookingHoldApi,
  verifyAgentPaymentApi,
  resendAgentTicketApi,
};
