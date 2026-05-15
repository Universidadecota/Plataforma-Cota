import { useEffect, useState } from "react";
import { Users, BookOpen, Award, TrendingUp, AlertTriangle, Download, DollarSign, Target, BarChart3, Briefcase } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import type { UserProfile, Lead } from "@/types";

interface StudentStats {
  profile: UserProfile;
  enrollments: number;
  completedCourses: number;
  certificates: number;
  points: number;
  totalLeads: number;
  wonLeads: number;
  totalSoldValue: number;
  pipelineValue: number;
}

type DashboardTab = "educational" | "commercial";

export default function ManagerDashboard() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<DashboardTab>("educational");
  const [students, setStudents] = useState<StudentStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Totais Educacionais
  const [totalEnrollments, setTotalEnrollments] = useState(0);
  const [totalCerts, setTotalCerts] = useState(0);
  const [avgPoints, setAvgPoints] = useState(0);

  // Totais Comerciais
  const [globalLeads, setGlobalLeads] = useState(0);
  const [globalSales, setGlobalSales] = useState(0);
  const [globalSalesValue, setGlobalSalesValue] = useState(0);
  const [globalPipelineValue, setGlobalPipelineValue] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        
        // CORREÇÃO AQUI: Removido o filtro .in("role", ["student", "instructor"])
        // Agora o painel busca TODOS os usuários, incluindo os Admins e Gestores
        const { data: profiles, error: errProf } = await supabase
          .from("user_profiles")
          .select("*")
          .order("points", { ascending: false });
          
        if (errProf) throw errProf;
        if (!profiles) return;

        const { data: allLeads, error: errLeads } = await supabase.from("leads").select("*");
        if (errLeads) throw errLeads;

        const stats: StudentStats[] = [];
        
        for (const p of profiles) {
          const { data: enrs } = await supabase.from("enrollments").select("id").eq("student_id", p.id);
          const { data: certs } = await supabase.from("certificates").select("id").eq("student_id", p.id);

          const userLeads = (allLeads as Lead[])?.filter((l) => l.assigned_to === p.id) || [];
          const wonLeads = userLeads.filter((l) => l.status === "ganho");
          const activeLeads = userLeads.filter((l) => l.status !== "ganho" && l.status !== "perdido");

          const totalSold = wonLeads.reduce((acc, lead) => acc + (lead.estimated_letter_value || 0), 0);
          const pipelineValue = activeLeads.reduce((acc, lead) => acc + (lead.estimated_letter_value || 0), 0);

          stats.push({
            profile: p,
            enrollments: enrs?.length || 0,
            completedCourses: certs?.length || 0,
            certificates: certs?.length || 0,
            points: p.points || 0,
            totalLeads: userLeads.length,
            wonLeads: wonLeads.length,
            totalSoldValue: totalSold,
            pipelineValue: pipelineValue,
          });
        }

        setStudents(stats);

        setTotalEnrollments(stats.reduce((a, s) => a + s.enrollments, 0));
        setTotalCerts(stats.reduce((a, s) => a + s.certificates, 0));
        setAvgPoints(stats.length > 0 ? Math.round(stats.reduce((a, s) => a + s.points, 0) / stats.length) : 0);

        setGlobalLeads(stats.reduce((a, s) => a + s.totalLeads, 0));
        setGlobalSales(stats.reduce((a, s) => a + s.wonLeads, 0));
        setGlobalSalesValue(stats.reduce((a, s) => a + s.totalSoldValue, 0));
        setGlobalPipelineValue(stats.reduce((a, s) => a + s.pipelineValue, 0));

      } catch (error) {
        console.error("Erro ao carregar o dashboard do gestor:", error);
        toast.error("Ocorreu um erro ao cruzar os dados da equipa.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const exportCSV = () => {
    const rows = [
      ["Nome", "E-mail", "Pontos de Estudo", "Matriculas", "Certificados", "Leads Trabalhados", "Vendas Fechadas", "Valor Vendido (R$)", "Valor em Pipeline (R$)"],
      ...students.map((s) => [
        s.profile.full_name || s.profile.username,
        s.profile.email,
        s.points,
        s.enrollments,
        s.certificates,
        s.totalLeads,
        s.wonLeads,
        s.totalSoldValue,
        s.pipelineValue,
      ]),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inteligencia_equipa_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  };

  const atRisk = students.filter((s) => s.enrollments > 0 && s.completedCourses === 0 && s.points < 50);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-header mb-0">Gestão e Inteligência</h1>
          <p className="page-subtitle mt-1">Cruza os dados de aprendizagem com a performance de vendas da tua equipa</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 bg-cota-green text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-cota-green-light transition-colors">
          <Download className="w-4 h-4" /> Exportar Relatório Geral
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        <button onClick={() => setTab("educational")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "educational" ? "bg-white text-cota-green shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <BookOpen className="w-4 h-4" /> Painel Educacional
        </button>
        <button onClick={() => setTab("commercial")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "commercial" ? "bg-white text-cota-green shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <Briefcase className="w-4 h-4" /> Painel Comercial (ROI)
        </button>
      </div>

      {tab === "educational" ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="stat-card"><div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3"><Users className="w-5 h-5 text-blue-600" /></div><p className="text-2xl font-bold text-gray-800">{students.length}</p><p className="text-xs text-gray-500">Membros da Equipa</p></div>
            <div className="stat-card"><div className="w-10 h-10 rounded-xl bg-cota-green/10 flex items-center justify-center mb-3"><BookOpen className="w-5 h-5 text-cota-green" /></div><p className="text-2xl font-bold text-gray-800">{totalEnrollments}</p><p className="text-xs text-gray-500">Matrículas Ativas</p></div>
            <div className="stat-card"><div className="w-10 h-10 rounded-xl bg-cota-gold/10 flex items-center justify-center mb-3"><Award className="w-5 h-5 text-cota-gold" /></div><p className="text-2xl font-bold text-gray-800">{totalCerts}</p><p className="text-xs text-gray-500">Certificados Emitidos</p></div>
            <div className="stat-card"><div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3"><TrendingUp className="w-5 h-5 text-purple-600" /></div><p className="text-2xl font-bold text-gray-800">{avgPoints}</p><p className="text-xs text-gray-500">Média de Pontos</p></div>
          </div>

          {atRisk.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-700"><strong>{atRisk.length} aluno(s)</strong> com matrícula mas sem progresso de estudo. Recomendado follow-up do gestor.</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-800">Engajamento de Estudo</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr><th className="px-5 py-3">Vendedor / Aluno</th><th className="px-5 py-3 text-center">Matrículas</th><th className="px-5 py-3 text-center">Concluídas</th><th className="px-5 py-3 text-center">Certificados</th><th className="px-5 py-3 text-center">Pontos</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((s) => (
                    <tr key={s.profile.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-cota-green/10 flex items-center justify-center text-cota-green font-bold text-sm flex-shrink-0">{(s.profile.full_name || s.profile.username).charAt(0).toUpperCase()}</div><div><p className="text-sm font-semibold text-gray-800">{s.profile.full_name || s.profile.username}</p><p className="text-xs text-gray-400">{s.profile.email}</p></div></div></td>
                      <td className="px-5 py-3.5 text-center text-sm font-semibold text-gray-700">{s.enrollments}</td>
                      <td className="px-5 py-3.5 text-center text-sm font-semibold text-cota-green">{s.completedCourses}</td>
                      <td className="px-5 py-3.5 text-center text-sm font-semibold text-cota-gold">{s.certificates}</td>
                      <td className="px-5 py-3.5 text-center text-sm font-bold text-gray-700">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="stat-card"><div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3"><Target className="w-5 h-5 text-blue-600" /></div><p className="text-2xl font-bold text-gray-800">{globalLeads}</p><p className="text-xs text-gray-500">Leads Trabalhados</p></div>
            <div className="stat-card"><div className="w-10 h-10 rounded-xl bg-cota-green/10 flex items-center justify-center mb-3"><Award className="w-5 h-5 text-cota-green" /></div><p className="text-2xl font-bold text-gray-800">{globalSales}</p><p className="text-xs text-gray-500">Vendas Fechadas (Ganho)</p></div>
            <div className="stat-card"><div className="w-10 h-10 rounded-xl bg-cota-gold/10 flex items-center justify-center mb-3"><DollarSign className="w-5 h-5 text-cota-gold" /></div><p className="text-2xl font-bold text-gray-800">{formatCurrency(globalSalesValue)}</p><p className="text-xs text-gray-500">VGV Fechado</p></div>
            <div className="stat-card"><div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3"><BarChart3 className="w-5 h-5 text-purple-600" /></div><p className="text-2xl font-bold text-gray-800">{formatCurrency(globalPipelineValue)}</p><p className="text-xs text-gray-500">Pipeline (Em Negociação)</p></div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-gray-800">Ranking Comercial vs Treinamento</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Métricas ordenadas por VGV</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr><th className="px-5 py-3">Vendedor</th><th className="px-5 py-3 text-center">Pontos de Estudo</th><th className="px-5 py-3 text-center">Conversões</th><th className="px-5 py-3 text-center">VGV Fechado</th><th className="px-5 py-3 text-center">Pipeline Ativo</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.sort((a, b) => b.totalSoldValue - a.totalSoldValue).map((s) => (
                    <tr key={s.profile.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">{(s.profile.full_name || s.profile.username).charAt(0).toUpperCase()}</div><div><p className="text-sm font-semibold text-gray-800">{s.profile.full_name || s.profile.username}</p><p className="text-xs text-gray-400">{s.totalLeads} leads em carteira</p></div></div></td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${s.points > avgPoints ? "bg-cota-green/10 text-cota-green" : "bg-gray-100 text-gray-500"}`}>{s.points} pts</span>
                      </td>
                      <td className="px-5 py-3.5 text-center text-sm font-semibold text-gray-700">{s.wonLeads} vendas</td>
                      <td className="px-5 py-3.5 text-center text-sm font-bold text-cota-gold">{formatCurrency(s.totalSoldValue)}</td>
                      <td className="px-5 py-3.5 text-center text-sm font-medium text-gray-500">{formatCurrency(s.pipelineValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}