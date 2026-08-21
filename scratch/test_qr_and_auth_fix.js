const BASE_URL = 'http://localhost:5000/api';

async function testQrAndAuthFix() {
  console.log('=== STARTING PHONE NORMALIZATION & AUTH FIX TEST ===\n');

  // 1. Health check
  try {
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    console.log('Backend Health Status:', healthData);
  } catch (err) {
    console.error('Backend health check failed:', err.message);
    process.exit(1);
  }

  // 2. Register user with exact custom name and formatted phone (+91 91234 56789)
  const rawPhone = '+91 91234 56789';
  const customName = 'Rohan Sharma';
  console.log(`\n--- 1. Testing Registration with name "${customName}" and phone "${rawPhone}" ---`);
  
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: customName,
      email: `rohan_${Date.now()}@test.com`,
      phone: rawPhone,
      password: '1234',
      pin: '1234'
    })
  });
  const regData = await regRes.json();
  console.log('Registration Status:', regRes.status);
  console.log('Registration User Payload:', JSON.stringify(regData.user, null, 2));

  if (!regData.success || !regData.user || regData.user.name !== customName || regData.user.phone !== '9123456789') {
    console.error('❌ Registration phone normalization or name preservation failed!');
    process.exit(1);
  }
  console.log('✅ Exact user name preserved and phone normalized to 10 digits!');

  // 3. Test login with formatted phone "+91 91234 56789"
  console.log(`\n--- 2. Testing Login with formatted phone "${rawPhone}" ---`);
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: rawPhone,
      password: '1234'
    })
  });
  const loginData = await loginRes.json();
  console.log('Login Status:', loginRes.status);
  console.log('Login User Payload:', JSON.stringify(loginData.user, null, 2));

  if (!loginData.success || !loginData.user || loginData.user.name !== customName || loginData.user.phone !== '9123456789') {
    console.error('❌ Login phone normalization or user payload failed!');
    process.exit(1);
  }
  console.log('✅ Login with formatted phone successfully returned user payload!');

  // 4. Test QR payload JSON generation
  console.log('\n--- 3. Testing QR Code JSON Payload Generation ---');
  const qrObj = {
    payverseId: loginData.user.payverseId,
    phone: loginData.user.phone.replace(/[^0-9]/g, '').slice(-10),
    name: loginData.user.name
  };
  const qrString = JSON.stringify(qrObj);
  console.log('Generated QR JSON String:', qrString);
  const parsedQr = JSON.parse(qrString);

  if (parsedQr.name !== customName || parsedQr.phone !== '9123456789') {
    console.error('❌ QR Payload JSON generation failed!');
    process.exit(1);
  }
  console.log('✅ QR Code JSON payload generated and parsed successfully!');

  console.log('\n=== ALL AUTH & QR FIX TESTS PASSED SUCCESSFULLY! ===');
}

testQrAndAuthFix();
