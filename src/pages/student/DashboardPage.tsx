import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Award, Trophy, Star, ChevronRight, TrendingUp, Bell, Play, Clock } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { CATEGORY_IMAGES, DEFAULT_COURSE_IMAGE, LEVEL_LABELS } from "@/constants";
import { formatDate } from "@/lib/utils";
import type { Enrollment, Certificate, Announcement, Course, LessonProgress } from "@/types";

interface CourseWithProgress {
  course: Course;
  totalLessons: number;
  completedLessons: number;
  progress: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [coursesProgress, setCoursesProgress] = useState<CourseWithProgress[]>([]);
  const [rankingPos, setRankingPos] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const directApiCall = async (tableName: string, method: string, body?: any, query?: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    let token = supabaseAnonKey;

    try {
      const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (storageKey) {
        const sessionData = JSON.parse(localStorage.getItem(storageKey) || '{}');
        if (sessionData?.access_token) token = sessionData.access_token;
      }
    } catch (err) {}

    const endpoint = `${supabaseUrl}/rest/v1/${tableName}${query ? `?${query}` : ''}`;
    
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`,
        'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro ${response.status}: ${errText}`);
    }
    
    if (method === 'GET' || method === 'POST') {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }
    return true;
  };

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        setLoading(true);
        
        const [enrData, certData, annData, rankData, progressData] = await Promise.all([
          directApiCall('enrollments', 'GET', undefined, `student_id=eq.${user!.id}&select=*,courses(*)`),
          directApiCall('certificates', 'GET', undefined, `student_id=eq.${user!.id}&select=*,courses(title)`),
          directApiCall('announcements', 'GET', undefined, `is_published=eq.true&select=*&order=created_at.desc&limit=3`),
          directApiCall('user_profiles', 'GET', undefined, `select=id,points&order=points.desc`),
          directApiCall('lesson_progress', 'GET', undefined, `student_id=eq.${user!.id}&completed=eq.true&select=*`)
        ]);

        const pos = (rankData || []).findIndex((u: any) => u.id === user!.id);
        setRankingPos(pos >= 0 ? pos + 1 : 0);

        setEnrollments(enrData || []);
        setCertificates(certData || []);
        setAnnouncements(annData || []);

        if (enrData) {
          const progressList: CourseWithProgress[] = [];
          for (const enr of enrData) {
            if (!enr.courses) continue;
            
            const modules = await directApiCall('modules', 'GET', undefined, `course_id=eq.${enr.course_id}&select=id`);
            
            let total = 0;
            let completed = 0;

            if (modules && modules.length > 0) {
              const moduleIds = modules.map((m: any) => m.id);
              const lessons = await directApiCall('lessons', 'GET', undefined, `module_id=in.(${moduleIds.join(',')})&select=id`);
              
              total = lessons?.length || 0;
              completed = (progressData || []).filter((p: LessonProgress) =>
                lessons?.some((l: any) => l.id === p.lesson_id)
              ).length;
            }

            progressList.push({
              course: enr.courses as Course,
              totalLessons: total,
              completedLessons: completed,
              progress: total > 0 ? Math.round((completed / total) * 100) : 0,
            });
          }

          progressList.sort((a, b) =>
            String(a.course?.title || "").trim().localeCompare(String(b.course?.title || "").trim(), 'pt-BR', { numeric: true, sensitivity: 'base' })
          );

          setCoursesProgress(progressList);
        }
      } catch (error) {
        console.error("Erro ao carregar o Dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const priorityColor: Record<string, string> = {
    urgent: "bg-red-100 text-red-700 border-red-200",
    high: "bg-amber-100 text-amber-700 border-amber-200",
    normal: "bg-blue-100 text-blue-700 border-blue-200",
    low: "bg-gray-100 text-gray-600 border-gray-200",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.role === 'pending_partner') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4 w-full">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Conta em Análise</h1>
        <p className="text-gray-500 max-w-md mx-auto">
          Recebemos o seu cadastro! O seu perfil de parceiro comercial está passando por análise pelo nosso time de gestão. 
          Você receberá um aviso assim que o acesso à sua infraestrutura de envios for liberado.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-6 min-w-0">
      {/* Welcome header */}
      <div className="mb-6 min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-cota-green break-words">
          {greeting()},{" "}
          <span className="text-cota-gold">{user?.full_name?.split(" ")[0] || user?.username}!</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1 break-words">
          Bem-vindo de volta à Universidade C.O.T.A. Continue sua jornada de aprendizado.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8 min-w-0">
        {[
          { label: "Trilhas Matriculadas", value: enrollments.length, icon: BookOpen, color: "text-cota-green", bg: "bg-cota-green/10" },
          { label: "Certificados", value: certificates.length, icon: Award, color: "text-cota-gold", bg: "bg-cota-gold/10" },
          { label: "Pontuação", value: user?.points || 0, icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Ranking", value: rankingPos ? `#${rankingPos}` : "—", icon: Trophy, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card min-w-0 overflow-hidden">
              <div className="flex items-center justify-between mb-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <TrendingUp className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-800 truncate">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight break-words">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 min-w-0">
        {/* Courses in progress */}
        <div className="lg:col-span-2 min-w-0">
          <div className="flex items-center justify-between mb-4 gap-3 min-w-0">
            <h2 className="text-lg font-bold text-gray-800 truncate">Trilhas em Andamento</h2>
            <Link to="/catalog" className="text-sm text-cota-green font-medium hover:underline flex items-center gap-1 flex-shrink-0">
              Ver todas <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {coursesProgress.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhuma trilha iniciada</p>
              <p className="text-sm text-gray-400 mb-4">Explore o catálogo e comece sua formação!</p>
              <Link to="/catalog"
                className="inline-flex items-center gap-2 bg-cota-green text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-cota-green-light transition-colors">
                <BookOpen className="w-4 h-4" /> Explorar Catálogo
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {coursesProgress.slice(0, 4).map(({ course, totalLessons, completedLessons, progress }) => (
                <Link key={course.id} to={`/courses/${course.id}`}
                  className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3 sm:gap-4 hover:shadow-md transition-all group min-w-0 overflow-hidden">
                  <img
                    src={course.cover_image || CATEGORY_IMAGES[course.category || ""] || DEFAULT_COURSE_IMAGE}
                    alt={course.title}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    {/* Atualizado para flex-col no mobile, mostrando o badge sem estourar */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-2 mb-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm leading-tight group-hover:text-cota-green transition-colors line-clamp-2">
                        {course.title}
                      </p>
                      <span className={`badge-level-${course.level} self-start flex-shrink-0 text-[10px]`}>
                        {LEVEL_LABELS[course.level]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {completedLessons} de {totalLessons} aulas concluídas
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cota-green rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-cota-green w-8 text-right">{progress}%</span>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center self-center flex-shrink-0">
                    <Play className="w-5 h-5 text-gray-300 group-hover:text-cota-green transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5 min-w-0">
          {/* Announcements */}
          <div>
            <div className="flex items-center justify-between mb-4 gap-3 min-w-0">
              <h2 className="text-lg font-bold text-gray-800 truncate">Comunicados</h2>
              <Link to="/announcements" className="text-sm text-cota-green font-medium hover:underline flex items-center gap-1 flex-shrink-0">
                Ver todos <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {announcements.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                  <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Nenhum comunicado</p>
                </div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className={`bg-white rounded-xl border p-4 min-w-0 overflow-hidden ${priorityColor[ann.priority]}`}>
                    <p className="font-semibold text-sm leading-tight break-words">{ann.title}</p>
                    <p className="text-xs mt-1 opacity-70 line-clamp-2 break-words">{ann.content}</p>
                    <p className="text-xs mt-2 opacity-50">{formatDate(ann.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent certificates */}
          {certificates.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4 gap-3 min-w-0">
                <h2 className="text-lg font-bold text-gray-800 truncate">Certificados</h2>
                <Link to="/certificates" className="text-sm text-cota-green font-medium hover:underline flex items-center gap-1 flex-shrink-0">
                  Ver todos <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {certificates.slice(0, 2).map((cert) => (
                  <div key={cert.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cota-gold/10 flex items-center justify-center flex-shrink-0">
                      <Award className="w-5 h-5 text-cota-gold" />
                    </div>
                    <div className="min-w-0 overflow-hidden">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {(cert.courses as Course)?.title}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(cert.issued_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}