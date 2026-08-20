const API_BASE = 'http://localhost:5000/api';

async function testOtpFlow() {
  console.log('--- Testing PayVerse Demo OTP Backend Endpoints ---');

  const testPhone = '9876543210';

  // 1. Send OTP
  console.log(`1. Sending OTP to ${testPhone}...`);
  const sendRes = await fetch(`${API_BASE}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone })
  });
  const sendData = await sendRes.json();
  console.log('Send OTP Response:', sendData);

  const otp = sendData.simulatedOtp;

  // 2. Verify with Invalid OTP
  console.log('\n2. Testing verification with invalid OTP "0000"...');
  const invalidRes = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone, otp: '0000' })
  });
  const invalidData = await invalidRes.json();
  console.log('Invalid OTP Response:', invalidData);

  // 3. Verify with Correct Generated OTP
  console.log(`\n3. Testing verification with correct generated OTP "${otp}"...`);
  const validRes = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone, otp })
  });
  const validData = await validRes.json();
  console.log('Valid OTP Response:', validData);

  if (validData.success && validData.verified) {
    console.log('\n✅ Demo OTP Flow Verification Passed!');
  } else {
    console.error('\n❌ Demo OTP Flow Verification Failed!');
  }
}

testOtpFlow().catch(console.error);
