const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Testing PayVerse Backend API Endpoints ---');

  // 1. Healthcheck
  const healthRes = await fetch(`${API_BASE}/health`);
  const healthData = await healthRes.json();
  console.log('1. Health Check:', healthData);

  // 2. Register Test User 1
  const user1Email = `user1_${Date.now()}@payverse.com`;
  const reg1Res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Pay',
      email: user1Email,
      phone: `900${Math.floor(1000000 + Math.random() * 9000000)}`,
      password: 'secretpassword123',
      payverseId: `alice_${Date.now()}@payverse`
    })
  });
  const reg1Data = await reg1Res.json();
  console.log('2. Register User 1:', reg1Data.success ? 'Success ✅' : reg1Data);
  const token1 = reg1Data.token;
  const alicePayverseId = reg1Data.user?.payverseId;

  // 3. Register Test User 2
  const user2Email = `user2_${Date.now()}@payverse.com`;
  const reg2Res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bob Pay',
      email: user2Email,
      phone: `900${Math.floor(1000000 + Math.random() * 9000000)}`,
      password: 'secretpassword123',
      payverseId: `bob_${Date.now()}@payverse`
    })
  });
  const reg2Data = await reg2Res.json();
  console.log('3. Register User 2:', reg2Data.success ? 'Success ✅' : reg2Data);
  const bobPayverseId = reg2Data.user?.payverseId;

  // 4. Fetch User 1 Balance
  const balRes = await fetch(`${API_BASE}/wallet/balance`, {
    headers: { 'Authorization': `Bearer ${token1}` }
  });
  const balData = await balRes.json();
  console.log('4. Fetch Balance User 1:', balData);

  // 5. Transfer Money from User 1 to User 2
  const transferRes = await fetch(`${API_BASE}/wallet/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token1}`
    },
    body: JSON.stringify({
      receiverPayverseId: bobPayverseId,
      amount: 250
    })
  });
  const transferData = await transferRes.json();
  console.log('5. Money Transfer (250 INR):', transferData);

  // 6. Fetch Transaction History User 1
  const historyRes = await fetch(`${API_BASE}/transactions/history`, {
    headers: { 'Authorization': `Bearer ${token1}` }
  });
  const historyData = await historyRes.json();
  console.log('6. Transaction History Count:', historyData.count, historyData.success ? '✅' : '❌');

  console.log('--- All Backend API Tests Completed ---');
}

runTests().catch(console.error);
