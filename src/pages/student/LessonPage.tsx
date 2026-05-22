import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle, Download, Save, ChevronRight, BookOpen, FileText } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { POINTS_PER_LESSON } from "@/constants";
import type { Lesson, Module, Material } from "@/types";

interface FullLesson extends Lesson {
  module?: Module & { course?: { id: string; title: string } };
}

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const { user, updatePoints } = useAuthStore();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<FullLesson | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [prevLesson, setPrevLesson] = useState<Lesson | null>(null);
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // =====================================================================
  // O MOTOR CENTRAL "MODO DEUS" (Sem Cache)
  // =====================================================================
  const directApiCall = async (tableName: string, method: string, body?: any, query?: string, customPrefer?: string) => {
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
        'Prefer': customPrefer || (method === 'POST' ? 'return=representation' : 'return=minimal'),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro ${response.status}: ${errText}`);
    }
    
    if (method === 'GET' || (method === 'POST' && (!customPrefer || customPrefer.includes('return=representation')))) {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }
    return true;
  };
  // =====================================================================

  const getEmbedUrl = (url?: string | null) => {
    if (!url) return "";
    try {
      if (url.includes("youtu.be/")) {
        const videoId = url.split("youtu.be/")[1]?.split("?")[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
      if (url.includes("youtube.com/watch")) {
        const urlObj = new URL(url);
        const videoId = urlObj.searchParams.get("v");
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }
    } catch (e) { return url; }
    return url;
  };

  // =====================================================================
  // TRADUTOR DE MARKDOWN NATIVO (Transforma #, ** e Tabelas em Visual)
  // =====================================================================
  const renderMarkdown = (content: string) => {
    if (!content) return null;
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    
    let inList = false;
    let listItems: JSX.Element[] = [];
    
    let inTable = false;
    let tableHeaders: JSX.Element[] = [];
    let tableRows: JSX.Element[] = [];

    // Parseador de Negrito e Itálico dentro da linha
    const parseInline = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={i} className="italic">{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      });
    };

    const flushList = (index: number) => {
      if (inList) {
        elements.push(<ul key={`ul-${index}`} className="list-disc pl-5 mb-5 text-gray-600 space-y-1">{listItems}</ul>);
        inList = false;
        listItems = [];
      }
    };

    const flushTable = (index: number) => {
      if (inTable) {
        elements.push(
          <div key={`table-${index}`} className="overflow-x-auto mb-6 rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-left border-collapse bg-white">
              <thead className="bg-gray-50"><tr>{tableHeaders}</tr></thead>
              <tbody className="divide-y divide-gray-100">{tableRows}</tbody>
            </table>
          </div>
        );
        inTable = false;
        tableHeaders = [];
        tableRows = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Verificação de Tabela
      if (line.trim().startsWith('|')) {
        flushList(i);
        inTable = true;
        if (line.includes('---|---')) continue; // Ignora linha separadora
        
        const cells = line.split('|').filter(c => c.trim() !== '').map(c => c.trim());
        if (tableHeaders.length === 0) {
          tableHeaders = cells.map((c, idx) => <th key={idx} className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{parseInline(c)}</th>);
        } else {
          tableRows.push(
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              {cells.map((c, idx) => <td key={idx} className="px-5 py-3 text-sm text-gray-600">{parseInline(c)}</td>)}
            </tr>
          );
        }
        continue;
      } else {
        flushTable(i);
      }

      // Verificação de Lista
      if (line.startsWith('* ') || line.startsWith('- ')) {
        inList = true;
        listItems.push(<li key={i}>{parseInline(line.substring(2))}</li>);
        continue;
      } else {
        flushList(i);
      }

      // Títulos e Outros Elementos
      if (line.trim() === '---' || line.trim() === '***') {
        elements.push(<hr key={i} className="my-8 border-gray-200" />);
      } else if (line.startsWith('# ')) {
       elements.push(<h1 key={i} className="text-2xl md:text-3xl font-black mt-10 mb-5 tracking-tight uppercase text-cota-green-dark">{parseInline(line.substring(2))}</h1>);
      } else if (line.startsWith('## ')) {
        elements.push(<h2 key={i} className="text-xl font-bold text-gray-800 mt-8 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">{parseInline(line.substring(3))}</h2>);
      } else if (line.startsWith('### ')) {
       elements.push(<h3 key={i} className="text-lg font-bold mt-6 mb-3 text-cota-green">{parseInline(line.substring(4))}</h3>);
      } else if (line.startsWith('> ')) {
        elements.push(<blockquote key={i} className="border-l-4 border-cota-green bg-cota-green/5 p-4 my-5 rounded-r-xl italic text-gray-700">{parseInline(line.substring(2))}</blockquote>);
      } else if (line.trim() === '') {
        // Ignora linhas totalmente vazias
      } else {
        elements.push(<p key={i} className="mb-4 text-gray-600 leading-relaxed text-[15px]">{parseInline(line)}</p>);
      }
    }
    
    flushList(lines.length);
    flushTable(lines.length);

    return elements;
  };
  // =====================================================================

  useEffect(() => {
  async function load() {
    try {
      setLoading(true);
      const lessonDataArr = await directApiCall("lessons", "GET", undefined, `id=eq.${id}&select=*,modules(*,courses(id,title))`);
      const lessonData = lessonDataArr?.[0];
      if (!lessonData) return;
      setLesson(lessonData as FullLesson);

      const matData = await directApiCall("materials", "GET", undefined, `lesson_id=eq.${id}`);
      setMaterials(matData || []);

      const progDataArr = await directApiCall("lesson_progress", "GET", undefined, `student_id=eq.${user!.id}&lesson_id=eq.${id}`);
      const progData = progDataArr?.[0];
      if (progData) {
        setIsCompleted(progData.completed);
        setNotes(progData.notes || "");
      }

      // NOVO BLOCO DE ORDENAÇÃO AQUI:
      const siblingLessons = await directApiCall("lessons", "GET", undefined, `module_id=eq.${lessonData.module_id}`);

if (siblingLessons) {
  // Ignora o banco de dados e força a ordenação estritamente pelo texto/número do título
  siblingLessons.sort((a: any, b: any) => {
    return String(a.title || "").trim().localeCompare(
      String(b.title || "").trim(), 
      'pt-BR', 
      { numeric: true, sensitivity: 'base' }
    );
  });

  const idx = siblingLessons.findIndex((l: any) => l.id === id);
  setPrevLesson(idx > 0 ? siblingLessons[idx - 1] : null);
  setNextLesson(idx < siblingLessons.length - 1 ? siblingLessons[idx + 1] : null);
}
    } catch (error) {  // <-- ATENÇÃO: A chave do try deve fechar logo antes do catch
      toast.error("Ocorreu um erro ao carregar o conteúdo da aula.");
    } finally {
      setLoading(false);
    }
  }
  load();
}, [id, user]);

  const handleMarkComplete = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await directApiCall('lesson_progress', 'POST', {
        student_id: user!.id, lesson_id: id!, completed: !isCompleted, notes, completed_at: !isCompleted ? now : null,
      }, 'on_conflict=student_id,lesson_id', 'resolution=merge-duplicates,return=minimal');

      const newCompleted = !isCompleted;
      setIsCompleted(newCompleted);

      if (newCompleted) {
        const newPoints = (user?.points || 0) + POINTS_PER_LESSON;
        await directApiCall("user_profiles", "PATCH", { points: newPoints }, `id=eq.${user!.id}`);
        updatePoints(newPoints);
        toast.success(`Aula concluída! +${POINTS_PER_LESSON} pontos conquistados!`);
        if (nextLesson) setTimeout(() => navigate(`/lessons/${nextLesson.id}`), 1200);
      } else {
        toast.info("Aula marcada como não concluída.");
      }
    } catch (error) { toast.error("Erro ao salvar progresso."); } finally { setSaving(false); }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await directApiCall('lesson_progress', 'POST', {
        student_id: user!.id, lesson_id: id!, notes, completed: isCompleted,
      }, 'on_conflict=student_id,lesson_id', 'resolution=merge-duplicates,return=minimal');
      toast.success("Anotações salvas!");
    } catch (error) { toast.error("Erro ao salvar anotações."); } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!lesson) return <div className="text-center py-20 text-gray-400">Aula não encontrada.</div>;

  const courseId = (lesson.module as Module & { course?: { id: string; title: string } })?.course?.id;
  const courseTitle = (lesson.module as Module & { course?: { id: string; title: string } })?.course?.title;

  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-5">
        {courseId && (
          <>
            <Link to={`/courses/${courseId}`} className="hover:text-cota-green transition-colors">{courseTitle}</Link>
            <span>/</span>
            <span className="text-gray-500">{lesson.module?.title}</span>
            <span>/</span>
          </>
        )}
        <span className="text-gray-700 font-medium truncate">{lesson.title}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {lesson.video_url ? (
              <div className="aspect-video">
                <iframe src={getEmbedUrl(lesson.video_url)} className="w-full h-full" allowFullScreen />
              </div>
            ) : (
              <div className="aspect-video bg-cota-green-dark flex items-center justify-center">
                <div className="text-center text-white/50">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Conteúdo em formato texto</p>
                </div>
              </div>
            )}
            <div className="p-5">
              <h1 className="text-xl font-bold text-gray-800">{lesson.title}</h1>
              <p className="text-xs text-gray-400 mt-1">Duração: {lesson.duration_minutes} minutos</p>
            </div>
          </div>

          {lesson.content && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 lg:p-8">
              {/* O NOVO RENDERIZADOR NATIVO EM AÇÃO AQUI */}
              {renderMarkdown(lesson.content)}
            </div>
          )}

          {materials.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Download className="w-4 h-4 text-cota-green" /> Materiais para Download
              </h2>
              <div className="space-y-2">
                {materials.map((mat) => (
                  <a key={mat.id} href={mat.file_url || "#"} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-cota-green/5 border border-gray-100 rounded-lg transition-colors group">
                    <div className="w-8 h-8 rounded bg-cota-green/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-cota-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 group-hover:text-cota-green truncate">{mat.title}</p>
                      {mat.file_size && <p className="text-xs text-gray-400">{mat.file_size}</p>}
                    </div>
                    <Download className="w-4 h-4 text-gray-400 group-hover:text-cota-green flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-3">Minhas Anotações</h2>
            <textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escreva suas anotações sobre esta aula..."
              rows={4}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green resize-none"
            />
            <button onClick={handleSaveNotes} disabled={saving}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              <Save className="w-3.5 h-3.5" /> Salvar Anotações
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <button
              onClick={handleMarkComplete}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all ${
                isCompleted
                  ? "bg-cota-green/10 text-cota-green border-2 border-cota-green"
                  : "bg-cota-green text-white hover:bg-cota-green-light"
              } disabled:opacity-50`}
            >
              {saving ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : (
                <><CheckCircle className="w-4 h-4" />{isCompleted ? "Aula Concluída ✓" : "Marcar como Concluída"}</>
              )}
            </button>
            {isCompleted && <p className="text-center text-xs text-cota-green mt-2">+{POINTS_PER_LESSON} pontos conquistados!</p>}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Navegação</p>
            {prevLesson && (
              <Link to={`/lessons/${prevLesson.id}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-cota-green transition-colors p-2 rounded-lg hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{prevLesson.title}</span>
              </Link>
            )}
            {nextLesson && (
              <Link to={`/lessons/${nextLesson.id}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-cota-green transition-colors p-2 rounded-lg hover:bg-gray-50">
                <span className="truncate flex-1">{nextLesson.title}</span>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              </Link>
            )}
          </div>

          {courseId && (
            <Link to={`/courses/${courseId}`}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-cota-green p-4 bg-white rounded-xl border border-gray-100 shadow-sm transition-colors">
              <ChevronLeft className="w-4 h-4" /> Voltar para a Trilha
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}