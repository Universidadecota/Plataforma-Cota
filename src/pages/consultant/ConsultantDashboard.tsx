import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Search, MessageCircle, Clock, ShieldCheck, Copy, Sparkles, AlertCircle, ChevronRight, X, User } from "lucide-react";

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
      // Busca apenas os leads atrelados a este consultor específico
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

  // === INTELIGÊNCIA CONTEXTUAL EPSA ===
  // Decide qual categoria de script mostrar com base no status do Lead
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

  // Filtra scripts e objeções pela pesquisa e (opcionalmente) pelo contexto
  const filteredScripts = scripts.filter(s => 
    s.content.toLowerCase().includes(searchAssistant.toLowerCase()) || 
    s.title.toLowerCase().includes(searchAssistant.toLowerCase())
  ).sort((a, b) => {
    // Joga os scripts que combinam com o momento do cliente para o topo
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
    <div className="w-full max-w-[1400px] mx-auto px-2 sm:px-4 pb-10 h-[calc(100vh-100px)] flex flex-col">
      
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-[#0a1a15] flex items-center justify-center border border-[#b8995a]/30">
          <MessageCircle className="w-6 h-6 text-[#b8995a]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mesa de Batalha EPSA</h1>
          <p className="text-sm text-gray-500">Atendimento, Scripts e Conversão</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* LADO ESQUERDO: FILA DE CLIENTES */}
        <div className="w-full lg:w-1/3 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <h2 className="font-bold text-gray-800 text-sm mb-3">Minha Fila ({filteredLeads.length})</h2>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-cota-green focus:outline-none" />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {filteredLeads.map(lead => (
              <button 
                key={lead.id} 
                onClick={() => setSelectedLead(lead)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${selectedLead?.id === lead.id ? 'bg-cota-green/5 border-cota-green shadow-sm' : 'bg-white border-gray-100 hover:border-cota-green/40 hover:bg-gray-50'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="font-bold text-gray-800 text-sm truncate pr-2">{lead.nome}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${lead.status === 'Novo' ? 'bg-blue-100 text-blue-700' : lead.status === 'Fechado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {lead.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(lead.data_criacao).toLocaleDateString()}</p>
                <div className="bg-gray-100 rounded text-[11px] px-2 py-1 text-gray-600 truncate">
                  <span className="font-semibold">{lead.origem}:</span> {lead.motivo}
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
              {/* HEADER DO CLIENTE */}
              <div className="p-5 border-b border-gray-100 bg-[#0a1a15] text-white shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#b8995a]/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">{selectedLead.nome}</h2>
                    <p className="text-sm text-gray-300 mb-3">{selectedLead.telefone} • {selectedLead.email || 'Sem e-mail'}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-white/10 border border-white/20 px-2.5 py-1 rounded text-xs font-medium">{selectedLead.motivo}</span>
                      {selectedLead.valor_carta > 0 && (
                        <span className="bg-[#b8995a]/20 border border-[#b8995a]/40 text-[#b8995a] px-2.5 py-1 rounded text-xs font-bold">Carta: {formatCurrency(selectedLead.valor_carta)}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedLead(null)} className="text-white/50 hover:text-white"><X className="w-5 h-5"/></button>
                </div>
                {selectedLead.observacoes && (
                  <div className="relative z-10 mt-4 bg-white/5 border border-white/10 p-3 rounded-lg text-sm text-gray-300 italic">
                    "{selectedLead.observacoes}"
                  </div>
                )}
              </div>

              {/* AÇÕES DE STATUS E CONTATO */}
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Mover para:</span>
                  <select 
                    value={selectedLead.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cota-green"
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
                  className="flex items-center gap-2 bg-[#25D366] text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-[#20bd5a] transition-all"
                >
                  <MessageCircle className="w-4 h-4" /> Abrir WhatsApp
                </button>
              </div>

              {/* ASSISTENTE EPSA (Scripts e Objeções) */}
              <div className="flex-1 flex flex-col min-h-0 bg-white">
                
                <div className="flex border-b border-gray-200 shrink-0">
                  <button onClick={() => setAssistantTab('scripts')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${assistantTab === 'scripts' ? 'text-cota-green border-b-2 border-cota-green' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <Sparkles className="w-4 h-4" /> Scripts de Abordagem
                  </button>
                  <button onClick={() => setAssistantTab('objections')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${assistantTab === 'objections' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <AlertCircle className="w-4 h-4" /> Quebra de Objeções
                  </button>
                </div>

                <div className="p-4 shrink-0 bg-gray-50/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder={assistantTab === 'scripts' ? "Buscar roteiros..." : "Buscar objeção do cliente (ex: muito caro)..."} value={searchAssistant} onChange={(e) => setSearchAssistant(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-cota-green focus:outline-none bg-white shadow-sm" />
                  </div>
                  {assistantTab === 'scripts' && contextualCategory && !searchAssistant && (
                    <p className="text-[11px] text-cota-green-dark font-medium mt-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Sugerindo roteiros de "{contextualCategory}" para este cliente.
                    </p>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {assistantTab === 'scripts' ? (
                    filteredScripts.length > 0 ? filteredScripts.map(script => (
                      <div key={script.id} className={`border rounded-xl p-4 transition-all ${script.category === contextualCategory ? 'border-cota-green/50 bg-cota-green/5' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-cota-gold bg-cota-gold/10 px-2 py-0.5 rounded">{script.category}</span>
                            <h4 className="font-bold text-gray-800 text-sm mt-1">{script.title}</h4>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 font-mono whitespace-pre-wrap mt-3 bg-white p-3 rounded border border-gray-100">{script.content}</p>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => copyToClipboard(script.content)} className="flex-1 flex items-center justify-center gap-1 py-1.5 border border-gray-200 text-gray-600 rounded text-xs font-bold hover:bg-gray-50">
                            <Copy className="w-3 h-3" /> Copiar
                          </button>
                          <button onClick={() => openWhatsApp(selectedLead.telefone, script.content)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#25D366]/10 text-[#20bd5a] rounded text-xs font-bold hover:bg-[#25D366]/20">
                            <MessageCircle className="w-3 h-3" /> Enviar Direto
                          </button>
                        </div>
                      </div>
                    )) : <p className="text-center text-sm text-gray-400 mt-6">Nenhum script encontrado.</p>
                  ) : (
                    filteredObjections.length > 0 ? filteredObjections.map(obj => (
                      <div key={obj.id} className="border border-red-100 rounded-xl p-4 bg-white hover:border-red-200 transition-all">
                        <div className="flex items-start gap-2 mb-3">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">{obj.category}</span>
                            <h4 className="font-bold text-gray-800 text-sm mt-0.5">"{obj.objection}"</h4>
                          </div>
                        </div>
                        <div className="bg-red-50/50 border border-red-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-700 italic flex gap-2"><ChevronRight className="w-3 h-3 text-red-400 shrink-0 mt-0.5"/> {obj.response}</p>
                        </div>
                        {obj.tips && (
                          <div className="mt-3 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                            <Sparkles className="w-3.5 h-3.5 shrink-0" /> <span className="font-medium">{obj.tips}</span>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => copyToClipboard(obj.response)} className="w-full flex items-center justify-center gap-1 py-1.5 border border-gray-200 text-gray-600 rounded text-xs font-bold hover:bg-gray-50">
                            <Copy className="w-3 h-3" /> Copiar Resposta
                          </button>
                        </div>
                      </div>
                    )) : <p className="text-center text-sm text-gray-400 mt-6">Nenhuma objeção encontrada.</p>
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