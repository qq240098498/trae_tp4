import { Router, type Request, type Response } from 'express';
import { queryAll, queryOne, run, getLastInsertId } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatDateOnly(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getWeekRange(dateStr: string): { start: string; end: string } {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(date.setDate(diff));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return {
    start: formatDateOnly(weekStart),
    end: formatDateOnly(weekEnd),
  };
}

function getMonthRange(dateStr: string): { start: string; end: string } {
  const date = new Date(dateStr);
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: formatDateOnly(start),
    end: formatDateOnly(end),
  };
}

function getYearRange(dateStr: string): { start: string; end: string } {
  const date = new Date(dateStr);
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear(), 11, 31);
  return {
    start: formatDateOnly(start),
    end: formatDateOnly(end),
  };
}

function getCourseName(c: string): string {
  return ({ subject1: '科目一', subject2: '科目二', subject3: '科目三', subject4: '科目四' } as Record<string, string>)[c] || c;
}

function getDefaultHourlyRate(courseType: string): number {
  const rates: Record<string, number> = { subject1: 50, subject2: 80, subject3: 100, subject4: 60 };
  return rates[courseType] || 50;
}

function getABCGradeFromScore(score: number, rule?: any): { grade: string; deduction_rate: number } {
  const aScore = rule?.grade_a_score ?? 80;
  const bScore = rule?.grade_b_score ?? 60;
  const cDeduction = rule?.grade_c_deduction_rate ?? 0.2;
  if (score >= aScore) return { grade: 'A', deduction_rate: 0 };
  if (score >= bScore) return { grade: 'B', deduction_rate: 0 };
  return { grade: 'C', deduction_rate: cDeduction };
}

function detectPeriodType(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sY = s.getFullYear();
  const eY = e.getFullYear();
  const sM = s.getMonth();
  const eM = e.getMonth();
  const sD = s.getDate();
  const eD = e.getDate();
  if (sY === eY && sM === eM && sD === 1 && eD === new Date(eY, eM + 1, 0).getDate()) return 'monthly';
  if (sY === eY && sM === 0 && sD === 1 && eM === 11 && eD === 31) return 'yearly';
  const diffDays = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 6) return 'weekly';
  return 'custom';
}

function getLinkedPerformance(coachId: number, start: string, end: string): any {
  const periodType = detectPeriodType(start, end);
  let perf: any = null;
  if (periodType !== 'custom') {
    perf = queryOne(
      `SELECT cp.*, pr.grade_a_score, pr.grade_b_score, pr.grade_c_deduction_rate 
       FROM coach_performance cp 
       LEFT JOIN performance_rules pr ON cp.period_type = pr.period_type
       WHERE cp.coach_id=? AND cp.period_type=? AND cp.period_start=? AND cp.period_end=? AND cp.status='published'`,
      [coachId, periodType, start, end]
    );
  }
  if (!perf) {
    perf = queryOne(
      `SELECT cp.*, pr.grade_a_score, pr.grade_b_score, pr.grade_c_deduction_rate 
       FROM coach_performance cp 
       LEFT JOIN performance_rules pr ON cp.period_type = pr.period_type
       WHERE cp.coach_id=? AND cp.status='published' 
         AND cp.period_start <= ? AND cp.period_end >= ?
       ORDER BY cp.created_at DESC LIMIT 1`,
      [coachId, end, start]
    );
  }
  return perf;
}

// 获取教练课时费配置
router.get('/rates/:coach_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const coachId = parseInt(req.params.coach_id);
    const rates = queryAll(
      `SELECT chr.*, u.name as coach_name 
       FROM coach_hourly_rates chr 
       LEFT JOIN users u ON chr.coach_id = u.id 
       WHERE chr.coach_id = ? 
       ORDER BY chr.course_type, chr.effective_date DESC`,
      [coachId]
    );
    const grouped: Record<string, any> = {};
    rates.forEach((r) => {
      if (!grouped[r.course_type]) {
        grouped[r.course_type] = r;
      }
    });
    const result = ['subject1', 'subject2', 'subject3', 'subject4'].map((ct) => ({
      course_type: ct,
      course_name: getCourseName(ct),
      hourly_rate: grouped[ct]?.hourly_rate || getDefaultHourlyRate(ct),
      effective_date: grouped[ct]?.effective_date || '-',
    }));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取课时费配置失败' });
  }
});

// 更新教练课时费配置
router.put('/rates/:coach_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const coachId = parseInt(req.params.coach_id);
    const { rates } = req.body;
    if (!Array.isArray(rates)) {
      res.status(400).json({ success: false, error: '参数格式错误' });
      return;
    }
    const today = formatDateOnly(new Date());
    const results: any[] = [];
    for (const r of rates) {
      const existing = queryOne(
        `SELECT id FROM coach_hourly_rates WHERE coach_id = ? AND course_type = ? AND effective_date = ?`,
        [coachId, r.course_type, today]
      );
      if (existing) {
        run(
          `UPDATE coach_hourly_rates SET hourly_rate = ? WHERE id = ?`,
          [r.hourly_rate, existing.id]
        );
      } else {
        run(
          `INSERT INTO coach_hourly_rates (coach_id, course_type, hourly_rate, effective_date) VALUES (?, ?, ?, ?)`,
          [coachId, r.course_type, r.hourly_rate, today]
        );
      }
      results.push({
        course_type: r.course_type,
        course_name: getCourseName(r.course_type),
        hourly_rate: r.hourly_rate,
        effective_date: today,
      });
    }
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新课时费配置失败' });
  }
});

// 获取教练每日台账汇总
router.get('/daily/:coach_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const coachId = parseInt(req.params.coach_id);
    const date = req.query.date as string || formatDateOnly(new Date());

    // 考勤数据
    const attendanceStats = queryOne(
      `SELECT 
        COUNT(DISTINCT a.student_id) as student_count,
        COUNT(DISTINCT a.id) as session_count,
        COALESCE(SUM(a.duration_hours), 0) as total_hours
       FROM attendance a 
       WHERE a.coach_id = ? 
         AND substr(a.check_in_time, 1, 10) = ? 
         AND a.status = 'completed'`,
      [coachId, date]
    );

    // 排班数据
    const scheduleStats = queryOne(
      `SELECT 
        COUNT(*) as class_count,
        COALESCE(SUM(
          (CAST(substr(s.end_time, 1, 2) AS INTEGER) * 60 + CAST(substr(s.end_time, 4, 2) AS INTEGER)) -
          (CAST(substr(s.start_time, 1, 2) AS INTEGER) * 60 + CAST(substr(s.start_time, 4, 2) AS INTEGER))
        ) / 60.0, 0) as scheduled_hours
       FROM schedules s 
       WHERE s.coach_id = ? 
         AND s.schedule_date = ? 
         AND s.status != 'cancelled'`,
      [coachId, date]
    );

    // 分科目明细
    const byCourse = queryAll(
      `SELECT 
        a.course_type,
        COUNT(DISTINCT a.student_id) as student_count,
        COUNT(a.id) as session_count,
        COALESCE(SUM(a.duration_hours), 0) as total_hours
       FROM attendance a 
       WHERE a.coach_id = ? 
         AND substr(a.check_in_time, 1, 10) = ? 
         AND a.status = 'completed'
       GROUP BY a.course_type
       ORDER BY a.course_type`,
      [coachId, date]
    );

    // 当日排班列表
    const schedules = queryAll(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM bookings b WHERE b.schedule_id = s.id AND b.status = 'booked') as booking_count
       FROM schedules s 
       WHERE s.coach_id = ? 
         AND s.schedule_date = ? 
         AND s.status != 'cancelled'
       ORDER BY s.start_time`,
      [coachId, date]
    );

    // 获取课时费计算薪资
    const rateResult = queryAll(
      `SELECT chr.course_type, chr.hourly_rate 
       FROM coach_hourly_rates chr
       WHERE chr.coach_id = ? 
         AND chr.effective_date <= ?
       ORDER BY chr.course_type, chr.effective_date DESC`,
      [coachId, date]
    );
    const ratesMap: Record<string, number> = {};
    rateResult.forEach((r) => {
      if (!ratesMap[r.course_type]) ratesMap[r.course_type] = r.hourly_rate;
    });

    let totalSalary = 0;
    const salaryByCourse = byCourse.map((c) => {
      const rate = ratesMap[c.course_type] ?? getDefaultHourlyRate(c.course_type);
      const salary = Math.round(c.total_hours * rate * 100) / 100;
      totalSalary += salary;
      return {
        ...c,
        course_name: getCourseName(c.course_type),
        hourly_rate: rate,
        salary,
      };
    });
    totalSalary = Math.round(totalSalary * 100) / 100;

    res.json({
      success: true,
      data: {
        date,
        summary: {
          student_count: attendanceStats?.student_count || 0,
          session_count: attendanceStats?.session_count || 0,
          class_count: scheduleStats?.class_count || 0,
          total_hours: Math.round((attendanceStats?.total_hours || 0) * 100) / 100,
          scheduled_hours: Math.round((scheduleStats?.scheduled_hours || 0) * 100) / 100,
          total_salary: totalSalary,
        },
        by_course: salaryByCourse,
        schedules,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取每日台账失败' });
  }
});

// 获取教练每周台账汇总
router.get('/weekly/:coach_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const coachId = parseInt(req.params.coach_id);
    const date = req.query.date as string || formatDateOnly(new Date());
    const { start: weekStart, end: weekEnd } = getWeekRange(date);

    // 汇总数据
    const attendanceStats = queryOne(
      `SELECT 
        COUNT(DISTINCT a.student_id) as student_count,
        COUNT(DISTINCT a.id) as session_count,
        COUNT(DISTINCT substr(a.check_in_time, 1, 10)) as work_days,
        COALESCE(SUM(a.duration_hours), 0) as total_hours
       FROM attendance a 
       WHERE a.coach_id = ? 
         AND substr(a.check_in_time, 1, 10) >= ? 
         AND substr(a.check_in_time, 1, 10) <= ? 
         AND a.status = 'completed'`,
      [coachId, weekStart, weekEnd]
    );

    const scheduleStats = queryOne(
      `SELECT 
        COUNT(*) as class_count,
        COALESCE(SUM(
          (CAST(substr(s.end_time, 1, 2) AS INTEGER) * 60 + CAST(substr(s.end_time, 4, 2) AS INTEGER)) -
          (CAST(substr(s.start_time, 1, 2) AS INTEGER) * 60 + CAST(substr(s.start_time, 4, 2) AS INTEGER))
        ) / 60.0, 0) as scheduled_hours
       FROM schedules s 
       WHERE s.coach_id = ? 
         AND s.schedule_date >= ? 
         AND s.schedule_date <= ? 
         AND s.status != 'cancelled'`,
      [coachId, weekStart, weekEnd]
    );

    // 按天分日统计
    const dailyStats = queryAll(
      `SELECT 
        substr(a.check_in_time, 1, 10) as work_date,
        COUNT(DISTINCT a.student_id) as student_count,
        COUNT(a.id) as session_count,
        COALESCE(SUM(a.duration_hours), 0) as total_hours
       FROM attendance a 
       WHERE a.coach_id = ? 
         AND substr(a.check_in_time, 1, 10) >= ? 
         AND substr(a.check_in_time, 1, 10) <= ? 
         AND a.status = 'completed'
       GROUP BY substr(a.check_in_time, 1, 10)
       ORDER BY work_date`,
      [coachId, weekStart, weekEnd]
    );

    // 按科目统计
    const byCourse = queryAll(
      `SELECT 
        a.course_type,
        COUNT(DISTINCT a.student_id) as student_count,
        COUNT(a.id) as session_count,
        COALESCE(SUM(a.duration_hours), 0) as total_hours
       FROM attendance a 
       WHERE a.coach_id = ? 
         AND substr(a.check_in_time, 1, 10) >= ? 
         AND substr(a.check_in_time, 1, 10) <= ? 
         AND a.status = 'completed'
       GROUP BY a.course_type
       ORDER BY a.course_type`,
      [coachId, weekStart, weekEnd]
    );

    // 获取课时费计算薪资
    const rateResult = queryAll(
      `SELECT chr.course_type, chr.hourly_rate 
       FROM coach_hourly_rates chr
       WHERE chr.coach_id = ? 
         AND chr.effective_date <= ?
       ORDER BY chr.course_type, chr.effective_date DESC`,
      [coachId, weekEnd]
    );
    const ratesMap: Record<string, number> = {};
    rateResult.forEach((r) => {
      if (!ratesMap[r.course_type]) ratesMap[r.course_type] = r.hourly_rate;
    });

    let totalSalary = 0;
    const salaryByCourse = byCourse.map((c) => {
      const rate = ratesMap[c.course_type] ?? getDefaultHourlyRate(c.course_type);
      const salary = Math.round(c.total_hours * rate * 100) / 100;
      totalSalary += salary;
      return {
        ...c,
        course_name: getCourseName(c.course_type),
        hourly_rate: rate,
        salary,
      };
    });
    totalSalary = Math.round(totalSalary * 100) / 100;

    // 生成完整7天数据
    const fullWeek: any[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dStr = formatDateOnly(d);
      const found = dailyStats.find((x) => x.work_date === dStr);
      fullWeek.push({
        work_date: dStr,
        weekday: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i],
        student_count: found?.student_count || 0,
        session_count: found?.session_count || 0,
        total_hours: Math.round((found?.total_hours || 0) * 100) / 100,
      });
    }

    res.json({
      success: true,
      data: {
        week_start: weekStart,
        week_end: weekEnd,
        summary: {
          work_days: attendanceStats?.work_days || 0,
          student_count: attendanceStats?.student_count || 0,
          session_count: attendanceStats?.session_count || 0,
          class_count: scheduleStats?.class_count || 0,
          total_hours: Math.round((attendanceStats?.total_hours || 0) * 100) / 100,
          scheduled_hours: Math.round((scheduleStats?.scheduled_hours || 0) * 100) / 100,
          total_salary: totalSalary,
        },
        daily_stats: fullWeek,
        by_course: salaryByCourse,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取每周台账失败' });
  }
});

// 获取教练薪资报表（按日期范围）
router.get('/salary/:coach_id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const coachId = parseInt(req.params.coach_id);
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    const today = formatDateOnly(new Date());
    const finalStart = startDate || today.substring(0, 8) + '01';
    const finalEnd = endDate || today;

    const performance = getLinkedPerformance(coachId, finalStart, finalEnd);
    const compositeScore = performance?.composite_score ?? null;
    let abcGradeInfo = { grade: '-', deduction_rate: 0 };
    if (compositeScore !== null) {
      const rule = performance || undefined;
      abcGradeInfo = getABCGradeFromScore(compositeScore, rule);
    } else {
      const defaultRule = queryOne('SELECT * FROM performance_rules WHERE period_type=? LIMIT 1', ['monthly']);
      const defScore = 75;
      abcGradeInfo = getABCGradeFromScore(defScore, defaultRule || undefined);
    }

    // 每日考勤数据
    const dailyRecords = queryAll(
      `SELECT 
        substr(a.check_in_time, 1, 10) as work_date,
        a.course_type,
        COUNT(DISTINCT a.student_id) as student_count,
        COUNT(a.id) as session_count,
        COALESCE(SUM(a.duration_hours), 0) as total_hours
       FROM attendance a 
       WHERE a.coach_id = ? 
         AND substr(a.check_in_time, 1, 10) >= ? 
         AND substr(a.check_in_time, 1, 10) <= ? 
         AND a.status = 'completed'
       GROUP BY substr(a.check_in_time, 1, 10), a.course_type
       ORDER BY work_date, a.course_type`,
      [coachId, finalStart, finalEnd]
    );

    // 每日排班数
    const dailySchedules = queryAll(
      `SELECT 
        s.schedule_date,
        COUNT(*) as class_count
       FROM schedules s 
       WHERE s.coach_id = ? 
         AND s.schedule_date >= ? 
         AND s.schedule_date <= ? 
         AND s.status != 'cancelled'
       GROUP BY s.schedule_date`,
      [coachId, finalStart, finalEnd]
    );

    // 获取课时费
    const rateResult = queryAll(
      `SELECT chr.course_type, chr.hourly_rate, chr.effective_date
       FROM coach_hourly_rates chr
       WHERE chr.coach_id = ? 
         AND chr.effective_date <= ?
       ORDER BY chr.course_type, chr.effective_date DESC`,
      [coachId, finalEnd]
    );
    const ratesMap: Record<string, number> = {};
    rateResult.forEach((r) => {
      if (!ratesMap[r.course_type]) ratesMap[r.course_type] = r.hourly_rate;
    });

    // 聚合日数据
    const dayMap = new Map<string, any>();
    dailyRecords.forEach((r) => {
      const rate = ratesMap[r.course_type] ?? getDefaultHourlyRate(r.course_type);
      const salary = Math.round(r.total_hours * rate * 100) / 100;
      if (!dayMap.has(r.work_date)) {
        const sched = dailySchedules.find((s) => s.schedule_date === r.work_date);
        dayMap.set(r.work_date, {
          work_date: r.work_date,
          student_count: 0,
          session_count: 0,
          class_count: sched?.class_count || 0,
          total_hours: 0,
          total_salary: 0,
          course_details: [],
        });
      }
      const day = dayMap.get(r.work_date);
      day.student_count += r.student_count;
      day.session_count += r.session_count;
      day.total_hours += r.total_hours;
      day.total_salary += salary;
      day.course_details.push({
        course_type: r.course_type,
        course_name: getCourseName(r.course_type),
        student_count: r.student_count,
        session_count: r.session_count,
        total_hours: Math.round(r.total_hours * 100) / 100,
        hourly_rate: rate,
        salary,
      });
    });

    // 添加无考勤但有排班的日期
    dailySchedules.forEach((s) => {
      if (!dayMap.has(s.schedule_date)) {
        dayMap.set(s.schedule_date, {
          work_date: s.schedule_date,
          student_count: 0,
          session_count: 0,
          class_count: s.class_count,
          total_hours: 0,
          total_salary: 0,
          course_details: [],
        });
      }
    });

    const dailyList = Array.from(dayMap.values())
      .sort((a, b) => a.work_date.localeCompare(b.work_date))
      .map((d) => ({
        ...d,
        total_hours: Math.round(d.total_hours * 100) / 100,
        total_salary: Math.round(d.total_salary * 100) / 100,
      }));

    // 汇总统计
    const totals = dailyList.reduce(
      (acc, d) => ({
        student_count: acc.student_count + d.student_count,
        session_count: acc.session_count + d.session_count,
        class_count: acc.class_count + d.class_count,
        total_hours: acc.total_hours + d.total_hours,
        total_salary: acc.total_salary + d.total_salary,
        work_days: acc.work_days + (d.total_hours > 0 ? 1 : 0),
      }),
      { student_count: 0, session_count: 0, class_count: 0, total_hours: 0, total_salary: 0, work_days: 0 }
    );
    totals.total_hours = Math.round(totals.total_hours * 100) / 100;
    totals.total_salary = Math.round(totals.total_salary * 100) / 100;

    const baseSalary = totals.total_salary;
    const deductionRate = abcGradeInfo.deduction_rate;
    const performanceDeduction = Math.round(baseSalary * deductionRate * 100) / 100;
    const finalSalary = Math.round((baseSalary - performanceDeduction) * 100) / 100;

    // 分科目汇总
    const courseAgg = new Map<string, any>();
    dailyRecords.forEach((r) => {
      const rate = ratesMap[r.course_type] ?? getDefaultHourlyRate(r.course_type);
      const salary = Math.round(r.total_hours * rate * 100) / 100;
      if (!courseAgg.has(r.course_type)) {
        courseAgg.set(r.course_type, {
          course_type: r.course_type,
          course_name: getCourseName(r.course_type),
          student_count: 0,
          session_count: 0,
          total_hours: 0,
          hourly_rate: rate,
          salary: 0,
        });
      }
      const c = courseAgg.get(r.course_type);
      c.student_count += r.student_count;
      c.session_count += r.session_count;
      c.total_hours += r.total_hours;
      c.salary += salary;
    });
    const courseSummary = Array.from(courseAgg.values()).map((c) => ({
      ...c,
      total_hours: Math.round(c.total_hours * 100) / 100,
      salary: Math.round(c.salary * 100) / 100,
    }));

    res.json({
      success: true,
      data: {
        start_date: finalStart,
        end_date: finalEnd,
        period_type: detectPeriodType(finalStart, finalEnd),
        performance: performance ? {
          id: performance.id,
          period_type: performance.period_type,
          composite_score: compositeScore,
          grade: performance.grade,
          abc_grade: abcGradeInfo.grade,
          ranking: performance.ranking,
          period_start: performance.period_start,
          period_end: performance.period_end,
        } : null,
        abc_grade: abcGradeInfo.grade,
        salary_deduction_rate: deductionRate,
        summary: {
          ...totals,
          base_salary: baseSalary,
          performance_deduction: performanceDeduction,
          final_salary: finalSalary,
          total_salary: finalSalary,
        },
        course_summary: courseSummary,
        daily_list: dailyList,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取薪资报表失败' });
  }
});

// 获取所有教练的今日概览
router.get('/overview/today', authMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = formatDateOnly(new Date());

    const coaches = queryAll(
      `SELECT u.id, u.name, u.phone 
       FROM users u 
       WHERE u.role = 'coach' 
       ORDER BY u.name`
    );

    const result = [];
    for (const coach of coaches) {
      const att = queryOne(
        `SELECT 
          COUNT(DISTINCT a.student_id) as student_count,
          COALESCE(SUM(a.duration_hours), 0) as total_hours,
          COUNT(a.id) as session_count
         FROM attendance a 
         WHERE a.coach_id = ? 
           AND substr(a.check_in_time, 1, 10) = ? 
           AND a.status = 'completed'`,
        [coach.id, today]
      );
      const sched = queryOne(
        `SELECT COUNT(*) as class_count
         FROM schedules s 
         WHERE s.coach_id = ? 
           AND s.schedule_date = ? 
           AND s.status != 'cancelled'`,
        [coach.id, today]
      );
      const rateResult = queryAll(
        `SELECT chr.course_type, chr.hourly_rate 
         FROM coach_hourly_rates chr
         WHERE chr.coach_id = ? AND chr.effective_date <= ?
         ORDER BY chr.course_type, chr.effective_date DESC`,
        [coach.id, today]
      );
      const ratesMap: Record<string, number> = {};
      rateResult.forEach((r) => {
        if (!ratesMap[r.course_type]) ratesMap[r.course_type] = r.hourly_rate;
      });
      const byCourse = queryAll(
        `SELECT a.course_type, COALESCE(SUM(a.duration_hours), 0) as total_hours
         FROM attendance a 
         WHERE a.coach_id = ? 
           AND substr(a.check_in_time, 1, 10) = ? 
           AND a.status = 'completed'
         GROUP BY a.course_type`,
        [coach.id, today]
      );
      let salary = 0;
      byCourse.forEach((c) => {
        const rate = ratesMap[c.course_type] ?? getDefaultHourlyRate(c.course_type);
        salary += c.total_hours * rate;
      });

      result.push({
        coach_id: coach.id,
        coach_name: coach.name,
        phone: coach.phone,
        student_count: att?.student_count || 0,
        session_count: att?.session_count || 0,
        class_count: sched?.class_count || 0,
        total_hours: Math.round((att?.total_hours || 0) * 100) / 100,
        today_salary: Math.round(salary * 100) / 100,
      });
    }

    res.json({ success: true, data: { date: today, list: result } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取今日概览失败' });
  }
});

export default router;
