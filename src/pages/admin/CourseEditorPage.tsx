import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  ChevronLeft, Plus, Trash2, BookOpen, Video, FileText, 
  ChevronDown, ChevronUp, Layout, CheckCircle2, HelpCircle, Save 
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
  const [loading, setLoading] = useState(true);

  // States: Módulos e Aulas
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [activeLessonModuleId, setActiveLessonModuleId] = useState<string | null>(null);
  
  // States: Form Aula
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
    loadCourseData();
  }, [id]);

  async function loadCourseData() {
    try {
      setLoading(true);
      const { data: courseData } = await supabase.from("courses").select("*").eq("id", id).single();
      setCourse(courseData);

      // Carregar Módulos e Aulas com Materiais
      const { data: modulesData } = await supabase.from("modules").select("*").eq("course_id", id).order("order_index");
      
      const modulesWithData: ModuleWithLessons[] = [];
      for (const mod of modulesData || []) {
        const { data: lessonsData } = await supabase.from("lessons").select("*").eq("module_id", mod.id).order("order_index");
        
        const lessonsWithMaterials = [];
        for (const lesson of lessonsData || []) {
          const { data: matData } = await supabase.from("materials").select("*").eq("lesson_id", lesson.id);
          lessonsWithMaterials.push({ ...lesson, materials: matData || [] });
        }
        modulesWithData.push({ ...mod, lessons: lessonsWithMaterials });
      }
      setModules(modulesWithData);

      // Carregar Quiz
      const { data: quizData } = await supabase.from("quizzes").select("*, quiz_questions(*, quiz_options(*))").eq("course_id", id).maybeSingle();
      setQuiz(quizData);

    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados do curso.");
    } finally {
      setLoading(false);
    }
  }

  // --- Módulos ---
  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await supabase.from("modules").insert({ course_id: id, title: newModuleTitle, order_index: modules.length + 1 });
      toast.success("Módulo adicionado!");
      setNewModuleTitle(""); setShowModuleForm(false);
      loadCourseData();
    } catch (error) { toast.error("Erro ao adicionar módulo."); }
  };

  // --- Aulas ---
  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const mod = modules.find(m => m.id === activeLessonModuleId);
      await supabase.from("lessons").insert({
        module_id: activeLessonModuleId,
        title: lessonTitle,
        video_url: lessonVideo || null,
        content: lessonContent || null,
        duration_minutes: parseInt(lessonDuration) || 10,
        order_index: (mod?.lessons.length || 0) + 1
      });
      toast.success("Aula adicionada!");
      setLessonTitle(""); setLessonVideo(""); setLessonContent(""); setLessonDuration("");
      setActiveLessonModuleId(null);
      loadCourseData();
    } catch (error) { toast.error("Erro ao adicionar aula."); }
  };

  // --- Materiais ---
  const handleAddMaterial = async (lessonId: string) => {
    if (!matTitle || !matUrl) return;
    try {
      await supabase.from("materials").insert({ lesson_id: lessonId, course_id: id, title: matTitle, file_url: matUrl });
      toast.success("Material adicionado!");
      setMatTitle(""); setMatUrl(""); setShowMaterialForm(null);
      loadCourseData();
    } catch (error) { toast.error("Erro ao salvar material."); }
  };

  // --- Quiz ---
  const handleCreateQuiz = async () => {
    try {
      await supabase.from("quizzes").insert({ course_id: id, title: `Avaliação: ${course?.title}`, passing_score: 70 });
      toast.success("Quiz criado! Adiciona as perguntas.");
      loadCourseData();
    } catch (error) { toast.error("Erro ao criar quiz."); }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz || !qText) return;
    if (!options.some(o => o.is_correct)) { toast.error("Marca uma opção como correta."); return; }

    try {
      setLoading(true);
      const { data: newQ } = await supabase.from("quiz_questions").insert({
        quiz_id: quiz.id,
        question: qText,
        order_index: (quiz.quiz_questions.length || 0) + 1
      }).select().single();

      const optionsToInsert = options.map((opt, i) => ({
        question_id: newQ.id,
        text: opt.text,
        is_correct: opt.is_correct,
        order_index: i + 1
      }));

      await supabase.from("quiz_options").insert(optionsToInsert);
      toast.success("Pergunta adicionada!");
      setQTitle(""); setOptions([{ text: "", is_correct: false }, { text: "", is_correct: false }]);
      setShowQuestionForm(false);
      loadCourseData();
    } catch (error) { toast.error("Erro ao salvar pergunta."); }
  };

  if (loading && !course) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-cota-green mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Voltar ao Painel
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Gestão da Trilha</h1>
            <p className="text-gray-500 text-sm">Configurando: <span className="font-semibold text-cota-green">{course?.title}</span></p>
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
                <input type="text" placeholder="Nome do Módulo" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} className="flex-1 border rounded-lg px-3 text-sm focus:outline-none focus:border-cota-gold" required />
                <button type="submit" className="bg-cota-green text-white px-4 py-2 rounded-lg text-sm font-semibold">Salvar</button>
                <button type="button" onClick={() => setShowModuleForm(false)} className="text-sm text-gray-500">Cancelar</button>
              </form>
            )}

            <div className="space-y-4">
              {modules.map((mod) => (
                <div key={mod.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 cursor-pointer" onClick={() => setExpandedModuleId(expandedModuleId === mod.id ? null : mod.id)}>
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-cota-green" />
                      <h3 className="font-bold text-gray-800">{mod.title}</h3>
                    </div>
                    {expandedModuleId === mod.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
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
                              <button onClick={async () => { if(confirm("Eliminar aula?")) { await supabase.from("lessons").delete().eq("id", lesson.id); loadCourseData(); } }} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            
                            {/* Listagem de Materiais */}
                            <div className="ml-7 space-y-2">
                              {lesson.materials.map(m => (
                                <div key={m.id} className="flex items-center justify-between bg-gray-50 px-3 py-1.5 rounded-lg text-xs">
                                  <div className="flex items-center gap-2 text-gray-600"><FileText className="w-3 h-3" /> {m.title}</div>
                                  <button onClick={async () => { await supabase.from("materials").delete().eq("id", m.id); loadCourseData(); }} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              ))}
                              
                              {showMaterialForm === lesson.id ? (
                                <div className="bg-cota-gold/5 p-3 rounded-lg border border-cota-gold/20 mt-2 space-y-2">
                                  <input type="text" placeholder="Nome do PDF/Link" value={matTitle} onChange={(e) => setMatTitle(e.target.value)} className="w-full text-xs p-2 border rounded" />
                                  <input type="text" placeholder="URL do ficheiro" value={matUrl} onChange={(e) => setMatUrl(e.target.value)} className="w-full text-xs p-2 border rounded" />
                                  <div className="flex gap-2">
                                    <button onClick={() => handleAddMaterial(lesson.id)} className="bg-cota-gold text-cota-green-dark px-3 py-1 rounded text-xs font-bold">Salvar Material</button>
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
                          <input type="text" placeholder="Título da Aula" required value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} className="w-full text-sm p-2 border rounded" />
                          <input type="text" placeholder="Link do Vídeo" value={lessonVideo} onChange={(e) => setLessonVideo(e.target.value)} className="w-full text-sm p-2 border rounded" />
                          <button type="submit" className="bg-cota-green text-white px-4 py-2 rounded text-sm font-semibold">Salvar Aula</button>
                        </form>
                      ) : (
                        <button onClick={() => setActiveLessonModuleId(mod.id)} className="text-sm text-cota-green font-semibold flex items-center gap-1"><Plus className="w-4 h-4" /> Adicionar Aula</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            {!quiz ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-gray-700">Nenhum Quiz Criado</h3>
                <p className="text-sm text-gray-500 mb-6">Cria uma avaliação final para que os alunos possam obter o certificado.</p>
                <button onClick={handleCreateQuiz} className="bg-cota-green text-white px-6 py-2 rounded-lg font-bold">Criar Quiz Agora</button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-cota-green" /> {quiz.quiz_questions.length} Perguntas Registadas</h3>
                  <button onClick={() => setShowQuestionForm(true)} className="bg-cota-gold text-cota-green-dark px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Nova Pergunta</button>
                </div>

                {showQuestionForm && (
                  <form onSubmit={handleAddQuestion} className="bg-white border-2 border-cota-gold/30 p-6 rounded-xl space-y-4">
                    <input type="text" placeholder="Escreve a pergunta aqui..." value={qText} onChange={(e) => setQTitle(e.target.value)} className="w-full p-3 border rounded-lg font-medium" required />
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-400 uppercase">Opções de Resposta</p>
                      {options.map((opt, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input type="radio" name="correct" checked={opt.is_correct} onChange={() => setOptions(options.map((o, idx) => ({ ...o, is_correct: idx === i })))} />
                          <input type="text" placeholder={`Opção ${i+1}`} value={opt.text} onChange={(e) => {
                            const newOpts = [...options]; newOpts[i].text = e.target.value; setOptions(newOpts);
                          }} className="flex-1 p-2 border rounded text-sm" required />
                          {options.length > 2 && <button type="button" onClick={() => setOptions(options.filter((_, idx) => idx !== i))} className="text-red-400"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      ))}
                      <button type="button" onClick={() => setOptions([...options, { text: "", is_correct: false }])} className="text-xs text-cota-green font-bold">+ Adicionar Opção</button>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="submit" className="bg-cota-green text-white px-6 py-2 rounded-lg font-bold text-sm">Salvar Pergunta</button>
                      <button type="button" onClick={() => setShowQuestionForm(false)} className="text-sm text-gray-500">Cancelar</button>
                    </div>
                  </form>
                )}

                <div className="space-y-4">
                  {quiz.quiz_questions.map((q, idx) => (
                    <div key={q.id} className="bg-gray-50 p-5 rounded-xl border border-gray-100 relative group">
                      <button onClick={async () => { if(confirm("Excluir pergunta?")) { await supabase.from("quiz_questions").delete().eq("id", q.id); loadCourseData(); } }} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                      <p className="font-bold text-gray-800 mb-3">{idx + 1}. {q.question}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {q.quiz_options.map(opt => (
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