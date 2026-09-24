import client from './client';

export const sendChatMessageApi = async (message, conversationHistory = [], context = {}) => {
  const res = await client.post('/chat/message', {
    message,
    conversationHistory,
    context: {
      ...context,
      platform: 'mobile',
      mode: context.mode || 'chat',
    },
  });
  return res.data;
};

export default { sendChatMessageApi };
