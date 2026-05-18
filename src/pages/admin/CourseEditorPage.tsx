import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  ChevronLeft, Plus, Trash2, BookOpen, Video, FileText, 
  ChevronDown, ChevronUp, CheckCircle2, HelpCircle, Edit2, X, Settings
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
  const isMounted = useRef(true);

  // States: Editar Trilha
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [editCourseTitle, setEditCourseTitle] = useState("");
  const [editCourseDescription, setEditCourseDescription] = useState("");
  const [editCourseCategory, setEditCourseCategory] = useState("Fundamentos");
  const [editCourseLevel, setEditCourseLevel] = useState("beginner");

  // States: Módulos
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  
  // States: Editar Módulos
  const [editingModId, setEditingModId] = useState<string | null>(null);
  const [editModTitle, setEditModTitle] = useState("");

  // States: Criar Aulas
  const [activeLessonModuleId, setActiveLessonModuleId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonVideo, setLessonVideo] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonDuration, setLessonDuration] = useState("");

  // States: Editar Aulas
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState("");
  const [editLessonVideo, setEditLessonVideo] = useState("");
  const [editLessonContent, setEditLessonContent] = useState("");

  // States: Materiais
  const [showMaterialForm, setShowMaterialForm] = useState<string | null>(null);
  const [matTitle, setMatTitle] = useState("");
  const [matUrl, setMatUrl] = useState("");

  // States: Quiz
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [qText, setQTitle] = useState("");
  const [options, setOptions] = useState([{ text: "", is_correct: false }, { text: "", is_correct: false }]);

  useEffect(() => {
    isMounted.current = true;
    loadCourseData(true);
    return () => { isMounted.current = false; };
  }, [id]);

  // =====================================================================
  // O MOTOR CENTRAL "MODO DEUS": Lê e Envia TUDO nativamente (Sem Cache)
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
    
    // Devolve dados no GET ou no POST
    if (method === 'GET' || method === 'POST') {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }
    return true;
  };
  // =====================================================================

  // LEITURA BLINDADA (Substitui a biblioteca quebrada por fetch)
  async function loadCourseData(isInitial = false) {
    try {
      if (isInitial && isMounted.current) setLoading(true);

      // 1. Busca a Trilha
      const courseDataArr = await directApiCall('courses', 'GET', undefined, `id=eq.${id}&select=*`);
      if (courseDataArr && courseDataArr.length > 0 && isMounted.current) {
        setCourse(courseDataArr[0]);
      }

      // 2. Busca Módulos, Aulas e Materiais (Pedindo ao banco para ordenar + Forçando no JS)
      const modulesData = await directApiCall('modules', 'GET', undefined, `course_id=eq.${id}&select=*,lessons(*,materials(*))&order=title.asc`);
      
      if (modulesData && isMounted.current) {
        // ORDENAÇÃO À PROVA DE BALAS: Ignora espaços extras e entende a ordem numérica (M01, M02...)
        const sortedModules = [...modulesData]
          .sort((a: any, b: any) => {
            const tA = String(a.title || "").trim();
            const tB = String(b.title || "").trim();
            return tA.localeCompare(tB, 'pt-BR', { numeric: true, sensitivity: 'base' });
          })
          .map((m: any) => ({
            ...m,
            lessons: [...(m.lessons || [])].sort((a: any, b: any) => {
              const tA = String(a.title || "").trim();
              const tB = String(b.title || "").trim();
              return tA.localeCompare(tB, 'pt-BR', { numeric: true, sensitivity: 'base' });
            })
          }));
        setModules(sortedModules);
      }

      // 3. Busca o Quiz
      const quizDataArr = await directApiCall('quizzes', 'GET', undefined, `course_id=eq.${id}&select=*,quiz_questions(*,quiz_options(*))`);
      if (quizDataArr && quizDataArr.length > 0 && isMounted.current) {
        setQuiz(quizDataArr[0]);
      }

    } catch (error) {
      console.error("Erro ao carregar dados nativos:", error);
    } finally {
      if (isInitial && isMounted.current) setLoading(false);
    }
  }

  const handleUpdateCourse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editCourseTitle.trim()) { toast.error("O título é obrigatório."); return; }
    
    setSaving(true);
    try {
      await directApiCall('courses', 'PATCH', {
        title: editCourseTitle,
        description: editCourseDescription,
        category: editCourseCategory,
        level: editCourseLevel
      }, `id=eq.${id}`);

      toast.success("Trilha salva com sucesso absoluto! 🚀");
      setShowEditCourseModal(false);
      loadCourseData(false);
    } catch (error: any) {
      toast.error(error.message || "Falha na comunicação.");
    } finally { setSaving(false); }
  };

  // --- Funções de Módulos ---
  const handleAddModule = async (e?: any) => {
    if (e) e.preventDefault();
    if (!newModuleTitle.trim()) { toast.error("Preencha o nome."); return; }
    setSaving(true);
    try {
      await directApiCall('modules', 'POST', { course_id: id, title: newModuleTitle, order_index: modules.length + 1 });
      toast.success("Módulo adicionado! 🚀");
      setNewModuleTitle(""); setShowModuleForm(false); loadCourseData(false);
    } catch (error: any) { toast.error("Erro ao adicionar módulo."); } finally { setSaving(false); }
  };

  const handleUpdateModule = async (moduleId: string) => {
    if (!editModTitle.trim()) return;
    setSaving(true);
    try {
      await directApiCall('modules', 'PATCH', { title: editModTitle }, `id=eq.${moduleId}`);
      toast.success("Módulo atualizado! 🚀");
      setEditingModId(null); setEditModTitle(""); loadCourseData(false);
    } catch (error) { toast.error("Erro ao atualizar módulo."); } finally { setSaving(false); }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if(!confirm("Atenção: Eliminar este módulo vai apagar todas as aulas dentro dele! Continuar?")) return;
    setSaving(true);
    try {
      await directApiCall('modules', 'DELETE', undefined, `id=eq.${moduleId}`);
      toast.success("Módulo eliminado! 🚀");
      loadCourseData(false);
    } catch (error) { toast.error("Erro ao eliminar módulo."); } finally { setSaving(false); }
  };

  // --- Funções de Aulas ---
  const handleAddLesson = async (e?: any) => {
    if (e) e.preventDefault();
    if (!lessonTitle.trim()) { toast.error("Preencha o título da aula."); return; }
    setSaving(true);
    try {
      const mod = modules.find(m => m.id === activeLessonModuleId);
      await directApiCall('lessons', 'POST', {
        module_id: activeLessonModuleId, title: lessonTitle, video_url: lessonVideo || null, content: lessonContent || null, duration_minutes: parseInt(lessonDuration) || 10, order_index: (mod?.lessons?.length || 0) + 1
      });
      toast.success("Aula adicionada! 🚀");
      setLessonTitle(""); setLessonVideo(""); setLessonContent(""); setLessonDuration("");
      setActiveLessonModuleId(null); loadCourseData(false);
    } catch (error: any) { toast.error("Erro ao adicionar aula."); } finally { setSaving(false); }
  };

  const handleUpdateLesson = async (lessonId: string) => {
    if (!editLessonTitle.trim()) { toast.error("O título é obrigatório."); return; }
    setSaving(true);
    try {
      await directApiCall('lessons', 'PATCH', { 
        title: editLessonTitle, 
        video_url: editLessonVideo || null, 
        content: editLessonContent || null 
      }, `id=eq.${lessonId}`);
      toast.success("Aula atualizada! 🚀");
      setEditingLessonId(null);
      loadCourseData(false);
    } catch (error) { 
      toast.error("Erro ao atualizar aula."); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if(!confirm("Eliminar aula?")) return;
    setSaving(true);
    try {
      await directApiCall('lessons', 'DELETE', undefined, `id=eq.${lessonId}`);
      toast.success("Aula eliminada! 🚀");
      loadCourseData(false);
    } catch (error) { toast.error("Erro ao eliminar aula."); } finally { setSaving(false); }
  };

  // --- Funções de Materiais ---
  const handleAddMaterial = async (lessonId: string, e?: any) => {
    if (e) e.preventDefault();
    if (!matTitle || !matUrl) { toast.error("Preencha o nome e o link."); return; }
    setSaving(true);
    try {
      await directApiCall('materials', 'POST', { lesson_id: lessonId, course_id: id, title: matTitle, file_url: matUrl });
      toast.success("Material adicionado! 🚀");
      setMatTitle(""); setMatUrl(""); setShowMaterialForm(null); loadCourseData(false);
    } catch (error) { toast.error("Erro ao salvar material."); } finally { setSaving(false); }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if(!confirm("Eliminar material?")) return;
    setSaving(true);
    try {
      await directApiCall('materials', 'DELETE', undefined, `id=eq.${materialId}`);
      toast.success("Material removido! 🚀");
      loadCourseData(false);
    } catch (error) { toast.error("Erro ao eliminar material."); } finally { setSaving(false); }
  };

  // --- Funções de Quiz ---
  const handleCreateQuiz = async (e?: any) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await directApiCall('quizzes', 'POST', { course_id: id, title: `Avaliação: ${course?.title}`, passing_score: 70 });
      toast.success("Quiz criado! 🚀");
      loadCourseData(false);
    } catch (error) { toast.error("Erro ao criar quiz."); } finally { setSaving(false); }
  };

  const handleAddQuestion = async (e?: any) => {
    if (e) e.preventDefault();
    if (!quiz || !qText.trim()) { toast.error("Escreva a pergunta."); return; }
    if (!options.some(o => o.is_correct)) { toast.error("Marque ao menos uma opção como correta."); return; }
    setSaving(true);
    try {
      const newQArray = await directApiCall('quiz_questions', 'POST', { quiz_id: quiz.id, question: qText, order_index: (quiz.quiz_questions?.length || 0) + 1 });
      const newQId = newQArray[0].id;

      const optionsToInsert = options.map((opt, i) => ({ question_id: newQId, text: opt.text, is_correct: opt.is_correct, order_index: i + 1 }));
      await directApiCall('quiz_options', 'POST', optionsToInsert);

      toast.success("Pergunta adicionada! 🚀");
      setQTitle(""); setOptions([{ text: "", is_correct: false }, { text: "", is_correct: false }]);
      setShowQuestionForm(false); loadCourseData(false);
    } catch (error) { toast.error("Erro ao salvar pergunta."); } finally { setSaving(false); }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if(!confirm("Excluir pergunta?")) return;
    setSaving(true);
    try {
      await directApiCall('quiz_questions', 'DELETE', undefined, `id=eq.${questionId}`);
      toast.success("Pergunta eliminada! 🚀");
      loadCourseData(false);
    } catch (error) { toast.error("Erro ao eliminar pergunta."); } finally { setSaving(false); }
  };

  const openEditCourseModal = () => {
    if (!course) return;
    setEditCourseTitle(course.title || "");
    setEditCourseDescription(course.description || "");
    setEditCourseCategory(course.category || "Fundamentos");
    setEditCourseLevel(course.level || "beginner");
    setShowEditCourseModal(true);
  };

  if (loading && !course) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      
      {/* Modal de Editar Trilha */}
      {showEditCourseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-cota-green" /> Editar Trilha
              </h2>
              <button onClick={() => setShowEditCourseModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título da Trilha</label>
                <input type="text" value={editCourseTitle} onChange={e => setEditCourseTitle(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cota-green" disabled={saving} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea rows={3} value={editCourseDescription} onChange={e => setEditCourseDescription(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cota-green resize-none" disabled={saving} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select 
                    value={editCourseCategory} 
                    onChange={e => setEditCourseCategory(e.target.value)} 
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cota-green" 
                    disabled={saving}
                  >
                    <option value="Fundamentos">Fundamentos (Trilha 1)</option>
                    <option value="Vendas">Vendas & Fechamento (Trilhas 2, 3 e 8)</option>
                    <option value="Atendimento">Atendimento & WhatsApp (Trilha 7)</option>
                    <option value="Marketing">Marketing Digital (Trilha 5)</option>
                    <option value="Compliance">Compliance & Ética (Trilha 6)</option>
                    <option value="Pós-venda">Pós-venda & Relacionamento (Trilha 9)</option>
                    <option value="Lideranca">Gestão & Liderança (Trilha 4)</option>
                    <option value="Imóveis">Específico: Imóveis</option>
                    <option value="Automóveis">Específico: Automóveis</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nível</label>
                  <select 
                    value={editCourseLevel} 
                    onChange={e => setEditCourseLevel(e.target.value)} 
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cota-green" 
                    disabled={saving}
                  >
                    <option value="beginner">Iniciante (0 a 30 dias)</option>
                    <option value="intermediate">Em Desenvolvimento (30 a 60 dias)</option>
                    <option value="advanced">Avançado (60 a 90 dias)</option>
                    <option value="leadership">Líderes Comerciais</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowEditCourseModal(false)} disabled={saving} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="button" onClick={handleUpdateCourse} disabled={saving} className="flex-1 px-4 py-2 bg-cota-green text-white rounded-lg text-sm font-bold hover:bg-cota-green-light disabled:opacity-50 transition-colors">{saving ? "Salvando..." : "Salvar Alterações"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-cota-green mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Voltar ao Painel
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-3">
              Gestão da Trilha
              <button onClick={openEditCourseModal} className="p-1.5 bg-gray-100 hover:bg-cota-green/10 text-gray-500 hover:text-cota-green rounded-lg transition-colors" title="Editar dados da Trilha">
                <Edit2 className="w-4 h-4" />
              </button>
            </h1>
            <p className="text-gray-500 text-sm mt-1">Configurando: <span className="font-semibold text-cota-green">{course?.title}</span></p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setTab("structure")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === "structure" ? "bg-white text-cota-green shadow-sm" : "text-gray-500"}`}>Estrutura</button>
            <button onClick={() => setTab("quiz")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === "quiz" ? "bg-white text-cota-green shadow-sm" : "text-gray-500"}`}>Quiz Final</button>
          </div>
        </div>

        {tab === "structure" ? (
          <>
            <div className="flex justify-end mb-6">
              <button onClick={() => setShowModuleForm(true)} className="flex items-center gap-2 bg-cota-gold text-cota-green-dark px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90">
                <Plus className="w-4 h-4" /> Novo Módulo
              </button>
            </div>

            {showModuleForm && (
              <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-cota-gold/50 mb-6 flex gap-3">
                <input type="text" placeholder="Nome do Módulo" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} className="flex-1 border rounded-lg px-3 text-sm focus:outline-none focus:border-cota-gold" disabled={saving} />
                <button type="button" onClick={handleAddModule} disabled={saving} className="bg-cota-green text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button type="button" onClick={() => setShowModuleForm(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              </div>
            )}

            <div className="space-y-4">
              {modules.map((mod) => (
                <div key={mod.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 cursor-pointer" onClick={() => setExpandedModuleId(expandedModuleId === mod.id ? null : mod.id)}>
                    
                    {editingModId === mod.id ? (
                      <div className="flex items-center gap-2 w-full pr-4" onClick={e => e.stopPropagation()}>
                        <BookOpen className="w-5 h-5 text-cota-green" />
                        <input type="text" value={editModTitle} onChange={e => setEditModTitle(e.target.value)} className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm font-bold text-gray-800 focus:outline-none focus:border-cota-green" autoFocus />
                        <button type="button" onClick={() => handleUpdateModule(mod.id)} disabled={saving} className="bg-cota-green text-white px-3 py-1 rounded text-xs font-bold disabled:opacity-50">Salvar</button>
                        <button type="button" onClick={() => setEditingModId(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-5 h-5 text-cota-green" />
                          <h3 className="font-bold text-gray-800">{mod.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={(e) => { e.stopPropagation(); setEditingModId(mod.id); setEditModTitle(mod.title); }} className="text-gray-400 hover:text-cota-green transition-colors p-1" title="Editar Módulo">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteModule(mod.id); }} className="text-gray-400 hover:text-red-500 transition-colors p-1 mr-2" title="Eliminar Módulo">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="border-l border-gray-200 pl-2">
                            {expandedModuleId === mod.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {expandedModuleId === mod.id && (
                    <div className="p-6 border-t border-gray-100">
                      <div className="space-y-4 mb-6">
                        {mod.lessons.map(lesson => (
                          <div key={lesson.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                            
                            {/* === INÍCIO: MODO DE EDIÇÃO DA AULA === */}
                            {editingLessonId === lesson.id ? (
                              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3 mb-3">
                                <input type="text" placeholder="Título da Aula" value={editLessonTitle} onChange={(e) => setEditLessonTitle(e.target.value)} className="w-full text-sm p-2 border rounded" disabled={saving} />
                                <input type="text" placeholder="Link do Vídeo (Opcional)" value={editLessonVideo} onChange={(e) => setEditLessonVideo(e.target.value)} className="w-full text-sm p-2 border rounded" disabled={saving} />
                                <textarea placeholder="Conteúdo escrito / Resumo da aula" rows={4} value={editLessonContent} onChange={(e) => setEditLessonContent(e.target.value)} className="w-full text-sm p-2 border rounded resize-none" disabled={saving} />
                                <div className="flex gap-2">
                                  <button type="button" onClick={() => handleUpdateLesson(lesson.id)} disabled={saving} className="bg-cota-green text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50">Salvar Alterações</button>
                                  <button type="button" onClick={() => setEditingLessonId(null)} className="text-sm text-gray-500 px-2 hover:text-gray-700">Cancelar</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-3">
                                  <Video className="w-4 h-4 text-cota-green" />
                                  <span className="font-semibold text-gray-700">{lesson.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => {
                                    setEditingLessonId(lesson.id);
                                    setEditLessonTitle(lesson.title);
                                    setEditLessonVideo(lesson.video_url || "");
                                    setEditLessonContent(lesson.content || "");
                                  }} className="text-gray-400 hover:text-cota-green transition-colors p-1" title="Editar Aula">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button type="button" onClick={() => handleDeleteLesson(lesson.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Excluir Aula">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                            {/* === FIM: MODO DE EDIÇÃO DA AULA === */}
                            
                            <div className="ml-7 space-y-2">
                              {lesson.materials.map(m => (
                                <div key={m.id} className="flex items-center justify-between bg-gray-50 px-3 py-1.5 rounded-lg text-xs">
                                  <div className="flex items-center gap-2 text-gray-600"><FileText className="w-3 h-3" /> {m.title}</div>
                                  <button type="button" onClick={() => handleDeleteMaterial(m.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              ))}
                              
                              {showMaterialForm === lesson.id ? (
                                <div className="bg-cota-gold/5 p-3 rounded-lg border border-cota-gold/20 mt-2 space-y-2">
                                  <input type="text" placeholder="Nome do PDF/Link" value={matTitle} onChange={(e) => setMatTitle(e.target.value)} className="w-full text-xs p-2 border rounded" disabled={saving} />
                                  <input type="text" placeholder="URL do ficheiro" value={matUrl} onChange={(e) => setMatUrl(e.target.value)} className="w-full text-xs p-2 border rounded" disabled={saving} />
                                  <div className="flex gap-2">
                                    <button type="button" onClick={() => handleAddMaterial(lesson.id)} disabled={saving} className="bg-cota-gold text-cota-green-dark px-3 py-1 rounded text-xs font-bold disabled:opacity-50">Salvar Material</button>
                                    <button type="button" onClick={() => setShowMaterialForm(null)} className="text-xs text-gray-500">Cancelar</button>
                                  </div>
                                </div>
                              ) : (
                                <button type="button" onClick={() => setShowMaterialForm(lesson.id)} className="text-[10px] uppercase tracking-wider font-bold text-cota-gold hover:text-cota-gold-dark flex items-center gap-1"><Plus className="w-3 h-3" /> Adicionar Material</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {activeLessonModuleId === mod.id ? (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                          <input type="text" placeholder="Título da Aula" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} className="w-full text-sm p-2 border rounded" disabled={saving} />
                          <input type="text" placeholder="Link do Vídeo (Opcional)" value={lessonVideo} onChange={(e) => setLessonVideo(e.target.value)} className="w-full text-sm p-2 border rounded" disabled={saving} />
                          <textarea placeholder="Conteúdo escrito / Resumo da aula" rows={4} value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} className="w-full text-sm p-2 border rounded resize-none" disabled={saving} />
                          <div className="flex gap-2">
                            <button type="button" onClick={handleAddLesson} disabled={saving} className="bg-cota-green text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50">Salvar Aula</button>
                            <button type="button" onClick={() => setActiveLessonModuleId(null)} className="text-sm text-gray-500 px-2 hover:text-gray-700">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setActiveLessonModuleId(mod.id)} className="text-sm text-cota-green font-semibold flex items-center gap-1"><Plus className="w-4 h-4" /> Adicionar Aula neste Módulo</button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {modules.length === 0 && !showModuleForm && (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                  <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Esta trilha ainda não tem módulos.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            {!quiz ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-gray-700">Nenhum Quiz Criado</h3>
                <p className="text-sm text-gray-500 mb-6">Cria uma avaliação final para que os alunos possam obter o certificado.</p>
                <button type="button" onClick={handleCreateQuiz} disabled={saving} className="bg-cota-green text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50">Criar Quiz Agora</button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-cota-green" /> {quiz.quiz_questions?.length || 0} Perguntas Registadas</h3>
                  <button type="button" onClick={() => setShowQuestionForm(true)} className="bg-cota-gold text-cota-green-dark px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90"><Plus className="w-4 h-4" /> Nova Pergunta</button>
                </div>

                {showQuestionForm && (
                  <div className="bg-white border-2 border-cota-gold/30 p-6 rounded-xl space-y-4">
                    <input type="text" placeholder="Escreve a pergunta aqui..." value={qText} onChange={(e) => setQTitle(e.target.value)} className="w-full p-3 border rounded-lg font-medium outline-none focus:border-cota-gold" disabled={saving} />
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-400 uppercase">Opções de Resposta</p>
                      {options.map((opt, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input type="radio" name="correct" checked={opt.is_correct} onChange={() => setOptions(options.map((o, idx) => ({ ...o, is_correct: idx === i })))} disabled={saving} />
                          <input type="text" placeholder={`Opção ${i+1}`} value={opt.text} onChange={(e) => {
                            const newOpts = [...options]; newOpts[i].text = e.target.value; setOptions(newOpts);
                          }} className="flex-1 p-2 border rounded text-sm outline-none focus:border-cota-gold" disabled={saving} />
                          {options.length > 2 && <button type="button" onClick={() => setOptions(options.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      ))}
                      <button type="button" onClick={() => setOptions([...options, { text: "", is_correct: false }])} className="text-xs text-cota-green font-bold hover:underline">+ Adicionar Opção</button>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={handleAddQuestion} disabled={saving} className="bg-cota-green text-white px-6 py-2 rounded-lg font-bold text-sm disabled:opacity-50">{saving ? "A Salvar..." : "Salvar Pergunta"}</button>
                      <button type="button" onClick={() => setShowQuestionForm(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {quiz.quiz_questions?.map((q, idx) => (
                    <div key={q.id} className="bg-gray-50 p-5 rounded-xl border border-gray-100 relative group">
                      <button type="button" onClick={() => handleDeleteQuestion(q.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                      <p className="font-bold text-gray-800 mb-3">{idx + 1}. {q.question}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {q.quiz_options?.map(opt => (
                          <div key={opt.id} className={`text-xs p-2 rounded border ${opt.is_correct ? "bg-green-50 border-green-200 text-green-700 font-bold" : "bg-white border-gray-100 text-gray-500"}`}>
                            {opt.text} {opt.is_correct && "✓"}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}