export type Evaluation = {
  evaluationId: string;
  title: string;
  date: string;               // ISO string
  coefficient: number;
  gradeStudent: number | null; // null si absent
  classAverage?: number | null;
  classMin?: number | null;
  classMax?: number | null;
};

export type SubjectNotes = {
  subjectId: string | null;
  subjectName: string;
  evaluations: Evaluation[];
  generalAverage: number | null; // moyenne élève sur la matière
  classAverage?: number | null;  // moyenne de classe sur la matière (si tu la calcules)
  classMin?: number | null;
  classMax?: number | null;
};
