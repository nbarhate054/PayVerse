const API_BASE = 'http://localhost:5000/api';

async function testLiveData() {
  console.log('--- Testing PayVerse Live Backend Data Flow ---');

  const randomId = Math.floor(100000 + Math.random() * 900000);
  const email = `testuser_${randomId}@gmail.com`;
  const phone = `98${randomId}10`;

  // 1. Register User
  console.log(`1. Registering live user ${email} (${phone})...`);
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Live User', email, phone, password: 'password123' })
  });
  const regData = await regRes.json();
  console.log('Register Response:', regData);

  const token = regData.token;
  if (!token) {
    console.error('Registration failed: no token returned.');
    return;
  }

  // 2. Add Money to Live Wallet
  console.log('\n2. Adding ₹2,500 live funds to wallet (/api/wallet/add-money)...');
  const addRes = await fetch(`${API_BASE}/wallet/add-money`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ amount: 2500 })
  });
  const addData = await addRes.json();
  console.log('Add Money Response:', addData);

  // 3. Fetch Live Wallet Balance (/api/wallet/balance)
  console.log('\n3. Fetching live wallet balance (/api/wallet/balance)...');
  const balRes = await fetch(`${API_BASE}/wallet/balance`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const balData = await balRes.json();
  console.log('Wallet Balance Response:', balData);

  // 4. Fetch Transaction History (/api/transactions/history)
  console.log('\n4. Fetching live transaction history (/api/transactions/history)...');
  const txRes = await fetch(`${API_BASE}/transactions/history`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const txData = await txRes.json();
  console.log('Transaction History Response:', txData);

  if (balData.success && balData.balance === 3500 && txData.transactions && txData.transactions.length === 1) {
    console.log('\n✅ Live MongoDB Atlas Backend Data Integration Verified Successfully!');
  } else {
    console.error('\n❌ Live Data Integration Verification Failed!');
  }
}

testLiveData().catch(console.error);
