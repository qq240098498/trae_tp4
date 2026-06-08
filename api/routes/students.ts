import { Router, type Request, type Response } from 'express';
import { queryAll, queryOne, run, getLastInsertId } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const keyword = req.query.keyword as string;
    const status = req.query.status as string;
    const coachId = req.query.coach_id as string;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];

    if (keyword) {
      conditions.push('(s.name LIKE ? OR s.phone LIKE ? OR s.id_card LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (status) {
      conditions.push('s.status = ?');
      params.push(status);
    }
    if (coachId) {
      conditions.push('s.coach_id = ?');
      params.push(parseInt(coachId));
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const totalResult = queryOne(
      `SELECT COUNT(*) as count FROM students s ${whereClause}`,
      params
    );
    const total = totalResult?.count || 0;

    const list = queryAll(
      `SELECT s.*, u.name as coach_name FROM students s LEFT JOIN users u ON s.coach_id = u.id ${whereClause} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: { list, total, page, limit },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取学员列表失败' });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const student = queryOne(
      'SELECT s.*, u.name as coach_name FROM students s LEFT JOIN users u ON s.coach_id = u.id WHERE s.id = ?',
      [parseInt(req.params.id)]
    );
    if (!student) {
      res.status(404).json({ success: false, error: '学员不存在' });
      return;
    }

    const hoursSummary = queryAll(
      `SELECT course_type, SUM(duration_hours) as total_hours FROM attendance WHERE student_id = ? AND status = 'completed' GROUP BY course_type`,
      [student.id]
    );

    res.json({
      success: true,
      data: { ...student, hours_summary: hoursSummary },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取学员详情失败' });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, gender, id_card, phone, training_type, stage, enroll_date, expected_complete_date, coach_id, status, remark } = req.body;

    if (!name || !training_type || !enroll_date) {
      res.status(400).json({ success: false, error: '姓名、培训类型和入学日期为必填项' });
      return;
    }

    if (id_card) {
      const existing = queryOne('SELECT id FROM students WHERE id_card = ?', [id_card]);
      if (existing) {
        res.status(400).json({ success: false, error: '身份证号已存在' });
        return;
      }
    }

    run(
      `INSERT INTO students (name, gender, id_card, phone, training_type, stage, enroll_date, expected_complete_date, coach_id, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, gender || null, id_card || null, phone || null, training_type, stage || 'subject1', enroll_date, expected_complete_date || null, coach_id || null, status || 'active', remark || null]
    );

    const id = getLastInsertId();
    const student = queryOne('SELECT * FROM students WHERE id = ?', [id]);

    res.status(201).json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, error: '新增学员失败' });
  }
});

router.put('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const existing = queryOne('SELECT id FROM students WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ success: false, error: '学员不存在' });
      return;
    }

    const { name, gender, id_card, phone, training_type, stage, enroll_date, expected_complete_date, coach_id, status, remark } = req.body;

    if (id_card) {
      const dup = queryOne('SELECT id FROM students WHERE id_card = ? AND id != ?', [id_card, id]);
      if (dup) {
        res.status(400).json({ success: false, error: '身份证号已被其他学员使用' });
        return;
      }
    }

    run(
      `UPDATE students SET name=?, gender=?, id_card=?, phone=?, training_type=?, stage=?, enroll_date=?, expected_complete_date=?, coach_id=?, status=?, remark=?, updated_at=datetime('now') WHERE id=?`,
      [name, gender || null, id_card || null, phone || null, training_type, stage, enroll_date, expected_complete_date || null, coach_id || null, status, remark || null, id]
    );

    const student = queryOne('SELECT * FROM students WHERE id = ?', [id]);
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新学员失败' });
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const existing = queryOne('SELECT id FROM students WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ success: false, error: '学员不存在' });
      return;
    }

    run('DELETE FROM students WHERE id = ?', [id]);
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除学员失败' });
  }
});

export default router;
