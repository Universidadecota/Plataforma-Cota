import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Clock, BookOpen, ChevronDown, ChevronUp, CheckCircle, Circle, Play, Award, FileText } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { CATEGORY_IMAGES, DEFAULT_COURSE_IMAGE, LEVEL_LABELS } from "@/constants";
import { toast } from "sonner";
import type { Course, Module, Lesson, LessonProgress } from "@/types";

interface ModuleWithLessons extends Module {
  lessons: Lesson[];
}

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [hasCertificate, setHasCertificate] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // =====================================================================
  // O MOTOR CENTRAL "MODO DEUS"
  // =====================================================================
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
  // =====================================================================

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const courseDataArr = await directApiCall('courses', 'GET', undefined, `id=eq.${id}&select=*`);
        if (!courseDataArr || courseDataArr.length === 0) return;
        setCourse(courseDataArr[0]);

        const modulesData = await directApiCall('modules', 'GET', undefined, `course_id=eq.${id}&select=*`);
        
        // Ordem JS (A-Z) para módulos
        const sortedModules = (modulesData || []).sort((a: any, b: any) => 
            String(a.title || "").trim().localeCompare(String(b.title || "").trim(), 'pt-BR', { numeric: true, sensitivity: 'base' })
        );

        const modulesWithLessons: ModuleWithLessons[] = [];
        for (const mod of sortedModules) {
          const lessonsData = await directApiCall('lessons', 'GET', undefined, `module_id=eq.${mod.id}&select=*`);
          // Ordem JS (A-Z) para aulas
          const sortedLessons = (lessonsData || []).sort((a: any, b: any) => 
            String(a.title || "").trim().localeCompare(String(b.title || "").trim(), 'pt-BR', { numeric: true, sensitivity: 'base' })
          );
          modulesWithLessons.push({ ...mod, lessons: sortedLessons });
        }
        setModules(modulesWithLessons);
        if (modulesWithLessons.length > 0) setExpandedModules([modulesWithLessons[0].id]);

        const enrData = await directApiCall('enrollments', 'GET', undefined, `student_id=eq.${user!.id}&course_id=eq.${id}&select=id`);
        setIsEnrolled(enrData && enrData.length > 0);

        const lessonIds = modulesWithLessons.flatMap((m) => m.lessons.map((l) => l.id));
        if (lessonIds.length) {
          const progData = await directApiCall('lesson_progress', 'GET', undefined, `student_id=eq.${user!.id}&lesson_id=in.(${lessonIds.join(',')})&select=*`);
          setProgress(progData || []);
        }

        const certData = await directApiCall('certificates', 'GET', undefined, `student_id=eq.${user!.id}&course_id=eq.${id}&select=id`);
        setHasCertificate(certData && certData.length > 0);

      } catch (error) {
        console.error("Erro ao carregar trilha:", error);
        toast.error("Ocorreu um erro ao carregar os detalhes desta trilha.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, user]);

  const handleEnroll = async () => {
    try {
        await directApiCall('enrollments', 'POST', { student_id: user!.id, course_id: id });
        setIsEnrolled(true); 
        toast.success("Matrícula realizada com sucesso!");
    } catch (err) {
        toast.error("Erro ao matricular.");
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((m) => m !== moduleId) : [...prev, moduleId]
    );
  };

  const isLessonCompleted = (lessonId: string) =>
    progress.some((p) => p.lesson_id === lessonId && p.completed);

  const totalLessons = modules.flatMap((m) => m.lessons).length;
  const completedLessons = progress.filter((p) => p.completed).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!course) return (
    <div className="text-center py-20 text-gray-400">Trilha não encontrada.</div>
  );

  const coverImg = course.cover_image || CATEGORY_IMAGES[course.category || ""] || DEFAULT_COURSE_IMAGE;

  return (
    <div>
      <Link to="/catalog" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-cota-green mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Voltar ao Catálogo
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <img src={coverImg} alt={course.title} className="w-full h-52 object-cover" />
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className={`badge-level-${course.level}`}>{LEVEL_LABELS[course.level]}</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{course.duration_hours}h de conteúdo</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-400 flex items-center gap-1"><BookOpen className="w-3 h-3" />{totalLessons} aulas</span>
              </div>
              <h1 className="text-xl font-bold text-gray-800 mb-3">{course.title}</h1>
              <p className="text-gray-600 text-sm leading-relaxed">{course.description}</p>

              {isEnrolled && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-gray-500">Seu progresso</span>
                    <span className="font-bold text-cota-green">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full">
                    <div className="h-full bg-cota-green rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{completedLessons} de {totalLessons} aulas concluídas</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">Conteúdo da Trilha</h2>
              <p className="text-xs text-gray-400">{modules.length} módulos · {totalLessons} aulas</p>
            </div>

            {modules.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p>Conteúdo em preparação</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {modules.map((mod) => {
                  const isExpanded = expandedModules.includes(mod.id);
                  const modCompleted = mod.lessons.filter((l) => isLessonCompleted(l.id)).length;
                  return (
                    <div key={mod.id}>
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-8 h-8 rounded-lg bg-cota-green/10 flex items-center justify-center text-cota-green font-bold text-sm flex-shrink-0">
                            {mod.order_index}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{mod.title}</p>
                            <p className="text-xs text-gray-400">{mod.lessons.length} aulas · {modCompleted} concluídas</p>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </button>

                      {isExpanded && (
                        <div className="bg-gray-50/50">
                          {mod.lessons.map((lesson) => {
                            const completed = isLessonCompleted(lesson.id);
                            return (
                              <Link
                                key={lesson.id}
                                to={isEnrolled ? `/lessons/${lesson.id}` : "#"}
                                onClick={(e) => { if (!isEnrolled) e.preventDefault(); }}
                                className={`flex items-center gap-4 px-6 py-3 border-t border-gray-100 transition-colors ${isEnrolled ? "hover:bg-white cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                              >
                                {completed ? (
                                  <CheckCircle className="w-5 h-5 text-cota-green flex-shrink-0" />
                                ) : (
                                  <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-700 font-medium">{lesson.title}</p>
                                  <p className="text-xs text-gray-400">{lesson.duration_minutes} min</p>
                                </div>
                                {isEnrolled && <Play className="w-4 h-4 text-gray-300" />}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {!isEnrolled ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <p className="font-bold text-gray-800 mb-1">Iniciar esta trilha</p>
              <p className="text-sm text-gray-500 mb-4">Matricule-se gratuitamente e comece agora mesmo.</p>
              <button onClick={handleEnroll}
                className="w-full bg-cota-gold hover:bg-cota-gold-dark text-cota-green-dark py-3 rounded-lg font-bold text-sm transition-colors">
                Matricular-me Agora
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <p className="font-bold text-gray-800 mb-4">Sua jornada</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Progresso</span>
                  <span className="font-bold text-cota-green">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full">
                  <div className="h-full bg-cota-green rounded-full" style={{ width: `${progressPercent}%` }} />
                </div>
                {modules.length > 0 && modules[0].lessons.length > 0 && (
                  <Link to={`/lessons/${modules[0].lessons[0].id}`}
                    className="flex items-center gap-2 w-full bg-cota-green text-white py-2.5 rounded-lg text-sm font-semibold justify-center hover:bg-cota-green-light transition-colors mt-2">
                    <Play className="w-4 h-4" /> Continuar Estudando
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="font-semibold text-gray-700 mb-3 text-sm">O que você vai aprender</p>
            <ul className="space-y-2">
              {modules.slice(0, 5).map((mod) => (
                <li key={mod.id} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-cota-green flex-shrink-0" />
                  {mod.title}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <p className="font-semibold text-gray-700 text-sm">Esta trilha inclui</p>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-cota-green" />{totalLessons} videoaulas</div>
              <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-cota-green" />Materiais para download</div>
              <div className="flex items-center gap-2"><Award className="w-4 h-4 text-cota-gold" />Certificado ao concluir</div>
            </div>
          </div>

          {hasCertificate && (
            <Link to="/certificates"
              className="flex items-center gap-3 bg-cota-gold/10 border border-cota-gold/30 rounded-xl p-4 hover:bg-cota-gold/20 transition-colors">
              <Award className="w-8 h-8 text-cota-gold flex-shrink-0" />
              <div>
                <p className="font-semibold text-cota-gold-dark text-sm">Parabéns!</p>
                <p className="text-xs text-gray-600">Você tem o certificado desta trilha.</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}