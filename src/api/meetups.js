import client from './client';

export const getEventMeetupsApi = async (eventId) => {
  const res = await client.get(`/meetups/event/${eventId}`);
  return res.data;
};

export const getMyMeetupsApi = async () => {
  const res = await client.get('/meetups/mine');
  return res.data;
};

export const createMeetupApi = async (eventId, data) => {
  const res = await client.post(`/meetups/event/${eventId}`, data);
  return res.data;
};

export const joinMeetupApi = async (meetupId) => {
  const res = await client.post(`/meetups/${meetupId}/join`);
  return res.data;
};

export const leaveMeetupApi = async (meetupId) => {
  const res = await client.post(`/meetups/${meetupId}/leave`);
  return res.data;
};

export const deleteMeetupApi = async (meetupId) => {
  const res = await client.delete(`/meetups/${meetupId}`);
  return res.data;
};

export const getEventDiscussionsApi = async (eventId) => {
  const res = await client.get(`/meetups/event/${eventId}/discussions`);
  return res.data;
};

export const postEventDiscussionApi = async (eventId, message) => {
  const res = await client.post(`/meetups/event/${eventId}/discussions`, { message });
  return res.data;
};

export default {
  getEventMeetupsApi,
  getMyMeetupsApi,
  createMeetupApi,
  joinMeetupApi,
  leaveMeetupApi,
  deleteMeetupApi,
  getEventDiscussionsApi,
  postEventDiscussionApi,
};
