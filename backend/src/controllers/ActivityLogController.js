import { ActivityLog } from '../models/ActivityLog.js';

export class ActivityLogController {
  static async getLogs(req, res) {
    try {
      const { page = 1, limit = 20, search, startDate, endDate } = req.query;
      const offset = (page - 1) * limit;

      const result = await ActivityLog.findAll(
        { search, startDate, endDate }, 
        limit, 
        offset
      );

      res.json({
        success: true,
        data: result.logs,
        pagination: {
            total: result.total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      console.error('Fetch logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch logs' });
    }
  }
}