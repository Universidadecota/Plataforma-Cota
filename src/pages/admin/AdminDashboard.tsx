import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, BookOpen, Bell, Settings, Plus, Edit2, Trash2, Eye, EyeOff, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
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
  const [saving, setSaving] = useState(false);

  // Formulário de Criação: Comunicados
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annPriority, setAnnPriority] = useState("normal");
  const [annTargetRole, setAnnTargetRole] = useState("");

  // Formulário de Edição: Comunicados
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [editAnnTitle, setEditAnnTitle] = useState("");
  const [editAnnContent, setEditAnnContent] = useState("");
  const [editAnnPriority, setEditAnnPriority] = useState("normal");
  const [editAnnTargetRole, setEditAnnTargetRole] = useState("");

  // Formulário de Criação: Trilhas
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseCategory, setCourseCategory] = useState("Fundamentos");
  const [courseLevel, setCourseLevel] = useState("beginner");

  // Formulário de Criação: Scripts
  const [showScriptForm, setShowScriptForm] = useState(false);
  const [scriptTitle, setScriptTitle] = useState("");
  const [scriptCategory, setScriptCategory] = useState("Primeiro contato");
  const [scriptContent, setScriptContent] = useState("");

  // Formulário de Edição: Scripts
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
  const [editScriptTitle, setEditScriptTitle] = useState("");
  const [editScriptCategory, setEditScriptCategory] = useState("");
  const [editScriptContent, setEditScriptContent] = useState("");

  // Formulário de Criação: Objeções
  const [showObjForm, setShowObjForm] = useState(false);
  const [objTitle, setObjTitle] = useState("");
  const [objCategory, setObjCategory] = useState("Contemplação");
  const [objResponse, setObjResponse] = useState("");
  const [objTips, setObjTips] = useState("");

  // Formulário de Edição: Objeções
  const [editingObjId, setEditingObjId] = useState<string | null>(null);
  const [editObjTitle, setEditObjTitle] = useState("");
  const [editObjCategory, setEditObjCategory] = useState("");
  const [editObjResponse, setEditObjResponse] = useState("");
  const [editObjTips, setEditObjTips] = useState("");

  // =====================================================================
  // O MOTOR CENTRAL "MODO DEUS": Lê e Envia TUDO nativamente
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
    loadAll(true);
  }, []);

  async function loadAll(isInitial = false) {
    try {
      if (isInitial) setLoading(true);
      
      const [u, c, a, s, o] = await Promise.all([
        directApiCall('user_profiles', 'GET', undefined, 'select=*&order=created_at.desc'),
        directApiCall('courses', 'GET', undefined, 'select=*&order=title.asc'),
        directApiCall('announcements', 'GET', undefined, 'select=*&order=created_at.desc'),
        directApiCall('whatsapp_scripts', 'GET', undefined, 'select=*&order=created_at.desc'),
        directApiCall('objections', 'GET', undefined, 'select=*&order=created_at.desc'),
      ]);

      setUsers(u || []);
      setCourses(c || []);
      setAnnouncements(a || []);
      setScripts(s || []);
      setObjections(o || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Houve um problema ao sincronizar os dados.");
    } finally {
      if (isInitial) setLoading(false);
    }
  }

  // --- Funções de Trilhas ---
  const submitCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle) { toast.error("Preenche o título da trilha."); return; }
    if (!courseDescription) { toast.error("A descrição é importante para os alunos."); return; }

    try {
      setSaving(true);
      const newCourseArr = await directApiCall('courses', 'POST', {
        title: courseTitle,
        description: courseDescription,
        category: courseCategory,
        level: courseLevel,
        duration_hours: 1, 
        is_published: false 
      });

      const newCourseId = newCourseArr[0].id;

      await directApiCall('modules', 'POST', {
        course_id: newCourseId,
        title: "M01 - Introdução",
        order_index: 1
      });

      toast.success("Trilha criada com sucesso! 🚀");
      setShowCourseForm(false);
      setCourseTitle("");
      setCourseDescription("");
      await loadAll(false);
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao criar a trilha.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async (id: string) => {
    if (!confirm("⚠️ ATENÇÃO: Excluir esta trilha apagará TODOS os módulos e aulas. Deseja excluir?")) return;
    try {
      await directApiCall('courses', 'DELETE', undefined, `id=eq.${id}`);
      toast.success("Trilha excluída. 🚀");
      await loadAll(false);
    } catch (error) { toast.error("Erro ao excluir a trilha."); }
  };

  const toggleCoursePublished = async (course: Course) => {
    try {
      await directApiCall('courses', 'PATCH', { is_published: !course.is_published }, `id=eq.${course.id}`);
      setCourses((prev) => prev.map((c) => c.id === course.id ? { ...c, is_published: !c.is_published } : c));
      toast.success(course.is_published ? "Trilha ocultada. 🚀" : "Trilha publicada! 🚀");
    } catch (error) { toast.error("Erro ao atualizar estado."); }
  };

  // --- Funções de Utilizadores ---
  const updateUserRole = async (userId: string, role: string) => {
    try {
      await directApiCall('user_profiles', 'PATCH', { role }, `id=eq.${userId}`);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: role as UserProfile["role"] } : u));
      toast.success("Perfil atualizado! 🚀");
    } catch (error) { toast.error("Erro ao atualizar perfil."); }
  };

  // --- Funções de Comunicados ---
  const submitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) { toast.error("Preenche título e conteúdo."); return; }
    try {
      setSaving(true);
      await directApiCall('announcements', 'POST', {
        title: annTitle,
        content: annContent,
        priority: annPriority,
        target_role: annTargetRole || null,
        is_published: true,
      });
      toast.success("Comunicado publicado! 🚀");
      setShowAnnForm(false);
      setAnnTitle(""); setAnnContent(""); setAnnPriority("normal"); setAnnTargetRole("");
      await loadAll(false);
    } catch (error) { toast.error("Erro ao criar comunicado."); } finally { setSaving(false); }
  };

  const updateAnnouncement = async (id: string) => {
    if (!editAnnTitle || !editAnnContent) { toast.error("Preencha título e conteúdo."); return; }
    try {
      setSaving(true);
      await directApiCall('announcements', 'PATCH', {
        title: editAnnTitle,
        content: editAnnContent,
        priority: editAnnPriority,
        target_role: editAnnTargetRole || null
      }, `id=eq.${id}`);
      toast.success("Comunicado atualizado! 🚀");
      setEditingAnnId(null);
      await loadAll(false);
    } catch (error) { toast.error("Erro ao atualizar comunicado."); } finally { setSaving(false); }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm("Excluir este comunicado?")) return;
    try {
      await directApiCall('announcements', 'DELETE', undefined, `id=eq.${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Comunicado removido. 🚀");
    } catch (error) { toast.error("Erro ao remover comunicado."); }
  };

  // --- Funções de Scripts ---
  const submitScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptTitle || !scriptContent) { toast.error("Preenche título e conteúdo."); return; }
    try {
      setSaving(true);
      await directApiCall('whatsapp_scripts', 'POST', {
        title: scriptTitle,
        category: scriptCategory,
        content: scriptContent
      });
      toast.success("Script criado com sucesso! 🚀");
      setShowScriptForm(false);
      setScriptTitle(""); setScriptContent("");
      await loadAll(false);
    } catch (error) { toast.error("Erro ao criar script."); } finally { setSaving(false); }
  };

  const updateScript = async (id: string) => {
    if (!editScriptTitle || !editScriptContent) { toast.error("Preencha título e conteúdo."); return; }
    try {
      setSaving(true);
      await directApiCall('whatsapp_scripts', 'PATCH', {
        title: editScriptTitle,
        category: editScriptCategory,
        content: editScriptContent
      }, `id=eq.${id}`);
      toast.success("Script atualizado! 🚀");
      setEditingScriptId(null);
      await loadAll(false);
    } catch (error) { toast.error("Erro ao atualizar script."); } finally { setSaving(false); }
  };

  const deleteScript = async (id: string) => {
    if (!confirm("Desejas eliminar este script?")) return;
    try {
      await directApiCall('whatsapp_scripts', 'DELETE', undefined, `id=eq.${id}`);
      setScripts((prev) => prev.filter((s) => s.id !== id));
      toast.success("Script removido. 🚀");
    } catch (error) { toast.error("Erro ao remover script."); }
  };

  // --- Funções de Objeções ---
  const submitObjection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objTitle || !objResponse) { toast.error("Preenche a objeção e a resposta."); return; }
    try {
      setSaving(true);
      await directApiCall('objections', 'POST', {
        objection: objTitle,
        category: objCategory,
        response: objResponse,
        tips: objTips || null
      });
      toast.success("Objeção registada com sucesso! 🚀");
      setShowObjForm(false);
      setObjTitle(""); setObjResponse(""); setObjTips("");
      await loadAll(false);
    } catch (error) { toast.error("Erro ao criar objeção."); } finally { setSaving(false); }
  };

  const updateObjection = async (id: string) => {
    if (!editObjTitle || !editObjResponse) { toast.error("Preencha a objeção e a resposta."); return; }
    try {
      setSaving(true);
      await directApiCall('objections', 'PATCH', {
        objection: editObjTitle,
        category: editObjCategory,
        response: editObjResponse,
        tips: editObjTips || null
      }, `id=eq.${id}`);
      toast.success("Objeção atualizada! 🚀");
      setEditingObjId(null);
      await loadAll(false);
    } catch (error) { toast.error("Erro ao atualizar objeção."); } finally { setSaving(false); }
  };

  const deleteObjection = async (id: string) => {
    if (!confirm("Desejas eliminar esta objeção?")) return;
    try {
      await directApiCall('objections', 'DELETE', undefined, `id=eq.${id}`);
      setObjections((prev) => prev.filter((o) => o.id !== id));
      toast.success("Objeção removida. 🚀");
    } catch (error) { toast.error("Erro ao remover objeção."); }
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
        <div className="flex items-center justify-center py-16 w-full">
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
                            <option value="student">Aluno (Apenas Aulas)</option>
                            <option value="consultant">Consultor (Vendedor)</option>
                            <option value="pending_partner">⏳ Aguardando Aprovação</option>
                            <option value="partner">Parceiro (Aprovado)</option>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição (Resumo para o aluno)</label>
                      <textarea value={courseDescription} onChange={(e) => setCourseDescription(e.target.value)}
                        placeholder="Ex: Base essencial para entender consórcio, carta de crédito, assembleias..." rows={3}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green resize-none" />
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
                      <button type="button" onClick={() => setShowCourseForm(false)} disabled={saving}
                        className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                      <button type="submit" disabled={saving}
                        className="flex-1 bg-cota-green text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-cota-green-light transition-colors disabled:opacity-50">
                        {saving ? "Salvando..." : "Criar Trilha"}
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
                      <button type="button" onClick={() => setShowAnnForm(false)} disabled={saving}
                        className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                      <button type="submit" disabled={saving}
                        className="flex-1 bg-cota-green text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-cota-green-light transition-colors disabled:opacity-50">
                        {saving ? "Publicando..." : "Publicar"}
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
                    editingAnnId === ann.id ? (
                      <div key={ann.id} className="p-5 bg-gray-50">
                        <div className="space-y-3">
                          <input type="text" value={editAnnTitle} onChange={(e) => setEditAnnTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cota-green" />
                          <textarea value={editAnnContent} onChange={(e) => setEditAnnContent(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cota-green resize-none" rows={3} />
                          <div className="grid grid-cols-2 gap-3">
                            <select value={editAnnPriority} onChange={(e) => setEditAnnPriority(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cota-green">
                              <option value="low">Baixa</option>
                              <option value="normal">Normal</option>
                              <option value="high">Alta</option>
                              <option value="urgent">Urgente</option>
                            </select>
                            <select value={editAnnTargetRole} onChange={(e) => setEditAnnTargetRole(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cota-green">
                              <option value="">Todos</option>
                              <option value="student">Alunos</option>
                              <option value="instructor">Instrutores</option>
                              <option value="manager">Gestores</option>
                              <option value="admin">Admins</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => updateAnnouncement(ann.id)} disabled={saving} className="bg-cota-green text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-cota-green-light">Salvar Alterações</button>
                            <button onClick={() => setEditingAnnId(null)} className="text-gray-500 px-3 py-2 text-sm hover:text-gray-700">Cancelar</button>
                          </div>
                        </div>
                      </div>
                    ) : (
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
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => {
                            setEditingAnnId(ann.id);
                            setEditAnnTitle(ann.title);
                            setEditAnnContent(ann.content);
                            setEditAnnPriority(ann.priority);
                            setEditAnnTargetRole(ann.target_role || "");
                          }} className="p-1.5 rounded-lg hover:bg-cota-green/10 text-gray-400 hover:text-cota-green transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteAnnouncement(ann.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
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
                          <option value="Primeiro contato">Primeiro contato</option>
                          <option value="Diagnóstico">Diagnóstico</option>
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
                      <button type="button" onClick={() => setShowScriptForm(false)} disabled={saving}
                        className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                      <button type="submit" disabled={saving}
                        className="flex-1 bg-cota-green text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-cota-green-light transition-colors disabled:opacity-50">
                        {saving ? "Salvando..." : "Salvar Script"}
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
                    editingScriptId === script.id ? (
                      <div key={script.id} className="p-5 bg-gray-50">
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <input type="text" value={editScriptTitle} onChange={(e) => setEditScriptTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cota-green" />
                            <select value={editScriptCategory} onChange={(e) => setEditScriptCategory(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cota-green">
                              <option value="Primeiro contato">Primeiro contato</option>
                              <option value="Diagnóstico">Diagnóstico</option>
                              <option value="Captação">Captação</option>
                              <option value="Follow-up">Follow-up</option>
                              <option value="Reativação">Reativação</option>
                              <option value="Proposta">Proposta</option>
                              <option value="Pós-venda">Pós-venda</option>
                              <option value="Relacionamento">Relacionamento</option>
                              <option value="Indicação">Indicação</option>
                            </select>
                          </div>
                          <textarea value={editScriptContent} onChange={(e) => setEditScriptContent(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-cota-green resize-none" rows={5} />
                          <div className="flex gap-2">
                            <button onClick={() => updateScript(script.id)} disabled={saving} className="bg-cota-green text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-cota-green-light">Salvar Alterações</button>
                            <button onClick={() => setEditingScriptId(null)} className="text-gray-500 px-3 py-2 text-sm hover:text-gray-700">Cancelar</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div key={script.id} className="p-5 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-800 text-sm">{script.title}</h3>
                            <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                              {script.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => {
                              setEditingScriptId(script.id);
                              setEditScriptTitle(script.title);
                              setEditScriptCategory(script.category);
                              setEditScriptContent(script.content);
                            }} className="p-1.5 rounded-lg hover:bg-cota-green/10 text-gray-400 hover:text-cota-green transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteScript(script.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100 font-mono text-xs text-gray-600 whitespace-pre-wrap">
                          {script.content}
                        </div>
                      </div>
                    )
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
                          <option value="Contemplação">Contemplação</option>
                          <option value="Prazo">Prazo</option>
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
                      <button type="button" onClick={() => setShowObjForm(false)} disabled={saving}
                        className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                      <button type="submit" disabled={saving}
                        className="flex-1 bg-cota-green text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-cota-green-light transition-colors disabled:opacity-50">
                        {saving ? "Salvando..." : "Salvar Objeção"}
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
                    editingObjId === obj.id ? (
                      <div key={obj.id} className="p-5 bg-gray-50">
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <input type="text" value={editObjTitle} onChange={(e) => setEditObjTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cota-green" />
                            <select value={editObjCategory} onChange={(e) => setEditObjCategory(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cota-green">
                              <option value="Contemplação">Contemplação</option>
                              <option value="Prazo">Prazo</option>
                              <option value="Financeiro">Financeiro</option>
                              <option value="Comparação">Comparação</option>
                              <option value="Funcionamento">Funcionamento</option>
                              <option value="Experiência negativa">Experiência negativa</option>
                              <option value="Procrastinação">Procrastinação</option>
                              <option value="Custo">Custo</option>
                            </select>
                          </div>
                          <textarea value={editObjResponse} onChange={(e) => setEditObjResponse(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cota-green resize-none" rows={3} />
                          <input type="text" placeholder="Dica Extra" value={editObjTips} onChange={(e) => setEditObjTips(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cota-green" />
                          <div className="flex gap-2">
                            <button onClick={() => updateObjection(obj.id)} disabled={saving} className="bg-cota-green text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-cota-green-light">Salvar Alterações</button>
                            <button onClick={() => setEditingObjId(null)} className="text-gray-500 px-3 py-2 text-sm hover:text-gray-700">Cancelar</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div key={obj.id} className="p-5 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">"{obj.objection}"</p>
                            <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                              {obj.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => {
                              setEditingObjId(obj.id);
                              setEditObjTitle(obj.objection);
                              setEditObjCategory(obj.category);
                              setEditObjResponse(obj.response);
                              setEditObjTips(obj.tips || "");
                            }} className="p-1.5 rounded-lg hover:bg-cota-green/10 text-gray-400 hover:text-cota-green transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteObjection(obj.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
                    )
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