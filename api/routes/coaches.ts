import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryAll, queryOne, run, getLastInsertId } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const list = queryAll(
      `SELECT u.id, u.username, u.name, u.phone, u.created_at,
        (SELECT COUNT(*) FROM students s WHERE s.coach_id = u.id AND s.status = 'active') as student_count
      FROM users u WHERE u.role = 'coach' ORDER BY u.created_at DESC`
    );
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取教练列表失败' });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, name, phone } = req.body;

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
      'INSERT INTO users (username, password, role, name, phone) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, 'coach', name, phone || null]
    );

    const id = getLastInsertId();
    const coach = queryOne('SELECT id, username, name, phone, created_at FROM users WHERE id = ?', [id]);

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

    const { name, phone, password } = req.body;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      run('UPDATE users SET name=?, phone=?, password=? WHERE id=?', [name, phone || null, hashedPassword, id]);
    } else {
      run('UPDATE users SET name=?, phone=? WHERE id=?', [name, phone || null, id]);
    }

    const coach = queryOne('SELECT id, username, name, phone, created_at FROM users WHERE id = ?', [id]);
    res.json({ success: true, data: coach });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新教练失败' });
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

    const studentCount = queryOne('SELECT COUNT(*) as count FROM students WHERE coach_id = ? AND status = ?', [id, 'active']);
    if (studentCount?.count > 0) {
      res.status(400).json({ success: false, error: '该教练下还有在训学员，无法删除' });
      return;
    }

    run('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除教练失败' });
  }
});

export default router;
