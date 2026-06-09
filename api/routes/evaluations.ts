import { Router, type Request, type Response } from 'express';
import { queryAll, queryOne, run, getLastInsertId } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { coach_id, student_id, attendance_id, course_type, professional_score, patience_score, communication_score, punctuality_score, comment, tags, is_anonymous, status } = req.body;
    if (professional_score < 0 || professional_score > 5 || patience_score < 0 || patience_score > 5 || communication_score < 0 || communication_score > 5 || punctuality_score < 0 || punctuality_score > 5) {
      res.status(400).json({ success: false, error: '评分必须在0-5之间' });
      return;
    }
    if (attendance_id) {
      const existing = queryOne('SELECT id FROM teaching_evaluations WHERE attendance_id=?', [attendance_id]);
      if (existing) {
        res.status(400).json({ success: false, error: '该训练记录已评价过' });
        return;
      }
    }
    const overallScore = Math.round(((professional_score + patience_score + communication_score + punctuality_score) / 4) * 100) / 100;
    const tagsStr = tags ? (Array.isArray(tags) ? tags.join(',') : tags) : '';
    run(
      `INSERT INTO teaching_evaluations (coach_id, student_id, attendance_id, course_type, professional_score, patience_score, communication_score, punctuality_score, overall_score, comment, tags, is_anonymous, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [coach_id, student_id, attendance_id || null, course_type, professional_score, patience_score, communication_score, punctuality_score, overallScore, comment || '', tagsStr, is_anonymous ? 1 : 0, status || 'published']
    );
    const id = getLastInsertId();
    const created = queryOne(
      `SELECT e.*, u.name as coach_name, s.name as student_name FROM teaching_evaluations e LEFT JOIN users u ON e.coach_id=u.id LEFT JOIN students s ON e.student_id=s.id WHERE e.id=?`,
      [id]
    );
    res.json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: '创建评价失败' });
  }
});

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const coachId = req.query.coach_id as string;
    const studentId = req.query.student_id as string;
    const courseType = req.query.course_type as string;
    const minScore = req.query.min_score as string;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const conditions: string[] = [];
    const params: any[] = [];
    if (coachId) { conditions.push('e.coach_id=?'); params.push(parseInt(coachId)); }
    if (studentId) { conditions.push('e.student_id=?'); params.push(parseInt(studentId)); }
    if (courseType) { conditions.push('e.course_type=?'); params.push(courseType); }
    if (minScore) { conditions.push('e.overall_score>=?'); params.push(parseFloat(minScore)); }
    if (status) { conditions.push('e.status=?'); params.push(status); }
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const total = queryOne(`SELECT COUNT(*) as count FROM teaching_evaluations e ${whereClause}`, params);
    const list = queryAll(
      `SELECT e.*, u.name as coach_name, s.name as student_name FROM teaching_evaluations e LEFT JOIN users u ON e.coach_id=u.id LEFT JOIN students s ON e.student_id=s.id ${whereClause} ORDER BY e.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );
    res.json({ success: true, data: { list, total: total?.count || 0, page, limit } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取评价列表失败' });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const evaluation = queryOne(
      `SELECT e.*, u.name as coach_name, u.phone as coach_phone, s.name as student_name, s.phone as student_phone FROM teaching_evaluations e LEFT JOIN users u ON e.coach_id=u.id LEFT JOIN students s ON e.student_id=s.id WHERE e.id=?`,
      [id]
    );
    if (!evaluation) {
      res.status(404).json({ success: false, error: '评价不存在' });
      return;
    }
    res.json({ success: true, data: evaluation });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取评价详情失败' });
  }
});

router.put('/:id/status', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!['pending', 'published', 'hidden'].includes(status)) {
      res.status(400).json({ success: false, error: '无效的状态值' });
      return;
    }
    run('UPDATE teaching_evaluations SET status=? WHERE id=?', [status, id]);
    const updated = queryOne('SELECT * FROM teaching_evaluations WHERE id=?', [id]);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新状态失败' });
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    run('DELETE FROM teaching_evaluations WHERE id=?', [id]);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

router.get('/coach/:coach_id/summary', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const coachId = parseInt(req.params.coach_id);
    const overall = queryOne(
      `SELECT COUNT(*) as total_count, COALESCE(AVG(overall_score), 0) as avg_overall, COALESCE(AVG(professional_score), 0) as avg_professional, COALESCE(AVG(patience_score), 0) as avg_patience, COALESCE(AVG(communication_score), 0) as avg_communication, COALESCE(AVG(punctuality_score), 0) as avg_punctuality FROM teaching_evaluations WHERE coach_id=? AND status='published'`,
      [coachId]
    );
    const byCourse = queryAll(
      `SELECT course_type, COUNT(*) as count, COALESCE(AVG(overall_score), 0) as avg_score FROM teaching_evaluations WHERE coach_id=? AND status='published' GROUP BY course_type`,
      [coachId]
    );
    const scoreDistribution = queryAll(
      `SELECT CASE WHEN overall_score >= 4.5 THEN '5星' WHEN overall_score >= 3.5 THEN '4星' WHEN overall_score >= 2.5 THEN '3星' WHEN overall_score >= 1.5 THEN '2星' ELSE '1星' END as star, COUNT(*) as count FROM teaching_evaluations WHERE coach_id=? AND status='published' GROUP BY star ORDER BY star DESC`,
      [coachId]
    );
    const recentTags: Record<string, number> = {};
    const tagEvals = queryAll(
      `SELECT tags FROM teaching_evaluations WHERE coach_id=? AND status='published' AND tags IS NOT NULL AND tags!='' ORDER BY created_at DESC LIMIT 100`,
      [coachId]
    );
    tagEvals.forEach((e) => {
      if (e.tags) {
        e.tags.split(',').forEach((tag: string) => {
          if (tag.trim()) {
            recentTags[tag.trim()] = (recentTags[tag.trim()] || 0) + 1;
          }
        });
      }
    });
    const sortedTags = Object.entries(recentTags).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag, count]) => ({ tag, count }));
    const recentComments = queryAll(
      `SELECT e.comment, s.name as student_name, e.created_at, e.overall_score FROM teaching_evaluations e LEFT JOIN students s ON e.student_id=s.id WHERE e.coach_id=? AND e.status='published' AND e.comment IS NOT NULL AND e.comment!='' ORDER BY e.created_at DESC LIMIT 10`,
      [coachId]
    );
    res.json({
      success: true,
      data: {
        overall: {
          total_count: overall?.total_count || 0,
          avg_overall: Math.round((overall?.avg_overall || 0) * 100) / 100,
          avg_professional: Math.round((overall?.avg_professional || 0) * 100) / 100,
          avg_patience: Math.round((overall?.avg_patience || 0) * 100) / 100,
          avg_communication: Math.round((overall?.avg_communication || 0) * 100) / 100,
          avg_punctuality: Math.round((overall?.avg_punctuality || 0) * 100) / 100
        },
        by_course: byCourse,
        score_distribution: scoreDistribution,
        popular_tags: sortedTags,
        recent_comments: recentComments
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取教练评价汇总失败' });
  }
});

router.get('/pending/student/:student_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.student_id);
    const pending = queryAll(
      `SELECT a.*, u.name as coach_name, s.schedule_date, s.start_time, s.end_time, s.course_type FROM attendance a LEFT JOIN users u ON a.coach_id=u.id LEFT JOIN schedules s ON a.schedule_id=s.id WHERE a.student_id=? AND a.status='completed' AND a.id NOT IN (SELECT attendance_id FROM teaching_evaluations WHERE attendance_id IS NOT NULL) ORDER BY a.check_out_time DESC LIMIT 20`,
      [studentId]
    );
    res.json({ success: true, data: pending });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取待评价列表失败' });
  }
});

export default router;
