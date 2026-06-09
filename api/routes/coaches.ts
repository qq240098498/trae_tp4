import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryAll, queryOne, run, getLastInsertId } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const COURSE_MAP: Record<string, string> = {
  subject1: '科目一',
  subject2: '科目二',
  subject3: '科目三',
  subject4: '科目四',
};

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string;
    const keyword = req.query.keyword as string;

    const conditions: string[] = ["u.role = 'coach'"];
    const params: any[] = [];

    if (status) {
      conditions.push('u.coach_status = ?');
      params.push(status);
    }
    if (keyword) {
      conditions.push('(u.name LIKE ? OR u.phone LIKE ? OR u.employee_id LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const list = queryAll(
      `SELECT u.id, u.username, u.name, u.phone, u.created_at,
        u.employee_id, u.hire_date, u.specialty, u.coach_status,
        u.license_number, u.years_of_experience, u.remark,
        (SELECT COUNT(*) FROM students s WHERE s.coach_id = u.id AND s.status = 'active') as student_count,
        (SELECT COUNT(*) FROM schedules s WHERE s.coach_id = u.id AND s.status != 'cancelled' AND s.schedule_date >= date('now')) as upcoming_schedule_count,
        (SELECT COALESCE(SUM(a.duration_hours), 0) FROM attendance a WHERE a.coach_id = u.id AND a.status = 'completed' AND substr(a.check_in_time, 1, 7) = substr(datetime('now'), 1, 7)) as month_hours
      FROM users u ${whereClause} ORDER BY u.created_at DESC`,
      params
    );
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取教练列表失败' });
  }
});

router.get('/simple', authMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const list = queryAll(
      `SELECT u.id, u.name, u.phone, u.specialty, u.coach_status
       FROM users u WHERE u.role = 'coach' AND (u.coach_status = 'active' OR u.coach_status IS NULL)
       ORDER BY u.name ASC`
    );
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取教练简表失败' });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const coach = queryOne(
      `SELECT u.id, u.username, u.name, u.phone, u.created_at,
        u.employee_id, u.hire_date, u.specialty, u.coach_status,
        u.license_number, u.years_of_experience, u.remark
       FROM users u WHERE u.id = ? AND u.role = 'coach'`,
      [id]
    );
    if (!coach) {
      res.status(404).json({ success: false, error: '教练不存在' });
      return;
    }

    const stats = queryOne(
      `SELECT
        (SELECT COUNT(*) FROM students s WHERE s.coach_id = ? AND s.status = 'active') as active_student_count,
        (SELECT COUNT(*) FROM students s WHERE s.coach_id = ? AND s.status = 'completed') as completed_student_count,
        (SELECT COUNT(*) FROM students s WHERE s.coach_id = ?) as total_student_count,
        (SELECT COALESCE(SUM(a.duration_hours), 0) FROM attendance a WHERE a.coach_id = ? AND a.status = 'completed') as total_teaching_hours,
        (SELECT COUNT(*) FROM schedules s WHERE s.coach_id = ? AND s.status != 'cancelled') as total_schedule_count,
        (SELECT COUNT(*) FROM schedules s WHERE s.coach_id = ? AND s.status != 'cancelled' AND s.schedule_date >= date('now')) as upcoming_schedule_count,
        (SELECT COUNT(*) FROM teaching_evaluations e WHERE e.coach_id = ? AND e.status = 'published') as evaluation_count,
        (SELECT COALESCE(AVG(e.overall_score), 0) FROM teaching_evaluations e WHERE e.coach_id = ? AND e.status = 'published') as avg_evaluation_score,
        (SELECT COUNT(*) FROM violations v WHERE v.violator_type = 'coach' AND v.violator_id = ? AND v.status != 'cancelled') as violation_count
      `,
      [id, id, id, id, id, id, id, id, id]
    );

    const recentStudents = queryAll(
      `SELECT s.id, s.name, s.training_type, s.stage, s.status, s.enroll_date
       FROM students s WHERE s.coach_id = ? ORDER BY s.created_at DESC LIMIT 10`,
      [id]
    );

    const recentSchedules = queryAll(
      `SELECT s.id, s.course_type, s.schedule_date, s.start_time, s.end_time,
        s.max_students, s.current_students, s.status
       FROM schedules s WHERE s.coach_id = ? ORDER BY s.schedule_date DESC, s.start_time DESC LIMIT 10`,
      [id]
    );

    const recentAttendance = queryAll(
      `SELECT a.id, a.check_in_time, a.check_out_time, a.duration_hours,
        a.course_type, s.name as student_name
       FROM attendance a
       LEFT JOIN students s ON a.student_id = s.id
       WHERE a.coach_id = ? AND a.status = 'completed'
       ORDER BY a.check_in_time DESC LIMIT 10`,
      [id]
    );

    const recentPerformance = queryOne(
      `SELECT cp.* FROM coach_performance cp
       WHERE cp.coach_id = ? AND cp.status = 'published'
       ORDER BY cp.created_at DESC LIMIT 1`,
      [id]
    );

    const hourlyRates = queryAll(
      `SELECT chr.course_type, chr.hourly_rate, chr.effective_date
       FROM coach_hourly_rates chr
       WHERE chr.coach_id = ?
       ORDER BY chr.course_type, chr.effective_date DESC`,
      [id]
    );
    const ratesMap: Record<string, any> = {};
    hourlyRates.forEach((r) => {
      if (!ratesMap[r.course_type]) {
        ratesMap[r.course_type] = r;
      }
    });
    const ratesResult = ['subject1', 'subject2', 'subject3', 'subject4'].map((ct) => ({
      course_type: ct,
      course_name: COURSE_MAP[ct] || ct,
      hourly_rate: ratesMap[ct]?.hourly_rate || (ct === 'subject1' ? 50 : ct === 'subject2' ? 80 : ct === 'subject3' ? 100 : 60),
      effective_date: ratesMap[ct]?.effective_date || null,
    }));

    res.json({
      success: true,
      data: {
        ...coach,
        stats,
        recent_students: recentStudents,
        recent_schedules: recentSchedules,
        recent_attendance: recentAttendance,
        recent_performance: recentPerformance,
        hourly_rates: ratesResult,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取教练详情失败' });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      username, password, name, phone,
      employee_id, hire_date, specialty, coach_status,
      license_number, years_of_experience, remark,
    } = req.body;

    if (!username || !password || !name) {
      res.status(400).json({ success: false, error: '用户名、密码和姓名为必填项' });
      return;
    }

    const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      res.status(400).json({ success: false, error: '用户名已存在' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    run(
      `INSERT INTO users (username, password, role, name, phone,
        employee_id, hire_date, specialty, coach_status,
        license_number, years_of_experience, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username, hashedPassword, 'coach', name, phone || null,
        employee_id || null, hire_date || null, specialty || null,
        coach_status || 'active', license_number || null,
        years_of_experience || 0, remark || null,
      ]
    );

    const id = getLastInsertId();
    const coach = queryOne(
      `SELECT u.id, u.username, u.name, u.phone, u.created_at,
        u.employee_id, u.hire_date, u.specialty, u.coach_status,
        u.license_number, u.years_of_experience, u.remark
       FROM users u WHERE u.id = ?`,
      [id]
    );

    res.status(201).json({ success: true, data: coach });
  } catch (error) {
    res.status(500).json({ success: false, error: '新增教练失败' });
  }
});

router.put('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const existing = queryOne('SELECT id FROM users WHERE id = ? AND role = ?', [id, 'coach']);
    if (!existing) {
      res.status(404).json({ success: false, error: '教练不存在' });
      return;
    }

    const {
      name, phone, password,
      employee_id, hire_date, specialty, coach_status,
      license_number, years_of_experience, remark,
    } = req.body;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      run(
        `UPDATE users SET name=?, phone=?, password=?,
          employee_id=?, hire_date=?, specialty=?, coach_status=?,
          license_number=?, years_of_experience=?, remark=?
         WHERE id=?`,
        [
          name, phone || null, hashedPassword,
          employee_id || null, hire_date || null, specialty || null,
          coach_status || 'active', license_number || null,
          years_of_experience || 0, remark || null, id,
        ]
      );
    } else {
      run(
        `UPDATE users SET name=?, phone=?,
          employee_id=?, hire_date=?, specialty=?, coach_status=?,
          license_number=?, years_of_experience=?, remark=?
         WHERE id=?`,
        [
          name, phone || null,
          employee_id || null, hire_date || null, specialty || null,
          coach_status || 'active', license_number || null,
          years_of_experience || 0, remark || null, id,
        ]
      );
    }

    const coach = queryOne(
      `SELECT u.id, u.username, u.name, u.phone, u.created_at,
        u.employee_id, u.hire_date, u.specialty, u.coach_status,
        u.license_number, u.years_of_experience, u.remark
       FROM users u WHERE u.id = ?`,
      [id]
    );
    res.json({ success: true, data: coach });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新教练失败' });
  }
});

router.patch('/:id/status', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { coach_status } = req.body;

    const existing = queryOne('SELECT id FROM users WHERE id = ? AND role = ?', [id, 'coach']);
    if (!existing) {
      res.status(404).json({ success: false, error: '教练不存在' });
      return;
    }

    if (!['active', 'leave', 'resigned'].includes(coach_status)) {
      res.status(400).json({ success: false, error: '无效的状态值' });
      return;
    }

    run('UPDATE users SET coach_status = ? WHERE id = ?', [coach_status, id]);

    const coach = queryOne(
      'SELECT id, name, coach_status FROM users WHERE id = ?',
      [id]
    );
    res.json({ success: true, data: coach });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新教练状态失败' });
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const existing = queryOne('SELECT id FROM users WHERE id = ? AND role = ?', [id, 'coach']);
    if (!existing) {
      res.status(404).json({ success: false, error: '教练不存在' });
      return;
    }

    const studentCount = queryOne(
      "SELECT COUNT(*) as count FROM students WHERE coach_id = ? AND status = 'active'",
      [id]
    );
    if (studentCount?.count > 0) {
      res.status(400).json({ success: false, error: '该教练下还有在训学员，无法删除' });
      return;
    }

    const scheduleCount = queryOne(
      "SELECT COUNT(*) as count FROM schedules WHERE coach_id = ? AND status != 'cancelled' AND schedule_date >= date('now')",
      [id]
    );
    if (scheduleCount?.count > 0) {
      res.status(400).json({ success: false, error: '该教练还有未完成的排班，无法删除' });
      return;
    }

    run('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除教练失败' });
  }
});

export default router;
