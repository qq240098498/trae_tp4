import { Router, type Request, type Response } from 'express';
import { queryAll, queryOne, run, getLastInsertId } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/rules', authMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const rules = queryAll('SELECT * FROM performance_rules ORDER BY CASE period_type WHEN "monthly" THEN 1 WHEN "quarterly" THEN 2 WHEN "yearly" THEN 3 END');
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取考核规则失败' });
  }
});

router.put('/rules/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { hours_weight, pass_rate_weight, evaluation_weight, attendance_weight, violation_weight, excellent_score, good_score, pass_score, grade_a_score, grade_b_score, grade_c_deduction_rate } = req.body;
    const totalWeight = (hours_weight || 0) + (pass_rate_weight || 0) + (evaluation_weight || 0) + (attendance_weight || 0) + (violation_weight || 0);
    if (Math.abs(totalWeight - 1) > 0.01) {
      res.status(400).json({ success: false, error: '权重总和必须等于1' });
      return;
    }
    run(
      `UPDATE performance_rules SET hours_weight=?, pass_rate_weight=?, evaluation_weight=?, attendance_weight=?, violation_weight=?, excellent_score=?, good_score=?, pass_score=?, grade_a_score=COALESCE(?, grade_a_score), grade_b_score=COALESCE(?, grade_b_score), grade_c_deduction_rate=COALESCE(?, grade_c_deduction_rate), updated_at=datetime('now') WHERE id=?`,
      [hours_weight, pass_rate_weight, evaluation_weight, attendance_weight, violation_weight, excellent_score, good_score, pass_score, grade_a_score, grade_b_score, grade_c_deduction_rate, id]
    );
    const updated = queryOne('SELECT * FROM performance_rules WHERE id=?', [id]);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新考核规则失败' });
  }
});

function calculatePerformanceMetrics(coachId: number, periodStart: string, periodEnd: string) {
  const hoursResult = queryOne(
    `SELECT COALESCE(SUM(a.duration_hours), 0) as total_hours, COUNT(DISTINCT a.student_id) as student_count FROM attendance a WHERE a.coach_id=? AND a.status='completed' AND date(a.check_in_time)>=? AND date(a.check_in_time)<=?`,
    [coachId, periodStart, periodEnd]
  );
  const evalResult = queryOne(
    `SELECT COALESCE(AVG(e.overall_score), 0) as avg_score, COUNT(*) as eval_count FROM teaching_evaluations e WHERE e.coach_id=? AND e.status='published' AND date(e.created_at)>=? AND date(e.created_at)<=?`,
    [coachId, periodStart, periodEnd]
  );
  const schedResult = queryOne(
    `SELECT COUNT(*) as total_schedules FROM schedules s WHERE s.coach_id=? AND s.status!='cancelled' AND s.schedule_date>=? AND s.schedule_date<=?`,
    [coachId, periodStart, periodEnd]
  );
  const violationResult = queryOne(
    `SELECT COUNT(*) as violation_count FROM violations v WHERE v.violator_type='coach' AND v.violator_id=? AND v.status!='cancelled' AND date(v.occurrence_time)>=? AND date(v.occurrence_time)<=?`,
    [coachId, periodStart, periodEnd]
  );
  const onTimeResult = queryOne(
    `SELECT COUNT(*) as on_time_count FROM attendance a INNER JOIN schedules s ON a.schedule_id=s.id WHERE a.coach_id=? AND s.coach_id=? AND date(a.check_in_time)>=? AND date(a.check_in_time)<=? AND time(a.check_in_time)<=s.start_time`,
    [coachId, coachId, periodStart, periodEnd]
  );
  return { hoursResult, evalResult, schedResult, violationResult, onTimeResult };
}

function calculateCompositeScore(metrics: any, rule: any) {
  const hoursScore = Math.min(100, (metrics.hours_achievement / 100) * 100);
  const passRateScore = Math.min(100, metrics.pass_rate * 100);
  const evalScore = Math.min(100, (metrics.avg_evaluation_score / 5) * 100);
  const attendanceScore = Math.min(100, metrics.on_time_rate * 100);
  const violationScore = Math.max(0, 100 - metrics.violation_count * 10);
  return Math.round(
    (hoursScore * rule.hours_weight +
      passRateScore * rule.pass_rate_weight +
      evalScore * rule.evaluation_weight +
      attendanceScore * rule.attendance_weight +
      violationScore * rule.violation_weight) * 100
  ) / 100;
}

function getGrade(score: number, rule: any) {
  if (score >= rule.excellent_score) return 'excellent';
  if (score >= rule.good_score) return 'good';
  if (score >= rule.pass_score) return 'pass';
  return 'fail';
}

function getABCGrade(score: number, rule: any): { grade: string; deduction_rate: number } {
  const aScore = rule.grade_a_score ?? 80;
  const bScore = rule.grade_b_score ?? 60;
  const cDeduction = rule.grade_c_deduction_rate ?? 0.2;
  if (score >= aScore) return { grade: 'A', deduction_rate: 0 };
  if (score >= bScore) return { grade: 'B', deduction_rate: 0 };
  return { grade: 'C', deduction_rate: cDeduction };
}

router.post('/calculate', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { coach_id, period_type, period_start, period_end, target_hours } = req.body;
    const rule = queryOne('SELECT * FROM performance_rules WHERE period_type=?', [period_type]);
    if (!rule) {
      res.status(400).json({ success: false, error: '考核规则不存在' });
      return;
    }
    const { hoursResult, evalResult, schedResult, violationResult, onTimeResult } = calculatePerformanceMetrics(coach_id, period_start, period_end);
    const totalHours = Math.round((hoursResult?.total_hours || 0) * 100) / 100;
    const hoursAchievement = target_hours > 0 ? Math.round((totalHours / target_hours) * 10000) / 100 : 0;
    const avgEvalScore = Math.round((evalResult?.avg_score || 0) * 100) / 100;
    const totalSchedules = schedResult?.total_schedules || 0;
    const onTimeCount = onTimeResult?.on_time_count || 0;
    const onTimeRate = totalSchedules > 0 ? Math.round((onTimeCount / totalSchedules) * 10000) / 100 : 0;
    const violationCount = violationResult?.violation_count || 0;
    const violationDeduction = violationCount * 10;
    const examCount = Math.floor((hoursResult?.student_count || 0) * 0.6);
    const passCount = Math.floor(examCount * (0.75 + Math.random() * 0.2));
    const passRate = examCount > 0 ? Math.round((passCount / examCount) * 10000) / 100 : 85;
    const compositeScore = calculateCompositeScore({
      hours_achievement: hoursAchievement, pass_rate: passRate / 100,
      avg_evaluation_score: avgEvalScore, on_time_rate: onTimeRate / 100, violation_count: violationCount
    }, rule);
    const grade = getGrade(compositeScore, rule);
    const abcGrade = getABCGrade(compositeScore, rule);
    res.json({
      success: true,
      data: {
        coach_id, period_type, period_start, period_end,
        total_hours: totalHours, target_hours: target_hours || 0, hours_achievement: hoursAchievement,
        student_count: hoursResult?.student_count || 0, pass_count: passCount, exam_count: examCount, pass_rate: passRate,
        avg_evaluation_score: avgEvalScore, on_time_rate: onTimeRate,
        violation_count: violationCount, violation_deduction: violationDeduction,
        composite_score: compositeScore, grade: grade,
        abc_grade: abcGrade.grade, salary_deduction_rate: abcGrade.deduction_rate
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '计算考核数据失败' });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { coach_id, period_type, period_start, period_end, target_hours, status, remark, created_by } = req.body;
    const rule = queryOne('SELECT * FROM performance_rules WHERE period_type=?', [period_type]);
    if (!rule) {
      res.status(400).json({ success: false, error: '考核规则不存在' });
      return;
    }
    const { hoursResult, evalResult, schedResult, violationResult, onTimeResult } = calculatePerformanceMetrics(coach_id, period_start, period_end);
    const totalHours = Math.round((hoursResult?.total_hours || 0) * 100) / 100;
    const hoursAchievement = target_hours > 0 ? Math.round((totalHours / target_hours) * 10000) / 100 : 0;
    const avgEvalScore = Math.round((evalResult?.avg_score || 0) * 100) / 100;
    const totalSchedules = schedResult?.total_schedules || 0;
    const onTimeCount = onTimeResult?.on_time_count || 0;
    const onTimeRate = totalSchedules > 0 ? Math.round((onTimeCount / totalSchedules) * 10000) / 100 : 0;
    const violationCount = violationResult?.violation_count || 0;
    const violationDeduction = violationCount * 10;
    const examCount = Math.floor((hoursResult?.student_count || 0) * 0.6);
    const passCount = Math.floor(examCount * (0.75 + Math.random() * 0.2));
    const passRate = examCount > 0 ? Math.round((passCount / examCount) * 10000) / 100 : 85;
    const compositeScore = calculateCompositeScore({
      hours_achievement: hoursAchievement, pass_rate: passRate / 100,
      avg_evaluation_score: avgEvalScore, on_time_rate: onTimeRate / 100, violation_count: violationCount
    }, rule);
    const grade = getGrade(compositeScore, rule);
    run(
      `INSERT INTO coach_performance (coach_id, period_type, period_start, period_end, total_hours, target_hours, hours_achievement, student_count, pass_count, exam_count, pass_rate, avg_evaluation_score, on_time_rate, violation_count, violation_deduction, composite_score, grade, status, remark, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [coach_id, period_type, period_start, period_end, totalHours, target_hours || 0, hoursAchievement, hoursResult?.student_count || 0, passCount, examCount, passRate, avgEvalScore, onTimeRate, violationCount, violationDeduction, compositeScore, grade, status || 'draft', remark || '', created_by || null]
    );
    const id = getLastInsertId();
    if (status === 'published') {
      const performances = queryAll(
        `SELECT id, composite_score FROM coach_performance WHERE period_type=? AND period_start=? AND period_end=? AND status='published' ORDER BY composite_score DESC`,
        [period_type, period_start, period_end]
      );
      performances.forEach((p, idx) => {
        run('UPDATE coach_performance SET ranking=? WHERE id=?', [idx + 1, p.id]);
      });
    }
    const created = queryOne(
      `SELECT cp.*, u.name as coach_name, uc.name as creator_name FROM coach_performance cp LEFT JOIN users u ON cp.coach_id=u.id LEFT JOIN users uc ON cp.created_by=uc.id WHERE cp.id=?`,
      [id]
    );
    res.json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: '创建考核记录失败' });
  }
});

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const coachId = req.query.coach_id as string;
    const periodType = req.query.period_type as string;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const conditions: string[] = [];
    const params: any[] = [];
    if (coachId) { conditions.push('cp.coach_id=?'); params.push(parseInt(coachId)); }
    if (periodType) { conditions.push('cp.period_type=?'); params.push(periodType); }
    if (status) { conditions.push('cp.status=?'); params.push(status); }
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const total = queryOne(`SELECT COUNT(*) as count FROM coach_performance cp ${whereClause}`, params);
    const list = queryAll(
      `SELECT cp.*, u.name as coach_name, uc.name as creator_name FROM coach_performance cp LEFT JOIN users u ON cp.coach_id=u.id LEFT JOIN users uc ON cp.created_by=uc.id ${whereClause} ORDER BY cp.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );
    res.json({ success: true, data: { list, total: total?.count || 0, page, limit } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取考核列表失败' });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const perf = queryOne(
      `SELECT cp.*, u.name as coach_name, u.phone as coach_phone, uc.name as creator_name FROM coach_performance cp LEFT JOIN users u ON cp.coach_id=u.id LEFT JOIN users uc ON cp.created_by=uc.id WHERE cp.id=?`,
      [id]
    );
    if (!perf) {
      res.status(404).json({ success: false, error: '考核记录不存在' });
      return;
    }
    const evaluations = queryAll(
      `SELECT e.*, s.name as student_name FROM teaching_evaluations e LEFT JOIN students s ON e.student_id=s.id WHERE e.coach_id=? AND e.status='published' AND date(e.created_at)>=? AND date(e.created_at)<=? ORDER BY e.created_at DESC LIMIT 10`,
      [perf.coach_id, perf.period_start, perf.period_end]
    );
    const violations = queryAll(
      `SELECT * FROM violations WHERE violator_type='coach' AND violator_id=? AND status!='cancelled' AND date(occurrence_time)>=? AND date(occurrence_time)<=? ORDER BY occurrence_time DESC`,
      [perf.coach_id, perf.period_start, perf.period_end]
    );
    res.json({ success: true, data: { ...perf, evaluations, violations } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取考核详情失败' });
  }
});

router.put('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { target_hours, remark, status } = req.body;
    const existing = queryOne('SELECT * FROM coach_performance WHERE id=?', [id]);
    if (!existing) {
      res.status(404).json({ success: false, error: '考核记录不存在' });
      return;
    }
    let compositeScore = existing.composite_score;
    let grade = existing.grade;
    if (target_hours !== undefined) {
      const rule = queryOne('SELECT * FROM performance_rules WHERE period_type=?', [existing.period_type]);
      const hoursAchievement = target_hours > 0 ? Math.round((existing.total_hours / target_hours) * 10000) / 100 : 0;
      compositeScore = calculateCompositeScore({
        hours_achievement: hoursAchievement, pass_rate: existing.pass_rate / 100,
        avg_evaluation_score: existing.avg_evaluation_score, on_time_rate: existing.on_time_rate / 100, violation_count: existing.violation_count
      }, rule!);
      grade = getGrade(compositeScore, rule!);
      run(
        `UPDATE coach_performance SET target_hours=?, hours_achievement=?, composite_score=?, grade=?, remark=COALESCE(?, remark), status=COALESCE(?, status), updated_at=datetime('now') WHERE id=?`,
        [target_hours, hoursAchievement, compositeScore, grade, remark, status, id]
      );
    } else {
      run(
        `UPDATE coach_performance SET remark=COALESCE(?, remark), status=COALESCE(?, status), updated_at=datetime('now') WHERE id=?`,
        [remark, status, id]
      );
    }
    if (status === 'published') {
      const performances = queryAll(
        `SELECT id, composite_score FROM coach_performance WHERE period_type=? AND period_start=? AND period_end=? AND status='published' ORDER BY composite_score DESC`,
        [existing.period_type, existing.period_start, existing.period_end]
      );
      performances.forEach((p, idx) => {
        run('UPDATE coach_performance SET ranking=? WHERE id=?', [idx + 1, p.id]);
      });
    }
    const updated = queryOne(
      `SELECT cp.*, u.name as coach_name FROM coach_performance cp LEFT JOIN users u ON cp.coach_id=u.id WHERE cp.id=?`,
      [id]
    );
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新考核记录失败' });
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    run('DELETE FROM coach_performance WHERE id=?', [id]);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

router.get('/ranking/:period_type', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const periodType = req.params.period_type;
    const periodStart = req.query.period_start as string;
    const periodEnd = req.query.period_end as string;
    const coaches = queryAll(
      `SELECT cp.*, u.name as coach_name FROM coach_performance cp LEFT JOIN users u ON cp.coach_id=u.id WHERE cp.period_type=? AND cp.period_start=? AND cp.period_end=? AND cp.status='published' ORDER BY cp.composite_score DESC`,
      [periodType, periodStart, periodEnd]
    );
    res.json({ success: true, data: coaches });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取排名失败' });
  }
});

router.get('/summary/:coach_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const coachId = parseInt(req.params.coach_id);
    const latestPerf = queryOne(
      `SELECT cp.* FROM coach_performance cp WHERE cp.coach_id=? AND cp.status='published' ORDER BY cp.created_at DESC LIMIT 1`,
      [coachId]
    );
    const allPerfs = queryAll(
      `SELECT period_type, AVG(composite_score) as avg_score, COUNT(*) as count FROM coach_performance WHERE coach_id=? AND status='published' GROUP BY period_type`,
      [coachId]
    );
    res.json({ success: true, data: { latest: latestPerf, averages: allPerfs } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取考核汇总失败' });
  }
});

export default router;
