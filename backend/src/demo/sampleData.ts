export const demoResponses = [
  {
    method: "GET",
    pattern: /^\/api\/parent\/dashboard/,
    body: {
      success: true,
      data: {
        student: {
          id: "demo-student-id",
          full_name: "Samira Haddad",
          student_number: "STU-2024-0001",
          class_label: "Troisième A",
          class_id: "demo-class",
        },
        recent_grades: [
          { subject: "Mathématiques", grade: 17, date: "2024-05-15", appreciation: "Excellent travail" },
          { subject: "Français", grade: 15, date: "2024-05-13", appreciation: "Très bonne copie" },
        ],
        upcoming_homework: [
          {
            id: "demo-hw-1",
            subject_name: "Histoire",
            title: "Réviser la Révolution Française",
            due_date: "2024-05-25",
            class_label: "3A",
          },
        ],
        next_sessions: [
          {
            id: "demo-session-1",
            subject_name: "Physique",
            day_of_week: 2,
            start_time: "10:00",
            end_time: "11:00",
            room: "Lab 2",
            teacher_name: "M. Dupont",
          },
        ],
        attendance_stats: {
          total_absences: 2,
          justified_absences: 1,
          late_arrivals: 1,
          current_term: "T3",
        },
      },
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/establishment\/settings/,
    body: {
      success: true,
      data: {
        establishmentId: "demo-establishment",
        displayName: "Collège Démo Horizon",
        contactEmail: "contact@demo-horizon.edu",
        schoolYear: "2024-2025",
      },
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/parent\/children/,
    body: {
      success: true,
      data: [
        {
          id: "demo-student-id",
          full_name: "Samira Haddad",
          email: "samira.haddad@example.com",
          student_number: "STU-2024-0001",
          class_id: "demo-class",
          class_name: "Troisième A",
          relation_type: "guardian",
        },
      ],
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/attendance\/records/,
    body: {
      success: true,
      data: {
        absences: [],
        pagination: { totalPages: 1 },
      },
    },
  },
]
