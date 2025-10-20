import bcrypt from 'bcrypt';

async function hashPassword(password: string) {
  const hash = await bcrypt.hash(password, 10);
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
}

hashPassword('student123');
hashPassword('prof123');