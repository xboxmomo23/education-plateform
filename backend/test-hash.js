const bcrypt = require('bcrypt');

// ⚠️ REMPLACE CE HASH PAR CELUI DE LA BASE DE DONNÉES
const hashFromDB = '$2b$10$JiJvXDThMcD0X'; // Hash de alice.dupont

async function testHash() {
  console.log('\n🔍 Test du hash bcrypt\n');
  
  // Test avec différents mots de passe
  const passwords = ['student123', 'Student123', 'STUDENT123', 'student', ''];
  
  for (const pwd of passwords) {
    const match = await bcrypt.compare(pwd, hashFromDB);
    console.log(`"${pwd}" → ${match ? '✅ MATCH' : '❌ NO MATCH'}`);
  }
}

testHash().catch(console.error);