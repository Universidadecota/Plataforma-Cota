import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Search, MessageCircle, Clock, Copy, Sparkles, AlertCircle, ChevronRight, X, User } from "lucide-react";

type UnifiedLead = {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  motivo?: string;
  observacoes?: string;
  status: string;
  etapa_funil?: string;
  temperatura?: string;
  origem: string;
  lead_source_type?: string;
  data_criacao: string;
  updated_at?: string;
  tabela_fonte: "leads";
  valor_carta?: number;
  comissao_epsa?: number;
  comissao_parceiro?: number;
  proxima_acao?: string | null;
  proxima_acao_em?: string | null;
  ultimo_contato_em?: string | null;
};

type Script = { id: string; title: string; category: string; content: string; };
type Objection = { id: string; objection: string; category: string; response: string; tips?: string; };

export default function ConsultantDashboard() {
  const { user } = useAuthStore();
  const [leads, setLeads] = useState<UnifiedLead[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [objections, setObjections] = useState<Objection[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [quickFilter, setQuickFilter] = useState<"all" | "new" | "unattended" | "today" | "overdue" | "hot" | "proposals">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedLead, setSelectedLead] = useState<UnifiedLead | null>(null);
  const [assistantTab, setAssistantTab] = useState<'scripts' | 'objections'>('scripts');
  const [searchAssistant, setSearchAssistant] = useState("");

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
    if (method === 'GET') {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }
    return true;
  };

  const loadWorkspace = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const leadQuery = [
        "select=*",
        `or=(vendedor_id.eq.${user.id},closer_id.eq.${user.id},sdr_id.eq.${user.id},assigned_to.eq.${user.id})`,
        "order=created_at.desc",
      ].join("&");

      const [leadsData, scriptsData, objData] = await Promise.all([
        directApiCall("leads", "GET", undefined, leadQuery).catch(() => []),
        directApiCall("whatsapp_scripts", "GET", undefined, "select=*"),
        directApiCall("objections", "GET", undefined, "select=*"),
      ]);

      const mappedLeads = (leadsData || []).map((l: any) => ({
        id: l.id,
        nome: l.name || l.nome || "Sem nome",
        telefone: l.phone || l.telefone || "",
        email: l.email,
        motivo: l.motivo || l.interest || l.origem_detalhada || "Atendimento comercial",
        observacoes: l.observacoes || l.notes || "",
        status: l.etapa_funil || l.status || "Novo",
        etapa_funil: l.etapa_funil || l.status || "Novo",
        temperatura: l.temperatura || "Morno",
        origem: l.origin || l.origem || l.lead_source_label || "EPSA",
        lead_source_type: l.lead_source_type || "epsa_base",
        data_criacao: l.created_at || l.criado_em,
        updated_at: l.updated_at,
        tabela_fonte: "leads" as const,
        valor_carta: Number(l.valor_carta || l.estimated_letter_value || 0),
        comissao_epsa: Number(l.comissao_epsa || 0),
        comissao_parceiro: Number(l.comissao_parceiro || 0),
        proxima_acao: l.proxima_acao,
        proxima_acao_em: l.proxima_acao_em,
        ultimo_contato_em: l.ultimo_contato_em || l.last_follow_up_at || l.first_contact_at,
      }));

      setLeads(mappedLeads);
      setScripts(scriptsData || []);
      setObjections(objData || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar sua mesa de operações.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWorkspace(); }, [user]);

  const handleUpdateStatus = async (novoStatus: string) => {
    if (!selectedLead) return;

    try {
      await directApiCall(
        "leads",
        "PATCH",
        {
          status: novoStatus,
          etapa_funil: novoStatus,
          ultimo_contato_em: novoStatus === "Em atendimento" ? new Date().toISOString() : selectedLead.ultimo_contato_em,
        },
        `id=eq.${selectedLead.id}`
      );

      toast.success(`Status movido para: ${novoStatus}`);

      setLeads((current) =>
        current.map((lead) =>
          lead.id === selectedLead.id
            ? { ...lead, status: novoStatus, etapa_funil: novoStatus, ultimo_contato_em: novoStatus === "Em atendimento" ? new Date().toISOString() : lead.ultimo_contato_em }
            : lead
        )
      );

      setSelectedLead({
        ...selectedLead,
        status: novoStatus,
        etapa_funil: novoStatus,
        ultimo_contato_em: novoStatus === "Em atendimento" ? new Date().toISOString() : selectedLead.ultimo_contato_em,
      });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar status.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Mensagem copiada!");
  };

  const openWhatsApp = (phone: string, text: string = "") => {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/55${cleanPhone}?text=${encodedText}`, '_blank');
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDateTime = (value?: string | null) => {
    if (!value) return "Não registrado";
    return new Date(value).toLocaleString("pt-BR");
  };

  const daysAgo = (value?: string | null) => {
    if (!value) return null;
    const diff = Date.now() - new Date(value).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const isClosed = (lead: UnifiedLead) => ["Fechado", "Perdido"].includes(lead.status);
  const isUnattended = (lead: UnifiedLead) => lead.status === "Novo" && !lead.ultimo_contato_em;

  const isOverdue = (lead: UnifiedLead) => {
    if (isClosed(lead)) return false;

    if (lead.proxima_acao_em) {
      return new Date(lead.proxima_acao_em).getTime() < Date.now();
    }

    const baseDate = lead.ultimo_contato_em || lead.updated_at || lead.data_criacao;
    const days = daysAgo(baseDate);
    return days !== null && days >= 3;
  };

  const isTodayAction = (lead: UnifiedLead) => {
    if (!lead.proxima_acao_em) return false;

    const actionDate = new Date(lead.proxima_acao_em);
    const now = new Date();

    return (
      actionDate.getFullYear() === now.getFullYear() &&
      actionDate.getMonth() === now.getMonth() &&
      actionDate.getDate() === now.getDate()
    );
  };

  const getLeadPriorityScore = (lead: UnifiedLead) => {
    let score = 0;

    if (isUnattended(lead)) score += 1000;
    if (isOverdue(lead)) score += 800;
    if (isTodayAction(lead)) score += 650;
    if (lead.temperatura === "Quente") score += 500;
    if (["Proposta", "Simulação enviada"].includes(lead.status)) score += 350;

    const age = daysAgo(lead.data_criacao);
    if (age !== null) score += Math.max(0, 30 - age);

    return score;
  };

  // Inteligência Contextual
  const getContextCategory = (status: string) => {
    switch (status) {
      case 'Novo': return 'Primeiro contato';
      case 'Em atendimento': return 'Diagnóstico';
      case 'Proposta': return 'Proposta';
      case 'Perdido': return 'Reativação';
      default: return '';
    }
  };

  const contextualCategory = selectedLead ? getContextCategory(selectedLead.status) : '';

  const filteredScripts = scripts.filter(s => 
    s.content.toLowerCase().includes(searchAssistant.toLowerCase()) || 
    s.title.toLowerCase().includes(searchAssistant.toLowerCase())
  ).sort((a, b) => {
    if (a.category === contextualCategory && b.category !== contextualCategory) return -1;
    if (a.category !== contextualCategory && b.category === contextualCategory) return 1;
    return 0;
  });

  const filteredObjections = objections.filter(o => 
    o.objection.toLowerCase().includes(searchAssistant.toLowerCase()) || 
    o.category.toLowerCase().includes(searchAssistant.toLowerCase())
  );

  const filteredLeads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const filtered = leads.filter((lead) => {
      const matchesSearch = term
        ? `${lead.nome} ${lead.telefone} ${lead.email || ""} ${lead.motivo || ""}`
            .toLowerCase()
            .includes(term)
        : true;

      const matchesQuick =
        quickFilter === "all" ||
        (quickFilter === "new" && lead.status === "Novo") ||
        (quickFilter === "unattended" && isUnattended(lead)) ||
        (quickFilter === "today" && isTodayAction(lead)) ||
        (quickFilter === "overdue" && isOverdue(lead)) ||
        (quickFilter === "hot" && lead.temperatura === "Quente") ||
        (quickFilter === "proposals" && ["Proposta", "Simulação enviada"].includes(lead.status));

      return matchesSearch && matchesQuick;
    });

    return filtered.sort((a, b) => {
      const priorityDiff = getLeadPriorityScore(b) - getLeadPriorityScore(a);
      if (priorityDiff !== 0) return priorityDiff;

      return new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime();
    });
  }, [leads, searchTerm, quickFilter]);

  const quickCounts = useMemo(() => ({
    all: leads.length,
    new: leads.filter((lead) => lead.status === "Novo").length,
    unattended: leads.filter(isUnattended).length,
    today: leads.filter(isTodayAction).length,
    overdue: leads.filter(isOverdue).length,
    hot: leads.filter((lead) => lead.temperatura === "Quente").length,
    proposals: leads.filter((lead) => ["Proposta", "Simulação enviada"].includes(lead.status)).length,
  }), [leads]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedLeads = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredLeads.slice(startIndex, startIndex + pageSize);
  }, [filteredLeads, pageSize, safeCurrentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, quickFilter, pageSize]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="w-full max-w-[1400px] mx-auto px-2 sm:px-4 pb-4 h-[calc(100vh-80px)] flex flex-col">
      
      {/* Título Principal Compacto */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-[#0a1a15] flex items-center justify-center border border-[#b8995a]/30">
          <MessageCircle className="w-5 h-5 text-[#b8995a]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800 leading-tight">Mesa de Batalha EPSA</h1>
          <p className="text-xs text-gray-500">Atendimento, Scripts e Conversão</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        
        {/* LADO ESQUERDO: FILA DE CLIENTES */}
        <div className="w-full lg:w-1/3 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full">
          <div className="p-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-bold text-gray-800 text-sm">Minha Fila ({filteredLeads.length})</h2>
                <p className="text-[11px] text-gray-500">Prioridade: atrasados, sem atendimento e quentes primeiro.</p>
              </div>

              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-bold text-gray-600 focus:border-cota-green focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar cliente, telefone ou e-mail..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-xs focus:border-cota-green focus:outline-none" />
            </div>

            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
              {[
                ["all", "Todos", quickCounts.all],
                ["unattended", "Sem atendimento", quickCounts.unattended],
                ["today", "Hoje", quickCounts.today],
                ["overdue", "Atrasados", quickCounts.overdue],
                ["hot", "Quentes", quickCounts.hot],
                ["proposals", "Propostas", quickCounts.proposals],
                ["new", "Novos", quickCounts.new],
              ].map(([key, label, total]: any) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setQuickFilter(key)}
                  className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-black transition ${
                    quickFilter === key
                      ? "border-cota-green bg-cota-green text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-cota-green hover:text-cota-green"
                  }`}
                >
                  {label} <span className="ml-1 opacity-70">{total}</span>
                </button>
              ))}
            </div>

            <p className="mt-2 text-[11px] text-gray-400">
              Exibindo {filteredLeads.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}
              -{Math.min(safeCurrentPage * pageSize, filteredLeads.length)} de {filteredLeads.length}.
            </p>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 space-y-1.5 custom-scrollbar">
            {paginatedLeads.map(lead => (
              <button 
                key={lead.id} 
                onClick={() => setSelectedLead(lead)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${selectedLead?.id === lead.id ? 'bg-cota-green/5 border-cota-green shadow-sm' : 'bg-white border-gray-100 hover:border-cota-green/40 hover:bg-gray-50'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="font-bold text-gray-800 text-sm truncate pr-2">{lead.nome}</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider ${lead.status === 'Novo' ? 'bg-blue-100 text-blue-700' : lead.status === 'Fechado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {lead.status}
                  </span>
                </div>

                <div className="mb-1 flex flex-wrap gap-1">
                  {isUnattended(lead) && <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-red-700">Sem atendimento</span>}
                  {isOverdue(lead) && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-700">Atrasado</span>}
                  {lead.temperatura === "Quente" && <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-green-700">Quente</span>}
                </div>
                <div className="flex justify-between items-center text-[11px] text-gray-500">
                  <span>{lead.telefone}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(lead.data_criacao).toLocaleDateString()}</span>
                </div>
                {(lead.proxima_acao || lead.proxima_acao_em) && (
                  <p className="mt-1 truncate text-[10px] text-gray-400">
                    Próxima: {lead.proxima_acao || "ação registrada"} · {formatDateTime(lead.proxima_acao_em)}
                  </p>
                )}
              </button>
            ))}
            {filteredLeads.length === 0 && <p className="text-center text-sm text-gray-400 mt-10">Nenhum cliente na fila.</p>}

            {filteredLeads.length > pageSize && (
              <div className="sticky bottom-0 mt-3 flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white/95 p-2 shadow-sm">
                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="rounded-md border border-gray-200 px-2 py-1 text-[11px] font-bold text-gray-600 disabled:opacity-40"
                >
                  Anterior
                </button>

                <span className="text-[11px] font-bold text-gray-400">
                  {safeCurrentPage}/{totalPages}
                </span>

                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  className="rounded-md border border-gray-200 px-2 py-1 text-[11px] font-bold text-gray-600 disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </div>

        {/* LADO DIREITO: PAINEL TÁTICO E ASSISTENTE */}
        <div className="w-full lg:w-2/3 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full relative">
          
          {!selectedLead ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <User className="w-16 h-16 mb-4 text-gray-200" />
              <h3 className="text-lg font-bold text-gray-600">Nenhum cliente selecionado</h3>
              <p className="text-sm">Selecione um lead na fila ao lado para abrir o Painel Tático.</p>
            </div>
          ) : (
            <>
              {/* O NOVO CABEÇALHO SUPER COMPACTO */}
              <div className="p-3 sm:px-5 sm:py-3 border-b border-gray-100 bg-[#0a1a15] text-white shrink-0 relative overflow-hidden flex flex-col justify-center">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#b8995a]/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                
                <div className="relative z-10 flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold text-white truncate">{selectedLead.nome}</h2>
                      <span className="bg-white/10 border border-white/20 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-gray-200 truncate">{selectedLead.motivo}</span>
                      {selectedLead.valor_carta > 0 && (
                        <span className="bg-[#b8995a]/20 border border-[#b8995a]/40 text-[#b8995a] px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">CARTA: {formatCurrency(selectedLead.valor_carta)}</span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-gray-400">{selectedLead.telefone} • {selectedLead.email || 'Sem e-mail'}</p>
                    <p className="mt-0.5 text-[10px] sm:text-[11px] text-gray-500">Próxima ação: {selectedLead.proxima_acao || "não registrada"} · {formatDateTime(selectedLead.proxima_acao_em)}</p>
                  </div>
                  <button onClick={() => setSelectedLead(null)} className="text-white/40 hover:text-white p-1 ml-2"><X className="w-4 h-4"/></button>
                </div>
                
                {selectedLead.observacoes && (
                  <div className="relative z-10 mt-2 bg-white/5 border border-white/10 p-2 rounded text-[11px] sm:text-xs text-gray-300 italic line-clamp-1 hover:line-clamp-none transition-all cursor-help" title={selectedLead.observacoes}>
                    "{selectedLead.observacoes}"
                  </div>
                )}
              </div>

              {/* BARRA DE AÇÕES COMPACTA */}
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase hidden sm:inline">Status:</span>
                  <select 
                    value={selectedLead.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    className="px-2 py-1 rounded text-[11px] font-bold border border-gray-200 focus:outline-none focus:ring-1 focus:ring-cota-green bg-white shadow-sm"
                  >
                    <option value="Novo">🔵 Novo</option>
                    <option value="Em atendimento">🟡 Em Atendimento</option>
                    <option value="Diagnóstico">🧭 Diagnóstico</option>
                    <option value="Simulação enviada">📄 Simulação enviada</option>
                    <option value="Follow-up">⏰ Follow-up</option>
                    <option value="Proposta">🟣 Proposta Enviada</option>
                    <option value="Fechado">🟢 Fechado</option>
                    <option value="Perdido">🔴 Perdido</option>
                    <option value="Reativar futuramente">⚪ Reativar futuramente</option>
                  </select>
                </div>
                <button 
                  onClick={() => openWhatsApp(selectedLead.telefone)}
                  className="flex items-center gap-1.5 bg-[#25D366] text-white px-3 py-1.5 rounded text-[11px] sm:text-xs font-bold shadow hover:bg-[#20bd5a] transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Abrir WhatsApp
                </button>
              </div>

              {/* ASSISTENTE EPSA (Scripts e Objeções) */}
              <div className="flex-1 flex flex-col min-h-0 bg-white">
                
                <div className="flex border-b border-gray-200 shrink-0 bg-white">
                  <button onClick={() => setAssistantTab('scripts')} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${assistantTab === 'scripts' ? 'text-cota-green border-b-[3px] border-cota-green bg-cota-green/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
                    <Sparkles className="w-3.5 h-3.5" /> Scripts Rápidos
                  </button>
                  <button onClick={() => setAssistantTab('objections')} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${assistantTab === 'objections' ? 'text-red-600 border-b-[3px] border-red-600 bg-red-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
                    <AlertCircle className="w-3.5 h-3.5" /> Quebra de Objeções
                  </button>
                </div>

                <div className="p-3 shrink-0 bg-gray-50/50 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-gray-400" />
                    <input type="text" placeholder={assistantTab === 'scripts' ? "Procurar roteiros..." : "Ex: Achei muito caro, Vou pensar..."} value={searchAssistant} onChange={(e) => setSearchAssistant(e.target.value)} className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded text-xs focus:border-cota-green focus:outline-none bg-white shadow-sm" />
                  </div>
                </div>

                {/* ÁREA COM BARRA DE ROLAGEM MAXIMIZADA */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 custom-scrollbar bg-[#f8fafc]">
                  {assistantTab === 'scripts' ? (
                    filteredScripts.length > 0 ? filteredScripts.map(script => (
                      <div key={script.id} className={`border rounded-lg p-3 sm:p-4 transition-all shadow-sm ${script.category === contextualCategory ? 'border-cota-green/40 bg-[#f0fdf4]' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                        {script.category === contextualCategory && (
                          <div className="flex items-center gap-1 text-[9px] font-black text-cota-green uppercase tracking-wider mb-2">
                            <Sparkles className="w-3 h-3" /> Recomendado para esta etapa
                          </div>
                        )}
                        <h4 className="font-bold text-gray-800 text-xs sm:text-sm mb-2">{script.title}</h4>
                        <div className="bg-gray-50/80 p-2.5 rounded border border-gray-100">
                          <p className="text-[11px] sm:text-xs text-gray-600 font-mono whitespace-pre-wrap leading-relaxed">{script.content}</p>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => copyToClipboard(script.content)} className="flex-1 flex items-center justify-center gap-1 py-1.5 border border-gray-200 text-gray-600 bg-white rounded text-[10px] sm:text-xs font-bold hover:bg-gray-50">
                            <Copy className="w-3 h-3" /> Copiar
                          </button>
                          <button onClick={() => openWhatsApp(selectedLead.telefone, script.content)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#25D366]/10 text-[#20bd5a] rounded text-[10px] sm:text-xs font-bold hover:bg-[#25D366]/20">
                            <MessageCircle className="w-3 h-3" /> Enviar
                          </button>
                        </div>
                      </div>
                    )) : <p className="text-center text-xs text-gray-400 mt-6">Nenhum script encontrado.</p>
                  ) : (
                    filteredObjections.length > 0 ? filteredObjections.map(obj => (
                      <div key={obj.id} className="border border-red-100 rounded-lg p-3 sm:p-4 bg-white hover:border-red-200 transition-all shadow-sm">
                        <div className="flex items-start gap-2 mb-2">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-red-500">{obj.category}</span>
                            <h4 className="font-bold text-gray-800 text-xs sm:text-sm mt-0.5">"{obj.objection}"</h4>
                          </div>
                        </div>
                        <div className="bg-red-50/50 border border-red-50 p-2.5 rounded">
                          <p className="text-[11px] sm:text-xs text-gray-700 italic flex gap-1.5 leading-relaxed"><ChevronRight className="w-3 h-3 text-red-400 shrink-0 mt-0.5"/> {obj.response}</p>
                        </div>
                        {obj.tips && (
                          <div className="mt-2.5 flex items-start gap-1.5 text-[10px] sm:text-xs text-amber-700 bg-amber-50 p-2 rounded">
                            <Sparkles className="w-3 h-3 shrink-0 mt-0.5" /> <span className="font-medium">{obj.tips}</span>
                          </div>
                        )}
                        <div className="mt-3">
                          <button onClick={() => copyToClipboard(obj.response)} className="w-full flex items-center justify-center gap-1 py-1.5 border border-gray-200 text-gray-600 bg-gray-50 rounded text-[10px] sm:text-xs font-bold hover:bg-gray-100">
                            <Copy className="w-3 h-3" /> Copiar Resposta
                          </button>
                        </div>
                      </div>
                    )) : <p className="text-center text-xs text-gray-400 mt-6">Nenhuma objeção encontrada.</p>
                  )}
                </div>

              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}