import dotenv from 'dotenv';
import { pool } from '../config/database';
import { createUser, createStudentProfile, createTeacherProfile, createStaffProfile } from '../models/user.model';
import type { UserRole } from '../types'


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
    role: 'super_admin' as const,
    full_name: 'Super Administrateur',
  },
  {
    email: 'staff1@test.com',
    password: '123456',
    role: 'staff' as const,
    full_name: 'staff 1',
    profile: {
      phone: '0612345680',
      department: 'Vie scolaire',      
      office_room: 'B102',
      employee_no: 'STF-0001',
      hire_date: new Date('2024-09-01')  },
  },
  {
    email: 'staff2@test.com',
    password: '123456',
    role: 'staff' as const,
    full_name: 'staff 2',
    profile: {
      phone: '0612385680',
      department: 'Vie scolaire',     
      office_room: 'B103',
      employee_no: 'STF-0002',
                              
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
      } else if (userData.role === 'staff' && userData.profile) {
        await createStaffProfile(user.id, userData.profile);
        console.log('   ✅ Profil staff créé');
      }

      console.log('');
    }

    console.log('✅ Seed des utilisateurs terminé avec succès!\n');
    console.log('📋 Utilisateurs créés:');
    console.log('   - eleve@example.com (mot de passe: eleve123)');
    console.log('   - prof@example.com (mot de passe: prof123)');
    console.log('   - admin@example.com (mot de passe: admin123)');
    console.log('   - staff1@test.com (mot de passe: 123456)');
    console.log('   - staff2@test.com (mot de passe: 123456)');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    process.exit(1);
  }
}

// Exécuter le seed
seedUsers();