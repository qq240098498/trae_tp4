const BASE = 'http://localhost:3001/api';

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
  } catch (e) {
    console.log(`FAIL: ${name}`, e.message);
  }
}

async function main() {
  let token = '';

  await test('POST /auth/login', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '$2a$10$dummyhashadmin' }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    token = data.data.token;
    console.log('  Token:', token.substring(0, 20) + '...');
  });

  await test('GET /auth/me', async () => {
    const res = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    console.log('  User:', data.data.name);
  });

  await test('GET /coaches', async () => {
    const res = await fetch(`${BASE}/coaches`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    console.log('  Coaches:', data.data.length);
  });

  await test('POST /students', async () => {
    const res = await fetch(`${BASE}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: '测试学员', training_type: 'C1', enroll_date: '2024-01-01', phone: '13900001111', coach_id: 2,
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    console.log('  Student ID:', data.data.id);
  });

  await test('GET /students', async () => {
    const res = await fetch(`${BASE}/students`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    console.log('  Total:', data.data.total);
  });

  await test('GET /statistics/overview', async () => {
    const res = await fetch(`${BASE}/statistics/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    console.log('  Active students:', data.data.active_students);
  });

  await test('POST /schedules', async () => {
    const res = await fetch(`${BASE}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        coach_id: 2, course_type: 'subject2', schedule_date: '2024-06-10', start_time: '09:00', end_time: '12:00',
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    console.log('  Schedule ID:', data.data.id);
  });

  await test('POST /attendance/check-in', async () => {
    const res = await fetch(`${BASE}/attendance/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ student_id: 1, coach_id: 2, course_type: 'subject2' }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    console.log('  Attendance ID:', data.data.id);
  });

  await test('GET /alerts/rules', async () => {
    const res = await fetch(`${BASE}/alerts/rules`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    console.log('  Rules:', data.data.length);
  });

  await test('GET /health', async () => {
    const res = await fetch(`${BASE}/health`);
    const data = await res.json();
    if (!data.success) throw new Error('health check failed');
  });

  console.log('\nAll tests completed!');
}

main();
