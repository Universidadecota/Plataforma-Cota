import { useEffect, useState } from "react";
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
  origem: string;
  data_criacao: string;
  tabela_fonte: 'leads' | 'pistas';
  valor_carta?: number;
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

    if (!response.ok) throw new Error("Erro na API");
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
      const [pistasData, leadsData, scriptsData, objData] = await Promise.all([
        directApiCall('pistas', 'GET', undefined, `vendedor_id=eq.${user.id}&order=criado_em.desc`),
        directApiCall('leads', 'GET', undefined, `vendedor_id=eq.${user.id}&order=created_at.desc`).catch(() => []),
        directApiCall('whatsapp_scripts', 'GET', undefined, 'select=*'),
        directApiCall('objections', 'GET', undefined, 'select=*')
      ]);

      const mappedPistas = (pistasData || []).map((p: any) => ({
        id: p.id, nome: p.nome, telefone: p.telefone, email: p.email, motivo: p.motivo, observacoes: p.observacoes, status: p.status || 'Novo', origem: p.origem || 'Parceiro', data_criacao: p.criado_em, tabela_fonte: 'pistas', valor_carta: p.valor_carta || 0
      }));

      const mappedLeads = (leadsData || []).map((l: any) => ({
        id: l.id, nome: l.name || l.nome || 'Sem Nome', telefone: l.phone || l.telefone || '', email: l.email, motivo: 'Captação Interna', observacoes: '', status: l.status || 'Novo', origem: l.origem || 'Interno', data_criacao: l.created_at || l.criado_em, tabela_fonte: 'leads', valor_carta: l.valor_carta || 0
      }));

      setLeads([...mappedPistas, ...mappedLeads].sort((a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime()));
      setScripts(scriptsData || []);
      setObjections(objData || []);
    } catch (error) {
      toast.error("Erro ao carregar sua mesa de operações.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWorkspace(); }, [user]);

  const handleUpdateStatus = async (novoStatus: string) => {
    if (!selectedLead) return;
    try {
      await directApiCall(selectedLead.tabela_fonte, 'PATCH', { status: novoStatus }, `id=eq.${selectedLead.id}`);
      toast.success(`Status movido para: ${novoStatus}`);
      setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, status: novoStatus } : l));
      setSelectedLead({ ...selectedLead, status: novoStatus });
    } catch (err) {
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

  const filteredLeads = leads.filter(l => l.nome.toLowerCase().includes(searchTerm.toLowerCase()) || l.telefone.includes(searchTerm));

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
            <h2 className="font-bold text-gray-800 text-sm mb-2">Minha Fila ({filteredLeads.length})</h2>
            <div className="relative">
              <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-xs focus:border-cota-green focus:outline-none" />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 space-y-1.5 custom-scrollbar">
            {filteredLeads.map(lead => (
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
                <div className="flex justify-between items-center text-[11px] text-gray-500">
                  <span>{lead.telefone}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(lead.data_criacao).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
            {filteredLeads.length === 0 && <p className="text-center text-sm text-gray-400 mt-10">Nenhum cliente na fila.</p>}
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
                    <option value="Proposta">🟣 Proposta Enviada</option>
                    <option value="Fechado">🟢 Fechado</option>
                    <option value="Perdido">🔴 Perdido</option>
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