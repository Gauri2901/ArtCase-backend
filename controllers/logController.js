import UploadLog from '../models/UploadLog.js';

const sortMap = {
  timestamp: 'timestamp',
  title: 'artworkTitle',
  type: 'artworkType',
  action: 'action',
};

const normalizeLog = (log) => {
  const rawLog = typeof log.toObject === 'function' ? log.toObject() : log;
  const action = rawLog.action || 'created';
  const changes = Array.isArray(rawLog.changes) ? rawLog.changes : [];
  const summary =
    rawLog.summary ||
    (action === 'updated'
      ? `Artwork "${rawLog.artworkTitle}" was updated.`
      : action === 'deleted'
        ? `Artwork "${rawLog.artworkTitle}" was deleted.`
        : `Artwork "${rawLog.artworkTitle}" was uploaded.`);

  return {
    ...rawLog,
    action,
    changes,
    summary,
  };
};

export const getUploadLogs = async (req, res) => {
  try {
    const sortBy = sortMap[req.query.sortBy] ?? 'timestamp';
    const order = req.query.order === 'asc' ? 1 : -1;

    const filters = {};
    if (req.query.type && req.query.type !== 'all') {
      filters.artworkType = req.query.type;
    }
    if (req.query.action && req.query.action !== 'all') {
      filters.action = req.query.action;
    }
    if (req.query.search) {
      filters.artworkTitle = { $regex: req.query.search, $options: 'i' };
    }

    const logs = await UploadLog.find(filters)
      .populate('uploadedBy', 'name email')
      .sort({ [sortBy]: order });

    res.json(logs.map(normalizeLog));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUploadLogById = async (req, res) => {
  try {
    const log = await UploadLog.findById(req.params.id).populate('uploadedBy', 'name email');

    if (!log) {
      return res.status(404).json({ message: 'Log not found' });
    }

    res.json(normalizeLog(log));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
