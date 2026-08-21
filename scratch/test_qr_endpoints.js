const BASE_URL = 'http://localhost:5000/api';

async function testQrEndpoints() {
  console.log('=== STARTING QR FLOW & ENDPOINTS TEST ===\n');

  // 1. Health check
  try {
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    console.log('Backend Health Status:', healthData);
  } catch (err) {
    console.error('Backend health check failed:', err.message);
    process.exit(1);
  }

  // 2. Register user to get valid token
  const testPhone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'QR Tester User',
      email: `qrtester_${testPhone}@test.com`,
      phone: testPhone,
      password: '1234',
      pin: '1234'
    })
  });
  const regData = await regRes.json();
  const token = regData.token;
  console.log('User Reg Status:', regRes.status);
  console.log('Auth Token Obtained:', token ? 'YES' : 'NO');

  // 3. Test GET /api/users/find-user?query=9849043040 (Shital Barhate)
  console.log('\n--- 1. Testing GET /api/users/find-user?query=9849043040 ---');
  const findUserRes = await fetch(`${BASE_URL}/users/find-user?query=9849043040`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  const findUserData = await findUserRes.json();
  console.log('Find-User Response Status:', findUserRes.status);
  console.log('Find-User Payload:', JSON.stringify(findUserData, null, 2));

  if (!findUserData.success || !findUserData.user) {
    console.error('❌ GET /api/users/find-user endpoint failed!');
    process.exit(1);
  }
  console.log('✅ GET /api/users/find-user verified successfully!');

  // 4. Test GET /api/users/find-user?query=shitalbarhate
  console.log('\n--- 2. Testing GET /api/users/find-user?query=shitalbarhate ---');
  const findIdRes = await fetch(`${BASE_URL}/users/find-user?query=shitalbarhate`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  const findIdData = await findIdRes.json();
  console.log('Find-User by PayVerse ID Status:', findIdRes.status);
  console.log('Find-User by PayVerse ID Payload:', JSON.stringify(findIdData, null, 2));

  if (!findIdData.success || !findIdData.user) {
    console.error('❌ GET /api/users/find-user by PayVerse ID failed!');
    process.exit(1);
  }
  console.log('✅ GET /api/users/find-user by PayVerse ID verified successfully!');

  console.log('\n=== ALL QR ENDPOINT TESTS PASSED SUCCESSFULLY! ===');
}

testQrEndpoints();
