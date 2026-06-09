import { Router, type Request, type Response } from 'express';
import { queryAll, queryOne, run, getLastInsertId, getDb } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatLocalTime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function parseLocalTime(s: string): Date {
  const [datePart, timePart] = s.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
}

function formatDateOnly(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function checkAndGenerateAlert(studentId: number, courseType: string) {
  const hoursResult = queryOne(
    "SELECT SUM(duration_hours) as total FROM attendance WHERE student_id = ? AND course_type = ? AND status = 'completed'",
    [studentId, courseType]
  );
  const currentHours = hoursResult?.total || 0;

  const rule = queryOne('SELECT * FROM alert_rules WHERE course_type = ?', [courseType]);
  if (!rule) return;

  const warningHours = rule.required_hours * rule.warning_threshold;

  if (currentHours < rule.required_hours) {
    const severity = currentHours < warningHours ? 'high' : 'medium';
    const ratio = currentHours / rule.required_hours;
    const actualSeverity = ratio < 0.5 ? 'high' : ratio < rule.warning_threshold ? 'medium' : 'low';

    const existingAlert = queryOne(
      "SELECT * FROM alerts WHERE student_id = ? AND course_type = ? AND status = 'pending'",
      [studentId, courseType]
    );

    if (existingAlert) {
      run(
        'UPDATE alerts SET current_hours = ?, required_hours = ?, severity = ? WHERE id = ?',
        [currentHours, rule.required_hours, actualSeverity, existingAlert.id]
      );
    } else {
      run(
        'INSERT INTO alerts (student_id, course_type, current_hours, required_hours, severity) VALUES (?, ?, ?, ?, ?)',
        [studentId, courseType, currentHours, rule.required_hours, actualSeverity]
      );
    }
  } else {
    run(
      "UPDATE alerts SET status = 'resolved', resolved_at = datetime('now') WHERE student_id = ? AND course_type = ? AND status = 'pending'",
      [studentId, courseType]
    );
  }
}

const router = Router();

router.post('/check-in', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { student_id, schedule_id, coach_id, course_type } = req.body;

    if (!student_id || !coach_id || !course_type) {
      res.status(400).json({ success: false, error: '缺少必填字段' });
      return;
    }

    const student = queryOne('SELECT id FROM students WHERE id = ?', [student_id]);
    if (!student) {
      res.status(404).json({ success: false, error: '学员不存在' });
      return;
    }

    const activeCheckIn = queryOne(
      "SELECT id FROM attendance WHERE student_id = ? AND status = 'checked_in'",
      [student_id]
    );
    if (activeCheckIn) {
      res.status(400).json({ success: false, error: '该学员有未签退的记录' });
      return;
    }

    const now = formatLocalTime(new Date());

    run(
      'INSERT INTO attendance (student_id, schedule_id, coach_id, course_type, check_in_time) VALUES (?, ?, ?, ?, ?)',
      [student_id, schedule_id || null, coach_id, course_type, now]
    );

    const id = getLastInsertId();
    const record = queryOne(
      'SELECT a.*, s.name as student_name, u.name as coach_name FROM attendance a LEFT JOIN students s ON a.student_id = s.id LEFT JOIN users u ON a.coach_id = u.id WHERE a.id = ?',
      [id]
    );

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: '签到失败' });
  }
});

router.post('/check-out', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { attendance_id } = req.body;

    if (!attendance_id) {
      res.status(400).json({ success: false, error: '签到记录ID为必填项' });
      return;
    }

    const record = queryOne('SELECT * FROM attendance WHERE id = ?', [attendance_id]);
    if (!record) {
      res.status(404).json({ success: false, error: '签到记录不存在' });
      return;
    }

    if (record.status === 'completed') {
      res.status(400).json({ success: false, error: '该记录已签退' });
      return;
    }

    const now = new Date();
    const checkInTime = parseLocalTime(record.check_in_time);
    const durationMs = now.getTime() - checkInTime.getTime();
    const durationHours = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;

    const nowStr = formatLocalTime(now);

    run(
      "UPDATE attendance SET check_out_time = ?, duration_hours = ?, status = 'completed' WHERE id = ?",
      [nowStr, durationHours, attendance_id]
    );

    const updated = queryOne(
      'SELECT a.*, s.name as student_name, u.name as coach_name FROM attendance a LEFT JOIN students s ON a.student_id = s.id LEFT JOIN users u ON a.coach_id = u.id WHERE a.id = ?',
      [attendance_id]
    );

    checkAndGenerateAlert(record.student_id, record.course_type);

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: '签退失败' });
  }
});

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const date = req.query.date as string;
    const coachId = req.query.coach_id as string;
    const studentId = req.query.student_id as string;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];

    if (date) {
      conditions.push("substr(a.check_in_time, 1, 10) = ?");
      params.push(date);
    }
    if (coachId) {
      conditions.push('a.coach_id = ?');
      params.push(parseInt(coachId));
    }
    if (studentId) {
      conditions.push('a.student_id = ?');
      params.push(parseInt(studentId));
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const totalResult = queryOne(
      `SELECT COUNT(*) as count FROM attendance a ${whereClause}`,
      params
    );
    const total = totalResult?.count || 0;

    const list = queryAll(
      `SELECT a.*, s.name as student_name, u.name as coach_name FROM attendance a LEFT JOIN students s ON a.student_id = s.id LEFT JOIN users u ON a.coach_id = u.id ${whereClause} ORDER BY a.check_in_time DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: { list, total, page, limit },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取签到记录失败' });
  }
});

router.get('/today', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const today = formatDateOnly(new Date());

    const checkedIn = queryAll(
      `SELECT a.*, s.name as student_name, u.name as coach_name FROM attendance a LEFT JOIN students s ON a.student_id = s.id LEFT JOIN users u ON a.coach_id = u.id WHERE substr(a.check_in_time, 1, 10) = ? AND a.status = 'checked_in'`,
      [today]
    );

    const completed = queryAll(
      `SELECT a.*, s.name as student_name, u.name as coach_name FROM attendance a LEFT JOIN students s ON a.student_id = s.id LEFT JOIN users u ON a.coach_id = u.id WHERE substr(a.check_in_time, 1, 10) = ? AND a.status = 'completed'`,
      [today]
    );

    res.json({
      success: true,
      data: { checked_in: checkedIn, completed, total: checkedIn.length + completed.length },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取今日签到状态失败' });
  }
});

export default router;
