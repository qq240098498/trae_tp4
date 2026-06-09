import { Router, type Request, type Response } from 'express';
import { queryAll, queryOne, run, getLastInsertId } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/analyze/:student_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.student_id);
    const { course_type } = req.body;
    const analysisDate = new Date().toISOString().substring(0, 10);
    const rules = queryAll('SELECT * FROM alert_rules');
    const courseTypes = course_type ? [course_type] : ['subject1', 'subject2', 'subject3', 'subject4'];
    const results = [];
    for (const ct of courseTypes) {
      const rule = rules.find((r: any) => r.course_type === ct);
      const requiredHours = rule?.required_hours || 0;
      const totalHoursResult = queryOne(
        `SELECT COALESCE(SUM(duration_hours), 0) as total_hours, COUNT(DISTINCT date(check_in_time)) as training_days FROM attendance WHERE student_id=? AND course_type=? AND status='completed'`,
        [studentId, ct]
      );
      const totalHours = Math.round((totalHoursResult?.total_hours || 0) * 100) / 100;
      const trainingDays = totalHoursResult?.training_days || 0;
      const avgHoursPerDay = trainingDays > 0 ? Math.round((totalHours / trainingDays) * 100) / 100 : 0;
      const recent4Weeks = queryAll(
        `SELECT date(check_in_time) as d, COALESCE(SUM(duration_hours), 0) as h FROM attendance WHERE student_id=? AND course_type=? AND status='completed' AND date(check_in_time)>=date('now','-28 days') GROUP BY date(check_in_time) ORDER BY d`,
        [studentId, ct]
      );
      const weeklyMap: Record<number, number> = {};
      recent4Weeks.forEach((r: any) => {
        const weekIdx = Math.floor((new Date(analysisDate).getTime() - new Date(r.d).getTime()) / (7 * 24 * 3600 * 1000));
        const bucket = Math.min(3, Math.max(0, 3 - weekIdx));
        weeklyMap[bucket] = (weeklyMap[bucket] || 0) + r.h;
      });
      const weekHours = [weeklyMap[0] || 0, weeklyMap[1] || 0, weeklyMap[2] || 0, weeklyMap[3] || 0];
      const weeklyFrequency = weekHours.filter(h => h > 0).length;
      let trend = 'stable';
      if (weekHours[3] > 0 && weekHours[2] > 0) {
        if (weekHours[0] > weekHours[1] * 1.15) trend = 'improving';
        else if (weekHours[0] < weekHours[1] * 0.85) trend = 'declining';
      }
      const weakPoints: string[] = [];
      const strongPoints: string[] = [];
      if (ct === 'subject2') {
        if (totalHours < requiredHours * 0.3) weakPoints.push('倒库练习不足');
        if (trainingDays < 5) weakPoints.push('训练频率较低');
        if (avgHoursPerDay < 1.5) weakPoints.push('单次训练时长偏短');
        if (weeklyFrequency >= 3) strongPoints.push('训练持续性好');
        if (avgHoursPerDay >= 2.5) strongPoints.push('训练效率较高');
      } else if (ct === 'subject3') {
        if (totalHours < requiredHours * 0.3) weakPoints.push('道路经验不足');
        if (weeklyFrequency < 2) weakPoints.push('路面练习频次不够');
        if (weeklyFrequency >= 3) strongPoints.push('路面训练积极');
      }
      const learningEfficiency = trainingDays > 0 ? Math.min(100, Math.round((avgHoursPerDay / 3) * 100)) : 0;
      let expectedCompletionDate = '';
      const remainingHours = Math.max(0, requiredHours - totalHours);
      if (totalHours > 0 && trainingDays > 0 && remainingHours > 0) {
        const avgDaily = totalHours / trainingDays;
        const daysNeeded = Math.ceil(remainingHours / avgDaily);
        const d = new Date();
        d.setDate(d.getDate() + daysNeeded);
        expectedCompletionDate = d.toISOString().substring(0, 10);
      }
      let riskLevel = 'low';
      if (requiredHours > 0) {
        const progress = totalHours / requiredHours;
        const frequencyIssue = weeklyFrequency < 2 && totalHours < requiredHours * 0.8;
        if (progress < 0.3 && trainingDays < 3) riskLevel = 'high';
        else if ((progress < 0.5 && frequencyIssue) || trend === 'declining') riskLevel = 'medium';
      }
      const suggestions: string[] = [];
      if (riskLevel === 'high') {
        suggestions.push('建议尽快增加训练频次，加快培训进度');
        suggestions.push('可与教练沟通安排突击训练计划');
      } else if (riskLevel === 'medium') {
        suggestions.push('建议保持每周至少2-3次训练');
        suggestions.push('注意训练质量，避免单次训练时间过短');
      } else {
        suggestions.push('继续保持当前训练节奏');
      }
      if (trend === 'declining') suggestions.push('近期训练量有所下降，请注意保持训练连续性');
      if (weakPoints.length > 0) suggestions.push(`重点加强：${weakPoints.join('、')}`);
      run(
        `INSERT OR REPLACE INTO student_learning_analysis (student_id, analysis_date, course_type, total_hours, training_days, avg_hours_per_day, weekly_frequency, recent_trend, weak_points, strong_points, learning_efficiency, expected_completion_date, risk_level, suggestions) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [studentId, analysisDate, ct, totalHours, trainingDays, avgHoursPerDay, weeklyFrequency, trend, weakPoints.join(','), strongPoints.join(','), learningEfficiency, expectedCompletionDate, riskLevel, suggestions.join('|')]
      );
      const id = getLastInsertId();
      results.push({
        id, analysis_date: analysisDate, course_type: ct,
        total_hours: totalHours, required_hours: requiredHours, training_days: trainingDays,
        avg_hours_per_day: avgHoursPerDay, weekly_frequency: weeklyFrequency,
        recent_trend: trend, weak_points: weakPoints, strong_points: strongPoints,
        learning_efficiency: learningEfficiency, expected_completion_date: expectedCompletionDate,
        risk_level: riskLevel, suggestions: suggestions, weekly_hours: weekHours
      });
    }
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: '分析失败' });
  }
});

router.get('/student/:student_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.student_id);
    const latestDate = queryOne(
      `SELECT MAX(analysis_date) as md FROM student_learning_analysis WHERE student_id=?`,
      [studentId]
    );
    const analysisDate = latestDate?.md || new Date().toISOString().substring(0, 10);
    const list = queryAll(
      `SELECT * FROM student_learning_analysis WHERE student_id=? AND analysis_date=? ORDER BY CASE course_type WHEN "subject1" THEN 1 WHEN "subject2" THEN 2 WHEN "subject3" THEN 3 WHEN "subject4" THEN 4 END`,
      [studentId, analysisDate]
    );
    const student = queryOne('SELECT * FROM students WHERE id=?', [studentId]);
    const timeline = queryAll(
      `SELECT date(check_in_time) as d, course_type, COALESCE(SUM(duration_hours), 0) as h FROM attendance WHERE student_id=? AND status='completed' AND date(check_in_time)>=date('now','-30 days') GROUP BY date(check_in_time), course_type ORDER BY d`,
      [studentId]
    );
    res.json({
      success: true,
      data: {
        student,
        analysis_date: analysisDate,
        analysis: list.map((a: any) => ({
          ...a,
          weak_points: a.weak_points ? a.weak_points.split(',') : [],
          strong_points: a.strong_points ? a.strong_points.split(',') : [],
          suggestions: a.suggestions ? a.suggestions.split('|') : []
        })),
        timeline
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取学情分析失败' });
  }
});

router.get('/student/:student_id/history', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.student_id);
    const courseType = req.query.course_type as string;
    const history = queryAll(
      `SELECT * FROM student_learning_analysis WHERE student_id=? ${courseType ? 'AND course_type=?' : ''} ORDER BY analysis_date DESC LIMIT 30`,
      courseType ? [studentId, courseType] : [studentId]
    );
    res.json({
      success: true,
      data: history.map((h: any) => ({
        ...h,
        weak_points: h.weak_points ? h.weak_points.split(',') : [],
        strong_points: h.strong_points ? h.strong_points.split(',') : [],
        suggestions: h.suggestions ? h.suggestions.split('|') : []
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取历史分析失败' });
  }
});

router.get('/overview', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const latestDate = queryOne(`SELECT MAX(analysis_date) as md FROM student_learning_analysis`)?.md || new Date().toISOString().substring(0, 10);
    const riskStats = queryAll(
      `SELECT s.training_type, sla.risk_level, COUNT(*) as count FROM student_learning_analysis sla LEFT JOIN students s ON sla.student_id=s.id WHERE sla.analysis_date=? GROUP BY s.training_type, sla.risk_level`,
      [latestDate]
    );
    const trendStats = queryAll(
      `SELECT recent_trend, COUNT(*) as count FROM student_learning_analysis WHERE analysis_date=? GROUP BY recent_trend`,
      [latestDate]
    );
    const highRiskList = queryAll(
      `SELECT sla.*, s.name as student_name, s.training_type, s.stage, s.phone FROM student_learning_analysis sla LEFT JOIN students s ON sla.student_id=s.id WHERE sla.analysis_date=? AND sla.risk_level='high' ORDER BY sla.total_hours ASC LIMIT 50`,
      [latestDate]
    );
    const efficiencyStats = queryOne(
      `SELECT COALESCE(AVG(learning_efficiency), 0) as avg_efficiency, COUNT(*) as total FROM student_learning_analysis WHERE analysis_date=?`,
      [latestDate]
    );
    res.json({
      success: true,
      data: {
        analysis_date: latestDate,
        risk_stats: riskStats,
        trend_stats: trendStats,
        high_risk_list: highRiskList.map((a: any) => ({
          ...a,
          weak_points: a.weak_points ? a.weak_points.split(',') : [],
          suggestions: a.suggestions ? a.suggestions.split('|') : []
        })),
        avg_efficiency: Math.round((efficiencyStats?.avg_efficiency || 0) * 100) / 100,
        total_analyzed: efficiencyStats?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取学情总览失败' });
  }
});

router.get('/risk/list', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const riskLevel = req.query.risk_level as string;
    const trainingType = req.query.training_type as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const latestDate = queryOne(`SELECT MAX(analysis_date) as md FROM student_learning_analysis`)?.md || new Date().toISOString().substring(0, 10);
    const conditions: string[] = ['sla.analysis_date=?'];
    const params: any[] = [latestDate];
    if (riskLevel) { conditions.push('sla.risk_level=?'); params.push(riskLevel); }
    if (trainingType) { conditions.push('s.training_type=?'); params.push(trainingType); }
    const whereClause = 'WHERE ' + conditions.join(' AND ');
    const total = queryOne(
      `SELECT COUNT(*) as count FROM student_learning_analysis sla LEFT JOIN students s ON sla.student_id=s.id ${whereClause}`,
      params
    );
    const list = queryAll(
      `SELECT sla.*, s.name as student_name, s.training_type, s.stage, s.phone, s.enroll_date, s.expected_complete_date FROM student_learning_analysis sla LEFT JOIN students s ON sla.student_id=s.id ${whereClause} ORDER BY CASE sla.risk_level WHEN "high" THEN 1 WHEN "medium" THEN 2 ELSE 3 END, sla.total_hours ASC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );
    res.json({
      success: true,
      data: {
        list: list.map((a: any) => ({
          ...a,
          weak_points: a.weak_points ? a.weak_points.split(',') : [],
          suggestions: a.suggestions ? a.suggestions.split('|') : []
        })),
        total: total?.count || 0, page, limit
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取风险列表失败' });
  }
});

export default router;
