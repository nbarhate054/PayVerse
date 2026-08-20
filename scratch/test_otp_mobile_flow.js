const API_BASE = 'http://localhost:5000/api';

async function testOtpMobileFlow() {
  console.log('--- Testing OTP Verification Mobile Sanitize & Verification ---');

  const sendRes = await fetch(`${API_BASE}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543210' })
  });
  const sendData = await sendRes.json();
  console.log('Send OTP Result:', sendData);

  const verifyRes = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543210', otp: '1234' })
  });
  const verifyData = await verifyRes.json();
  console.log('Verify OTP Result:', verifyData);

  if (verifyData.success && verifyData.verified) {
    console.log('\n✅ Mobile OTP Verification Test Passed!');
  } else {
    throw new Error('Mobile OTP Verification failed: ' + JSON.stringify(verifyData));
  }
}

testOtpMobileFlow().catch(console.error);
