import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  ChevronLeft, Plus, Trash2, BookOpen, Video, FileText, 
  ChevronDown, ChevronUp, CheckCircle2, Edit2, X, Trophy, Clock, ListPlus
} from "lucide-react";
import { toast } from "sonner";
import type { Course, Module, Lesson, Material, Quiz, QuizQuestion, QuizOption } from "@/types";

interface ModuleWithLessons extends Module {
  lessons: (Lesson & { materials: Material[] })[];
}

type EditorTab = "structure" | "quiz";

export default function CourseEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<EditorTab>("structure");
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [quiz, setQuiz] = useState<(Quiz & { quiz_questions: (QuizQuestion & { quiz_options: QuizOption[] })[] }) | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // States: Editar Trilha
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [editCourseTitle, setEditCourseTitle] = useState("");
  const [editCourseDescription, setEditCourseDescription] = useState("");

  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // Formulários de Criação
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  
  const [showLessonForm, setShowLessonForm] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonDuration, setLessonDuration] = useState(10);
  const [lessonContent, setLessonContent] = useState("");

  const [showMaterialForm, setShowMaterialForm] = useState<string | null>(null);
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialFileUrl, setMaterialFileUrl] = useState("");
  const [materialFileSize, setMaterialFileSize] = useState("");

  // States: Editar Módulo
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState("");

  // States: Editar Aula
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState("");
  const [editLessonVideoUrl, setEditLessonVideoUrl] = useState("");
  const [editLessonDuration, setEditLessonDuration] = useState(10);
  const [editLessonContent, setEditLessonContent] = useState("");

  // Quizzes: Unitário e Lote
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [optD, setOptD] = useState("");
  const [correctOpt, setCorrectOpt] = useState<"A" | "B" | "C" | "D">("A");

  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const [quizPassingScore, setQuizPassingScore] = useState(70);
  const [quizTimeLimit, setQuizTimeLimit] = useState("");

  // =====================================================================
  // O MOTOR CENTRAL "MODO DEUS"
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

  useEffect(() => {
    loadCourseData();
  }, [id]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const courseArr = await directApiCall('courses', 'GET', undefined, `id=eq.${id}&select=*`);
      if (!courseArr || courseArr.length === 0) return;
      setCourse(courseArr[0]);
      setEditCourseTitle(courseArr[0].title);
      setEditCourseDescription(courseArr[0].description || "");

      const modulesArr = await directApiCall('modules', 'GET', undefined, `course_id=eq.${id}&select=*`);
      const sortedModules = (modulesArr || []).sort((a: any, b: any) => 
        String(a.title || "").trim().localeCompare(String(b.title || "").trim(), 'pt-BR', { numeric: true, sensitivity: 'base' })
      );

      const fullModules: ModuleWithLessons[] = [];
      for (const mod of sortedModules) {
        const lessonsArr = await directApiCall('lessons', 'GET', undefined, `module_id=eq.${mod.id}&select=*`);
        const sortedLessons = (lessonsArr || []).sort((a: any, b: any) => 
          String(a.title || "").trim().localeCompare(String(b.title || "").trim(), 'pt-BR', { numeric: true, sensitivity: 'base' })
        );

        const fullLessons: any[] = [];
        for (const les of sortedLessons) {
          const matsArr = await directApiCall('materials', 'GET', undefined, `lesson_id=eq.${les.id}&select=*`);
          fullLessons.push({ ...les, materials: matsArr || [] });
        }
        fullModules.push({ ...mod, lessons: fullLessons });
      }
      setModules(fullModules);

      const quizArr = await directApiCall('quizzes', 'GET', undefined, `course_id=eq.${id}&select=*`);
      if (quizArr && quizArr.length > 0) {
        const baseQuiz = quizArr[0];
        setQuizPassingScore(baseQuiz.passing_score);
        setQuizTimeLimit(baseQuiz.time_limit_minutes ? String(baseQuiz.time_limit_minutes) : "");

        const questionsArr = await directApiCall('quiz_questions', 'GET', undefined, `quiz_id=eq.${baseQuiz.id}&select=*&order=order_index.asc`);
        const fullQuestions: any[] = [];
        if (questionsArr) {
          for (const q of questionsArr) {
            const optionsArr = await directApiCall('quiz_options', 'GET', undefined, `question_id=eq.${q.id}&select=*&order=order_index.asc`);
            fullQuestions.push({ ...q, quiz_options: optionsArr || [] });
          }
        }
        setQuiz({ ...baseQuiz, quiz_questions: fullQuestions });
      } else {
        setQuiz(null);
      }
    } catch (error) {
      toast.error("Erro ao sincronizar os dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await directApiCall('courses', 'PATCH', { title: editCourseTitle, description: editCourseDescription }, `id=eq.${id}`);
      toast.success("Trilha atualizada!");
      setShowEditCourseModal(false);
      await loadCourseData();
    } catch (error) { toast.error("Erro ao atualizar trilha."); } finally { setSaving(false); }
  };

  // --- Módulos ---
  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleTitle) return;
    try {
      setSaving(true);
      const nextOrder = modules.length + 1;
      await directApiCall('modules', 'POST', { course_id: id, title: moduleTitle, order_index: nextOrder });
      toast.success("Módulo adicionado!");
      setModuleTitle(""); setShowModuleForm(false);
      await loadCourseData();
    } catch (error) { toast.error("Erro ao adicionar módulo."); } finally { setSaving(false); }
  };

  const handleUpdateModule = async (modId: string) => {
    if (!editModuleTitle) return;
    try {
      setSaving(true);
      await directApiCall('modules', 'PATCH', { title: editModuleTitle }, `id=eq.${modId}`);
      toast.success("Módulo atualizado com sucesso!");
      setEditingModuleId(null);
      await loadCourseData();
    } catch (error) { toast.error("Erro ao atualizar módulo."); } finally { setSaving(false); }
  };

  const handleDeleteModule = async (modId: string) => {
    if (!confirm("Excluir este módulo apagará todas as aulas nele. Continuar?")) return;
    try {
      await directApiCall('modules', 'DELETE', undefined, `id=eq.${modId}`);
      toast.success("Módulo removido.");
      await loadCourseData();
    } catch (error) { toast.error("Erro."); }
  };

  // --- Aulas ---
  const handleAddLesson = async (e: React.FormEvent, moduleId: string) => {
    e.preventDefault();
    try {
      setSaving(true);
      const mod = modules.find(m => m.id === moduleId);
      const nextOrder = (mod?.lessons?.length || 0) + 1;
      await directApiCall('lessons', 'POST', {
        module_id: moduleId, title: lessonTitle, video_url: lessonVideoUrl || null,
        duration_minutes: Number(lessonDuration) || 10, content: lessonContent || null, order_index: nextOrder
      });
      toast.success("Aula salva!");
      setLessonTitle(""); setLessonVideoUrl(""); setLessonDuration(10); setLessonContent(""); setShowLessonForm(null);
      await loadCourseData();
    } catch (error) { toast.error("Erro ao salvar aula."); } finally { setSaving(false); }
  };

  const handleUpdateLesson = async (lesId: string) => {
    if (!editLessonTitle) return;
    try {
      setSaving(true);
      await directApiCall('lessons', 'PATCH', {
        title: editLessonTitle,
        video_url: editLessonVideoUrl || null,
        duration_minutes: Number(editLessonDuration) || 10,
        content: editLessonContent || null
      }, `id=eq.${lesId}`);
      toast.success("Aula atualizada com sucesso!");
      setEditingLessonId(null);
      await loadCourseData();
    } catch (error) { toast.error("Erro ao atualizar aula."); } finally { setSaving(false); }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Excluir esta aula?")) return;
    try {
      await directApiCall('lessons', 'DELETE', undefined, `id=eq.${lessonId}`);
      toast.success("Aula excluída.");
      await loadCourseData();
    } catch (error) { toast.error("Erro."); }
  };

  // --- Materiais ---
  const handleAddMaterial = async (e: React.FormEvent, lessonId: string) => {
    e.preventDefault();
    try {
      setSaving(true);
      await directApiCall('materials', 'POST', {
        lesson_id: lessonId, course_id: id, title: materialTitle, file_url: materialFileUrl, file_size: materialFileSize || "1.5 MB"
      });
      toast.success("Material anexado!");
      setMaterialTitle(""); setMaterialFileUrl(""); setMaterialFileSize(""); setShowMaterialForm(null);
      await loadCourseData();
    } catch (error) { toast.error("Erro ao anexar."); } finally { setSaving(false); }
  };

  const handleDeleteMaterial = async (matId: string) => {
    if (!confirm("Remover este material?")) return;
    try {
      await directApiCall('materials', 'DELETE', undefined, `id=eq.${matId}`);
      toast.success("Material removido.");
      await loadCourseData();
    } catch (error) { toast.error("Erro."); }
  };

  // --- Quiz Base ---
  const handleCreateBaseQuiz = async () => {
    if (!course) return;
    try {
      setSaving(true);
      await directApiCall('quizzes', 'POST', {
        course_id: id, title: `Quiz Final — ${course.title}`, description: `Avaliação de certificação.`, passing_score: 70
      });
      toast.success("Quiz inicializado!");
      await loadCourseData();
    } catch (error) { toast.error("Erro."); } finally { setSaving(false); }
  };

  const handleUpdateQuizConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz) return;
    try {
      setSaving(true);
      await directApiCall('quizzes', 'PATCH', {
        passing_score: Number(quizPassingScore), time_limit_minutes: quizTimeLimit ? Number(quizTimeLimit) : null
      }, `id=eq.${quiz.id}`);
      toast.success("Regras salvas!");
      await loadCourseData();
    } catch (error) { toast.error("Erro."); } finally { setSaving(false); }
  };

  // --- Quiz Unitário ---
  const handleAddQuestionWithOptions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz || !questionText || !optA || !optB || !optC || !optD) return;

    try {
      setSaving(true);
      const nextOrder = (quiz.quiz_questions?.length || 0) + 1;
      
      const qRes = await directApiCall('quiz_questions', 'POST', {
        quiz_id: quiz.id, question: questionText, order_index: nextOrder
      }, 'return=representation');
      const newQId = Array.isArray(qRes) ? qRes[0]?.id : qRes?.id;

      if (!newQId) throw new Error("ID não retornado");

      await Promise.all([
        directApiCall('quiz_options', 'POST', { question_id: newQId, text: optA, is_correct: correctOpt === "A", order_index: 1 }),
        directApiCall('quiz_options', 'POST', { question_id: newQId, text: optB, is_correct: correctOpt === "B", order_index: 2 }),
        directApiCall('quiz_options', 'POST', { question_id: newQId, text: optC, is_correct: correctOpt === "C", order_index: 3 }),
        directApiCall('quiz_options', 'POST', { question_id: newQId, text: optD, is_correct: correctOpt === "D", order_index: 4 }),
      ]);

      toast.success("Pergunta registrada!");
      setShowQuestionForm(false); setQuestionText(""); setOptA(""); setOptB(""); setOptC(""); setOptD("");
      await loadCourseData();
    } catch (error: any) { toast.error(`Erro: ${error.message}`); } finally { setSaving(false); }
  };

  // --- Importador Mágico ---
  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz || !bulkText.trim()) return;

    try {
      setSaving(true);
      const lines = bulkText.split('\n');
      let currentQ: { question: string, options: { text: string, is_correct: boolean }[] } | null = null;
      const parsedQuestions: { question: string, options: { text: string, is_correct: boolean }[] }[] = [];

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.toLowerCase().includes('pergunta') && line.includes(':')) {
          if (currentQ && currentQ.options.length > 0) parsedQuestions.push(currentQ);
          const qText = line.split(':').slice(1).join(':').replace(/\*\*/g, '').trim();
          currentQ = { question: qText, options: [] };
        } 
        else {
          const optMatch = line.match(/^[-\*\•]?\s*\[\s*([xXvV]?)\s*\]\s*(.*)/);
          if (optMatch && currentQ) {
            const isCorrect = ['x', 'v'].includes(optMatch[1].toLowerCase());
            const optText = optMatch[2].replace(/\*\*/g, '').trim();
            currentQ.options.push({ text: optText, is_correct: isCorrect });
          }
        }
      }
      
      if (currentQ && currentQ.options.length > 0) parsedQuestions.push(currentQ);

      if (parsedQuestions.length === 0) {
        toast.error("Formato inválido. Não encontrei nenhuma pergunta.");
        setSaving(false); return;
      }

      let baseOrder = quiz.quiz_questions?.length || 0;
      let successCount = 0;

      for (const pq of parsedQuestions) {
        baseOrder++;
        const qRes = await directApiCall('quiz_questions', 'POST', {
          quiz_id: quiz.id, question: pq.question, order_index: baseOrder
        }, 'return=representation');

        const newQId = Array.isArray(qRes) ? qRes[0]?.id : qRes?.id;
        if (!newQId) throw new Error(`Falha no ID da pergunta: ${pq.question.substring(0, 15)}...`);

        const optsPromises = pq.options.map((opt, idx) => 
          directApiCall('quiz_options', 'POST', {
            question_id: newQId, text: opt.text, is_correct: opt.is_correct, order_index: idx + 1
          }, 'return=minimal')
        );
        await Promise.all(optsPromises);
        successCount++;
      }

      toast.success(`${successCount} perguntas importadas com sucesso! 🚀`);
      setShowBulkForm(false); setBulkText("");
      await loadCourseData();
    } catch (error: any) {
      toast.error(`Falha: ${error.message}`);
    } finally { setSaving(false); }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm("Excluir pergunta?")) return;
    try {
      await directApiCall('quiz_questions', 'DELETE', undefined, `id=eq.${qId}`);
      toast.success("Pergunta removida.");
      await loadCourseData();
    } catch (error) { toast.error("Erro."); }
  };

  const toggleModuleExpanded = (modId: string) => setExpandedModules((prev) => prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20 w-full">
      <div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-2 md:px-4">
      {/* Modal Editar Trilha */}
      {showEditCourseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-800">Editar Trilha</h2>
              <button onClick={() => setShowEditCourseModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdateCourse} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Título</label>
                <input type="text" value={editCourseTitle} onChange={(e) => setEditCourseTitle(e.target.value)} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-cota-green" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Descrição</label>
                <textarea value={editCourseDescription} onChange={(e) => setEditCourseDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-cota-green resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowEditCourseModal(false)} className="flex-1 border py-2 rounded-lg text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-cota-green text-white py-2 rounded-lg text-sm font-bold">{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Link to="/admin" className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-cota-green shadow-sm">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div>
              <span className="text-xs font-bold text-cota-gold uppercase tracking-wider">Editor de Conteúdo</span>
              <h1 className="text-lg md:text-xl font-black text-gray-800 leading-tight">{course?.title}</h1>
            </div>
            <button onClick={() => setShowEditCourseModal(true)} className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-md transition-colors"><Edit2 className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        <button onClick={() => setTab("structure")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${tab === "structure" ? "bg-white text-cota-green shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <BookOpen className="w-4 h-4" /> Estrutura da Trilha
        </button>
        <button onClick={() => setTab("quiz")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${tab === "quiz" ? "bg-white text-cota-green shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <Trophy className="w-4 h-4" /> Quiz Final da Trilha
        </button>
      </div>

      {/* TAB 1: ESTRUTURA DA TRILHA */}
      {tab === "structure" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div>
              <h2 className="font-bold text-gray-800 text-sm md:text-base">Módulos e Aulas</h2>
              <p className="text-xs text-gray-400">{modules.length} módulos estruturados de A-Z</p>
            </div>
            <button onClick={() => setShowModuleForm(!showModuleForm)} className="flex items-center gap-1.5 bg-cota-green text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-cota-green-light transition-all">
              <Plus className="w-4 h-4" /> Novo Módulo
            </button>
          </div>

          {showModuleForm && (
            <form onSubmit={handleAddModule} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
              <p className="text-xs font-bold text-gray-700 uppercase">Título do Módulo</p>
              <input type="text" value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModuleForm(false)} className="text-xs text-gray-500 px-3 py-2">Cancelar</button>
                <button type="submit" disabled={saving} className="bg-cota-green text-white px-4 py-2 rounded-lg text-xs font-bold">Criar Módulo</button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {modules.map((mod) => {
              const isExpanded = expandedModules.includes(mod.id);
              return (
                <div key={mod.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  
                  {/* HEADER DO MÓDULO (COM EDIÇÃO) */}
                  {editingModuleId === mod.id ? (
                    <div className="flex items-center gap-2 p-4 bg-gray-50 border-b border-gray-100">
                      <input type="text" value={editModuleTitle} onChange={(e) => setEditModuleTitle(e.target.value)} className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cota-green" autoFocus />
                      <button onClick={() => handleUpdateModule(mod.id)} disabled={saving} className="px-3 py-1.5 bg-cota-green text-white text-xs font-bold rounded-lg hover:bg-cota-green-light">Salvar</button>
                      <button onClick={() => setEditingModuleId(null)} className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-xs">Cancelar</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-gray-50/60 border-b border-gray-100">
                      <button type="button" onClick={() => toggleModuleExpanded(mod.id)} className="flex items-center gap-3 font-bold text-gray-700 text-sm text-left flex-1 min-w-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                        <span className="truncate">{mod.title}</span>
                      </button>
                      <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                        <button type="button" onClick={() => setShowLessonForm(showLessonForm === mod.id ? null : mod.id)} className="text-xs bg-cota-green/10 text-cota-green px-2.5 py-1 rounded font-bold hover:bg-cota-green hover:text-white transition-all mr-1">
                          + Aula
                        </button>
                        <button type="button" onClick={() => { setEditingModuleId(mod.id); setEditModuleTitle(mod.title); }} className="p-1.5 text-gray-400 hover:text-cota-green rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleDeleteModule(mod.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* FORMULÁRIO DE NOVA AULA */}
                  {showLessonForm === mod.id && (
                    <form onSubmit={(e) => handleAddLesson(e, mod.id)} className="p-5 border-b border-gray-100 bg-gray-50/50 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nome da Aula</label>
                          <input type="text" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Duração (Minutos)</label>
                          <input type="number" value={lessonDuration} onChange={(e) => setLessonDuration(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">URL do Vídeo</label>
                        <input type="text" value={lessonVideoUrl} onChange={(e) => setLessonVideoUrl(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Conteúdo (Markdown)</label>
                        <textarea value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} rows={6} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono bg-white resize-none" />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setShowLessonForm(null)} className="text-xs text-gray-500 px-3 py-2">Cancelar</button>
                        <button type="submit" className="bg-cota-green text-white px-4 py-2 rounded-lg text-xs font-bold">Salvar Nova Aula</button>
                      </div>
                    </form>
                  )}

                  {/* LISTAGEM DE AULAS */}
                  {isExpanded && (
                    <div className="divide-y divide-gray-100 bg-white">
                      {mod.lessons.map((les) => (
                        <div key={les.id}>
                          {/* LINHA DE EDIÇÃO DE AULA */}
                          {editingLessonId === les.id ? (
                            <div className="p-5 bg-gray-50/80 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Aula</label>
                                  <input type="text" value={editLessonTitle} onChange={(e) => setEditLessonTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cota-green" />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duração</label>
                                  <input type="number" value={editLessonDuration} onChange={(e) => setEditLessonDuration(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cota-green" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL do Vídeo</label>
                                <input type="text" value={editLessonVideoUrl} onChange={(e) => setEditLessonVideoUrl(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cota-green" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conteúdo (Markdown)</label>
                                <textarea value={editLessonContent} onChange={(e) => setEditLessonContent(e.target.value)} rows={5} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-cota-green resize-none" />
                              </div>
                              <div className="flex gap-2 justify-end pt-2">
                                <button onClick={() => setEditingLessonId(null)} className="text-xs text-gray-500 px-3 py-2 hover:text-gray-700">Cancelar</button>
                                <button onClick={() => handleUpdateLesson(les.id)} disabled={saving} className="bg-cota-green text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-cota-green-light">Salvar Alterações</button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 space-y-3">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Video className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <div>
                                    <p className="font-semibold text-gray-700 text-sm truncate">{les.title}</p>
                                    <p className="text-xs text-gray-400">{les.duration_minutes} min {les.video_url ? "· Com Vídeo" : "· Apenas Leitura"}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button type="button" onClick={() => setShowMaterialForm(showMaterialForm === les.id ? null : les.id)} className="text-[11px] border border-gray-200 text-gray-500 hover:border-cota-green hover:text-cota-green px-2 py-1 rounded font-medium mr-1">
                                    + Material
                                  </button>
                                  <button type="button" onClick={() => {
                                    setEditingLessonId(les.id);
                                    setEditLessonTitle(les.title);
                                    setEditLessonDuration(les.duration_minutes);
                                    setEditLessonVideoUrl(les.video_url || "");
                                    setEditLessonContent(les.content || "");
                                  }} className="p-1.5 text-gray-400 hover:text-cota-green rounded-lg transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button type="button" onClick={() => handleDeleteLesson(les.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {showMaterialForm === les.id && (
                                <form onSubmit={(e) => handleAddMaterial(e, les.id)} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input type="text" value={materialTitle} onChange={(e) => setMaterialTitle(e.target.value)} placeholder="Nome do Arquivo" required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                                    <input type="text" value={materialFileUrl} onChange={(e) => setMaterialFileUrl(e.target.value)} placeholder="URL do arquivo" required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <button type="button" onClick={() => setShowMaterialForm(null)} className="text-xs text-gray-500 px-2 py-1">Cancelar</button>
                                    <button type="submit" className="bg-cota-green text-white px-3 py-1.5 rounded-lg text-xs font-bold">Anexar</button>
                                  </div>
                                </form>
                              )}

                              {les.materials && les.materials.length > 0 && (
                                <div className="pl-6 flex flex-col gap-1.5">
                                  {les.materials.map((mat) => (
                                    <div key={mat.id} className="flex items-center justify-between max-w-md bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-xs text-gray-600">
                                      <span className="truncate font-medium">{mat.title}</span>
                                      <button type="button" onClick={() => handleDeleteMaterial(mat.id)} className="text-gray-400 hover:text-red-500 ml-2"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: QUIZ FINAL DA TRILHA */}
      {tab === "quiz" && (
        <div className="space-y-4">
          {!quiz ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center shadow-sm max-w-xl mx-auto">
              <Trophy className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <h3 className="font-bold text-gray-800 text-base mb-1">Nenhum Quiz Inicializado</h3>
              <p className="text-xs text-gray-500 mb-5">Esta trilha ainda não possui uma avaliação final.</p>
              <button type="button" onClick={handleCreateBaseQuiz} disabled={saving} className="bg-cota-green hover:bg-cota-green-light text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-colors">
                Inicializar Quiz Final da Trilha
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-800 text-sm mb-0">Configurações Base</h3>
                <form onSubmit={handleUpdateQuizConfig} className="space-y-4">
                  <div>
                    <label className="flex text-xs font-bold text-gray-600 uppercase mb-1 items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-cota-green" /> Nota Mínima (%)</label>
                    <input type="number" value={quizPassingScore} onChange={(e) => setQuizPassingScore(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" min={0} max={100} required />
                  </div>
                  <div>
                    <label className="flex text-xs font-bold text-gray-600 uppercase mb-1 items-center gap-1"><Clock className="w-3.5 h-3.5 text-blue-500" /> Tempo Limite (Min)</label>
                    <input type="number" value={quizTimeLimit} onChange={(e) => setQuizTimeLimit(e.target.value)} placeholder="Ilimitado" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <button type="submit" disabled={saving} className="w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold text-xs py-2 rounded-lg">Atualizar</button>
                </form>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">Banco de Questões</h3>
                    <p className="text-xs text-gray-400">{quiz.quiz_questions?.length || 0} perguntas ativas</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setShowBulkForm(!showBulkForm); setShowQuestionForm(false); }} className="flex items-center gap-1.5 bg-blue-50 text-blue-600 border border-blue-200 px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-100">
                      <ListPlus className="w-4 h-4" /> Importação em Lote
                    </button>
                    <button onClick={() => { setShowQuestionForm(!showQuestionForm); setShowBulkForm(false); }} className="flex items-center gap-1.5 bg-cota-green text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-cota-green-light">
                      <Plus className="w-4 h-4" /> Nova Pergunta
                    </button>
                  </div>
                </div>

                {showBulkForm && (
                  <form onSubmit={handleBulkImport} className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm space-y-4 relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <div>
                      <h3 className="font-bold text-blue-800 text-sm mb-1">Importação Rápida</h3>
                      <p className="text-xs text-gray-500">Cole o texto formatado. O sistema identificará automaticamente as perguntas e as respostas corretas [x].</p>
                    </div>
                    <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={10} required className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:border-blue-500 resize-none" />
                    <div className="flex gap-2 justify-end border-t border-gray-100 pt-3">
                      <button type="button" onClick={() => setShowBulkForm(false)} className="text-xs text-gray-500 px-3 py-2">Cancelar</button>
                      <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold">{saving ? "Processando..." : "Importar Tudo Agora"}</button>
                    </div>
                  </form>
                )}

                {showQuestionForm && (
                  <form onSubmit={handleAddQuestionWithOptions} className="bg-white rounded-xl border border-cota-green/30 p-5 shadow-sm space-y-4 relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-cota-green"></div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Enunciado</label>
                      <input type="text" value={questionText} onChange={(e) => setQuestionText(e.target.value)} required className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-cota-green" />
                    </div>
                    <div className="space-y-2.5 border-t border-gray-100 pt-4">
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Alternativas</label>
                      <div className="flex items-center gap-3"><input type="radio" checked={correctOpt === "A"} onChange={() => setCorrectOpt("A")} name="correct_radio" className="w-4 h-4 accent-cota-green" /><input type="text" value={optA} onChange={(e) => setOptA(e.target.value)} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
                      <div className="flex items-center gap-3"><input type="radio" checked={correctOpt === "B"} onChange={() => setCorrectOpt("B")} name="correct_radio" className="w-4 h-4 accent-cota-green" /><input type="text" value={optB} onChange={(e) => setOptB(e.target.value)} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
                      <div className="flex items-center gap-3"><input type="radio" checked={correctOpt === "C"} onChange={() => setCorrectOpt("C")} name="correct_radio" className="w-4 h-4 accent-cota-green" /><input type="text" value={optC} onChange={(e) => setOptC(e.target.value)} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
                      <div className="flex items-center gap-3"><input type="radio" checked={correctOpt === "D"} onChange={() => setCorrectOpt("D")} name="correct_radio" className="w-4 h-4 accent-cota-green" /><input type="text" value={optD} onChange={(e) => setOptD(e.target.value)} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
                    </div>
                    <div className="flex gap-2 justify-end border-t border-gray-100 pt-3">
                      <button type="button" onClick={() => setShowQuestionForm(false)} className="text-xs text-gray-500 px-3 py-2">Cancelar</button>
                      <button type="submit" disabled={saving} className="bg-cota-green text-white px-4 py-2 rounded-lg text-xs font-bold">Salvar</button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {quiz.quiz_questions?.map((q, idx) => (
                    <div key={q.id} className="bg-white p-4 rounded-xl border border-gray-100 relative group shadow-sm">
                      <button type="button" onClick={() => handleDeleteQuestion(q.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      <p className="font-bold text-gray-800 text-sm pr-6 mb-3"><span className="text-cota-gold">{idx + 1}.</span> {q.question}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                        {q.quiz_options?.map(opt => (
                          <div key={opt.id} className={`text-xs p-2.5 rounded-lg border ${opt.is_correct ? "bg-green-50 border-green-200 text-green-700 font-bold" : "bg-gray-50 border-gray-100 text-gray-500"}`}>
                            <span className="mr-1">{opt.is_correct ? "✓" : "•"}</span> {opt.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}