const API_BASE = 'http://localhost:5000/api';

async function testAddMoney() {
  console.log('--- Testing Add Money Backend Endpoints ---');

  // Test /api/wallet/add with dummy token
  const addRes = await fetch(`${API_BASE}/wallet/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer demo_token_1234'
    },
    body: JSON.stringify({ amount: 500, paymentMethod: 'UPI' })
  });

  const addData = await addRes.json();
  console.log('Add Money Response:', addData);

  if (addData.success) {
    console.log('\n✅ Add Money Endpoint Test Passed!');
  } else {
    console.log('\nResponse received:', addData);
  }
}

testAddMoney().catch(console.error);
