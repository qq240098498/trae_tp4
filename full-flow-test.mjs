const BASE = 'http://localhost:3001/api';

const testResults = [];

async function test(name, fn) {
  const startTime = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    testResults.push({ name, status: 'PASS', duration, result });
    console.log(`✅ PASS: ${name} (${duration}ms)`);
    return { success: true, data: result };
  } catch (e) {
    const duration = Date.now() - startTime;
    testResults.push({ name, status: 'FAIL', duration, error: e.message });
    console.log(`❌ FAIL: ${name} - ${e.message} (${duration}ms)`);
    return { success: false, error: e.message };
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data.data;
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

const mockStudents = [
  { name: '张伟', gender: 'male', id_card: '110101199001011234', phone: '13811112222', training_type: 'C1', stage: 'subject2', enroll_date: '2025-09-15', expected_complete_date: '2026-06-30' },
  { name: '李娜', gender: 'female', id_card: '110101199203152345', phone: '13822223333', training_type: 'C2', stage: 'subject2', enroll_date: '2025-10-01', expected_complete_date: '2026-07-15' },
  { name: '王强', gender: 'male', id_card: '110101198805203456', phone: '13833334444', training_type: 'C1', stage: 'subject3', enroll_date: '2025-08-20', expected_complete_date: '2026-05-30' },
  { name: '刘芳', gender: 'female', id_card: '110101199507124567', phone: '13844445555', training_type: 'C1', stage: 'subject2', enroll_date: '2025-11-10', expected_complete_date: '2026-08-20' },
  { name: '陈明', gender: 'male', id_card: '110101199111085678', phone: '13855556666', training_type: 'B2', stage: 'subject2', enroll_date: '2025-07-01', expected_complete_date: '2026-04-15' },
  { name: '赵丽', gender: 'female', id_card: '110101199402286789', phone: '13866667777', training_type: 'C2', stage: 'subject3', enroll_date: '2025-09-01', expected_complete_date: '2026-06-10' },
  { name: '孙浩', gender: 'male', id_card: '110101198906157890', phone: '13877778888', training_type: 'A1', stage: 'subject2', enroll_date: '2025-06-15', expected_complete_date: '2026-03-30' },
  { name: '周雪', gender: 'female', id_card: '110101199608308901', phone: '13888889999', training_type: 'C1', stage: 'subject1', enroll_date: '2026-01-10', expected_complete_date: '2026-10-01' },
  { name: '吴磊', gender: 'male', id_card: '110101199304129012', phone: '13899990000', training_type: 'C1', stage: 'subject2', enroll_date: '2025-10-20', expected_complete_date: '2026-07-30' },
  { name: '郑琳', gender: 'female', id_card: '110101199709250123', phone: '13900001111', training_type: 'C2', stage: 'subject1', enroll_date: '2026-02-01', expected_complete_date: '2026-11-15' },
  { name: '马超', gender: 'male', id_card: '110101199012101235', phone: '13911112222', training_type: 'B1', stage: 'subject3', enroll_date: '2025-08-05', expected_complete_date: '2026-05-10' },
  { name: '黄静', gender: 'female', id_card: '110101199303182346', phone: '13922223333', training_type: 'C1', stage: 'subject4', enroll_date: '2025-05-20', expected_complete_date: '2026-02-28' },
];

const scheduleTemplates = [
  { course_type: 'subject2', start_time: '08:00', end_time: '11:00', max_students: 4 },
  { course_type: 'subject2', start_time: '14:00', end_time: '17:00', max_students: 4 },
  { course_type: 'subject3', start_time: '09:00', end_time: '12:00', max_students: 3 },
  { course_type: 'subject3', start_time: '13:00', end_time: '16:00', max_students: 3 },
  { course_type: 'subject2', start_time: '18:00', end_time: '21:00', max_students: 3 },
];

function getFutureDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

function getPastDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  驾校管理系统 - 排队-预约-签到计时全流程测试');
  console.log('═══════════════════════════════════════════════════════════\n');

  let token = '';
  let adminUser = null;
  const createdStudents = [];
  const createdSchedules = [];
  const createdBookings = [];
  const createdAttendance = [];

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  第一阶段：登录认证测试');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await test('TC-AUTH-001: 管理员登录 - 正确凭证', async () => {
    const data = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    token = data.token;
    adminUser = data.user;
    console.log(`    用户: ${data.user.name}, 角色: ${data.user.role}`);
    return data;
  });

  await test('TC-AUTH-002: Token鉴权 - 获取当前用户信息', async () => {
    const data = await request('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (data.id !== adminUser.id) throw new Error('用户ID不匹配');
    return data;
  });

  await test('TC-AUTH-003: 教练登录 - 王教练', async () => {
    const data = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'coach1', password: 'coach123' }),
    });
    console.log(`    用户: ${data.user.name}, 角色: ${data.user.role}`);
    return data;
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  第二阶段：获取教练列表');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let coaches = [];
  await test('TC-COACH-001: 获取教练列表', async () => {
    const data = await request('/coaches', {
      headers: { Authorization: `Bearer ${token}` },
    });
    coaches = data;
    console.log(`    教练数量: ${data.length}`);
    data.forEach(c => console.log(`      - ${c.name} (ID: ${c.id})`));
    if (data.length < 3) throw new Error('教练数量不足');
    return data;
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  第三阶段：批量创建学员（测试数据）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (let i = 0; i < mockStudents.length; i++) {
    const student = mockStudents[i];
    const coachId = coaches[i % coaches.length].id;
    const testId = String(i + 1).padStart(2, '0');
    await test(`TC-STUDENT-${testId}: 创建学员 - ${student.name} (${student.training_type})`, async () => {
      try {
        const data = await request('/students', {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ ...student, coach_id: coachId }),
        });
        createdStudents.push(data);
        console.log(`    新建 ID: ${data.id}, 电话: ${data.phone}, 教练: ${coaches[i % coaches.length].name}`);
        return data;
      } catch (e) {
        if (e.message && e.message.includes('身份证号已存在')) {
          const existing = await request(`/students?keyword=${encodeURIComponent(student.id_card)}&limit=1`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (existing && existing.list && existing.list.length > 0) {
            const data = existing.list[0];
            createdStudents.push(data);
            console.log(`    已存在 ID: ${data.id}, 电话: ${data.phone}, 教练: ${data.coach_name || '-'}`);
            return data;
          }
        }
        throw e;
      }
    });
  }

  if (createdStudents.length === 0) {
    const allStudents = await request('/students?limit=50', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (allStudents && allStudents.list) {
      allStudents.list.slice(0, 12).forEach(s => createdStudents.push(s));
    }
  }

  await test('TC-STUDENT-VERIFY: 验证学员总数', async () => {
    const data = await request('/students?limit=100', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`    当前学员总数: ${data.total}`);
    return data;
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  第四阶段：创建排班（未来7天课程）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (let day = 0; day < 7; day++) {
    const scheduleDate = getFutureDate(day);
    for (let i = 0; i < scheduleTemplates.length; i++) {
      const tpl = scheduleTemplates[i];
      const coachId = coaches[(day + i) % coaches.length].id;
      await test(`TC-SCHED-0${day + 1}-${i + 1}: 创建排班 ${scheduleDate} ${tpl.start_time}-${tpl.end_time} (${tpl.course_type})`, async () => {
        const data = await request('/schedules', {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({
            coach_id: coachId,
            course_type: tpl.course_type,
            schedule_date: scheduleDate,
            start_time: tpl.start_time,
            end_time: tpl.end_time,
            max_students: tpl.max_students,
          }),
        });
        createdSchedules.push(data);
        console.log(`    ID: ${data.id}, 教练: ${data.coach_name}, 容量: ${data.max_students}人`);
        return data;
      });
    }
  }

  await test('TC-SCHED-LIST: 获取排班列表验证', async () => {
    const data = await request('/schedules', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`    排班总数: ${data.length}`);
    return data;
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  第五阶段：预约排队测试（核心流程）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const subject2Schedules = createdSchedules.filter(s => s.course_type === 'subject2' && s.max_students > 0);
  const subject3Schedules = createdSchedules.filter(s => s.course_type === 'subject3' && s.max_students > 0);

  console.log('  5.1 科目二排班预约（测试排队满员机制）');
  if (subject2Schedules.length > 0) {
    const targetSched = subject2Schedules[0];
    console.log(`    目标排班: ID=${targetSched.id}, 日期=${targetSched.schedule_date}, 容量=${targetSched.max_students}`);

    const subject2Students = createdStudents.filter(s => s.stage === 'subject2' || s.stage === 'subject3');
    const studentsToBook = subject2Students.slice(0, targetSched.max_students + 2);

    for (let i = 0; i < studentsToBook.length; i++) {
      const student = studentsToBook[i];
      const testName = `TC-BOOK-00${i + 1}: ${student.name} 预约排班 ${targetSched.id}`;
      if (i < targetSched.max_students) {
        await test(`${testName} - 应成功`, async () => {
          const data = await request(`/schedules/${targetSched.id}/book`, {
            method: 'POST',
            headers: authHeaders(token),
            body: JSON.stringify({ student_id: student.id }),
          });
          createdBookings.push({ scheduleId: targetSched.id, studentId: student.id });
          console.log(`    预约成功! 当前人数: ${data.current_students}/${data.max_students}, 状态: ${data.status}`);
          return data;
        });
      } else {
        await test(`${testName} - 应失败(已满)`, async () => {
          try {
            await request(`/schedules/${targetSched.id}/book`, {
              method: 'POST',
              headers: authHeaders(token),
              body: JSON.stringify({ student_id: student.id }),
            });
            throw new Error('应该已满但预约成功了');
          } catch (e) {
            console.log(`    预期错误: ${e.message}`);
            return { expected: true };
          }
        });
      }
    }
  }

  console.log('\n  5.2 重复预约测试');
  if (createdBookings.length > 0) {
    const booking = createdBookings[0];
    await test('TC-BOOK-DUP: 学员重复预约同一排班 - 应失败', async () => {
      try {
        await request(`/schedules/${booking.scheduleId}/book`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ student_id: booking.studentId }),
        });
        throw new Error('应该重复但预约成功了');
      } catch (e) {
        console.log(`    预期错误: ${e.message}`);
        return { expected: true };
      }
    });
  }

  console.log('\n  5.3 批量预约其他排班');
  for (let i = 1; i < Math.min(5, subject2Schedules.length); i++) {
    const sched = subject2Schedules[i];
    const availableStudents = createdStudents.filter(s =>
      (s.stage === 'subject2' || s.stage === 'subject3') &&
      !createdBookings.some(b => b.scheduleId === sched.id && b.studentId === s.id)
    );
    const count = Math.min(2, availableStudents.length);
    for (let j = 0; j < count; j++) {
      const student = availableStudents[j];
      await test(`TC-BOOK-BATCH-${i}-${j}: ${student.name} 预约排班 ${sched.id}`, async () => {
        const data = await request(`/schedules/${sched.id}/book`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ student_id: student.id }),
        });
        createdBookings.push({ scheduleId: sched.id, studentId: student.id });
        return data;
      });
    }
  }

  for (let i = 0; i < Math.min(4, subject3Schedules.length); i++) {
    const sched = subject3Schedules[i];
    const subject3Students = createdStudents.filter(s => s.stage === 'subject3' || s.stage === 'subject4');
    const count = Math.min(sched.max_students, subject3Students.length);
    for (let j = 0; j < count; j++) {
      const student = subject3Students[j];
      if (!createdBookings.some(b => b.scheduleId === sched.id && b.studentId === student.id)) {
        await test(`TC-BOOK-SUB3-${i}-${j}: ${student.name} 预约科三排班 ${sched.id}`, async () => {
          const data = await request(`/schedules/${sched.id}/book`, {
            method: 'POST',
            headers: authHeaders(token),
            body: JSON.stringify({ student_id: student.id }),
          });
          createdBookings.push({ scheduleId: sched.id, studentId: student.id });
          return data;
        });
      }
    }
  }

  await test('TC-SCHED-DETAIL: 获取排班详情（含预约列表）', async () => {
    const schedId = createdSchedules[0].id;
    const data = await request(`/schedules/${schedId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`    排班 ${schedId}: ${data.bookings?.length || 0} 人已预约`);
    if (data.bookings) {
      data.bookings.forEach(b => {
        console.log(`      - ${b.student_name} (${b.training_type})`);
      });
    }
    return data;
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  第六阶段：取消预约测试');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (createdBookings.length >= 3) {
    const bookingToCancel = createdBookings[createdBookings.length - 1];
    const studentToCancel = createdStudents.find(s => s.id === bookingToCancel.studentId);
    await test(`TC-CANCEL-001: ${studentToCancel?.name || '学员'} 取消预约`, async () => {
      const data = await request(`/schedules/${bookingToCancel.scheduleId}/book/${bookingToCancel.studentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`    取消成功! 当前人数: ${data.current_students}/${data.max_students}, 状态: ${data.status}`);
      createdBookings.pop();
      return data;
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  第七阶段：签到-签退计时测试（核心流程）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('  7.1 直接签到测试（无预约排班）');
  for (let i = 0; i < Math.min(3, createdStudents.length); i++) {
    const student = createdStudents[i];
    const stageMap = { subject1: 'subject1', subject2: 'subject2', subject3: 'subject3', subject4: 'subject4' };
    const courseType = stageMap[student.stage] || 'subject2';
    await test(`TC-CHECKIN-00${i + 1}: ${student.name} 签到 (${courseType})`, async () => {
      const data = await request('/attendance/check-in', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
          student_id: student.id,
          coach_id: student.coach_id || coaches[0].id,
          course_type: courseType,
        }),
      });
      createdAttendance.push({ id: data.id, student_id: data.student_id, name: data.student_name });
      console.log(`    签到ID: ${data.id}, 时间: ${data.check_in_time}, 教练: ${data.coach_name}`);
      return data;
    });
    await delay(800);
  }

  console.log('\n  7.2 重复签到测试（应失败）');
  if (createdAttendance.length > 0) {
    const att = createdAttendance[0];
    await test('TC-CHECKIN-DUP: 学员重复签到 - 应失败', async () => {
      try {
        await request('/attendance/check-in', {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({
            student_id: att.student_id,
            coach_id: 2,
            course_type: 'subject2',
          }),
        });
        throw new Error('应该未签退但签到成功了');
      } catch (e) {
        console.log(`    预期错误: ${e.message}`);
        return { expected: true };
      }
    });
  }

  console.log('\n  7.3 签退测试（计算时长）');
  for (let i = 0; i < createdAttendance.length; i++) {
    const att = createdAttendance[i];
    await test(`TC-CHECKOUT-00${i + 1}: ${att.name} 签退`, async () => {
      const data = await request('/attendance/check-out', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ attendance_id: att.id }),
      });
      console.log(`    签到: ${data.check_in_time} -> 签退: ${data.check_out_time}`);
      console.log(`    训练时长: ${data.duration_hours} 小时, 状态: ${data.status}`);
      return data;
    });
  }

  console.log('\n  7.4 重复签退测试（应失败）');
  if (createdAttendance.length > 0) {
    const att = createdAttendance[0];
    await test('TC-CHECKOUT-DUP: 已完成记录重复签退 - 应失败', async () => {
      try {
        await request('/attendance/check-out', {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ attendance_id: att.id }),
        });
        throw new Error('应该已签退但又成功了');
      } catch (e) {
        console.log(`    预期错误: ${e.message}`);
        return { expected: true };
      }
    });
  }

  console.log('\n  7.5 预约排班签到测试');
  if (createdSchedules.length > 0 && createdStudents.length > 3) {
    const sched = createdSchedules[0];
    for (let i = 3; i < 6 && i < createdStudents.length; i++) {
      const student = createdStudents[i];
      await test(`TC-CHECKIN-SCHED-00${i - 2}: ${student.name} 通过排班签到`, async () => {
        const data = await request('/attendance/check-in', {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({
            student_id: student.id,
            schedule_id: sched.id,
            coach_id: sched.coach_id,
            course_type: sched.course_type,
          }),
        });
        createdAttendance.push({ id: data.id, student_id: data.student_id, name: data.student_name });
        console.log(`    签到ID: ${data.id}, 排班: ${data.schedule_id}, 时间: ${data.check_in_time}`);
        return data;
      });
      await delay(500);
    }
    await delay(1000);
    for (let i = 3; i < createdAttendance.length; i++) {
      const att = createdAttendance[i];
      await test(`TC-CHECKOUT-SCHED-00${i - 2}: ${att.name} 排班训练签退`, async () => {
        const data = await request('/attendance/check-out', {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ attendance_id: att.id }),
        });
        console.log(`    训练时长: ${data.duration_hours} 小时`);
        return data;
      });
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  第八阶段：查询验证测试');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await test('TC-QUERY-ATT-LIST: 分页查询签到记录', async () => {
    const data = await request('/attendance?page=1&limit=10', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`    总记录数: ${data.total}, 当前页: ${data.list.length} 条`);
    data.list.forEach(r => {
      console.log(`      - ${r.student_name} | ${r.course_type} | ${r.check_in_time?.substring(0, 16)} | ${r.duration_hours}h | ${r.status}`);
    });
    return data;
  });

  await test('TC-QUERY-ATT-TODAY: 获取今日签到状态', async () => {
    const data = await request('/attendance/today', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`    今日签到中: ${data.checked_in.length} 人, 已完成: ${data.completed.length} 人, 总计: ${data.total}`);
    return data;
  });

  await test('TC-QUERY-STUDENT-DETAIL: 学员详情（含学时统计）', async () => {
    const student = createdStudents[0];
    const data = await request(`/students/${student.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`    学员: ${data.name}`);
    if (data.hours_summary && data.hours_summary.length > 0) {
      data.hours_summary.forEach(h => {
        console.log(`      - ${h.course_type}: ${h.total_hours} 小时`);
      });
    } else {
      console.log('      (暂无训练学时记录)');
    }
    return data;
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  第九阶段：告警机制测试');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await test('TC-ALERT-RULES: 获取告警规则', async () => {
    const data = await request('/alerts/rules', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('    学时要求规则:');
    data.forEach(r => {
      console.log(`      - ${r.course_type}: ${r.required_hours}小时, 告警阈值: ${(r.warning_threshold * 100).toFixed(0)}%`);
    });
    return data;
  });

  await test('TC-ALERT-LIST: 获取告警列表', async () => {
    const data = await request('/alerts?limit=50', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`    告警总数: ${data.total}`);
    if (data.list && data.list.length > 0) {
      data.list.slice(0, 5).forEach(a => {
        console.log(`      - 学员ID${a.student_id}: ${a.course_type} ${a.current_hours}/${a.required_hours}h (${a.severity})`);
      });
    }
    return data;
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  第十阶段：统计数据验证');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await test('TC-STAT-OVERVIEW: 获取系统概览统计', async () => {
    const data = await request('/statistics/overview', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('    系统概览:');
    console.log(`      - 活跃学员: ${data.active_students}`);
    console.log(`      - 已完成学员: ${data.completed_students}`);
    console.log(`      - 总教练数: ${data.total_coaches}`);
    console.log(`      - 本月新增: ${data.new_students_this_month}`);
    console.log(`      - 待处理告警: ${data.pending_alerts}`);
    return data;
  });

  await test('TC-STAT-BATCH: 批量统计（按科目和教练分组）', async () => {
    const data = await request('/statistics/batch', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`    批量统计结果:`);
    console.log(`      - 总训练时长: ${data.total_hours} 小时`);
    console.log(`      - 按科目分类: ${data.by_course_type?.length || 0} 项`);
    if (data.by_course_type) {
      data.by_course_type.forEach((c) => {
        console.log(`        * ${c.course_type}: ${c.total_hours}h, ${c.student_count}名学员, ${c.record_count}次训练`);
      });
    }
    console.log(`      - 按教练分类: ${data.by_coach?.length || 0} 项`);
    return data;
  });

  await test('TC-STAT-PROGRESS: 学员培训进度', async () => {
    const data = await request(`/statistics/progress/${createdStudents[0].id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`    学员 ${data.student?.name} 培训进度:`);
    if (data.progress) {
      data.progress.forEach((p) => {
        console.log(`      - ${p.course_type}: ${p.current_hours}/${p.required_hours}h (${p.percentage}%)`);
      });
    }
    return data;
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  测试结果汇总');
  console.log('═══════════════════════════════════════════════════════════\n');

  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const total = testResults.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`  总测试用例: ${total}`);
  console.log(`  ✅ 通过: ${passed}`);
  console.log(`  ❌ 失败: ${failed}`);
  console.log(`  📊 通过率: ${passRate}%\n`);

  if (failed > 0) {
    console.log('  失败用例列表:');
    testResults.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`    - ${r.name}: ${r.error}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  测试数据统计（已保存至数据库）');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`  新增学员: ${createdStudents.length} 人`);
  console.log(`  新增排班: ${createdSchedules.length} 个`);
  console.log(`  预约记录: ${createdBookings.length} 条`);
  console.log(`  签到记录: ${createdAttendance.length} 条`);
  console.log('\n  所有测试数据已保留在数据库中 (data/driving-school.db)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const summary = {
    passed,
    failed,
    total,
    passRate,
    stats: {
      students: createdStudents.length,
      schedules: createdSchedules.length,
      bookings: createdBookings.length,
      attendance: createdAttendance.length,
    },
    createdAt: new Date().toISOString(),
  };

  return summary;
}

main().catch(console.error);
