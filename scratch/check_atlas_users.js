import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

dotenv.config();

const uri = process.env.MONGODB_URI;

async function check() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected! Database name:', mongoose.connection.name);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const users = await User.find({}).lean();
  console.log('Total users in database:', users.length);
  users.forEach((u, i) => {
    console.log(`[${i+1}] ID: ${u._id}, Name: ${u.name}, Phone: ${u.phone}, PayVerseId: ${u.payverseId}, Email: ${u.email}`);
  });
  await mongoose.disconnect();
}

check().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
