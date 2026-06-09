import { Router, type Request, type Response } from 'express';
import { queryAll, queryOne, run, getLastInsertId, getDb } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    const coachId = req.query.coach_id as string;

    const conditions: string[] = [];
    const params: any[] = [];

    if (startDate) {
      conditions.push('s.schedule_date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('s.schedule_date <= ?');
      params.push(endDate);
    }
    if (coachId) {
      conditions.push('s.coach_id = ?');
      params.push(parseInt(coachId));
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const list = queryAll(
      `SELECT s.*, u.name as coach_name FROM schedules s LEFT JOIN users u ON s.coach_id = u.id ${whereClause} ORDER BY s.schedule_date DESC, s.start_time ASC`,
      params
    );

    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取排班列表失败' });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const schedule = queryOne(
      'SELECT s.*, u.name as coach_name FROM schedules s LEFT JOIN users u ON s.coach_id = u.id WHERE s.id = ?',
      [id]
    );
    if (!schedule) {
      res.status(404).json({ success: false, error: '排班不存在' });
      return;
    }

    const bookings = queryAll(
      `SELECT b.id, b.student_id, s.name as student_name, s.training_type, b.created_at, b.status 
       FROM bookings b LEFT JOIN students s ON b.student_id = s.id 
       WHERE b.schedule_id = ? AND b.status = 'booked'
       ORDER BY b.created_at ASC`,
      [id]
    );

    res.json({ success: true, data: { ...schedule, bookings } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取排班详情失败' });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { coach_id, course_type, schedule_date, start_time, end_time, max_students } = req.body;

    if (!coach_id || !course_type || !schedule_date || !start_time || !end_time) {
      res.status(400).json({ success: false, error: '缺少必填字段' });
      return;
    }

    const coach = queryOne('SELECT id FROM users WHERE id = ? AND role = ?', [coach_id, 'coach']);
    if (!coach) {
      res.status(400).json({ success: false, error: '教练不存在' });
      return;
    }

    const conflict = queryOne(
      `SELECT id FROM schedules WHERE coach_id = ? AND schedule_date = ? AND status != 'cancelled' AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?))`,
      [coach_id, schedule_date, end_time, end_time, start_time, start_time]
    );
    if (conflict) {
      res.status(400).json({ success: false, error: '该教练在此时间段已有排班' });
      return;
    }

    run(
      'INSERT INTO schedules (coach_id, course_type, schedule_date, start_time, end_time, max_students) VALUES (?, ?, ?, ?, ?, ?)',
      [coach_id, course_type, schedule_date, start_time, end_time, max_students || 4]
    );

    const id = getLastInsertId();
    const schedule = queryOne(
      'SELECT s.*, u.name as coach_name FROM schedules s LEFT JOIN users u ON s.coach_id = u.id WHERE s.id = ?',
      [id]
    );

    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, error: '新增排班失败' });
  }
});

router.put('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const existing = queryOne('SELECT * FROM schedules WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ success: false, error: '排班不存在' });
      return;
    }

    const { coach_id, course_type, schedule_date, start_time, end_time, max_students, status } = req.body;

    run(
      'UPDATE schedules SET coach_id=?, course_type=?, schedule_date=?, start_time=?, end_time=?, max_students=?, status=? WHERE id=?',
      [
        coach_id ?? existing.coach_id,
        course_type ?? existing.course_type,
        schedule_date ?? existing.schedule_date,
        start_time ?? existing.start_time,
        end_time ?? existing.end_time,
        max_students ?? existing.max_students,
        status ?? existing.status,
        id,
      ]
    );

    const schedule = queryOne(
      'SELECT s.*, u.name as coach_name FROM schedules s LEFT JOIN users u ON s.coach_id = u.id WHERE s.id = ?',
      [id]
    );
    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新排班失败' });
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const existing = queryOne('SELECT * FROM schedules WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ success: false, error: '排班不存在' });
      return;
    }

    const bookings = queryAll("SELECT id FROM bookings WHERE schedule_id = ? AND status = 'booked'", [id]);
    if (bookings.length > 0) {
      res.status(400).json({ success: false, error: '该排班有预约记录，无法删除' });
      return;
    }

    run('DELETE FROM schedules WHERE id = ?', [id]);
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除排班失败' });
  }
});

router.post('/:id/book', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const scheduleId = parseInt(req.params.id);
    const { student_id } = req.body;

    if (!student_id) {
      res.status(400).json({ success: false, error: '学员ID为必填项' });
      return;
    }

    const schedule = queryOne('SELECT * FROM schedules WHERE id = ?', [scheduleId]);
    if (!schedule) {
      res.status(404).json({ success: false, error: '排班不存在' });
      return;
    }

    if (schedule.status === 'cancelled') {
      res.status(400).json({ success: false, error: '该排班已取消' });
      return;
    }

    if (schedule.current_students >= schedule.max_students) {
      res.status(400).json({ success: false, error: '该排班已满' });
      return;
    }

    const dupBooking = queryOne(
      "SELECT id FROM bookings WHERE schedule_id = ? AND student_id = ? AND status = 'booked'",
      [scheduleId, student_id]
    );
    if (dupBooking) {
      res.status(400).json({ success: false, error: '该学员已预约此排班' });
      return;
    }

    run('INSERT INTO bookings (schedule_id, student_id) VALUES (?, ?)', [scheduleId, student_id]);

    const newCurrent = schedule.current_students + 1;
    if (newCurrent >= schedule.max_students) {
      run('UPDATE schedules SET current_students = ?, status = ? WHERE id = ?', [newCurrent, 'full', scheduleId]);
    } else {
      run('UPDATE schedules SET current_students = ? WHERE id = ?', [newCurrent, scheduleId]);
    }

    const updatedSchedule = queryOne(
      'SELECT s.*, u.name as coach_name FROM schedules s LEFT JOIN users u ON s.coach_id = u.id WHERE s.id = ?',
      [scheduleId]
    );
    const bookings = queryAll(
      `SELECT b.id, b.student_id, s.name as student_name, s.training_type, b.created_at, b.status 
       FROM bookings b LEFT JOIN students s ON b.student_id = s.id 
       WHERE b.schedule_id = ? AND b.status = 'booked'
       ORDER BY b.created_at ASC`,
      [scheduleId]
    );

    res.status(201).json({ success: true, data: { ...updatedSchedule, bookings } });
  } catch (error) {
    res.status(500).json({ success: false, error: '预约失败' });
  }
});

router.delete('/:id/book/:studentId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const scheduleId = parseInt(req.params.id);
    const studentId = parseInt(req.params.studentId);

    const booking = queryOne(
      "SELECT * FROM bookings WHERE schedule_id = ? AND student_id = ? AND status = 'booked'",
      [scheduleId, studentId]
    );
    if (!booking) {
      res.status(404).json({ success: false, error: '预约记录不存在' });
      return;
    }

    const schedule = queryOne('SELECT * FROM schedules WHERE id = ?', [scheduleId]);
    if (!schedule) {
      res.status(404).json({ success: false, error: '排班不存在' });
      return;
    }

    run("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [booking.id]);

    const newCurrent = Math.max(0, schedule.current_students - 1);
    if (schedule.status === 'full') {
      run('UPDATE schedules SET current_students = ?, status = ? WHERE id = ?', [newCurrent, 'available', scheduleId]);
    } else {
      run('UPDATE schedules SET current_students = ? WHERE id = ?', [newCurrent, scheduleId]);
    }

    const updatedSchedule = queryOne(
      'SELECT s.*, u.name as coach_name FROM schedules s LEFT JOIN users u ON s.coach_id = u.id WHERE s.id = ?',
      [scheduleId]
    );
    const bookings = queryAll(
      `SELECT b.id, b.student_id, s.name as student_name, s.training_type, b.created_at, b.status 
       FROM bookings b LEFT JOIN students s ON b.student_id = s.id 
       WHERE b.schedule_id = ? AND b.status = 'booked'
       ORDER BY b.created_at ASC`,
      [scheduleId]
    );

    res.json({ success: true, data: { ...updatedSchedule, bookings } });
  } catch (error) {
    res.status(500).json({ success: false, error: '取消预约失败' });
  }
});

export default router;
