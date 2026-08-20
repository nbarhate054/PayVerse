const API_BASE = 'http://localhost:5000/api';

async function testTxHistoryFlow() {
  console.log('--- Testing End-to-End Transaction History Flow ---');

  const randomPhone = `9${Math.floor(100000009 + Math.random() * 899999999)}`;
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Tx Test User',
      email: `txtest_${Date.now()}@payverse.com`,
      phone: randomPhone,
      password: '1234',
      payverseId: `txtest_${Date.now()}@payverse`
    })
  });
  const regData = await regRes.json();
  const token = regData.token;
  console.log('Registered User Token:', token ? 'Valid Token Received' : 'No Token');

  // 1. Add Money
  console.log('1. Adding Money...');
  const addRes = await fetch(`${API_BASE}/wallet/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ amount: 2000, paymentMethod: 'UPI' })
  });
  const addData = await addRes.json();
  console.log('Add Money Result:', addData.success ? 'Success' : addData);

  // 2. Fetch Transactions via GET /api/transactions
  console.log('2. Fetching GET /api/transactions...');
  const txRes = await fetch(`${API_BASE}/transactions`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const txData = await txRes.json();
  console.log('Transactions Count:', txData.count);
  console.log('Transactions List:', txData.transactions);

  if (txData.success && txData.transactions && txData.transactions.length > 0) {
    console.log('\n✅ Transaction Saved & Retrieved Successfully from MongoDB Atlas DB!');
  } else {
    throw new Error('Transaction retrieval failed: ' + JSON.stringify(txData));
  }
}

testTxHistoryFlow().catch(console.error);
