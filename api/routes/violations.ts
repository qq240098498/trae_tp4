import { Router, type Request, type Response } from 'express';
import { queryAll, queryOne, run, getLastInsertId } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const VIOLATION_TYPE_MAP: Record<string, string> = {
  coach_late: '教练迟到', coach_absent: '教练旷工', coach_early_leave: '教练早退',
  coach_smoking: '教练教学区吸烟', coach_verbal_abuse: '教练语言侮辱学员', coach_solicit_fee: '教练私自收费',
  student_late: '学员迟到', student_absent: '学员旷课', student_misconduct: '学员违纪',
  cheating: '作弊行为', safety_violation: '安全违规', equipment_misuse: '设备操作不当', other: '其他违规'
};

const SEVERITY_DEDUCTION: Record<string, number> = { minor: 1, moderate: 3, major: 5, serious: 10 };

router.get('/violation-types', authMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const types = Object.entries(VIOLATION_TYPE_MAP).map(([key, name]) => ({ key, name }));
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取违规类型失败' });
  }
});

router.get('/summary/overview', authMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const pending = queryOne(`SELECT COUNT(*) as count FROM violations WHERE status='pending'`);
    const investigating = queryOne(`SELECT COUNT(*) as count FROM violations WHERE status='investigating'`);
    const appealed = queryOne(`SELECT COUNT(*) as count FROM violations WHERE status='appealed'`);
    const totalThisMonth = queryOne(
      `SELECT COUNT(*) as count FROM violations WHERE strftime('%Y-%m', occurrence_time) = strftime('%Y-%m', 'now')`,
      []
    );
    const byType = queryAll(
      `SELECT violation_type, COUNT(*) as count FROM violations GROUP BY violation_type ORDER BY count DESC`,
      []
    );
    const bySeverity = queryAll(
      `SELECT severity, COUNT(*) as count FROM violations GROUP BY severity ORDER BY CASE severity WHEN "serious" THEN 1 WHEN "major" THEN 2 WHEN "moderate" THEN 3 ELSE 4 END`,
      []
    );
    const byViolatorType = queryAll(
      `SELECT violator_type, COUNT(*) as count FROM violations GROUP BY violator_type`,
      []
    );
    const recentList = queryAll(
      `SELECT v.*, u.name as reporter_name FROM violations v LEFT JOIN users u ON v.reporter_id=u.id ORDER BY v.created_at DESC LIMIT 10`,
      []
    );
    const enriched = recentList.map((v: any) => {
      const violatorName = v.violator_type === 'coach'
        ? queryOne('SELECT name FROM users WHERE id=?', [v.violator_id])?.name
        : queryOne('SELECT name FROM students WHERE id=?', [v.violator_id])?.name;
      return { ...v, violator_name: violatorName || '', violation_type_name: VIOLATION_TYPE_MAP[v.violation_type] || v.violation_type };
    });
    res.json({
      success: true,
      data: {
        pending_count: pending?.count || 0,
        investigating_count: investigating?.count || 0,
        appealed_count: appealed?.count || 0,
        total_this_month: totalThisMonth?.count || 0,
        by_type: byType.map((t: any) => ({ ...t, type_name: VIOLATION_TYPE_MAP[t.violation_type] || t.violation_type })),
        by_severity: bySeverity,
        by_violator_type: byViolatorType,
        recent: enriched
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取违规总览失败' });
  }
});

router.get('/ranking/coaches', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    const conditions: string[] = ["violator_type='coach'", "status!='cancelled'"];
    const params: any[] = [];
    if (startDate) { conditions.push('date(occurrence_time)>=?'); params.push(startDate); }
    if (endDate) { conditions.push('date(occurrence_time)<=?'); params.push(endDate); }
    const whereClause = 'WHERE ' + conditions.join(' AND ');
    const ranking = queryAll(
      `SELECT violator_id, COUNT(*) as violation_count, SUM(CASE severity WHEN 'serious' THEN ${SEVERITY_DEDUCTION.serious} WHEN 'major' THEN ${SEVERITY_DEDUCTION.major} WHEN 'moderate' THEN ${SEVERITY_DEDUCTION.moderate} ELSE ${SEVERITY_DEDUCTION.minor} END) as total_deduction FROM violations ${whereClause} GROUP BY violator_id ORDER BY total_deduction DESC LIMIT 50`,
      params
    );
    const enriched = ranking.map((r: any) => ({
      ...r,
      coach_name: queryOne('SELECT name FROM users WHERE id=?', [r.violator_id])?.name || ''
    }));
    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取教练违规排名失败' });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      violation_type, violator_type, violator_id, reporter_id, related_attendance_id, related_schedule_id,
      title, description, evidence, occurrence_time, location, severity, penalty_type, penalty_detail, penalty_amount
    } = req.body;
    if (!VIOLATION_TYPE_MAP[violation_type]) {
      res.status(400).json({ success: false, error: '无效的违规类型' });
      return;
    }
    if (!['coach', 'student'].includes(violator_type)) {
      res.status(400).json({ success: false, error: '无效的违规者类型' });
      return;
    }
    run(
      `INSERT INTO violations (violation_type, violator_type, violator_id, reporter_id, related_attendance_id, related_schedule_id, title, description, evidence, occurrence_time, location, severity, penalty_type, penalty_detail, penalty_amount, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [violation_type, violator_type, violator_id, reporter_id || null, related_attendance_id || null, related_schedule_id || null,
        title || VIOLATION_TYPE_MAP[violation_type], description, evidence || '', occurrence_time || new Date().toISOString(),
        location || '', severity || 'minor', penalty_type || null, penalty_detail || '', penalty_amount || 0, 'pending']
    );
    const id = getLastInsertId();
    const created = queryOne(
      `SELECT v.*, u.name as reporter_name FROM violations v LEFT JOIN users u ON v.reporter_id=u.id WHERE v.id=?`,
      [id]
    );
    const violatorName = violator_type === 'coach'
      ? queryOne('SELECT name FROM users WHERE id=?', [violator_id])?.name
      : queryOne('SELECT name FROM students WHERE id=?', [violator_id])?.name;
    res.json({ success: true, data: { ...created, violator_name: violatorName || '' } });
  } catch (error) {
    res.status(500).json({ success: false, error: '创建违规记录失败' });
  }
});

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const violationType = req.query.violation_type as string;
    const violatorType = req.query.violator_type as string;
    const violatorId = req.query.violator_id as string;
    const severity = req.query.severity as string;
    const status = req.query.status as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const conditions: string[] = [];
    const params: any[] = [];
    if (violationType) { conditions.push('v.violation_type=?'); params.push(violationType); }
    if (violatorType) { conditions.push('v.violator_type=?'); params.push(violatorType); }
    if (violatorId) { conditions.push('v.violator_id=?'); params.push(parseInt(violatorId)); }
    if (severity) { conditions.push('v.severity=?'); params.push(severity); }
    if (status) { conditions.push('v.status=?'); params.push(status); }
    if (startDate) { conditions.push('date(v.occurrence_time)>=?'); params.push(startDate); }
    if (endDate) { conditions.push('date(v.occurrence_time)<=?'); params.push(endDate); }
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const total = queryOne(`SELECT COUNT(*) as count FROM violations v ${whereClause}`, params);
    const list = queryAll(
      `SELECT v.*, u.name as reporter_name, uh.name as handler_name FROM violations v LEFT JOIN users u ON v.reporter_id=u.id LEFT JOIN users uh ON v.handler_id=uh.id ${whereClause} ORDER BY v.occurrence_time DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );
    const enriched = list.map((v: any) => {
      const violatorName = v.violator_type === 'coach'
        ? queryOne('SELECT name FROM users WHERE id=?', [v.violator_id])?.name
        : queryOne('SELECT name FROM students WHERE id=?', [v.violator_id])?.name;
      return { ...v, violator_name: violatorName || '', violation_type_name: VIOLATION_TYPE_MAP[v.violation_type] || v.violation_type };
    });
    res.json({ success: true, data: { list: enriched, total: total?.count || 0, page, limit } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取违规列表失败' });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: '无效的ID' });
      return;
    }
    const violation = queryOne(
      `SELECT v.*, u.name as reporter_name, uh.name as handler_name FROM violations v LEFT JOIN users u ON v.reporter_id=u.id LEFT JOIN users uh ON v.handler_id=uh.id WHERE v.id=?`,
      [id]
    );
    if (!violation) {
      res.status(404).json({ success: false, error: '违规记录不存在' });
      return;
    }
    const violator = violation.violator_type === 'coach'
      ? queryOne('SELECT * FROM users WHERE id=?', [violation.violator_id])
      : queryOne('SELECT * FROM students WHERE id=?', [violation.violator_id]);
    const history = queryAll(
      `SELECT * FROM violations WHERE violator_type=? AND violator_id=? AND id!=? AND status!='cancelled' ORDER BY occurrence_time DESC LIMIT 10`,
      [violation.violator_type, violation.violator_id, id]
    );
    res.json({
      success: true,
      data: {
        ...violation,
        violator_info: violator,
        violation_type_name: VIOLATION_TYPE_MAP[violation.violation_type] || violation.violation_type,
        violator_name: violator?.name || '',
        history: history.map((h: any) => ({ ...h, violation_type_name: VIOLATION_TYPE_MAP[h.violation_type] || h.violation_type }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取违规详情失败' });
  }
});

router.put('/:id/handle', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { handler_id, status, penalty_type, penalty_detail, penalty_amount, resolution_note } = req.body;
    if (status && !['pending', 'investigating', 'confirmed', 'appealed', 'resolved', 'cancelled'].includes(status)) {
      res.status(400).json({ success: false, error: '无效的状态值' });
      return;
    }
    const handledAt = ['confirmed', 'resolved', 'cancelled'].includes(status || '') ? new Date().toISOString() : null;
    run(
      `UPDATE violations SET handler_id=COALESCE(?, handler_id), status=COALESCE(?, status), penalty_type=COALESCE(?, penalty_type), penalty_detail=COALESCE(?, penalty_detail), penalty_amount=COALESCE(?, penalty_amount), resolution_note=COALESCE(?, resolution_note), handled_at=COALESCE(?, handled_at), updated_at=datetime('now') WHERE id=?`,
      [handler_id || null, status, penalty_type || null, penalty_detail || null, penalty_amount || 0, resolution_note || null, handledAt, id]
    );
    const updated = queryOne('SELECT * FROM violations WHERE id=?', [id]);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: '处理违规记录失败' });
  }
});

router.post('/:id/appeal', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { appeal_reason } = req.body;
    run(
      `UPDATE violations SET is_appealed=1, appeal_reason=?, status='appealed', updated_at=datetime('now') WHERE id=?`,
      [appeal_reason || '', id]
    );
    const updated = queryOne('SELECT * FROM violations WHERE id=?', [id]);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: '提交申诉失败' });
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    run('DELETE FROM violations WHERE id=?', [id]);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

export default router;
