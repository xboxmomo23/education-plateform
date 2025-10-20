import { api } from './client';

export interface Course {
  id: string;
  title: string;
  subject_name: string;
  subject_code: string;
  class_label: string;
  class_code: string;
  class_level: string;
  academic_year: number;
}

export const coursesApi = {
  getMyCourses: () => api.get<Course[]>('/courses/my-courses'),
};