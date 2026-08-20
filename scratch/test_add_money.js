async function testAddMoney() {
  const API_BASE = 'http://localhost:5000/api';
  console.log('--- Testing Add Money Endpoint ---');

  // Register
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Charlie Pay',
      email: `charlie_${Date.now()}@payverse.com`,
      phone: `900${Math.floor(1000000 + Math.random() * 9000000)}`,
      password: 'secretpassword123',
      payverseId: `charlie_${Date.now()}@payverse`
    })
  });
  const regData = await regRes.json();
  const token = regData.token;

  // Add Money 500
  const addRes = await fetch(`${API_BASE}/wallet/add-money`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ amount: 500 })
  });
  const addData = await addRes.json();
  console.log('Add Money Result:', addData);
}

testAddMoney().catch(console.error);
