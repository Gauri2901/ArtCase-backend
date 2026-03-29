import UserNotification from '../models/UserNotification.js';

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await UserNotification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(25);

    const unreadCount = await UserNotification.countDocuments({
      user: req.user._id,
      read: false,
    });

    res.json({
      unreadCount,
      notifications,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await UserNotification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    await UserNotification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ message: 'Notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
