const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Configuration PostgreSQL
const pool = new Pool({
  user: process.env.PGUSER || 'edupilot_user',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'edupilot',
  password: process.env.PGPASSWORD || 'Xboxmomo2004#',
  port: process.env.PGPORT || 5432,
});

async function fixAllPasswords() {
  try {
    console.log('\n==============================================');
    console.log('🔧 CORRECTION COMPLÈTE DES MOTS DE PASSE');
    console.log('==============================================\n');

    // 1️⃣ Générer les hashs
    console.log('1️⃣ Génération des hashs bcrypt...');
    const profHash = await bcrypt.hash('prof123', 10);
    const studentHash = await bcrypt.hash('student123', 10);
    console.log('   ✅ Hashs générés\n');

    // 2️⃣ Débloquer tous les comptes
    console.log('2️⃣ Déblocage des comptes...');
    await pool.query(`
      UPDATE users 
      SET account_locked_until = NULL, 
          failed_login_attempts = 0
      WHERE email = 'prof@example.com' 
         OR email LIKE '%@student.test'
    `);
    console.log('   ✅ Comptes débloqués\n');

    // 3️⃣ Mettre à jour le professeur
    console.log('3️⃣ Mise à jour professeur...');
    const profResult = await pool.query(
      `UPDATE users SET password_hash = $1 WHERE email = 'prof@example.com' RETURNING email`,
      [profHash]
    );
    console.log(`   ✅ ${profResult.rows[0]?.email || 'prof@example.com'} → prof123\n`);

    // 4️⃣ Mettre à jour les élèves
    console.log('4️⃣ Mise à jour élèves...');
    const studentsResult = await pool.query(
      `UPDATE users SET password_hash = $1 WHERE email LIKE '%@student.test' RETURNING email, full_name`,
      [studentHash]
    );
    console.log(`   ✅ ${studentsResult.rowCount} élève(s) → student123`);
    studentsResult.rows.forEach(s => console.log(`      - ${s.full_name} (${s.email})`));

    // 5️⃣ Vérification
    console.log('\n5️⃣ Vérification finale...');
    const check = await pool.query(`
      SELECT 
        email,
        full_name,
        LENGTH(password_hash) as hash_length,
        LEFT(password_hash, 10) as hash_start
      FROM users
      WHERE email = 'prof@example.com' OR email LIKE '%@student.test'
      ORDER BY role DESC, email
      LIMIT 5
    `);
    
    console.log('\n   📋 État des comptes:');
    check.rows.forEach(u => {
      console.log(`   ${u.hash_length === 60 ? '✅' : '❌'} ${u.full_name} (${u.email})`);
      console.log(`      Hash: ${u.hash_start}... (longueur: ${u.hash_length})`);
    });

    console.log('\n==============================================');
    console.log('🎉 TERMINÉ !');
    console.log('==============================================');
    console.log('\n📝 Comptes de test:');
    console.log('   • prof@example.com / prof123');
    console.log('   • alice.dupont@student.test / student123');
    console.log('\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Erreur:', error);
    await pool.end();
    process.exit(1);
  }
}

fixAllPasswords();