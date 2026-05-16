import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  ChevronLeft, Plus, Trash2, BookOpen, Video, FileText, 
  ChevronDown, ChevronUp, CheckCircle2, HelpCircle, Edit2, X, Settings
} from "lucide-react";
import { supabase } from "@/lib/supabase";
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
  
  const [loading, setLoading] = useState(true); // Apenas para o carregamento inicial da página inteira
  const [saving, setSaving] = useState(false);  // Apenas para bloquear botões
  const isMounted = useRef(true);

  // States: Editar Trilha (NOVO)
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [editCourseTitle, setEditCourseTitle] = useState("");
  const [editCourseDescription, setEditCourseDescription] = useState("");
  const [editCourseCategory, setEditCourseCategory] = useState("");
  const [editCourseLevel, setEditCourseLevel] = useState("");

  // States: Módulos
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  
  // States: Editar Módulos
  const [editingModId, setEditingModId] = useState<string | null>(null);
  const [editModTitle, setEditModTitle] = useState("");

  // States: Aulas
  const [activeLessonModuleId, setActiveLessonModuleId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonVideo, setLessonVideo] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonDuration, setLessonDuration] = useState("");

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

  // isInitial = true faz a bolinha gigante rodar. isInitial = false atualiza de forma invisível.
  async function loadCourseData(isInitial = false) {
    try {
      if (isInitial && isMounted.current) setLoading(true);

      const { data: courseData, error: courseErr } = await supabase.from("courses").select("*").eq("id", id).single();
      if (courseErr) throw courseErr;
      
      if (isMounted.current) {
        setCourse(courseData);
      }

      // Busca tudo de uma vez de forma otimizada
      const { data: modulesData, error: modErr } = await supabase
        .from("modules")
        .select("*, lessons(*, materials(*))")
        .eq("course_id", id)
        .order("order_index");
        
      if (modErr) throw modErr;

      // Ordena as aulas pelo order_index
      if (modulesData && isMounted.current) {
        const sortedModules = modulesData.map((m: any) => ({
          ...m,
          lessons: (m.lessons || []).sort((a: any, b: any) => a.order_index - b.order_index)
        }));
        setModules(sortedModules);
      }

      const { data: quizData } = await supabase.from("quizzes").select("*, quiz_questions(*, quiz_options(*))").eq("course_id", id).maybeSingle();
      if (isMounted.current) setQuiz(quizData);

    } catch (error) {
      console.error("Erro ao carregar curso:", error);
      toast.error("Erro ao carregar dados do curso.");
    } finally {
      if (isInitial && isMounted.current) setLoading(false);
    }
  }

  // --- Funções da Trilha ---
  const openEditCourseModal = () => {
    if (!course) return;
    setEditCourseTitle(course.title);
    setEditCourseDescription(course.description || "");
    setEditCourseCategory(course.category);
    setEditCourseLevel(course.level);
    setShowEditCourseModal(true);
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { error } = await supabase.from("courses").update({
        title: editCourseTitle,
        description: editCourseDescription,
        category: editCourseCategory,
        level: editCourseLevel
      }).eq("id", id).select();

      if (error) throw error;

      toast.success("Dados da trilha atualizados!");
      setShowEditCourseModal(false);
      await loadCourseData(false); // Atualiza os textos na tela sem piscar
    } catch (error) {
      toast.error("Erro ao atualizar a trilha.");
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  // --- Funções de Módulos ---
  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { error } = await supabase.from("modules").insert({ 
        course_id: id, 
        title: newModuleTitle, 
        order_index: modules.length + 1 
      }).select();
      
      if (error) throw error; 
      
      toast.success("Módulo adicionado!");
      setNewModuleTitle(""); 
      setShowModuleForm(false);
      await loadCourseData(false);
    } catch (error: any) { 
      toast.error("Erro ao adicionar módulo."); 
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleUpdateModule = async (moduleId: string) => {
    if (!editModTitle.trim()) return;
    try {
      setSaving(true);
      const { error } = await supabase.from("modules").update({ title: editModTitle }).eq("id", moduleId).select();
      if (error) throw error;
      
      toast.success("Módulo atualizado!");
      setEditingModId(null);
      setEditModTitle("");
      await loadCourseData(false);
    } catch (error) {
      toast.error("Erro ao atualizar módulo.");
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if(!confirm("Atenção: Eliminar este módulo vai apagar todas as aulas dentro dele! Continuar?")) return;
    try {
      setSaving(true);
      const { error } = await supabase.from("modules").delete().eq("id", moduleId);
      if (error) throw error;
      toast.success("Módulo eliminado!");
      await loadCourseData(false);
    } catch (error) {
      toast.error("Erro ao eliminar módulo.");
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  // --- Funções de Aulas ---
  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const mod = modules.find(m => m.id === activeLessonModuleId);
      const { error } = await supabase.from("lessons").insert({
        module_id: activeLessonModuleId,
        title: lessonTitle,
        video_url: lessonVideo || null,
        content: lessonContent || null,
        duration_minutes: parseInt(lessonDuration) || 10,
        order_index: (mod?.lessons?.length || 0) + 1
      }).select();
      
      if (error) throw error;

      toast.success("Aula adicionada!");
      setLessonTitle(""); setLessonVideo(""); setLessonContent(""); setLessonDuration("");
      setActiveLessonModuleId(null);
      await loadCourseData(false);
    } catch (error: any) { 
      toast.error("Erro ao adicionar aula."); 
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if(!confirm("Eliminar aula?")) return;
    try {
      const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
      if (error) throw error;
      toast.success("Aula eliminada!");
      await loadCourseData(false);
    } catch (error) {
      toast.error("Erro ao eliminar aula.");
    }
  };

  // --- Funções de Materiais ---
  const handleAddMaterial = async (lessonId: string) => {
    if (!matTitle || !matUrl) return;
    try {
      setSaving(true);
      const { error } = await supabase.from("materials").insert({ 
        lesson_id: lessonId, 
        course_id: id, 
        title: matTitle, 
        file_url: matUrl 
      }).select();
      
      if (error) throw error;

      toast.success("Material adicionado!");
      setMatTitle(""); setMatUrl(""); setShowMaterialForm(null);
      await loadCourseData(false);
    } catch (error) { 
      toast.error("Erro ao salvar material."); 
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if(!confirm("Eliminar material?")) return;
    try {
      const { error } = await supabase.from("materials").delete().eq("id", materialId);
      if (error) throw error;
      await loadCourseData(false);
    } catch (error) {
      toast.error("Erro ao eliminar material.");
    }
  };

  // --- Funções de Quiz ---
  const handleCreateQuiz = async () => {
    try {
      setSaving(true);
      const { error } = await supabase.from("quizzes").insert({ 
        course_id: id, 
        title: `Avaliação: ${course?.title}`, 
        passing_score: 70 
      }).select();
      if (error) throw error;

      toast.success("Quiz criado! Adicione as perguntas.");
      await loadCourseData(false);
    } catch (error) { 
      toast.error("Erro ao criar quiz."); 
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz || !qText) return;
    if (!options.some(o => o.is_correct)) { toast.error("Marca uma opção como correta."); return; }

    try {
      setSaving(true);
      const { data: newQ, error: qErr } = await supabase.from("quiz_questions").insert({
        quiz_id: quiz.id,
        question: qText,
        order_index: (quiz.quiz_questions?.length || 0) + 1
      }).select().single();

      if (qErr) throw qErr;

      const optionsToInsert = options.map((opt, i) => ({
        question_id: newQ.id,
        text: opt.text,
        is_correct: opt.is_correct,
        order_index: i + 1
      }));

      const { error: optErr } = await supabase.from("quiz_options").insert(optionsToInsert).select();
      if (optErr) throw optErr;

      toast.success("Pergunta adicionada!");
      setQTitle(""); setOptions([{ text: "", is_correct: false }, { text: "", is_correct: false }]);
      setShowQuestionForm(false);
      await loadCourseData(false);
    } catch (error) { 
      toast.error("Erro ao salvar pergunta."); 
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if(!confirm("Excluir pergunta?")) return;
    try {
      const { error } = await supabase.from("quiz_questions").delete().eq("id", questionId);
      if (error) throw error;
      toast.success("Pergunta eliminada!");
      await loadCourseData(false);
    } catch (error) {
      toast.error("Erro ao eliminar pergunta.");
    }
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
            <form onSubmit={handleUpdateCourse} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título da Trilha</label>
                <input type="text" required value={editCourseTitle} onChange={e => setEditCourseTitle(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cota-green" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea required rows={3} value={editCourseDescription} onChange={e => setEditCourseDescription(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cota-green resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select value={editCourseCategory} onChange={e => setEditCourseCategory(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cota-green">
                    <option value="Fundamentos">Fundamentos</option>
                    <option value="Imóveis">Imóveis</option>
                    <option value="Automóveis">Automóveis</option>
                    <option value="Vendas">Vendas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nível</label>
                  <select value={editCourseLevel} onChange={e => setEditCourseLevel(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cota-green">
                    <option value="beginner">Iniciante</option>
                    <option value="intermediate">Intermediário</option>
                    <option value="advanced">Avançado</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowEditCourseModal(false)} disabled={saving} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-cota-green text-white rounded-lg text-sm font-bold hover:bg-cota-green-light disabled:opacity-50 transition-colors">{saving ? "Salvando..." : "Salvar Alterações"}</button>
              </div>
            </form>
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
              <form onSubmit={handleAddModule} className="bg-gray-50 p-4 rounded-lg border border-dashed border-cota-gold/50 mb-6 flex gap-3">
                <input type="text" placeholder="Nome do Módulo" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} className="flex-1 border rounded-lg px-3 text-sm focus:outline-none focus:border-cota-gold" required disabled={saving} />
                <button type="submit" disabled={saving} className="bg-cota-green text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button type="button" onClick={() => setShowModuleForm(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              </form>
            )}

            <div className="space-y-4">
              {modules.map((mod) => (
                <div key={mod.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 cursor-pointer" onClick={() => setExpandedModuleId(expandedModuleId === mod.id ? null : mod.id)}>
                    
                    {/* Modo de Edição do Módulo */}
                    {editingModId === mod.id ? (
                      <div className="flex items-center gap-2 w-full pr-4" onClick={e => e.stopPropagation()}>
                        <BookOpen className="w-5 h-5 text-cota-green" />
                        <input type="text" value={editModTitle} onChange={e => setEditModTitle(e.target.value)} className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm font-bold text-gray-800 focus:outline-none focus:border-cota-green" autoFocus />
                        <button onClick={() => handleUpdateModule(mod.id)} disabled={saving} className="bg-cota-green text-white px-3 py-1 rounded text-xs font-bold disabled:opacity-50">Salvar</button>
                        <button onClick={() => setEditingModId(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-5 h-5 text-cota-green" />
                          <h3 className="font-bold text-gray-800">{mod.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); setEditingModId(mod.id); setEditModTitle(mod.title); }} className="text-gray-400 hover:text-cota-green transition-colors p-1" title="Editar Módulo">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteModule(mod.id); }} className="text-gray-400 hover:text-red-500 transition-colors p-1 mr-2" title="Eliminar Módulo">
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
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-3">
                                <Video className="w-4 h-4 text-cota-green" />
                                <span className="font-semibold text-gray-700">{lesson.title}</span>
                              </div>
                              <button onClick={() => handleDeleteLesson(lesson.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            
                            {/* Listagem de Materiais */}
                            <div className="ml-7 space-y-2">
                              {lesson.materials.map(m => (
                                <div key={m.id} className="flex items-center justify-between bg-gray-50 px-3 py-1.5 rounded-lg text-xs">
                                  <div className="flex items-center gap-2 text-gray-600"><FileText className="w-3 h-3" /> {m.title}</div>
                                  <button onClick={() => handleDeleteMaterial(m.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              ))}
                              
                              {showMaterialForm === lesson.id ? (
                                <div className="bg-cota-gold/5 p-3 rounded-lg border border-cota-gold/20 mt-2 space-y-2">
                                  <input type="text" placeholder="Nome do PDF/Link" value={matTitle} onChange={(e) => setMatTitle(e.target.value)} className="w-full text-xs p-2 border rounded" disabled={saving} />
                                  <input type="text" placeholder="URL do ficheiro" value={matUrl} onChange={(e) => setMatUrl(e.target.value)} className="w-full text-xs p-2 border rounded" disabled={saving} />
                                  <div className="flex gap-2">
                                    <button onClick={() => handleAddMaterial(lesson.id)} disabled={saving} className="bg-cota-gold text-cota-green-dark px-3 py-1 rounded text-xs font-bold disabled:opacity-50">Salvar Material</button>
                                    <button onClick={() => setShowMaterialForm(null)} className="text-xs text-gray-500">Cancelar</button>
                                  </div>
                                </div>
                              ) : (
                                <button onClick={() => setShowMaterialForm(lesson.id)} className="text-[10px] uppercase tracking-wider font-bold text-cota-gold hover:text-cota-gold-dark flex items-center gap-1"><Plus className="w-3 h-3" /> Adicionar Material</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {activeLessonModuleId === mod.id ? (
                        <form onSubmit={handleAddLesson} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                          <input type="text" placeholder="Título da Aula" required value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} className="w-full text-sm p-2 border rounded" disabled={saving} />
                          <input type="text" placeholder="Link do Vídeo (Opcional)" value={lessonVideo} onChange={(e) => setLessonVideo(e.target.value)} className="w-full text-sm p-2 border rounded" disabled={saving} />
                          <textarea placeholder="Conteúdo escrito / Resumo da aula" rows={4} value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} className="w-full text-sm p-2 border rounded resize-none" disabled={saving} />
                          <div className="flex gap-2">
                            <button type="submit" disabled={saving} className="bg-cota-green text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50">Salvar Aula</button>
                            <button type="button" onClick={() => setActiveLessonModuleId(null)} className="text-sm text-gray-500 px-2 hover:text-gray-700">Cancelar</button>
                          </div>
                        </form>
                      ) : (
                        <button onClick={() => setActiveLessonModuleId(mod.id)} className="text-sm text-cota-green font-semibold flex items-center gap-1"><Plus className="w-4 h-4" /> Adicionar Aula neste Módulo</button>
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
                <button onClick={handleCreateQuiz} disabled={saving} className="bg-cota-green text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50">Criar Quiz Agora</button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-cota-green" /> {quiz.quiz_questions?.length || 0} Perguntas Registadas</h3>
                  <button onClick={() => setShowQuestionForm(true)} className="bg-cota-gold text-cota-green-dark px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90"><Plus className="w-4 h-4" /> Nova Pergunta</button>
                </div>

                {showQuestionForm && (
                  <form onSubmit={handleAddQuestion} className="bg-white border-2 border-cota-gold/30 p-6 rounded-xl space-y-4">
                    <input type="text" placeholder="Escreve a pergunta aqui..." value={qText} onChange={(e) => setQTitle(e.target.value)} className="w-full p-3 border rounded-lg font-medium outline-none focus:border-cota-gold" required disabled={saving} />
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-400 uppercase">Opções de Resposta</p>
                      {options.map((opt, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input type="radio" name="correct" checked={opt.is_correct} onChange={() => setOptions(options.map((o, idx) => ({ ...o, is_correct: idx === i })))} disabled={saving} />
                          <input type="text" placeholder={`Opção ${i+1}`} value={opt.text} onChange={(e) => {
                            const newOpts = [...options]; newOpts[i].text = e.target.value; setOptions(newOpts);
                          }} className="flex-1 p-2 border rounded text-sm outline-none focus:border-cota-gold" required disabled={saving} />
                          {options.length > 2 && <button type="button" onClick={() => setOptions(options.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      ))}
                      <button type="button" onClick={() => setOptions([...options, { text: "", is_correct: false }])} className="text-xs text-cota-green font-bold hover:underline">+ Adicionar Opção</button>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="submit" disabled={saving} className="bg-cota-green text-white px-6 py-2 rounded-lg font-bold text-sm disabled:opacity-50">{saving ? "A Salvar..." : "Salvar Pergunta"}</button>
                      <button type="button" onClick={() => setShowQuestionForm(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                    </div>
                  </form>
                )}

                <div className="space-y-4">
                  {quiz.quiz_questions?.map((q, idx) => (
                    <div key={q.id} className="bg-gray-50 p-5 rounded-xl border border-gray-100 relative group">
                      <button onClick={() => handleDeleteQuestion(q.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
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