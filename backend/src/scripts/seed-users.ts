import dotenv from 'dotenv';
import { pool } from '../config/database';
import { createUser, createStudentProfile, createTeacherProfile, createResponsableProfile } from '../models/user.model';

dotenv.config();

// Utilisateurs de démonstration (correspondant au frontend hardcodé)
const DEMO_USERS = [
  {
    email: 'eleve@example.com',
    password: 'eleve123',
    role: 'student' as const,
    full_name: 'Étudiant Demo',
    profile: {
      student_no: 'STU2025001',
      birthdate: new Date('2008-05-15'),
      phone: '0612345678',
    },
  },
  {
    email: 'prof@example.com',
    password: 'prof123',
    role: 'teacher' as const,
    full_name: 'Professeur Demo',
    profile: {
      employee_no: 'PROF2025001',
      specialization: 'Mathématiques',
      phone: '0612345679',
    },
  },
  {
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin' as const,
    full_name: 'Administrateur Demo',
  },
  {
    email: 'responsable1@test.com',
    password: '123456',
    role: 'responsable' as const,
    full_name: 'Responsable 1',
    profile: {
      phone: '0612345680',
      relation_type: 'parent',
    },
  },
  {
    email: 'responsable2@test.com',
    password: '123456',
    role: 'responsable' as const,
    full_name: 'Responsable 2',
    profile: {
      phone: '0612345681',
      relation_type: 'tuteur',
    },
  },
];

async function seedUsers() {
  try {
    console.log('🌱 Démarrage du seed des utilisateurs...\n');

    for (const userData of DEMO_USERS) {
      console.log(`📝 Création de l'utilisateur: ${userData.email}`);

      // Vérifier si l'utilisateur existe déjà
      const checkQuery = 'SELECT id FROM users WHERE email = $1';
      const existingUser = await pool.query(checkQuery, [userData.email]);

      if (existingUser.rows.length > 0) {
        console.log(`   ⚠️  Utilisateur ${userData.email} existe déjà, ignoré\n`);
        continue;
      }

      // Créer l'utilisateur
      const user = await createUser({
        email: userData.email,
        password: userData.password,
        role: userData.role,
        full_name: userData.full_name,
      });

      console.log(`   ✅ Utilisateur créé: ${user.id}`);

      // Créer le profil selon le rôle
      if (userData.role === 'student' && userData.profile) {
        await createStudentProfile(user.id, userData.profile);
        console.log('   ✅ Profil étudiant créé');
      } else if (userData.role === 'teacher' && userData.profile) {
        await createTeacherProfile(user.id, userData.profile);
        console.log('   ✅ Profil enseignant créé');
      } else if (userData.role === 'responsable' && userData.profile) {
        await createResponsableProfile(user.id, userData.profile);
        console.log('   ✅ Profil responsable créé');
      }

      console.log('');
    }

    console.log('✅ Seed des utilisateurs terminé avec succès!\n');
    console.log('📋 Utilisateurs créés:');
    console.log('   - eleve@example.com (mot de passe: eleve123)');
    console.log('   - prof@example.com (mot de passe: prof123)');
    console.log('   - admin@example.com (mot de passe: admin123)');
    console.log('   - responsable1@test.com (mot de passe: 123456)');
    console.log('   - responsable2@test.com (mot de passe: 123456)');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    process.exit(1);
  }
}

// Exécuter le seed
seedUsers();