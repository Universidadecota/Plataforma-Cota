import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, BookOpen, Bell, Settings, Plus, Edit2, Trash2, Eye, EyeOff, MessageCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/constants";
import { formatDate } from "@/lib/utils";
import type { UserProfile, Course, Announcement, WhatsAppScript, Objection } from "@/types";

type AdminTab = "users" | "courses" | "announcements" | "scripts" | "objections";

export default function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [scripts, setScripts] = useState<WhatsAppScript[]>([]);
  const [objections, setObjections] = useState<Objection[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulário de Comunicados
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annPriority, setAnnPriority] = useState("normal");
  const [annTargetRole, setAnnTargetRole] = useState("");

  // Formulário de Trilhas
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseCategory, setCourseCategory] = useState("Fundamentos");
  const [courseLevel, setCourseLevel] = useState("beginner");

  // Formulário de Scripts
  const [showScriptForm, setShowScriptForm] = useState(false);
  const [scriptTitle, setScriptTitle] = useState("");
  const [scriptCategory, setScriptCategory] = useState("Captação");
  const [scriptContent, setScriptContent] = useState("");

  // Formulário de Objeções
  const [showObjForm, setShowObjForm] = useState(false);
  const [objTitle, setObjTitle] = useState("");
  const [objCategory, setObjCategory] = useState("Financeiro");
  const [objResponse, setObjResponse] = useState("");
  const [objTips, setObjTips] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const [
        { data: u, error: errU },
        { data: c, error: errC },
        { data: a, error: errA },
        { data: s, error: errS },
        { data: o, error: errO }
      ] = await Promise.all([
        supabase.from("user_profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("courses").select("*").order("order_index"),
        supabase.from("announcements").select("*").order("created_at", { ascending: false }),
        supabase.from("whatsapp_scripts").select("*").order("created_at", { ascending: false }),
        supabase.from("objections").select("*").order("created_at", { ascending: false }),
      ]);

      if (errU || errC || errA || errS || errO) throw new Error("Erro ao carregar dados.");

      setUsers(u || []);
      setCourses(c || []);
      setAnnouncements(a || []);
      setScripts(s || []);
      setObjections(o || []);
    } catch (error) {
      console.error(error);
      toast.error("Houve um problema ao carregar as informações do painel.");
    } finally {
      setLoading(false);
    }
  }

  // --- Funções de Trilhas ---
  const submitCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle) { toast.error("Preenche o título da trilha."); return; }
    try {
      setLoading(true);
      const { data: newCourse, error: courseErr } = await supabase.from("courses").insert({
        title: courseTitle,
        category: courseCategory,
        level: courseLevel,
        duration_hours: 1, 
        is_published: false 
      }).select().single();

      if (courseErr) throw courseErr;

      await supabase.from("modules").insert({
        course_id: newCourse.id,
        title: "Módulo 1 - Introdução",
        order_index: 1
      });

      toast.success("Trilha criada! Agora adiciona as aulas.");
      setShowCourseForm(false);
      setCourseTitle("");
      loadAll();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar a trilha.");
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (id: string) => {
    if (!confirm("⚠️ ATENÇÃO: Excluir esta trilha apagará TODOS os módulos, aulas e avaliações vinculados a ela. Desejas realmente excluir?")) return;
    try {
      setLoading(true);
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
      toast.success("Trilha excluída com sucesso.");
      loadAll();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir a trilha.");
      setLoading(false);
    }
  };

  const toggleCoursePublished = async (course: Course) => {
    try {
      const { error } = await supabase.from("courses").update({ is_published: !course.is_published }).eq("id", course.id);
      if (error) throw error;
      setCourses((prev) => prev.map((c) => c.id === course.id ? { ...c, is_published: !c.is_published } : c));
      toast.success(course.is_published ? "Trilha ocultada." : "Trilha publicada!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar estado.");
    }
  };

  // --- Funções de Utilizadores ---
  const updateUserRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase.from("user_profiles").update({ role }).eq("id", userId);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: role as UserProfile["role"] } : u));
      toast.success("Perfil atualizado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar perfil.");
    }
  };

  // --- Funções de Comunicados ---
  const submitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) { toast.error("Preenche título e conteúdo."); return; }
    try {
      setLoading(true);
      const { error } = await supabase.from("announcements").insert({
        title: annTitle,
        content: annContent,
        priority: annPriority,
        target_role: annTargetRole || null,
        is_published: true,
      });
      if (error) throw error;
      toast.success("Comunicado publicado!");
      setShowAnnForm(false);
      setAnnTitle(""); setAnnContent(""); setAnnPriority("normal"); setAnnTargetRole("");
      loadAll();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar comunicado.");
      setLoading(false);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm("Excluir este comunicado?")) return;
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Comunicado removido.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover comunicado.");
    }
  };

  // --- Funções de Scripts ---
  const submitScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptTitle || !scriptContent) { toast.error("Preenche título e conteúdo do script."); return; }
    try {
      setLoading(true);
      const { error } = await supabase.from("whatsapp_scripts").insert({
        title: scriptTitle,
        category: scriptCategory,
        content: scriptContent
      });
      if (error) throw error;
      toast.success("Script criado com sucesso!");
      setShowScriptForm(false);
      setScriptTitle(""); setScriptContent("");
      loadAll();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar script.");
      setLoading(false);
    }
  };

  const deleteScript = async (id: string) => {
    if (!confirm("Desejas eliminar este script?")) return;
    try {
      const { error } = await supabase.from("whatsapp_scripts").delete().eq("id", id);
      if (error) throw error;
      setScripts((prev) => prev.filter((s) => s.id !== id));
      toast.success("Script removido.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover script.");
    }
  };

  // --- Funções de Objeções ---
  const submitObjection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objTitle || !objResponse) { toast.error("Preenche a objeção e a resposta."); return; }
    try {
      setLoading(true);
      const { error } = await supabase.from("objections").insert({
        objection: objTitle,
        category: objCategory,
        response: objResponse,
        tips: objTips || null
      });
      if (error) throw error;
      toast.success("Objeção registada com sucesso!");
      setShowObjForm(false);
      setObjTitle(""); setObjResponse(""); setObjTips("");
      loadAll();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar objeção.");
      setLoading(false);
    }
  };

  const deleteObjection = async (id: string) => {
    if (!confirm("Desejas eliminar esta objeção?")) return;
    try {
      const { error } = await supabase.from("objections").delete().eq("id", id);
      if (error) throw error;
      setObjections((prev) => prev.filter((o) => o.id !== id));
      toast.success("Objeção removida.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover objeção.");
    }
  };

  const tabs = [
    { key: "users" as AdminTab, label: "Utilizadores", icon: Users },
    { key: "courses" as AdminTab, label: "Trilhas", icon: BookOpen },
    { key: "announcements" as AdminTab, label: "Comunicados", icon: Bell },
    { key: "scripts" as AdminTab, label: "Scripts", icon: MessageCircle },
    { key: "objections" as AdminTab, label: "Objeções", icon: ShieldCheck },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-cota-green flex items-center justify-center">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="page-header mb-0">Painel Administrativo</h1>
          <p className="text-sm text-gray-500">Gestão completa da plataforma</p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-cota-green">{users.length}</p>
          <p className="text-xs text-gray-500">Utilizadores</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-cota-gold">{courses.filter((c) => c.is_published).length}</p>
          <p className="text-xs text-gray-500">Trilhas Ativas</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-blue-600">{scripts.length}</p>
          <p className="text-xs text-gray-500">Scripts</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-red-500">{objections.length}</p>
          <p className="text-xs text-gray-500">Objeções</p>
        </div>
      </div>

      {/* Separadores (Tabs) */}
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? "bg-white text-cota-green shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Aba Utilizadores */}
          {tab === "users" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-800">Gerir Utilizadores</h2>
                <span className="text-sm text-gray-400">{users.length} utilizadores</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-5 py-3 text-left">Utilizador</th>
                      <th className="px-5 py-3 text-left">E-mail</th>
                      <th className="px-5 py-3 text-center">Perfil</th>
                      <th className="px-5 py-3 text-center">Pontos</th>
                      <th className="px-5 py-3 text-center">Desde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-cota-green/10 flex items-center justify-center text-cota-green font-bold text-sm flex-shrink-0">
                              {(u.full_name || u.username).charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-800">{u.full_name || u.username}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">{u.email}</td>
                        <td className="px-5 py-3.5 text-center">
                          <select
                            value={u.role}
                            onChange={(e) => updateUserRole(u.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cota-green/30"
                          >
                            <option value="student">Aluno</option>
                            <option value="instructor">Instrutor</option>
                            <option value="manager">Gestor</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-5 py-3.5 text-center text-sm font-bold text-gray-700">{u.points}</td>
                        <td className="px-5 py-3.5 text-center text-xs text-gray-400">{formatDate(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Aba Trilhas */}
          {tab === "courses" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setShowCourseForm(!showCourseForm)}
                  className="flex items-center gap-2 bg-cota-gold text-cota-green-dark px-4 py-2 rounded-lg text-sm font-bold hover:bg-cota-gold-dark transition-colors">
                  <Plus className="w-4 h-4" /> Nova Trilha
                </button>
              </div>

              {showCourseForm && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 mb-4">Criar Nova Trilha</h3>
                  <form onSubmit={submitCourse} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Título da Trilha</label>
                      <input type="text" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)}
                        placeholder="Ex: Como Vender Consórcio de Imóveis"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
                        <select value={courseCategory} onChange={(e) => setCourseCategory(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30">
                          <option value="Fundamentos">Fundamentos</option>
                          <option value="Imóveis">Imóveis</option>
                          <option value="Automóveis">Automóveis</option>
                          <option value="Vendas">Vendas</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nível</label>
                        <select value={courseLevel} onChange={(e) => setCourseLevel(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30">
                          <option value="beginner">Iniciante</option>
                          <option value="intermediate">Intermediário</option>
                          <option value="advanced">Avançado</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setShowCourseForm(false)}
                        className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                      <button type="submit"
                        className="flex-1 bg-cota-green text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-cota-green-light transition-colors">
                        Criar Trilha
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-800">Gerir Trilhas</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {courses.map((course) => (
                    <div key={course.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${course.is_published ? "bg-green-500" : "bg-gray-300"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{course.title}</p>
                        <p className="text-xs text-gray-400">{course.category} · {course.duration_hours}h · {course.level}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${course.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {course.is_published ? "Publicada" : "Oculta"}
                        </span>
                        
                        <button onClick={() => toggleCoursePublished(course)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title={course.is_published ? "Ocultar" : "Publicar"}>
                          {course.is_published ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-cota-green" />}
                        </button>
                        
                        <Link to={`/admin/courses/${course.id}`} className="p-1.5 rounded-lg hover:bg-cota-green/10 text-gray-500 hover:text-cota-green transition-colors" title="Gerir Módulos e Aulas">
                          <Edit2 className="w-4 h-4" />
                        </Link>

                        <button onClick={() => deleteCourse(course.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Excluir Trilha">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Aba Comunicados */}
          {tab === "announcements" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setShowAnnForm(!showAnnForm)}
                  className="flex items-center gap-2 bg-cota-green text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-cota-green-light transition-colors">
                  <Plus className="w-4 h-4" /> Novo Comunicado
                </button>
              </div>

              {showAnnForm && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 mb-4">Criar Comunicado</h3>
                  <form onSubmit={submitAnnouncement} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Título</label>
                      <input type="text" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)}
                        placeholder="Título do comunicado"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Conteúdo</label>
                      <textarea value={annContent} onChange={(e) => setAnnContent(e.target.value)}
                        placeholder="Conteúdo do comunicado..."
                        rows={4}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Prioridade</label>
                        <select value={annPriority} onChange={(e) => setAnnPriority(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30">
                          <option value="low">Baixa</option>
                          <option value="normal">Normal</option>
                          <option value="high">Alta</option>
                          <option value="urgent">Urgente</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Destinatário</label>
                        <select value={annTargetRole} onChange={(e) => setAnnTargetRole(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30">
                          <option value="">Todos</option>
                          <option value="student">Alunos</option>
                          <option value="instructor">Instrutores</option>
                          <option value="manager">Gestores</option>
                          <option value="admin">Admins</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setShowAnnForm(false)}
                        className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                      <button type="submit"
                        className="flex-1 bg-cota-green text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-cota-green-light transition-colors">
                        Publicar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-800">Comunicados Publicados</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-800 text-sm">{ann.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ann.priority === "urgent" ? "bg-red-100 text-red-700" : ann.priority === "high" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                            {ann.priority}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-1">{ann.content}</p>
                        <p className="text-xs text-gray-300 mt-1">{formatDate(ann.created_at)}</p>
                      </div>
                      <button onClick={() => deleteAnnouncement(ann.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Aba Scripts de WhatsApp */}
          {tab === "scripts" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setShowScriptForm(!showScriptForm)}
                  className="flex items-center gap-2 bg-cota-green text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-cota-green-light transition-colors">
                  <Plus className="w-4 h-4" /> Novo Script
                </button>
              </div>

              {showScriptForm && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 mb-4">Criar Script de WhatsApp</h3>
                  <form onSubmit={submitScript} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Título do Script</label>
                        <input type="text" value={scriptTitle} onChange={(e) => setScriptTitle(e.target.value)}
                          placeholder="Ex: Abordagem Fria" required
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
                        <select value={scriptCategory} onChange={(e) => setScriptCategory(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30">
                          <option value="Captação">Captação</option>
                          <option value="Follow-up">Follow-up</option>
                          <option value="Reativação">Reativação</option>
                          <option value="Proposta">Proposta</option>
                          <option value="Pós-venda">Pós-venda</option>
                          <option value="Relacionamento">Relacionamento</option>
                          <option value="Indicação">Indicação</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Conteúdo da Mensagem</label>
                      <textarea value={scriptContent} onChange={(e) => setScriptContent(e.target.value)}
                        placeholder="Escreve a mensagem aqui..." required rows={5}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green resize-none" />
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setShowScriptForm(false)}
                        className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                      <button type="submit"
                        className="flex-1 bg-cota-green text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-cota-green-light transition-colors">
                        Salvar Script
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-800">Scripts Disponíveis</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {scripts.map((script) => (
                    <div key={script.id} className="p-5 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-800 text-sm">{script.title}</h3>
                          <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                            {script.category}
                          </span>
                        </div>
                        <button onClick={() => deleteScript(script.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100 font-mono text-xs text-gray-600">
                        {script.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Aba Objeções */}
          {tab === "objections" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setShowObjForm(!showObjForm)}
                  className="flex items-center gap-2 bg-cota-green text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-cota-green-light transition-colors">
                  <Plus className="w-4 h-4" /> Nova Objeção
                </button>
              </div>

              {showObjForm && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 mb-4">Registar Objeção de Mercado</h3>
                  <form onSubmit={submitObjection} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Objeção do Cliente</label>
                        <input type="text" value={objTitle} onChange={(e) => setObjTitle(e.target.value)}
                          placeholder="Ex: Não tenho pressa, prefiro juntar" required
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
                        <select value={objCategory} onChange={(e) => setObjCategory(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30">
                          <option value="Financeiro">Financeiro</option>
                          <option value="Comparação">Comparação</option>
                          <option value="Funcionamento">Funcionamento</option>
                          <option value="Experiência negativa">Experiência negativa</option>
                          <option value="Procrastinação">Procrastinação</option>
                          <option value="Custo">Custo</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Resposta Recomendada</label>
                      <textarea value={objResponse} onChange={(e) => setObjResponse(e.target.value)}
                        placeholder="Como o consultor deve responder..." required rows={3}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green resize-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Dica Extra (Opcional)</label>
                      <input type="text" value={objTips} onChange={(e) => setObjTips(e.target.value)}
                        placeholder="Ex: Usa um tom de voz empático e compreensivo."
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green" />
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setShowObjForm(false)}
                        className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                      <button type="submit"
                        className="flex-1 bg-cota-green text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-cota-green-light transition-colors">
                        Salvar Objeção
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-800">Objeções Mapeadas</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {objections.map((obj) => (
                    <div key={obj.id} className="p-5 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">"{obj.objection}"</p>
                          <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                            {obj.category}
                          </span>
                        </div>
                        <button onClick={() => deleteObjection(obj.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="bg-cota-green/5 border border-cota-green/20 rounded-lg p-4 text-sm text-gray-700 italic">
                        {obj.response}
                      </div>
                      {obj.tips && (
                        <p className="mt-2 text-xs text-cota-gold-dark flex items-center gap-1">
                          <span className="font-bold">Dica:</span> {obj.tips}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}