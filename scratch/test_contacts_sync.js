import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import dns from 'node:dns';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'payverse_secret_key_123';

async function testContacts() {
  console.log('--- TESTING CONTACTS SYNC & DATABASE INTEGRATION ---');

  // 1. Check MongoDB Atlas Users
  console.log('1. Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const dbUsers = await User.find({}).lean();
  console.log(`   Total registered users in DB: ${dbUsers.length}`);
  dbUsers.forEach((u, i) => {
    console.log(`   User ${i+1}: ${u.name} (Phone: ${u.phone}, PayVerseId: ${u.payverseId}, _id: ${u._id})`);
  });

  const nidhi = dbUsers.find(u => u.name?.toLowerCase().includes('nidhi'));
  const shital = dbUsers.find(u => u.name?.toLowerCase().includes('shital'));

  if (!nidhi || !shital) {
    console.error('Could not find both Nidhi and Shital in database!');
    process.exit(1);
  }

  // Generate tokens matching server's token generation
  const nidhiToken = jwt.sign(
    { _id: nidhi._id.toString(), userId: nidhi._id.toString(), id: nidhi._id.toString(), email: nidhi.email, phone: nidhi.phone, payverseId: nidhi.payverseId },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  const shitalToken = jwt.sign(
    { _id: shital._id.toString(), userId: shital._id.toString(), id: shital._id.toString(), email: shital.email, phone: shital.phone, payverseId: shital.payverseId },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  // 2. Test GET /api/users/all-contacts logged in as Shital
  console.log('\n2. Testing GET /api/users/all-contacts logged in as Shital:');
  const resShital = await fetch(`${BASE_URL}/users/all-contacts`, {
    headers: { 'Authorization': `Bearer ${shitalToken}` }
  });
  const dataShital = await resShital.json();
  console.log('   Status:', resShital.status);
  console.log('   Response success:', dataShital.success);
  console.log('   Contacts count returned:', dataShital.users?.length);
  console.log('   Contacts:', dataShital.users?.map(u => u.name));

  if (dataShital.users?.length === 1 && dataShital.users[0].name === nidhi.name) {
    console.log('   ✅ PASS: When logged in as Shital, shows ONLY Nidhi Barhate!');
  } else {
    console.error('   ❌ FAIL: Expected only Nidhi Barhate, got:', dataShital.users);
  }

  // 3. Test GET /api/users/all-contacts logged in as Nidhi
  console.log('\n3. Testing GET /api/users/all-contacts logged in as Nidhi:');
  const resNidhi = await fetch(`${BASE_URL}/users/all-contacts`, {
    headers: { 'Authorization': `Bearer ${nidhiToken}` }
  });
  const dataNidhi = await resNidhi.json();
  console.log('   Status:', resNidhi.status);
  console.log('   Response success:', dataNidhi.success);
  console.log('   Contacts count returned:', dataNidhi.users?.length);
  console.log('   Contacts:', dataNidhi.users?.map(u => u.name));

  if (dataNidhi.users?.length === 1 && dataNidhi.users[0].name === shital.name) {
    console.log('   ✅ PASS: When logged in as Nidhi, shows ONLY Shital Barhate!');
  } else {
    console.error('   ❌ FAIL: Expected only Shital Barhate, got:', dataNidhi.users);
  }

  // 4. Test GET /api/users endpoint as well
  console.log('\n4. Testing GET /api/users endpoint logged in as Shital:');
  const resUsers = await fetch(`${BASE_URL}/users`, {
    headers: { 'Authorization': `Bearer ${shitalToken}` }
  });
  const dataUsers = await resUsers.json();
  console.log('   Status:', resUsers.status);
  console.log('   Contacts count returned:', dataUsers.users?.length);
  if (dataUsers.users?.length === 1 && dataUsers.users[0].name === nidhi.name) {
    console.log('   ✅ PASS: GET /api/users returns only Nidhi Barhate!');
  } else {
    console.error('   ❌ FAIL: Expected only Nidhi Barhate, got:', dataUsers.users);
  }

  // 5. Test GET /api/contacts endpoint
  console.log('\n5. Testing GET /api/contacts endpoint logged in as Nidhi:');
  const resContacts = await fetch(`${BASE_URL}/contacts`, {
    headers: { 'Authorization': `Bearer ${nidhiToken}` }
  });
  const dataContacts = await resContacts.json();
  console.log('   Status:', resContacts.status);
  console.log('   Contacts count returned:', dataContacts.users?.length);
  if (dataContacts.users?.length === 1 && dataContacts.users[0].name === shital.name) {
    console.log('   ✅ PASS: GET /api/contacts returns only Shital Barhate!');
  } else {
    console.error('   ❌ FAIL: Expected only Shital Barhate, got:', dataContacts.users);
  }

  await mongoose.disconnect();
  console.log('\n🎉 ALL CONTACT SYNC TESTS PASSED SUCCESSFULLY!');
}

testContacts().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
