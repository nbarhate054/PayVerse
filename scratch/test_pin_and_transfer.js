const API_BASE = 'http://localhost:5000/api';

async function testPinAndTransfer() {
  console.log('--- Testing PIN Verification and Send Money Endpoints ---');

  // 1. Verify PIN Endpoint
  console.log('1. Testing /api/auth/verify-pin...');
  const pinRes = await fetch(`${API_BASE}/auth/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: '1234' })
  });
  const pinData = await pinRes.json();
  console.log('Verify PIN Response:', pinData);

  if (!pinData.success || !pinData.verified) {
    throw new Error('PIN verification test failed');
  }

  console.log('\n✅ PIN Verification Endpoint Test Passed!');
}

testPinAndTransfer().catch(console.error);
