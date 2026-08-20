const API_BASE = 'http://localhost:5000/api';

async function testRegistrationAndTransferBugfix() {
  console.log('--- Testing Registration and Transfer Bugfix ---');

  // 1. Register Shital Barhate
  const shitalPhone = `98${Math.floor(10000000 + Math.random() * 89999999)}`;
  const reg1Res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Shital Barhate',
      email: `shital_${Date.now()}@payverse.com`,
      phone: shitalPhone,
      password: '1234',
      payverseId: `shitalbarhate_${Date.now()}@payverse`,
      pin: '1234'
    })
  });
  const reg1Data = await reg1Res.json();
  console.log('1. Shital Barhate Registered:', reg1Data.success ? 'Success (Saved to Atlas)' : reg1Data);
  const shitalToken = reg1Data.token;

  // 2. Register Recipient (Rahul Sharma)
  const rahulPhone = `97${Math.floor(10000000 + Math.random() * 89999999)}`;
  const reg2Res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rahul Sharma',
      email: `rahul_${Date.now()}@payverse.com`,
      phone: rahulPhone,
      password: '1234',
      payverseId: `rahul_${Date.now()}@payverse`,
      pin: '1234'
    })
  });
  const reg2Data = await reg2Res.json();
  console.log('2. Rahul Sharma Registered:', reg2Data.success ? 'Success (Saved to Atlas)' : reg2Data);

  // 3. Transfer from Shital to Rahul using payverseId
  console.log('3. Performing Transfer from Shital to Rahul...');
  const transferRes = await fetch(`${API_BASE}/wallet/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${shitalToken}`
    },
    body: JSON.stringify({
      recipient: reg2Data.user.payverseId,
      amount: 250,
      pin: '1234'
    })
  });

  const transferData = await transferRes.json();
  console.log('Transfer Response:', transferData);

  if (transferData.success) {
    console.log('\n✅ Registration and Send Money Controllers Bugfix Verified Successfully!');
  } else {
    throw new Error('Transfer failed: ' + JSON.stringify(transferData));
  }
}

testRegistrationAndTransferBugfix().catch(console.error);
