
export type UserRole = 'TEACHER' | 'SCHOOL' | 'PARENT' | null;

export interface TeacherProfile {
  id: string;
  name: string;
  subject: string;
  experienceYears: number;
  education: string;
  location: string;
  bio: string;
  skills: string[];
  avatar: string;
}

export interface ParentProfile {
  id: string;
  name: string;
  location: string;
  childName: string;
  childGrade: string;
  avatar: string;
}

export interface SchoolProfile {
  id: string;
  name: string;
  location: string;
  type: string; // e.g., IB World School, Public, Charter
  bio: string;
  openRoles: JobListing[];
  logo: string;
}

export interface JobListing {
  id: string;
  schoolId: string;
  title: string;
  subject: string;
  gradeLevel: string;
  salaryRange: string;
  description: string;
  postedAt: string;
}

export interface StudentApplication {
  id: string;
  parentId: string;
  schoolId: string;
  childName: string;
  gradeLevel: string;
  statement: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  submittedAt: string;
}

export interface AuthState {
  role: UserRole;
  user: any;
}
