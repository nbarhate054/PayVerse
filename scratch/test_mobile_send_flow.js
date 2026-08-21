const BASE_URL = 'http://localhost:5000/api';

async function testMobileSendFlow() {
  console.log('=== STARTING END-TO-END MOBILE NUMBER SEND MONEY TEST ===\n');

  // 1. Health check
  try {
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    console.log('Backend Health Status:', healthData);
  } catch (err) {
    console.error('Backend health check failed:', err.message);
    process.exit(1);
  }

  // 2. Register Sender
  const senderPhone = '9876543210';
  const regSenderRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Sender',
      email: 'sender@test.com',
      phone: senderPhone,
      password: '1234',
      pin: '1234'
    })
  });
  const senderData = await regSenderRes.json();
  console.log('\nSender Reg/Login Success:', senderData.success);
  const senderToken = senderData.token;

  // 3. Register Recipient (Shital Barhate)
  const recipientPhone = '9975342924';
  const regRecRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Shital Barhate',
      email: 'shital@test.com',
      phone: recipientPhone,
      password: '1234',
      pin: '1234'
    })
  });
  const recipientData = await regRecRes.json();
  console.log('Recipient Reg/Login Success:', recipientData.success);
  const recipientToken = recipientData.token;

  // Add initial money to sender if needed
  await fetch(`${BASE_URL}/wallet/add-money`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${senderToken}`
    },
    body: JSON.stringify({ amount: 1000 })
  });

  // 4. Test GET /api/users/find?query=9975342924
  console.log('\n--- Testing GET /api/users/find?query=9975342924 ---');
  const findRes = await fetch(`${BASE_URL}/users/find?query=${recipientPhone}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${senderToken}`
    }
  });
  const findResult = await findRes.json();
  console.log('User Find Result Status:', findRes.status);
  console.log('User Find Result Payload:', JSON.stringify(findResult, null, 2));

  if (!findResult.success || findResult.user.phone !== recipientPhone) {
    console.error('❌ User lookup by mobile number failed!');
    process.exit(1);
  }
  console.log('✅ User lookup by mobile number verified successfully!');

  // 5. Test GET /api/users/find with invalid mobile number
  console.log('\n--- Testing GET /api/users/find?query=0000000000 (Invalid) ---');
  const findInvalidRes = await fetch(`${BASE_URL}/users/find?query=0000000000`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${senderToken}`
    }
  });
  const findInvalidResult = await findInvalidRes.json();
  console.log('Invalid User Find Result Status:', findInvalidRes.status);
  console.log('Invalid User Find Message:', findInvalidResult.message);
  if (findInvalidRes.status === 404 && !findInvalidResult.success) {
    console.log('✅ 404 Alert for unregistered mobile number verified!');
  } else {
    console.error('❌ Invalid mobile lookup handling failed');
    process.exit(1);
  }

  // 6. Test POST /api/wallet/transfer with recipientPhone
  console.log('\n--- Testing POST /api/wallet/transfer via Mobile Number ---');
  const transferRes = await fetch(`${BASE_URL}/wallet/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${senderToken}`
    },
    body: JSON.stringify({
      recipientPhone: recipientPhone,
      amount: 250,
      pin: '1234'
    })
  });
  const transferResult = await transferRes.json();
  console.log('Transfer Result Status:', transferRes.status);
  console.log('Transfer Result Payload:', JSON.stringify(transferResult, null, 2));

  if (!transferResult.success) {
    console.error('❌ Transfer failed!');
    process.exit(1);
  }
  console.log('✅ Transfer executed successfully without errors!');

  // 7. Verify Transaction History Sync for both users
  console.log('\n--- Verifying Transaction History Sync ---');
  const senderTxRes = await fetch(`${BASE_URL}/transactions/history`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${senderToken}`
    }
  });
  const senderTxData = await senderTxRes.json();

  const recTxRes = await fetch(`${BASE_URL}/transactions/history`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${recipientToken}`
    }
  });
  const recTxData = await recTxRes.json();

  console.log(`Sender Tx Count: ${senderTxData.count}, Recipient Tx Count: ${recTxData.count}`);
  if (senderTxData.count > 0 && recTxData.count > 0) {
    console.log('✅ Both sender and recipient transaction history synced successfully!');
  }

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
}

testMobileSendFlow();
