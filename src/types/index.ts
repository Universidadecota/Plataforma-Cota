export type Role = "student" | "instructor" | "manager" | "admin" | "partner" | "pending_partner";
export type Level = "beginner" | "intermediate" | "advanced";
export type Priority = "low" | "normal" | "high" | "urgent";
export type LeadStatus = 'novo' | 'contatado' | 'simulacao_enviada' | 'negociacao' | 'ganho' | 'perdido';
export type LeadInterest = 'imovel' | 'automovel' | 'outros';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  points: number;
  team_id: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  points: number;
  team_id: string | null;
  created_at: string;
  phone?: string;
  bio?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  level: Level;
  duration_hours: number;
  category: string | null;
  instructor_id: string | null;
  is_published: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  video_url: string | null;
  content: string | null;
  duration_minutes: number;
  order_index: number;
  created_at: string;
}

export interface Material {
  id: string;
  lesson_id: string | null;
  course_id: string | null;
  title: string;
  file_url: string | null;
  file_type: string | null;
  file_size: string | null;
  created_at: string;
  courses?: Course;
}

export interface LessonProgress {
  id: string;
  student_id: string;
  lesson_id: string;
  completed: boolean;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  courses?: Course;
}

export interface Quiz {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  created_at: string;
  courses?: Course;
  quiz_questions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  explanation: string | null;
  order_index: number;
  quiz_options?: QuizOption[];
}

export interface QuizOption {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  order_index: number;
}

export interface QuizAttempt {
  id: string;
  student_id: string;
  quiz_id: string;
  score: number;
  passed: boolean;
  answers: Record<string, string> | null;
  attempted_at: string;
  quizzes?: Quiz;
}

export interface Certificate {
  id: string;
  student_id: string;
  course_id: string;
  issued_at: string;
  certificate_number: string;
  courses?: Course;
  user_profiles?: UserProfile;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author_id: string | null;
  target_role: string | null;
  priority: Priority;
  is_published: boolean;
  created_at: string;
}

export interface WhatsAppScript {
  id: string;
  title: string;
  category: string | null;
  content: string;
  tags: string[] | null;
  created_by: string | null;
  created_at: string;
}

export interface Objection {
  id: string;
  objection: string;
  category: string | null;
  response: string;
  tips: string | null;
  created_by: string | null;
  created_at: string;
}

export interface MentoringSession {
  id: string;
  instructor_id: string | null;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  duration_minutes: number;
  meeting_url: string | null;
  target_role: string | null;
  team_id: string | null;
  is_published: boolean;
  created_at: string;
}
export interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  origin: string | null;
  status: LeadStatus;
  interest: LeadInterest | null;
  assigned_to: string | null;
  team_id: string | null;
  estimated_letter_value: number | null;
  desired_installment: number | null;
  has_bid_value: boolean;
  bid_value: number | null;
  first_contact_at: string | null;
  simulation_sent_at: string | null;
  last_follow_up_at: string | null;
  loss_reason: string | null;
  created_at: string;
  updated_at: string;
}