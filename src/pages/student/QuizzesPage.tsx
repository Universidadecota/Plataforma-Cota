import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, BookOpen, Trophy } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { POINTS_PER_QUIZ } from "@/constants";
import type { Quiz, QuizQuestion, QuizOption, QuizAttempt } from "@/types";

interface QuizWithCourse extends Omit<Quiz, "courses"> {
  courses?: { title: string };
  quiz_questions: (QuizQuestion & { quiz_options: QuizOption[] })[];
}

type QuizState = "idle" | "taking" | "result";

export default function QuizzesPage() {
  const { user, updatePoints } = useAuthStore();
  const [quizzes, setQuizzes] = useState<QuizWithCourse[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState<QuizWithCourse | null>(null);
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

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
        const [quizData, attData] = await Promise.all([
          directApiCall(
            "quizzes", 
            "GET", 
            undefined, 
            "select=*,courses(title),quiz_questions(*,quiz_options(*))&order=created_at.asc"
          ),
          directApiCall(
            "quiz_attempts",
            "GET",
            undefined,
            `student_id=eq.${user!.id}&select=*`
          )
        ]);

        setQuizzes(quizData as QuizWithCourse[] || []);
        setAttempts(attData || []);
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar os quizzes.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const getBestAttempt = (quizId: string) => {
    const quizAttempts = attempts.filter((a) => a.quiz_id === quizId);
    if (!quizAttempts.length) return null;
    return quizAttempts.sort((a, b) => b.score - a.score)[0];
  };

  const handleStartQuiz = (quiz: QuizWithCourse) => {
    setActiveQuiz(quiz);
    setAnswers({});
    setResult(null);
    setQuizState("taking");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!activeQuiz) return;
    const questions = activeQuiz.quiz_questions || [];
    let correct = 0;
    for (const q of questions) {
      const selectedId = answers[q.id];
      if (!selectedId) continue;
      const correctOpt = q.quiz_options?.find((o) => o.is_correct);
      if (correctOpt && correctOpt.id === selectedId) correct++;
    }
    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    const passed = score >= activeQuiz.passing_score;

    try {
      await directApiCall("quiz_attempts", "POST", {
        student_id: user!.id,
        quiz_id: activeQuiz.id,
        score,
        passed,
        answers,
      });

      if (passed) {
        const newPoints = (user?.points || 0) + POINTS_PER_QUIZ;
        await directApiCall("user_profiles", "PATCH", { points: newPoints }, `id=eq.${user!.id}`);
        updatePoints(newPoints);
        toast.success(`Aprovado! +${POINTS_PER_QUIZ} pontos!`);
      } else {
        toast.error(`Não aprovado. Nota: ${score}%. Mínimo: ${activeQuiz.passing_score}%.`);
      }

      setResult({ score, passed });
      setQuizState("result");
      setAttempts((prev) => [...prev, {
        id: crypto.randomUUID(), student_id: user!.id, quiz_id: activeQuiz.id,
        score, passed, answers, attempted_at: new Date().toISOString(),
      }]);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar o quiz.");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (quizState === "taking" && activeQuiz) {
    const questions = activeQuiz.quiz_questions || [];
    const answered = Object.keys(answers).length;
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-bold text-gray-800 text-lg">{activeQuiz.title}</h1>
            <p className="text-sm text-gray-400">{activeQuiz.courses?.title}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">{answered}/{questions.length} respondidas</p>
            <p className="text-xs text-gray-400">Mínimo para aprovação: {activeQuiz.passing_score}%</p>
          </div>
        </div>

        <div className="space-y-5">
          {questions.sort((a, b) => a.order_index - b.order_index).map((q, idx) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="font-semibold text-gray-800 mb-4 text-sm">
                <span className="text-cota-gold font-bold">{idx + 1}. </span>{q.question}
              </p>
              <div className="space-y-2">
                {(q.quiz_options || []).sort((a, b) => a.order_index - b.order_index).map((opt) => (
                  <label key={opt.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      answers[q.id] === opt.id
                        ? "border-cota-green bg-cota-green/5 text-cota-green"
                        : "border-gray-200 hover:border-cota-green/40 hover:bg-gray-50"
                    }`}>
                    <input type="radio" name={q.id} value={opt.id}
                      checked={answers[q.id] === opt.id}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                      className="w-4 h-4 accent-cota-green" />
                    <span className="text-sm">{opt.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={() => setQuizState("idle")}
            className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit}
            disabled={answered < questions.length}
            className="flex-1 bg-cota-green hover:bg-cota-green-light text-white py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50">
            Enviar Respostas ({answered}/{questions.length})
          </button>
        </div>
      </div>
    );
  }

  if (quizState === "result" && result && activeQuiz) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className={`rounded-2xl p-8 text-center mb-6 ${result.passed ? "bg-cota-green text-white" : "bg-red-50 border border-red-100"}`}>
          {result.passed ? (
            <>
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-cota-gold" />
              <h2 className="text-2xl font-bold mb-2">Parabéns! Aprovado!</h2>
              <p className="text-white/80 mb-4">Você demonstrou domínio do conteúdo.</p>
              <div className="text-4xl font-black text-cota-gold">{result.score}%</div>
              <p className="text-white/70 text-sm mt-1">+{POINTS_PER_QUIZ} pontos adicionados!</p>
            </>
          ) : (
            <>
              <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h2 className="text-2xl font-bold text-red-700 mb-2">Não aprovado</h2>
              <p className="text-red-500 mb-4">Revise o conteúdo e tente novamente.</p>
              <div className="text-4xl font-black text-red-600">{result.score}%</div>
              <p className="text-red-400 text-sm mt-1">Mínimo necessário: {activeQuiz.passing_score}%</p>
            </>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setQuizState("idle")}
            className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Voltar aos Quizzes
          </button>
          {!result.passed && (
            <button onClick={() => handleStartQuiz(activeQuiz)}
              className="flex-1 bg-cota-green text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-cota-green-light transition-colors">
              Tentar Novamente
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-header">Avaliações e Quizzes</h1>
      <p className="page-subtitle">Teste seus conhecimentos e conquiste pontos extra</p>

      {quizzes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum quiz disponível ainda</p>
          <p className="text-sm text-gray-400">As avaliações serão disponibilizadas em breve.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {quizzes.map((quiz) => {
            const best = getBestAttempt(quiz.id);
            return (
              <div key={quiz.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-cota-green/10 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-cota-green" />
                  </div>
                  <span className="text-xs text-gray-400">{quiz.courses?.title}</span>
                </div>
                <h3 className="font-bold text-gray-800 text-sm mb-2">{quiz.title}</h3>
                {quiz.description && <p className="text-xs text-gray-500 mb-4 line-clamp-2">{quiz.description}</p>}

                <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{quiz.quiz_questions?.length || 0} questões</span>
                  <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Mín. {quiz.passing_score}%</span>
                  {quiz.time_limit_minutes && (
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{quiz.time_limit_minutes}min</span>
                  )}
                </div>

                {best && (
                  <div className={`rounded-lg p-2.5 mb-3 text-xs flex items-center justify-between ${best.passed ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                    <span>{best.passed ? "✓ Aprovado" : "✗ Não aprovado"}</span>
                    <span className="font-bold">{best.score}%</span>
                  </div>
                )}

                <button
                  onClick={() => handleStartQuiz(quiz)}
                  className="mt-auto w-full bg-cota-green hover:bg-cota-green-light text-white py-2.5 rounded-lg font-semibold text-sm transition-colors"
                >
                  {best ? "Refazer Quiz" : "Iniciar Quiz"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}