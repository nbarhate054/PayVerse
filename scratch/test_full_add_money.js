const API_BASE = 'http://localhost:5000/api';

async function testFullAddMoney() {
  console.log('--- Testing Full Add Money Flow ---');

  const randomPhone = `9${Math.floor(100000009 + Math.random() * 899999999)}`;
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test AddMoney User',
      email: `addmoney_${Date.now()}@payverse.com`,
      phone: randomPhone,
      password: '1234',
      payverseId: `addmoney_${Date.now()}@payverse`
    })
  });
  const regData = await regRes.json();
  const token = regData.token;
  console.log('Registered User Token:', token ? 'Valid Token Received' : 'No Token');

  const addRes = await fetch(`${API_BASE}/wallet/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ amount: 1500, paymentMethod: 'UPI' })
  });
  const addData = await addRes.json();
  console.log('Add Money Response:', addData);

  if (addData.success) {
    console.log('\n✅ Add Money Flow Completed Successfully!');
  } else {
    throw new Error('Add Money failed: ' + JSON.stringify(addData));
  }
}

testFullAddMoney().catch(console.error);
