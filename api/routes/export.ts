import { Router, type Request, type Response } from 'express';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { queryAll, run, getLastInsertId } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

function getExportData(exportType: string, filters: Record<string, any>) {
  switch (exportType) {
    case 'students': {
      const conditions: string[] = [];
      const params: any[] = [];
      if (filters.status) {
        conditions.push('s.status = ?');
        params.push(filters.status);
      }
      if (filters.coach_id) {
        conditions.push('s.coach_id = ?');
        params.push(filters.coach_id);
      }
      const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      return queryAll(
        `SELECT s.id, s.name, s.gender, s.id_card, s.phone, s.training_type, s.stage, s.enroll_date, s.expected_complete_date, u.name as coach_name, s.status, s.remark FROM students s LEFT JOIN users u ON s.coach_id = u.id ${where} ORDER BY s.created_at DESC`,
        params
      );
    }
    case 'attendance': {
      const conditions: string[] = ["a.status = 'completed'"];
      const params: any[] = [];
      if (filters.start_date) {
        conditions.push('date(a.check_in_time) >= ?');
        params.push(filters.start_date);
      }
      if (filters.end_date) {
        conditions.push('date(a.check_in_time) <= ?');
        params.push(filters.end_date);
      }
      if (filters.coach_id) {
        conditions.push('a.coach_id = ?');
        params.push(filters.coach_id);
      }
      if (filters.student_id) {
        conditions.push('a.student_id = ?');
        params.push(filters.student_id);
      }
      const where = 'WHERE ' + conditions.join(' AND ');
      return queryAll(
        `SELECT a.id, s.name as student_name, u.name as coach_name, a.course_type, a.check_in_time, a.check_out_time, a.duration_hours, a.status FROM attendance a LEFT JOIN students s ON a.student_id = s.id LEFT JOIN users u ON a.coach_id = u.id ${where} ORDER BY a.check_in_time DESC`,
        params
      );
    }
    case 'statistics': {
      return queryAll(
        `SELECT s.id, s.name, s.training_type, s.stage, a.course_type, COALESCE(a.total_hours, 0) as total_hours FROM students s LEFT JOIN (SELECT student_id, course_type, SUM(duration_hours) as total_hours FROM attendance WHERE status = 'completed' GROUP BY student_id, course_type) a ON s.id = a.student_id WHERE s.status = 'active' ORDER BY s.id`
      );
    }
    default:
      return [];
  }
}

function getHeaders(exportType: string): Record<string, string> {
  switch (exportType) {
    case 'students':
      return {
        id: 'ID', name: '姓名', gender: '性别', id_card: '身份证号', phone: '手机号',
        training_type: '培训类型', stage: '当前科目', enroll_date: '入学日期',
        expected_complete_date: '预计完成日期', coach_name: '教练', status: '状态', remark: '备注',
      };
    case 'attendance':
      return {
        id: 'ID', student_name: '学员', coach_name: '教练', course_type: '科目',
        check_in_time: '签到时间', check_out_time: '签退时间', duration_hours: '时长(小时)', status: '状态',
      };
    case 'statistics':
      return {
        id: 'ID', name: '姓名', training_type: '培训类型', stage: '当前科目',
        course_type: '科目', total_hours: '累计学时',
      };
    default:
      return {};
  }
}

function translateValue(key: string, value: any): any {
  if (value === null || value === undefined) return '';
  const maps: Record<string, Record<string, string>> = {
    gender: { male: '男', female: '女' },
    stage: { subject1: '科目一', subject2: '科目二', subject3: '科目三', subject4: '科目四' },
    course_type: { subject1: '科目一', subject2: '科目二', subject3: '科目三', subject4: '科目四' },
    status: { active: '在训', completed: '已完成', suspended: '暂停', booked: '已预约', cancelled: '已取消', checked_in: '已签到' },
  };
  if (maps[key] && maps[key][value]) return maps[key][value];
  return value;
}

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { export_type, filters = {} } = req.body;

    if (!['students', 'attendance', 'statistics'].includes(export_type)) {
      res.status(400).json({ success: false, error: '无效的导出类型' });
      return;
    }

    const data = getExportData(export_type, filters);
    const headers = getHeaders(export_type);

    const headersArr = Object.keys(headers);
    const headersTitleArr = headersArr.map(k => headers[k]);

    const rows = data.map((row: any) =>
      headersArr.map(key => translateValue(key, row[key]))
    );

    const wb = XLSX.utils.book_new();
    const wsData = [headersTitleArr, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, '数据');

    const exportDir = path.join(process.cwd(), 'data', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
    const fileName = `${export_type}_${timestamp}.xlsx`;
    const filePath = path.join(exportDir, fileName);

    XLSX.writeFile(wb, filePath);

    const fileSize = fs.statSync(filePath).size;

    run(
      'INSERT INTO export_records (export_type, file_name, file_path, filter_params, file_size, status) VALUES (?, ?, ?, ?, ?, ?)',
      [export_type, fileName, filePath, JSON.stringify(filters), fileSize, 'completed']
    );

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '导出失败' });
  }
});

router.get('/history', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const list = queryAll('SELECT * FROM export_records ORDER BY created_at DESC');
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取导出历史失败' });
  }
});

export default router;
