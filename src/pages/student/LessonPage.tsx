import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle, Download, Save, ChevronRight, BookOpen, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
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

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const { data: lessonData, error: errLess } = await supabase.from("lessons").select("*, modules(*, courses(id, title))").eq("id", id).single();
        if (errLess) throw errLess;
        if (!lessonData) return;
        setLesson(lessonData as FullLesson);

        const { data: matData, error: errMat } = await supabase.from("materials").select("*").eq("lesson_id", id);
        if (errMat) throw errMat;
        setMaterials(matData || []);

        // CORREÇÃO: Usando maybeSingle() para evitar erro 406 caso o aluno ainda não tenha acessado a aula
        const { data: progData, error: errProg } = await supabase.from("lesson_progress").select("*").eq("student_id", user!.id).eq("lesson_id", id).maybeSingle();
        if (errProg) throw errProg;
        if (progData) {
          setIsCompleted(progData.completed);
          setNotes(progData.notes || "");
        }

        const { data: siblingLessons, error: errSib } = await supabase.from("lessons").select("*").eq("module_id", lessonData.module_id).order("order_index");
        if (errSib) throw errSib;

        if (siblingLessons) {
          const idx = siblingLessons.findIndex((l) => l.id === id);
          setPrevLesson(idx > 0 ? siblingLessons[idx - 1] : null);
          setNextLesson(idx < siblingLessons.length - 1 ? siblingLessons[idx + 1] : null);
        }
      } catch (error) {
        console.error("Erro ao carregar Aula:", error);
        toast.error("Ocorreu um erro ao carregar o conteúdo da aula.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, user]);

  const handleMarkComplete = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from("lesson_progress").upsert({
      student_id: user!.id,
      lesson_id: id!,
      completed: !isCompleted,
      notes,
      completed_at: !isCompleted ? now : null,
    }, { onConflict: "student_id,lesson_id" });

    if (error) { toast.error("Erro ao salvar progresso."); }
    else {
      const newCompleted = !isCompleted;
      setIsCompleted(newCompleted);
      if (newCompleted) {
        const newPoints = (user?.points || 0) + POINTS_PER_LESSON;
        await supabase.from("user_profiles").update({ points: newPoints }).eq("id", user!.id);
        updatePoints(newPoints);
        toast.success(`Aula concluída! +${POINTS_PER_LESSON} pontos conquistados!`);
        if (nextLesson) {
          setTimeout(() => navigate(`/lessons/${nextLesson.id}`), 1200);
        }
      } else {
        toast.info("Aula marcada como não concluída.");
      }
    }
    setSaving(false);
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    const { error } = await supabase.from("lesson_progress").upsert({
      student_id: user!.id,
      lesson_id: id!,
      notes,
      completed: isCompleted,
    }, { onConflict: "student_id,lesson_id" });
    if (error) toast.error("Erro ao salvar anotações.");
    else toast.success("Anotações salvas!");
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!lesson) return (
    <div className="text-center py-20 text-gray-400">Aula não encontrada.</div>
  );

  const courseId = (lesson.module as Module & { course?: { id: string; title: string } })?.course?.id;
  const courseTitle = (lesson.module as Module & { course?: { id: string; title: string } })?.course?.title;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-5">
        {courseId && (
          <>
            <Link to={`/courses/${courseId}`} className="hover:text-cota-green transition-colors">{courseTitle}</Link>
            <span>/</span>
            <span className="text-gray-500">{lesson.module?.title}</span>
            <span>/</span>
          </>
        )}
        <span className="text-gray-700 font-medium">{lesson.title}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main lesson content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Video */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {lesson.video_url ? (
              <div className="aspect-video">
                <iframe
                  src={lesson.video_url}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
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
              <h1 className="text-lg font-bold text-gray-800">{lesson.title}</h1>
              <p className="text-xs text-gray-400 mt-1">Duração: {lesson.duration_minutes} minutos</p>
            </div>
          </div>

          {/* Content */}
          {lesson.content && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cota-green" /> Conteúdo da Aula
              </h2>
              <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
                {lesson.content.split("\n").map((para, i) => (
                  <p key={i} className="mb-3">{para}</p>
                ))}
              </div>
            </div>
          )}

          {/* Materials */}
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

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-3">Minhas Anotações</h2>
            <textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escreva suas anotações sobre esta aula..."
              rows={5}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green resize-none"
            />
            <button onClick={handleSaveNotes} disabled={saving}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              <Save className="w-3.5 h-3.5" /> Salvar Anotações
            </button>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Mark complete */}
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
              {saving ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {isCompleted ? "Aula Concluída ✓" : "Marcar como Concluída"}
                </>
              )}
            </button>
            {isCompleted && (
              <p className="text-center text-xs text-cota-green mt-2">+{POINTS_PER_LESSON} pontos conquistados!</p>
            )}
          </div>

          {/* Navigation */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Navegação</p>
            {prevLesson && (
              <Link to={`/lessons/${prevLesson.id}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-cota-green transition-colors p-2 rounded-lg hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4" />
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

          {/* Back to course */}
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