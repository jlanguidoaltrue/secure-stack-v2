import AuditLog from "../models/AuditLog.js";
import ErrorLog from "../models/ErrorLog.js";

export async function listLogs(req, res){
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100).lean();
  res.json({ data: logs });
}

export async function listErrorLogs(req, res){
  try {
    const { page = 1, limit = 50, level, resolved, search } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = {};
    if (level) filter.level = level;
    if (resolved !== undefined) filter.resolved = resolved === 'true';
    if (search) {
      filter.$or = [
        { message: { $regex: search, $options: 'i' } },
        { url: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const [logs, total] = await Promise.all([
      ErrorLog.find(filter)
        .populate('userId', 'username email')
        .populate('resolvedBy', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ErrorLog.countDocuments(filter)
    ]);

    res.json({
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function resolveErrorLog(req, res){
  try {
    const { id } = req.params;
    const { resolved = true } = req.body;
    
    const errorLog = await ErrorLog.findByIdAndUpdate(
      id,
      {
        resolved,
        resolvedBy: resolved ? req.user.id : null,
        resolvedAt: resolved ? new Date() : null
      },
      { new: true }
    ).populate('resolvedBy', 'username email');

    if (!errorLog) {
      return res.status(404).json({ error: 'Error log not found' });
    }

    res.json({ data: errorLog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getErrorLogStats(req, res){
  try {
    const stats = await ErrorLog.aggregate([
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 },
          unresolved: {
            $sum: { $cond: [{ $eq: ['$resolved', false] }, 1, 0] }
          }
        }
      }
    ]);

    const totalErrors = await ErrorLog.countDocuments();
    const unresolvedErrors = await ErrorLog.countDocuments({ resolved: false });

    res.json({
      data: {
        total: totalErrors,
        unresolved: unresolvedErrors,
        byLevel: stats
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
