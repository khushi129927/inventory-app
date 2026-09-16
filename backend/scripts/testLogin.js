const http = require('http');

async function runTest(name, testFn) {
  process.stdout.write(`Testing ${name}... `);
  try {
    await testFn();
    console.log('✅ PASS');
  } catch (err) {
    console.log(`❌ FAIL`);
    console.error(`   Error: ${err.message}`);
  }
}

async function test() {
  const BASE_URL = 'http://localhost:3000';
  const ADMIN_USER = 'adminUser';
  const ADMIN_PASS = 'mySecretPassword123';
  const SALES_USER = 'salesUser';
  const SALES_PASS = 'salesPassword123';

  let adminToken = '';

  console.log('🚀 Starting API Auth End-to-End Tests\n');

  // 1. Valid Login
  await runTest('Valid Login', async () => {
    const res = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
    });

    const data = await res.json();
    if (!res.ok || !data.token) throw new Error(`Expected token, got status ${res.status}`);
    adminToken = data.token;
  });

  // 2. Invalid Password
  await runTest('Invalid Password Rejection', async () => {
    const res = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ADMIN_USER, password: 'wrongPassword' }),
    });

    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // 3. Authorized Admin Access
  await runTest('Admin Role Access to /test-admin', async () => {
    const res = await fetch(`${BASE_URL}/api/test-admin`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });

    const data = await res.json();
    if (res.status !== 200 || !data.message.includes('Welcome, Admin!')) {
      throw new Error(`Expected 200 and Welcome message, got ${res.status}`);
    }
  });

  // 4. Unauthorized Sales Access
  await runTest('Sales Role Blocked from /test-admin', async () => {
    // Login as sales user
    const loginRes = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: SALES_USER, password: SALES_PASS }),
    });

    if (!loginRes.ok) {
      throw new Error(`Sales user login failed (Status ${loginRes.status}). Make sure you created the sales user in the DB first.`);
    }

    const loginData = await loginRes.json();
    const salesToken = loginData.token;

    // Try to access admin route
    const adminRes = await fetch(`${BASE_URL}/api/test-admin`, {
      headers: { 'Authorization': `Bearer ${salesToken}` },
    });

    if (adminRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got ${adminRes.status}`);
    }
  });

  console.log('\nTests Completed.');
}

test().catch(console.error);
