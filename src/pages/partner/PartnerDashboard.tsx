import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Users, Send, Activity, Clock, ShieldCheck, Mail, HelpCircle, MessageSquare, Edit2, X, Check, Filter, Wallet, TrendingUp, CheckCircle2 } from "lucide-react";

type Lead = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  motivo: string;
  observacoes: string;
  status: string;
  criado_em: string;
  // NOVOS CAMPOS PARA A WALLET
  valor_carta?: number;
  comissao_parceiro?: number;
  status_pagamento?: string;
};

export default function PartnerDashboard() {
  const { user } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [nomeLead, setNomeLead] = useState("");
  const [telefoneLead, setTelefoneLead] = useState("");
  const [emailLead, setEmailLead] = useState("");
  const [motivoLead, setMotivoLead] = useState("Recusado pelo banco");
  const [observacoesLead, setObservacoesLead] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Estados para Edição na Tabela
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMotivo, setEditMotivo] = useState("");
  const [editObservacoes, setEditObservacoes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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

  const loadLeads = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await directApiCall('pistas', 'GET', undefined, `partner_id=eq.${user.id}&order=criado_em.desc`);
      setLeads(data || []);
    } catch (error) {
      console.error("Erro ao carregar leads:", error);
      toast.error("Erro ao sincronizar seus leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [user]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeLead.trim() || !telefoneLead.trim()) {
      toast.error("Preencha o nome e o telefone do cliente.");
      return;
    }
    
    try {
      setSaving(true);
      await directApiCall('pistas', 'POST', {
        nome: nomeLead.trim(),
        telefone: telefoneLead.trim(),
        email: emailLead.trim(),
        motivo: motivoLead,
        observacoes: observacoesLead.trim(),
        partner_id: user?.id,
        origem: "Parceiro",
        status: "Novo"
      });
      toast.success("Lead cadastrado com sucesso na EPSA! 🚀");
      setNomeLead(""); 
      setTelefoneLead("");
      setEmailLead("");
      setMotivoLead("Recusado pelo banco");
      setObservacoesLead("");
      setStatusFilter(null);
      await loadLeads();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao cadastrar lead. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (lead: Lead) => {
    setEditingId(lead.id);
    setEditMotivo(lead.motivo || "Recusado pelo banco");
    setEditObservacoes(lead.observacoes || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      setSavingEdit(true);
      await directApiCall('pistas', 'PATCH', {
        motivo: editMotivo,
        observacoes: editObservacoes.trim()
      }, `id=eq.${id}`);
      
      toast.success("Lead atualizado com sucesso!");
      setEditingId(null);
      await loadLeads();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar o lead.");
    } finally {
      setSavingEdit(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'novo': return 'bg-blue-100 text-blue-800';
      case 'em atendimento': return 'bg-amber-100 text-amber-800';
      case 'proposta': return 'bg-purple-100 text-purple-800';
      case 'fechado': return 'bg-green-100 text-green-800';
      case 'perdido': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // CALCULADORA DA WALLET EPSA
  const valorEmNegociacao = leads
    .filter(l => ['Em atendimento', 'Proposta'].includes(l.status))
    .reduce((acc, l) => acc + (l.comissao_parceiro || 0), 0);

  const valorProjetado = leads
    .filter(l => l.status === 'Fechado' && l.status_pagamento === 'Pendente')
    .reduce((acc, l) => acc + (l.comissao_parceiro || 0), 0);

  const valorLiberado = leads
    .filter(l => l.status === 'Fechado' && l.status_pagamento === 'Liberado')
    .reduce((acc, l) => acc + (l.comissao_parceiro || 0), 0);

  const filteredLeads = statusFilter 
    ? leads.filter(l => l.status?.toLowerCase() === statusFilter.toLowerCase())
    : leads;

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 pb-10 min-w-0">
      
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-cota-green flex items-center justify-center flex-shrink-0 shadow-sm">
          <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">Portal do Parceiro EPSA</h1>
          <p className="text-xs sm:text-sm text-gray-500 truncate">Gerencie seus leads e acompanhe as conversões em tempo real</p>
        </div>
      </div>

      {/* WALLET / PAINEL DE COMISSÕES EPSA */}
      <div className="bg-gradient-to-br from-[#0a1a15] to-[#16382e] rounded-2xl shadow-lg border border-[#b8995a]/20 mb-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#b8995a]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="p-6 sm:p-8 relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <Wallet className="w-5 h-5 text-[#b8995a]" />
            <h2 className="text-lg font-bold text-white tracking-wide">Minha Carteira EPSA</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#b8995a]/20">
            <div className="pt-4 md:pt-0 md:pr-6 flex flex-col justify-center">
              <p className="text-sm font-medium text-gray-400 mb-1 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-amber-400" /> Em Negociação</p>
              <h3 className="text-3xl font-black text-white">{formatCurrency(valorEmNegociacao)}</h3>
            </div>
            <div className="pt-6 md:pt-0 md:px-6 flex flex-col justify-center">
              <p className="text-sm font-medium text-gray-400 mb-1 flex items-center gap-1.5"><Clock className="w-4 h-4 text-blue-400" /> Projetado (A Receber)</p>
              <h3 className="text-3xl font-black text-white">{formatCurrency(valorProjetado)}</h3>
            </div>
            <div className="pt-6 md:pt-0 md:pl-6 flex flex-col justify-center">
              <p className="text-sm font-medium text-gray-400 mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#b8995a]" /> Saldo Liberado</p>
              <h3 className="text-3xl font-black text-[#b8995a]">{formatCurrency(valorLiberado)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas / Filtros Originais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <button 
          onClick={() => setStatusFilter(null)}
          className={`text-left rounded-xl border p-4 shadow-sm flex flex-col justify-between transition-all ${
            statusFilter === null ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500' : 'bg-white border-gray-100 hover:border-blue-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex justify-between items-start mb-2 w-full">
            <p className="text-xs text-gray-500 font-medium">Total Enviado</p>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{leads.length}</p>
        </button>

        <button 
          onClick={() => setStatusFilter('Em atendimento')}
          className={`text-left rounded-xl border p-4 shadow-sm flex flex-col justify-between transition-all ${
            statusFilter === 'Em atendimento' ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-500' : 'bg-white border-gray-100 hover:border-amber-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex justify-between items-start mb-2 w-full">
            <p className="text-xs text-gray-500 font-medium">Em Atendimento</p>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{leads.filter(l => l.status === 'Em atendimento').length}</p>
        </button>

        <button 
          onClick={() => setStatusFilter('Proposta')}
          className={`text-left rounded-xl border p-4 shadow-sm flex flex-col justify-between transition-all ${
            statusFilter === 'Proposta' ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-500' : 'bg-white border-gray-100 hover:border-purple-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex justify-between items-start mb-2 w-full">
            <p className="text-xs text-gray-500 font-medium">Propostas</p>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{leads.filter(l => l.status === 'Proposta').length}</p>
        </button>

        <button 
          onClick={() => setStatusFilter('Fechado')}
          className={`text-left rounded-xl border p-4 shadow-sm flex flex-col justify-between transition-all ${
            statusFilter === 'Fechado' ? 'bg-green-50 border-green-200 ring-1 ring-green-500' : 'bg-white border-gray-100 hover:border-green-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex justify-between items-start mb-2 w-full">
            <p className="text-xs text-gray-500 font-medium">Fechados</p>
            <ShieldCheck className="w-4 h-4 text-cota-green" />
          </div>
          <p className="text-2xl font-bold text-cota-green">{leads.filter(l => l.status === 'Fechado').length}</p>
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        
        {/* Formulário Original */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-2">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-bold text-gray-800 text-sm">Enviar Novo Lead para EPSA</h2>
            <p className="text-xs text-gray-500 mt-0.5">Cadastre o cliente informando o contexto do encaminhamento</p>
          </div>
          <form onSubmit={handleAddLead} className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="flex text-xs font-bold text-gray-600 uppercase mb-1.5 items-center gap-1">Nome do Cliente *</label>
                <input type="text" value={nomeLead} onChange={(e) => setNomeLead(e.target.value)} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-cota-green focus:ring-1 focus:ring-cota-green/30" />
              </div>
              <div>
                <label className="flex text-xs font-bold text-gray-600 uppercase mb-1.5 items-center gap-1">WhatsApp / Telefone *</label>
                <input type="text" value={telefoneLead} onChange={(e) => setTelefoneLead(e.target.value)} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-cota-green focus:ring-1 focus:ring-cota-green/30" />
              </div>
              <div>
                <label className="flex text-xs font-bold text-gray-600 uppercase mb-1.5 items-center gap-1"><Mail className="w-3 h-3"/> E-mail do Cliente</label>
                <input type="email" value={emailLead} onChange={(e) => setEmailLead(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-cota-green focus:ring-1 focus:ring-cota-green/30" />
              </div>
              <div>
                <label className="flex text-xs font-bold text-gray-600 uppercase mb-1.5 items-center gap-1"><HelpCircle className="w-3 h-3"/> Motivo do Encaminhamento *</label>
                <select value={motivoLead} onChange={(e) => setMotivoLead(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-cota-green focus:ring-1 focus:ring-cota-green/30 bg-white">
                  <option value="Recusado pelo banco">Recusado pelo banco / Financiamento negado</option>
                  <option value="Não se enquadra no perfil da construtora">Não se enquadra no perfil do empreendimento</option>
                  <option value="Falta de recursos para entrada">Falta de recursos para entrada</option>
                  <option value="Prefere consórcio / Planejamento">Prefere consórcio / Foge de juros</option>
                  <option value="Outros motivos">Outros motivos</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="flex text-xs font-bold text-gray-600 uppercase mb-1.5 items-center gap-1"><MessageSquare className="w-3 h-3"/> Observações Adicionais</label>
                <textarea value={observacoesLead} onChange={(e) => setObservacoesLead(e.target.value)} maxLength={100} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-cota-green focus:ring-1 focus:ring-cota-green/30 resize-none" />
                <div className="flex justify-end mt-1"><span className={`text-[10px] font-medium ${observacoesLead.length >= 100 ? 'text-red-500' : 'text-gray-400'}`}>{observacoesLead.length} / 100</span></div>
              </div>
            </div>
            <button type="submit" disabled={saving} className="w-full md:w-auto md:px-8 ml-auto flex items-center justify-center gap-2 bg-cota-green text-white py-2.5 rounded-lg text-sm font-bold hover:bg-cota-green-light transition-colors disabled:opacity-50">
              <Send className="w-4 h-4" />{saving ? "Enviando..." : "Enviar Lead para EPSA"}
            </button>
          </form>
        </div>

        {/* Tabela Original com a Nova Coluna */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 className="font-bold text-gray-800 text-sm">{statusFilter ? `Leads: ${statusFilter}` : "Todos os Leads Enviados"}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Rastreabilidade em tempo real</p>
            </div>
            {statusFilter && (
              <button onClick={() => setStatusFilter(null)} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors">
                <Filter className="w-3 h-3" /> Limpar Filtro
              </button>
            )}
          </div>
          
          {loading ? (
             <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-cota-green border-t-transparent rounded-full animate-spin" /></div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">{statusFilter ? `Nenhum lead com status "${statusFilter}".` : "Nenhum lead enviado ainda."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Cliente</th>
                    <th className="px-5 py-3 font-semibold">Motivo & Observações</th>
                    <th className="px-5 py-3 font-semibold text-center">Status Atual</th>
                    <th className="px-5 py-3 font-semibold text-center">Ações</th>
                    <th className="px-5 py-3 font-semibold text-right">Comissão Projetada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 align-top">
                        <p className="font-medium text-gray-800 whitespace-nowrap">{lead.nome}</p>
                        <p className="text-gray-500 whitespace-nowrap mt-0.5 text-xs">{lead.telefone}</p>
                        {lead.email && <p className="text-[10px] text-gray-400 mt-0.5">{lead.email}</p>}
                        <p className="text-[10px] text-gray-300 mt-1">Enviado em: {new Date(lead.criado_em).toLocaleDateString('pt-BR')}</p>
                      </td>

                      <td className="px-5 py-3 align-top min-w-[280px]">
                        {editingId === lead.id ? (
                          <div className="space-y-2">
                            <select value={editMotivo} onChange={(e) => setEditMotivo(e.target.value)} className="w-full px-2 py-1.5 border border-cota-green/50 rounded text-xs focus:outline-none focus:ring-1 focus:ring-cota-green bg-white">
                              <option value="Recusado pelo banco">Recusado pelo banco / Financiamento negado</option>
                              <option value="Não se enquadra no perfil da construtora">Não se enquadra no perfil do empreendimento</option>
                              <option value="Falta de recursos para entrada">Falta de recursos para entrada</option>
                              <option value="Prefere consórcio / Planejamento">Prefere consórcio / Foge de juros</option>
                              <option value="Outros motivos">Outros motivos</option>
                            </select>
                            <textarea value={editObservacoes} onChange={(e) => setEditObservacoes(e.target.value)} maxLength={100} rows={2} className="w-full px-2 py-1.5 border border-cota-green/50 rounded text-xs focus:outline-none focus:ring-1 focus:ring-cota-green resize-none" />
                          </div>
                        ) : (
                          <div>
                            <p className="text-gray-600 text-xs font-semibold">{lead.motivo || "Não informado"}</p>
                            {lead.observacoes && <p className="text-[11px] text-gray-500 mt-1 italic leading-tight">"{lead.observacoes}"</p>}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3 text-center align-top whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${getStatusColor(lead.status)}`}>{lead.status || 'Novo'}</span>
                      </td>

                      <td className="px-5 py-3 text-center align-top whitespace-nowrap">
                        {editingId === lead.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleSaveEdit(lead.id)} disabled={savingEdit} className="p-1.5 bg-cota-green text-white rounded hover:bg-cota-green-light transition-colors"><Check className="w-4 h-4" /></button>
                            <button onClick={cancelEditing} disabled={savingEdit} className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <button onClick={() => startEditing(lead)} className="p-1.5 text-gray-400 hover:text-cota-green hover:bg-cota-green/10 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                        )}
                      </td>

                      {/* NOVA COLUNA FINANCEIRA DA TABELA */}
                      <td className="px-5 py-3 text-right align-top whitespace-nowrap">
                        {lead.comissao_parceiro && lead.comissao_parceiro > 0 ? (
                          <div>
                            <p className="font-bold text-[#b8995a]">{formatCurrency(lead.comissao_parceiro)}</p>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              lead.status_pagamento === 'Liberado' ? 'bg-green-100 text-green-700' :
                              lead.status_pagamento === 'Pago' ? 'bg-gray-100 text-gray-500' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {lead.status_pagamento || 'Pendente'}
                            </span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400 font-medium italic">Aguardando EPSA</p>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}