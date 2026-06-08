import { Router, type Request, type Response } from 'express';
import { queryAll, queryOne, run } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string;
    const severity = req.query.severity as string;
    const courseType = req.query.course_type as string;

    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }
    if (severity) {
      conditions.push('a.severity = ?');
      params.push(severity);
    }
    if (courseType) {
      conditions.push('a.course_type = ?');
      params.push(courseType);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const list = queryAll(
      `SELECT a.*, s.name as student_name, s.training_type, s.stage FROM alerts a LEFT JOIN students s ON a.student_id = s.id ${whereClause} ORDER BY CASE a.severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, a.created_at DESC`,
      params
    );

    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取预警列表失败' });
  }
});

router.get('/rules', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const rules = queryAll('SELECT * FROM alert_rules ORDER BY CASE course_type WHEN "subject1" THEN 1 WHEN "subject2" THEN 2 WHEN "subject3" THEN 3 WHEN "subject4" THEN 4 END');
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取预警规则失败' });
  }
});

router.put('/rules', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rules } = req.body;

    if (!Array.isArray(rules)) {
      res.status(400).json({ success: false, error: 'rules 必须为数组' });
      return;
    }

    for (const rule of rules) {
      if (!rule.course_type || rule.required_hours === undefined) continue;
      run(
        'UPDATE alert_rules SET required_hours = ?, warning_threshold = ?, updated_at = datetime(\'now\') WHERE course_type = ?',
        [rule.required_hours, rule.warning_threshold ?? 0.8, rule.course_type]
      );
    }

    const updated = queryAll('SELECT * FROM alert_rules ORDER BY CASE course_type WHEN "subject1" THEN 1 WHEN "subject2" THEN 2 WHEN "subject3" THEN 3 WHEN "subject4" THEN 4 END');
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新预警规则失败' });
  }
});

router.put('/:id/status', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    if (!['pending', 'resolved', 'ignored'].includes(status)) {
      res.status(400).json({ success: false, error: '无效的状态值' });
      return;
    }

    const existing = queryOne('SELECT * FROM alerts WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ success: false, error: '预警记录不存在' });
      return;
    }

    if (status === 'resolved') {
      run("UPDATE alerts SET status = 'resolved', resolved_at = datetime('now') WHERE id = ?", [id]);
    } else if (status === 'ignored') {
      run("UPDATE alerts SET status = 'ignored', resolved_at = datetime('now') WHERE id = ?", [id]);
    } else {
      run("UPDATE alerts SET status = 'pending', resolved_at = NULL WHERE id = ?", [id]);
    }

    const updated = queryOne('SELECT * FROM alerts WHERE id = ?', [id]);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新预警状态失败' });
  }
});

export default router;
