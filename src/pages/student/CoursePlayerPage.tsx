import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { 
  ChevronLeft, Play, CheckCircle2, Circle, FileText, 
  BookOpen, Trophy, ArrowRight, Video, FileDown, Check
} from "lucide-react";

type Material = { id: string; title: string; file_url: string; file_size?: string; };
type Lesson = { id: string; title: string; video_url?: string; duration_minutes: number; content?: string; order_index: number; materials: Material[]; };
type Module = { id: string; title: string; order_index: number; lessons: Lesson[]; };
type Course = { id: string; title: string; description?: string; category: string; };

function getYouTubeEmbedUrl(url?: string | null) {
  if (!url) return "";

  try {
    const cleanUrl = url.trim();

    // Se já estiver no formato embed, mantém.
    if (cleanUrl.includes("youtube.com/embed/")) {
      return cleanUrl;
    }

    const parsedUrl = new URL(cleanUrl);
    let videoId = "";

    // Exemplo: https://youtu.be/ra...
    if (parsedUrl.hostname.includes("youtu.be")) {
      videoId = parsedUrl.pathname.replace("/", "");
    }

    // Exemplo: https://www.youtube.com/watch?v=ra...
    if (parsedUrl.hostname.includes("youtube.com")) {
      videoId = parsedUrl.searchParams.get("v") || "";

      // Exemplo: https://www.youtube.com/shorts/ra...
      if (!videoId && parsedUrl.pathname.includes("/shorts/")) {
        videoId = parsedUrl.pathname.split("/shorts/")[1]?.split("/")[0] || "";
      }
    }

    if (!videoId) return cleanUrl;

    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return url;
  }
}


function renderMarkdown(content: string) {
  if (!content) return null;

  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const elements: JSX.Element[] = [];

  let listItems: JSX.Element[] = [];
  let orderedListItems: JSX.Element[] = [];
  let tableHeaders: JSX.Element[] = [];
  let tableRows: JSX.Element[] = [];

  const parseInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g);

    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-bold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        );
      }

      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={index} className="italic text-gray-700">
            {part.slice(1, -1)}
          </em>
        );
      }

      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={index} className="px-1.5 py-0.5 rounded bg-gray-100 text-cota-green-dark text-[13px] font-semibold">
            {part.slice(1, -1)}
          </code>
        );
      }

      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        return (
          <a
            key={index}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-cota-green hover:underline"
          >
            {linkMatch[1]}
          </a>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  const flushUnorderedList = (key: number) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} className="mb-6 space-y-2 pl-5 list-disc text-gray-600">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  const flushOrderedList = (key: number) => {
    if (orderedListItems.length > 0) {
      elements.push(
        <ol key={`ol-${key}`} className="mb-6 space-y-2 pl-5 list-decimal text-gray-600">
          {orderedListItems}
        </ol>
      );
      orderedListItems = [];
    }
  };

  const flushTable = (key: number) => {
    if (tableHeaders.length > 0) {
      elements.push(
        <div key={`table-${key}`} className="overflow-x-auto mb-7 rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead className="bg-gray-50">
              <tr>{tableHeaders}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">{tableRows}</tbody>
          </table>
        </div>
      );
      tableHeaders = [];
      tableRows = [];
    }
  };

  const flushAll = (key: number) => {
    flushUnorderedList(key);
    flushOrderedList(key);
    flushTable(key);
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      flushAll(i);
      continue;
    }

    if (line.startsWith("|") && line.endsWith("|")) {
      flushUnorderedList(i);
      flushOrderedList(i);

      const nextLine = lines[i + 1]?.trim() || "";
      const isSeparator = /^\|?[\s:-]+\|[\s|:-]*$/.test(line);
      if (isSeparator) continue;

      const cells = line
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean);

      const nextIsSeparator = nextLine.startsWith("|") && nextLine.includes("---");

      if (tableHeaders.length === 0 && nextIsSeparator) {
        tableHeaders = cells.map((cell, cellIndex) => (
          <th key={cellIndex} className="px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-500">
            {parseInline(cell)}
          </th>
        ));
        i++;
      } else if (tableHeaders.length > 0) {
        tableRows.push(
          <tr key={i} className="hover:bg-gray-50">
            {cells.map((cell, cellIndex) => (
              <td key={cellIndex} className="px-4 py-3 text-sm leading-relaxed text-gray-600">
                {parseInline(cell)}
              </td>
            ))}
          </tr>
        );
      }

      continue;
    }

    flushTable(i);

    if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("✅ ") || line.startsWith("✔ ")) {
      flushOrderedList(i);
      const cleanItem = line.replace(/^[-*]\s+/, "").replace(/^[✅✔]\s+/, "");
      listItems.push(
        <li key={i} className="leading-relaxed">
          {line.startsWith("✅") || line.startsWith("✔") ? (
            <span className="mr-1 text-cota-green">✓</span>
          ) : null}
          {parseInline(cleanItem)}
        </li>
      );
      continue;
    }

    const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      flushUnorderedList(i);
      orderedListItems.push(
        <li key={i} className="leading-relaxed">
          {parseInline(orderedMatch[2])}
        </li>
      );
      continue;
    }

    flushUnorderedList(i);
    flushOrderedList(i);

    if (line === "---" || line === "***") {
      elements.push(<hr key={i} className="my-8 border-gray-200" />);
      continue;
    }

    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="mb-5 mt-2 text-2xl sm:text-3xl font-black leading-tight tracking-tight text-cota-green-dark">
          {parseInline(line.slice(2))}
        </h1>
      );
      continue;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="mb-4 mt-8 border-b border-gray-100 pb-2 text-xl font-black leading-tight text-gray-800">
          {parseInline(line.slice(3))}
        </h2>
      );
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="mb-3 mt-6 text-lg font-bold leading-tight text-cota-green">
          {parseInline(line.slice(4))}
        </h3>
      );
      continue;
    }

    if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} className="my-6 rounded-r-xl border-l-4 border-cota-green bg-cota-green/5 p-4 italic leading-relaxed text-gray-700">
          {parseInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    elements.push(
      <p key={i} className="mb-4 text-[15px] leading-7 text-gray-600">
        {parseInline(line)}
      </p>
    );
  }

  flushAll(lines.length);

  return elements;
}


export default function CoursePlayerPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingProgress, setMarkingProgress] = useState(false);

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

    if (!response.ok) throw new Error("Erro na comunicação com a base EPSA");
    if (method === 'GET') {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }
    return true;
  };

  const loadPlayerData = async () => {
    if (!user || !courseId) return;
    try {
      setLoading(true);

      // 1. Carrega Trilha
      const courseArr = await directApiCall('courses', 'GET', undefined, `id=eq.${courseId}`);
      if (!courseArr || courseArr.length === 0) return;
      setCourse(courseArr[0]);

      // 2. Carrega Módulos ordenados pela ordem real (order_index)
      const modulesArr = await directApiCall('modules', 'GET', undefined, `course_id=eq.${courseId}`);
      const sortedModules = (modulesArr || []).sort((a: any, b: any) => {
        // 1º Prioridade: Organiza pela ordem numérica que o Admin definiu (order_index)
        const orderA = a.order_index ?? 999;
        const orderB = b.order_index ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        
        // 2º Prioridade (Desempate): Organiza pelo nome de forma inteligente (Módulo 1, Módulo 2...)
        return String(a.title).localeCompare(String(b.title), 'pt-BR', { numeric: true });
      });

      // 3. Carrega Aulas e Materiais para cada Módulo
      const fullStructure: Module[] = [];
      let firstLessonFound: Lesson | null = null;

      for (const mod of sortedModules) {
        const lessonsArr = await directApiCall('lessons', 'GET', undefined, `module_id=eq.${mod.id}`);
        // Ordenação inteligente também para as aulas
        const sortedLessons = (lessonsArr || []).sort((a: any, b: any) => {
          const orderA = a.order_index ?? 999;
          const orderB = b.order_index ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return String(a.title).localeCompare(String(b.title), 'pt-BR', { numeric: true });
        });

        const lessonsWithMaterials: Lesson[] = [];
        for (const les of sortedLessons) {
          const matsArr = await directApiCall('materials', 'GET', undefined, `lesson_id=eq.${les.id}`);
          const lessonData = { ...les, materials: matsArr || [] };
          lessonsWithMaterials.push(lessonData);

          if (!firstLessonFound) firstLessonFound = lessonData;
        }
        fullStructure.push({ ...mod, lessons: lessonsWithMaterials });
      }
      setModules(fullStructure);
      if (firstLessonFound) setCurrentLesson(firstLessonFound);

      // 4. Carrega as aulas concluídas pelo usuário
      const progressArr = await directApiCall('lesson_progress', 'GET', undefined, `student_id=eq.${user.id}`);
      setCompletedLessons((progressArr || []).map((p: any) => p.lesson_id));

    } catch (error) {
      toast.error("Erro ao preparar player de vídeo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayerData();
  }, [courseId, user]);

  const toggleLessonCompletion = async (lessonId: string) => {
    if (!user || markingProgress) return;
    const wasCompleted = completedLessons.includes(lessonId);

    try {
      setMarkingProgress(true);
      if (wasCompleted) {
        await directApiCall('lesson_progress', 'DELETE', undefined, `student_id=eq.${user.id}&lesson_id=eq.${lessonId}`);
        setCompletedLessons(completedLessons.filter(id => id !== lessonId));
        toast.info("Aula marcada como não concluída.");
      } else {
        await directApiCall('lesson_progress', 'POST', { student_id: user.id, lesson_id: lessonId, is_completed: true });
        setCompletedLessons([...completedLessons, lessonId]);
        toast.success("Aula concluída! Progresso salvo. 🚀");
      }
    } catch (err) {
      toast.error("Erro ao atualizar progresso.");
    } finally {
      setMarkingProgress(false);
    }
  };

  // Cálculo de Progresso Geral da Trilha
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;

  if (loading) return <div className="flex justify-center py-32"><div className="w-10 h-10 border-4 border-cota-green border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="w-full max-w-[1500px] mx-auto px-2 sm:px-4 pb-10 h-auto lg:h-[calc(100vh-90px)] flex flex-col min-w-0">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <Link to="/catalog" className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
          <ChevronLeft className="w-4 h-4" /> Voltar ao Catálogo
        </Link>
        <div className="flex items-center gap-3 bg-white px-4 py-1.5 rounded-xl border border-gray-100 shadow-sm">
          <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden hidden sm:block">
            <div className="bg-cota-green h-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <span className="text-xs font-black text-gray-700">{progressPercent}% Concluído</span>
        </div>
      </div>

      {/* Main Player Canvas */}
      <div className="flex flex-col lg:flex-row gap-6 flex-none lg:flex-1 lg:min-h-0">
        
        {/* LADO ESQUERDO: VÍDEO + TEXTO + MATERIAIS */}
        <div className="w-full flex-none lg:flex-1 flex flex-col lg:min-h-0 overflow-visible lg:overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 custom-scrollbar">
          {currentLesson ? (
            <>
              {/* Box de Vídeo Cinema */}
              {currentLesson.video_url ? (
                <div className="w-full aspect-video rounded-xl bg-black overflow-hidden shadow-md border border-gray-900 mb-6 flex-shrink-0 relative group">
                  <iframe 
                    src={getYouTubeEmbedUrl(currentLesson.video_url)} 
                    title={currentLesson.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-[#0a1a15] to-[#14352a] mb-6 flex-shrink-0 flex flex-col items-center justify-center p-6 text-center border border-gray-800 shadow-inner relative">
                  <Video className="w-12 h-12 text-[#b8995a] mb-3 opacity-60" />
                  <h3 className="font-bold text-white text-base">Material de Leitura Avançada</h3>
                  <p className="text-xs text-gray-400 max-w-sm mt-1">Esta aula foi estruturada com foco em roteiros de texto e materiais de apoio logo abaixo.</p>
                </div>
              )}

              {/* Informações da Aula */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-5">
                <div>
                  <span className="text-[10px] font-bold text-[#b8995a] uppercase tracking-widest bg-[#b8995a]/10 px-2 py-0.5 rounded">Aula Atual</span>
                  <h2 className="text-lg sm:text-xl font-black text-gray-800 mt-1 leading-tight">{currentLesson.title}</h2>
                </div>
                
                <button 
                  onClick={() => toggleLessonCompletion(currentLesson.id)}
                  disabled={markingProgress}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 ${
                    completedLessons.includes(currentLesson.id)
                    ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
                    : 'bg-cota-green text-white hover:bg-cota-green-light'
                  }`}
                >
                  {completedLessons.includes(currentLesson.id) ? (
                    <><Check className="w-4 h-4"/> Aula Concluída</>
                  ) : (
                    "Marcar como Concluída"
                  )}
                </button>
              </div>

              {/* Conteúdo Teórico com renderização real de Markdown */}
              {currentLesson.content && (
                <div className="max-w-none mb-8 bg-gray-50 p-4 sm:p-6 rounded-xl border border-gray-100">
                  {renderMarkdown(currentLesson.content)}
                </div>
              )}

              {/* Materiais Anexados */}
              {currentLesson.materials && currentLesson.materials.length > 0 && (
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> Arquivos Complementares para Download
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentLesson.materials.map(mat => (
                      <a 
                        key={mat.id} 
                        href={mat.file_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:border-[#b8995a] hover:bg-[#b8995a]/5 transition-all group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-gray-400 group-hover:text-[#b8995a]" />
                          <span className="text-xs font-bold text-gray-700 truncate pr-2">{mat.title}</span>
                        </div>
                        <FileDown className="w-4 h-4 text-gray-300 group-hover:text-[#b8995a] flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-12">
              <BookOpen className="w-12 h-12 mb-3 text-gray-200" />
              <p className="text-sm">Nenhuma aula selecionada nesta trilha da EPSA.</p>
            </div>
          )}
        </div>

        {/* LADO DIREITO: ÍNDICE DE MÓDULOS (ESTILO NETFLIX) */}
        <div className="w-full lg:w-1/3 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-auto lg:h-full">
          <div className="p-4 border-b border-gray-100 bg-gray-50/60 shrink-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{course?.category}</span>
            <h3 className="font-bold text-gray-800 text-sm sm:text-base truncate mt-0.5">{course?.title}</h3>
          </div>

          {/* Grade de Aulas */}
          <div className="flex-none lg:flex-1 max-h-[70vh] lg:max-h-none overflow-y-auto p-2 space-y-4 custom-scrollbar">
            {modules.map((mod) => (
              <div key={mod.id} className="space-y-1">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider px-2 mb-1.5 mt-2">
                  {mod.title}
                </p>
                
                <div className="space-y-1">
                  {mod.lessons.map(lesson => {
                    const isSelected = currentLesson?.id === lesson.id;
                    const isCompleted = completedLessons.includes(lesson.id);
                    return (
                      <button 
                        key={lesson.id}
                        onClick={() => { setCurrentLesson(lesson); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                          isSelected 
                          ? 'bg-[#0a1a15] border-[#0a1a15] text-white shadow-sm font-bold' 
                          : 'bg-white border-transparent hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isCompleted ? (
                            <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-[#b8995a]' : 'text-cota-green'}`} />
                          ) : (
                            <Circle className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-white/40' : 'text-gray-300'}`} />
                          )}
                          <span className="text-xs truncate pr-2 leading-tight">{lesson.title}</span>
                        </div>
                        <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${
                          isSelected ? 'bg-white/10 text-[#b8995a]' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {lesson.duration_minutes}m
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* ACESSO AO QUIZ FINAL DE CERTIFICAÇÃO */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
            <button 
              onClick={() => navigate('/quizzes')}
              className="w-full bg-[#b8995a] hover:bg-[#a1854e] text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow transition-all"
            >
              <Trophy className="w-4 h-4 text-white" /> Fazer Avaliação Final <ArrowRight className="w-4 h-4"/>
            </button>
            <p className="text-[10px] text-center text-gray-400 font-medium mt-2">Exige nota mínima de 70% para emissão do certificado.</p>
          </div>

        </div>

      </div>

    </div>
  );
}