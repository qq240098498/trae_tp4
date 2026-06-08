import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { queryOne } from '../db.js';
import { authMiddleware, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码不能为空' });
      return;
    }

    const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      res.status(401).json({ success: false, error: '用户名或密码错误' });
      return;
    }

    let passwordMatch = password === user.password;
    if (!passwordMatch && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
      passwordMatch = await bcrypt.compare(password, user.password);
    }

    if (!passwordMatch) {
      res.status(401).json({ success: false, error: '用户名或密码错误' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          phone: user.phone,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '登录失败' });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = queryOne('SELECT id, username, role, name, phone, created_at FROM users WHERE id = ?', [req.user!.id]);
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取用户信息失败' });
  }
});

export default router;
