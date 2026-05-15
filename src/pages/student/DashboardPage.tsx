import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Award, Trophy, Star, ChevronRight, TrendingUp, Bell, Play } from "lucide-react";
import { supabase } from "@/lib/supabase";
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

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        setLoading(true);
        // Enrollments with courses
        const { data: enrData, error: errEnr } = await supabase.from("enrollments").select("*, courses(*)").eq("student_id", user!.id);
        if (errEnr) throw errEnr;

        // Certificates
        const { data: certData, error: errCert } = await supabase.from("certificates").select("*, courses(title)").eq("student_id", user!.id);
        if (errCert) throw errCert;

        // Announcements
        const { data: annData, error: errAnn } = await supabase.from("announcements").select("*").eq("is_published", true).order("created_at", { ascending: false }).limit(3);
        if (errAnn) throw errAnn;

        // Ranking position
        const { data: rankData, error: errRank } = await supabase.from("user_profiles").select("id, points").order("points", { ascending: false });
        if (errRank) throw errRank;
        const pos = rankData?.findIndex((u) => u.id === user!.id) ?? -1;

        // Lesson progress
        const { data: progressData, error: errProg } = await supabase.from("lesson_progress").select("*").eq("student_id", user!.id).eq("completed", true);
        if (errProg) throw errProg;

        setEnrollments(enrData || []);
        setCertificates(certData || []);
        setAnnouncements(annData || []);
        setRankingPos(pos >= 0 ? pos + 1 : 0);

        // Build courses with progress
        if (enrData) {
          const progressList: CourseWithProgress[] = [];
          for (const enr of enrData) {
            if (!enr.courses) continue;
            const { data: modules, error: errMod } = await supabase.from("modules").select("id").eq("course_id", enr.course_id);
            if (errMod) throw errMod;

            if (!modules?.length) {
              progressList.push({ course: enr.courses as Course, totalLessons: 0, completedLessons: 0, progress: 0 });
              continue;
            }
            const moduleIds = modules.map((m) => m.id);
            const { data: lessons, error: errLess } = await supabase.from("lessons").select("id").in("module_id", moduleIds);
            if (errLess) throw errLess;

            const total = lessons?.length || 0;
            const completed = (progressData || []).filter((p: LessonProgress) =>
              lessons?.some((l) => l.id === p.lesson_id)
            ).length;
            progressList.push({
              course: enr.courses as Course,
              totalLessons: total,
              completedLessons: completed,
              progress: total > 0 ? Math.round((completed / total) * 100) : 0,
            });
          }
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

  return (
    <div>
      {/* Welcome header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-cota-green">
          {greeting()},{" "}
          <span className="text-cota-gold">{user?.full_name?.split(" ")[0] || user?.username}!</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Bem-vindo de volta à Universidade C.O.T.A. Continue sua jornada de aprendizado.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Trilhas Matriculadas", value: enrollments.length, icon: BookOpen, color: "text-cota-green", bg: "bg-cota-green/10" },
          { label: "Certificados", value: certificates.length, icon: Award, color: "text-cota-gold", bg: "bg-cota-gold/10" },
          { label: "Pontuação", value: user?.points || 0, icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Ranking", value: rankingPos ? `#${rankingPos}` : "—", icon: Trophy, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <TrendingUp className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Courses in progress */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Trilhas em Andamento</h2>
            <Link to="/catalog" className="text-sm text-cota-green font-medium hover:underline flex items-center gap-1">
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
                  className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4 hover:shadow-md transition-all group">
                  <img
                    src={course.cover_image || CATEGORY_IMAGES[course.category || ""] || DEFAULT_COURSE_IMAGE}
                    alt={course.title}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-800 text-sm leading-tight group-hover:text-cota-green transition-colors truncate">
                        {course.title}
                      </p>
                      <span className={`badge-level-${course.level} flex-shrink-0`}>
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
                  <div className="flex items-center self-center">
                    <Play className="w-5 h-5 text-gray-300 group-hover:text-cota-green transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Announcements */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Comunicados</h2>
              <Link to="/announcements" className="text-sm text-cota-green font-medium hover:underline flex items-center gap-1">
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
                  <div key={ann.id} className={`bg-white rounded-xl border p-4 ${priorityColor[ann.priority]}`}>
                    <p className="font-semibold text-sm leading-tight">{ann.title}</p>
                    <p className="text-xs mt-1 opacity-70 line-clamp-2">{ann.content}</p>
                    <p className="text-xs mt-2 opacity-50">{formatDate(ann.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent certificates */}
          {certificates.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">Certificados</h2>
                <Link to="/certificates" className="text-sm text-cota-green font-medium hover:underline flex items-center gap-1">
                  Ver todos <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {certificates.slice(0, 2).map((cert) => (
                  <div key={cert.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cota-gold/10 flex items-center justify-center flex-shrink-0">
                      <Award className="w-5 h-5 text-cota-gold" />
                    </div>
                    <div className="min-w-0">
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