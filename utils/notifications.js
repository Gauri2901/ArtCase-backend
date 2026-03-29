import UserNotification from '../models/UserNotification.js';

export const createUserNotification = async ({ userId, type, title, message, link = '' }) => {
  if (!userId) {
    return null;
  }

  return UserNotification.create({
    user: userId,
    type,
    title,
    message,
    link,
    read: false,
  });
};
