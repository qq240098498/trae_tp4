import { Router, type Request, type Response } from 'express';
import { queryAll, queryOne } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/overview', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const activeStudents = queryOne("SELECT COUNT(*) as count FROM students WHERE status = 'active'");
    const today = new Date().toISOString().substring(0, 10);
    const todayAttendance = queryOne(
      "SELECT COUNT(DISTINCT student_id) as count FROM attendance WHERE date(check_in_time) = ?",
      [today]
    );
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10);
    const monthHours = queryOne(
      "SELECT COALESCE(SUM(duration_hours), 0) as total FROM attendance WHERE status = 'completed' AND date(check_in_time) >= ?",
      [monthStart]
    );
    const pendingAlerts = queryOne("SELECT COUNT(*) as count FROM alerts WHERE status = 'pending'");

    const totalStudents = queryOne("SELECT COUNT(*) as count FROM students");
    const totalCoaches = queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'coach'");

    res.json({
      success: true,
      data: {
        active_students: activeStudents?.count || 0,
        today_attendance: todayAttendance?.count || 0,
        month_hours: Math.round((monthHours?.total || 0) * 100) / 100,
        pending_alerts: pendingAlerts?.count || 0,
        total_students: totalStudents?.count || 0,
        total_coaches: totalCoaches?.count || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取概览数据失败' });
  }
});

router.get('/student/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const student = queryOne('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!student) {
      res.status(404).json({ success: false, error: '学员不存在' });
      return;
    }

    const hoursByCourse = queryAll(
      `SELECT course_type, COALESCE(SUM(duration_hours), 0) as total_hours FROM attendance WHERE student_id = ? AND status = 'completed' GROUP BY course_type`,
      [studentId]
    );

    const rules = queryAll('SELECT * FROM alert_rules');
    const hoursMap: Record<string, number> = {};
    hoursByCourse.forEach((h: any) => {
      hoursMap[h.course_type] = h.total_hours;
    });

    const progress = rules.map((rule: any) => ({
      course_type: rule.course_type,
      required_hours: rule.required_hours,
      current_hours: Math.round((hoursMap[rule.course_type] || 0) * 100) / 100,
      warning_threshold: rule.warning_threshold,
      percentage: Math.round(((hoursMap[rule.course_type] || 0) / rule.required_hours) * 10000) / 100,
    }));

    const totalHours = Object.values(hoursMap).reduce((sum: number, h: any) => sum + h, 0);
    const totalRequired = rules.reduce((sum: number, r: any) => sum + r.required_hours, 0);

    res.json({
      success: true,
      data: {
        student,
        hours_by_course: hoursByCourse,
        progress,
        total_hours: Math.round(totalHours * 100) / 100,
        total_required: totalRequired,
        overall_percentage: totalRequired > 0 ? Math.round((totalHours / totalRequired) * 10000) / 100 : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取学员统计失败' });
  }
});

router.get('/batch', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const coachId = req.query.coach_id as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    const conditions: string[] = ["a.status = 'completed'"];
    const params: any[] = [];

    if (coachId) {
      conditions.push('a.coach_id = ?');
      params.push(parseInt(coachId));
    }
    if (startDate) {
      conditions.push('date(a.check_in_time) >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('date(a.check_in_time) <= ?');
      params.push(endDate);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const byCourseType = queryAll(
      `SELECT a.course_type, COALESCE(SUM(a.duration_hours), 0) as total_hours, COUNT(DISTINCT a.student_id) as student_count, COUNT(*) as record_count FROM attendance a ${whereClause} GROUP BY a.course_type`,
      params
    );

    const byCoach = queryAll(
      `SELECT a.coach_id, u.name as coach_name, COALESCE(SUM(a.duration_hours), 0) as total_hours, COUNT(DISTINCT a.student_id) as student_count FROM attendance a LEFT JOIN users u ON a.coach_id = u.id ${whereClause} GROUP BY a.coach_id`,
      params
    );

    const totalHours = queryOne(
      `SELECT COALESCE(SUM(duration_hours), 0) as total FROM attendance a ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        by_course_type: byCourseType,
        by_coach: byCoach,
        total_hours: Math.round((totalHours?.total || 0) * 100) / 100,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取批量统计失败' });
  }
});

router.get('/progress/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id);
    const student = queryOne('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!student) {
      res.status(404).json({ success: false, error: '学员不存在' });
      return;
    }

    const rules = queryAll('SELECT * FROM alert_rules ORDER BY CASE course_type WHEN "subject1" THEN 1 WHEN "subject2" THEN 2 WHEN "subject3" THEN 3 WHEN "subject4" THEN 4 END');

    const progressList = rules.map((rule: any) => {
      const hoursResult = queryOne(
        "SELECT COALESCE(SUM(duration_hours), 0) as total FROM attendance WHERE student_id = ? AND course_type = ? AND status = 'completed'",
        [studentId, rule.course_type]
      );
      const currentHours = Math.round((hoursResult?.total || 0) * 100) / 100;
      const percentage = rule.required_hours > 0 ? Math.round((currentHours / rule.required_hours) * 10000) / 100 : 0;

      return {
        course_type: rule.course_type,
        required_hours: rule.required_hours,
        current_hours: currentHours,
        percentage,
        is_completed: currentHours >= rule.required_hours,
        is_warning: currentHours < rule.required_hours * rule.warning_threshold && currentHours > 0,
      };
    });

    const currentStage = student.stage;
    const stageIndex = ['subject1', 'subject2', 'subject3', 'subject4'].indexOf(currentStage);

    res.json({
      success: true,
      data: {
        student,
        current_stage: currentStage,
        stage_index: stageIndex,
        progress: progressList,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取培训进度失败' });
  }
});

export default router;
