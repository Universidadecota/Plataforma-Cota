import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Users, Activity, Clock, ShieldCheck, Filter, Search, MessageCircle, Building2, Megaphone, UserPlus, UserCheck, Briefcase, DollarSign, Edit2, Check, X } from "lucide-react";

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
  vendedor_id?: string; 
  gestor_id?: string;
  valor_carta?: number;
  comissao_parceiro?: number;
  status_pagamento?: string;
};

type EquipeMember = {
  id: string;
  full_name: string;
  role: string;
};

export default function ManagerDashboard() {
  const { user } = useAuthStore();
  
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  
  const [leads, setLeads] = useState<UnifiedLead[]>([]);
  const [gestores, setGestores] = useState<EquipeMember[]>([]); 
  const [consultores, setConsultores] = useState<EquipeMember[]>([]); 
  const [loading, setLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [origemFilter, setOrigemFilter] = useState<string | null>(null);
  const [minhaBaseFilter, setMinhaBaseFilter] = useState(false); 
  const [searchTerm, setSearchTerm] = useState("");

  // Estados da Edição Financeira
  const [editingFinId, setEditingFinId] = useState<string | null>(null);
  const [finValorCarta, setFinValorCarta] = useState<number>(0);
  const [finStatusPagamento, setFinStatusPagamento] = useState<string>("Pendente");
  const [savingFin, setSavingFin] = useState(false);

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

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      const [pistasData, leadsData, equipeData] = await Promise.all([
        directApiCall('pistas', 'GET', undefined, 'order=criado_em.desc'),
        directApiCall('leads', 'GET', undefined, 'order=created_at.desc').catch(() => []),
        directApiCall('user_profiles', 'GET', undefined, 'role=in.(admin,manager,consultant,instructor)&select=id,full_name,role')
      ]);

      const equipeList = equipeData || [];
      
      setGestores(equipeList.filter((m: EquipeMember) => ['admin', 'manager'].includes(m.role)));
      setConsultores(equipeList);

      const mappedPistas: UnifiedLead[] = (pistasData || []).map((p: any) => ({
        id: p.id,
        nome: p.nome,
        telefone: p.telefone,
        email: p.email,
        motivo: p.motivo,
        observacoes: p.observacoes,
        status: p.status || 'Novo',
        origem: p.origem || 'Parceiro',
        data_criacao: p.criado_em,
        tabela_fonte: 'pistas',
        vendedor_id: p.vendedor_id,
        gestor_id: p.gestor_id,
        valor_carta: p.valor_carta || 0,
        comissao_parceiro: p.comissao_parceiro || 0,
        status_pagamento: p.status_pagamento || 'Pendente'
      }));

      const mappedLeads: UnifiedLead[] = (leadsData || []).map((l: any) => ({
        id: l.id,
        nome: l.name || l.nome || 'Sem Nome',
        telefone: l.phone || l.telefone || '',
        email: l.email,
        motivo: 'Captação Interna',
        observacoes: '',
        status: l.status || 'Novo',
        origem: l.origem || 'Interno',
        data_criacao: l.created_at || l.criado_em || new Date().toISOString(),
        tabela_fonte: 'leads',
        vendedor_id: l.vendedor_id,
        gestor_id: l.gestor_id,
        valor_carta: l.valor_carta || 0,
        comissao_parceiro: l.comissao_parceiro || 0,
        status_pagamento: l.status_pagamento || 'Pendente'
      }));

      const unified = [...mappedPistas, ...mappedLeads].sort((a, b) => 
        new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime()
      );

      setLeads(unified);
    } catch (error) {
      console.error("Erro ao carregar o CRM unificado:", error);
      toast.error("Erro ao sincronizar base de dados EPSA.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleUpdateStatus = async (id: string, tabelaFonte: 'leads' | 'pistas', novoStatus: string) => {
    try {
      await directApiCall(tabelaFonte, 'PATCH', { status: novoStatus }, `id=eq.${id}`);
      toast.success(`Status atualizado para: ${novoStatus}`);
      setLeads(leads.map(lead => lead.id === id ? { ...lead, status: novoStatus } : lead));
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar status.");
    }
  };

  const handleAssignConsultor = async (id: string, tabelaFonte: 'leads' | 'pistas', vendedorId: string) => {
    try {
      const valorParaSalvar = vendedorId === "" ? null : vendedorId;
      await directApiCall(tabelaFonte, 'PATCH', { vendedor_id: valorParaSalvar }, `id=eq.${id}`);
      toast.success("Consultor atribuído com sucesso!");
      setLeads(leads.map(lead => lead.id === id ? { ...lead, vendedor_id: vendedorId } : lead));
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atribuir consultor.");
    }
  };

  const handleAssignGestor = async (id: string, tabelaFonte: 'leads' | 'pistas', gestorId: string) => {
    try {
      const valorParaSalvar = gestorId === "" ? null : gestorId;
      await directApiCall(tabelaFonte, 'PATCH', { gestor_id: valorParaSalvar }, `id=eq.${id}`);
      toast.success("Gestor vinculado à carteira do lead!");
      setLeads(leads.map(lead => lead.id === id ? { ...lead, gestor_id: gestorId } : lead));
    } catch (err) {
      console.error(err);
      toast.error("Erro ao vincular gestor.");
    }
  };

  // Funções do Financeiro
  const startFinancialEdit = (lead: UnifiedLead) => {
    setEditingFinId(lead.id);
    setFinValorCarta(lead.valor_carta || 0);
    setFinStatusPagamento(lead.status_pagamento || "Pendente");
  };

  const saveFinancial = async (id: string, tabelaFonte: 'leads' | 'pistas') => {
    try {
      setSavingFin(true);
      // Cálculo Automático EPSA: 30% da comissão bruta (que é 3,5% do valor da carta)
      const comissaoParceiro = (finValorCarta * 0.035) * 0.30;
      
      await directApiCall(tabelaFonte, 'PATCH', { 
        valor_carta: finValorCarta,
        comissao_parceiro: comissaoParceiro,
        status_pagamento: finStatusPagamento
      }, `id=eq.${id}`);
      
      toast.success("Dados financeiros salvos! Wallet atualizada.");
      
      setLeads(leads.map(lead => lead.id === id ? { 
        ...lead, 
        valor_carta: finValorCarta, 
        comissao_parceiro: comissaoParceiro,
        status_pagamento: finStatusPagamento
      } : lead));
      
      setEditingFinId(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar financeiro.");
    } finally {
      setSavingFin(false);
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
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

  const filteredLeads = leads.filter(lead => {
    let temPermissaoDeVisao = false;
    if (isAdmin) {
      temPermissaoDeVisao = true; 
    } else if (isManager) {
      temPermissaoDeVisao = (lead.gestor_id === user?.id || lead.vendedor_id === user?.id);
    } else {
      temPermissaoDeVisao = (lead.vendedor_id === user?.id);
    }

    if (!temPermissaoDeVisao) return false;

    const matchesStatus = statusFilter ? lead.status?.toLowerCase() === statusFilter.toLowerCase() : true;
    const matchesOrigem = origemFilter ? lead.origem?.toLowerCase() === origemFilter.toLowerCase() : true;
    const matchesBase = minhaBaseFilter ? (lead.vendedor_id === user?.id || lead.gestor_id === user?.id) : true;
    const matchesSearch = searchTerm 
      ? lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
        lead.telefone.includes(searchTerm)
      : true;
      
    return matchesStatus && matchesOrigem && matchesBase && matchesSearch;
  });

  return (
    <div className="w-full max-w-[1400px] mx-auto px-2 sm:px-4 pb-10 min-w-0">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#0a1a15] flex items-center justify-center flex-shrink-0 shadow-sm border border-[#b8995a]/30">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-[#b8995a]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">
              {isAdmin ? "Mesa de Operações EPSA" : "CRM EPSA"}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {isAdmin ? "Distribuição Global e Financeiro" : "Gestão da sua Carteira de Clientes"}
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setMinhaBaseFilter(!minhaBaseFilter)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
            minhaBaseFilter 
            ? 'bg-[#b8995a] text-white ring-2 ring-offset-2 ring-[#b8995a]' 
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          {minhaBaseFilter ? 'Mostrando Minha Base' : 'Ver Minha Base'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <button 
          onClick={() => { setStatusFilter(null); setOrigemFilter(null); }}
          className={`text-left rounded-xl border p-4 shadow-sm flex flex-col justify-between transition-all ${
            !statusFilter && !origemFilter ? 'bg-[#0a1a15] border-[#0a1a15] text-white ring-2 ring-[#b8995a] ring-offset-2' : 'bg-white border-gray-100 hover:border-gray-300'
          }`}
        >
          <div className="flex justify-between items-start mb-2 w-full">
            <p className={`text-xs font-medium ${!statusFilter && !origemFilter ? 'text-gray-400' : 'text-gray-500'}`}>Total na Visão</p>
            <Users className={`w-4 h-4 ${!statusFilter && !origemFilter ? 'text-[#b8995a]' : 'text-gray-400'}`} />
          </div>
          <p className="text-2xl font-bold">{filteredLeads.length}</p>
        </button>

        <button 
          onClick={() => { setOrigemFilter('Interno'); setStatusFilter(null); }}
          className={`text-left rounded-xl border p-4 shadow-sm flex flex-col justify-between transition-all ${
            origemFilter === 'Interno' ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500' : 'bg-white border-gray-100 hover:border-blue-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex justify-between items-start mb-2 w-full">
            <p className="text-xs text-gray-500 font-medium">Tráfego Interno</p>
            <Megaphone className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{filteredLeads.filter(l => l.tabela_fonte === 'leads').length}</p>
        </button>

        <button 
          onClick={() => { setOrigemFilter('Parceiro'); setStatusFilter(null); }}
          className={`text-left rounded-xl border p-4 shadow-sm flex flex-col justify-between transition-all ${
            origemFilter === 'Parceiro' ? 'bg-green-50 border-green-200 ring-1 ring-green-600' : 'bg-white border-gray-100 hover:border-green-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex justify-between items-start mb-2 w-full">
            <p className="text-xs text-gray-500 font-medium">Leads Parceiros EPSA</p>
            <Building2 className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{filteredLeads.filter(l => l.tabela_fonte === 'pistas').length}</p>
        </button>

        <button 
          onClick={() => setStatusFilter('Novo')}
          className={`text-left rounded-xl border p-4 shadow-sm flex flex-col justify-between transition-all ${
            statusFilter === 'Novo' ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500' : 'bg-white border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex justify-between items-start mb-2 w-full">
            <p className="text-xs text-gray-500 font-medium">Novos (Pendente)</p>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{filteredLeads.filter(l => l.status === 'Novo').length}</p>
        </button>
      </div>

      <div className="bg-white rounded-t-xl border border-gray-100 p-4 flex flex-col sm:flex-row gap-4 items-center justify-between mt-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente na EPSA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#b8995a] focus:border-[#b8995a]"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter || ""}
            onChange={(e) => setStatusFilter(e.target.value || null)}
            className="flex-1 sm:w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#b8995a] bg-white"
          >
            <option value="">Todos os Status</option>
            <option value="Novo">Novo</option>
            <option value="Em atendimento">Em Atendimento</option>
            <option value="Proposta">Proposta Enviada</option>
            <option value="Fechado">Negócio Fechado</option>
            <option value="Perdido">Perdido</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-b-xl border border-t-0 border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
           <div className="flex items-center justify-center py-12">
             <div className="w-8 h-8 border-4 border-[#b8995a] border-t-transparent rounded-full animate-spin" />
           </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">
              {isAdmin ? "Nenhum lead encontrado." : "Sua carteira EPSA está vazia no momento."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 font-semibold">Cliente & Origem</th>
                  <th className="px-4 py-3 font-semibold">Contexto / Motivo</th>
                  <th className="px-4 py-3 font-semibold text-center">Distribuição (Carteira)</th>
                  <th className="px-4 py-3 font-semibold text-center">Financeiro (EPSA)</th>
                  <th className="px-4 py-3 font-semibold text-center">Status & Atendimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors group">
                    
                    <td className="px-4 py-4 align-top w-[20%] min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900">{lead.nome}</p>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          lead.tabela_fonte === 'pistas' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {lead.origem}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs font-medium mb-0.5">{lead.telefone}</p>
                      {lead.email && <p className="text-[10px] text-gray-400">{lead.email}</p>}
                      <p className="text-[10px] text-gray-400 mt-2">
                        Recebido: {new Date(lead.data_criacao).toLocaleString('pt-BR')}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top w-[20%] min-w-[200px]">
                      <p className="text-gray-700 text-xs font-semibold mb-1">
                        {lead.motivo || "Captação padrão EPSA"}
                      </p>
                      {lead.observacoes && (
                        <div className="bg-yellow-50/50 border border-yellow-100 rounded p-2 mt-1.5">
                          <p className="text-[11px] text-gray-600 italic">
                            <span className="font-semibold not-italic block text-yellow-800 mb-0.5">Nota:</span>
                            "{lead.observacoes}"
                          </p>
                        </div>
                      )}
                    </td>

                    {/* COLUNA: DISTRIBUIÇÃO (GESTOR + CONSULTOR UNIFICADOS) */}
                    <td className="px-4 py-4 align-top w-[20%] min-w-[180px]">
                       <div className="flex flex-col gap-3">
                         
                         {/* Bloco do Gestor */}
                         <div className="flex flex-col gap-1">
                           <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                             <Briefcase className="w-3 h-3" /> Supervisão
                           </div>
                           {isAdmin ? (
                             <select 
                               value={lead.gestor_id || ""}
                               onChange={(e) => handleAssignGestor(lead.id, lead.tabela_fonte, e.target.value)}
                               className={`w-full px-2 py-1.5 rounded text-[11px] font-bold appearance-none cursor-pointer border hover:shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-[#b8995a] ${
                                 lead.gestor_id ? 'bg-[#b8995a]/10 border-[#b8995a]/30 text-yellow-800' : 'bg-white border-gray-200 text-gray-500'
                               }`}
                             >
                               <option value="">+ Vincular Gestor</option>
                               {gestores.map(g => (
                                 <option key={g.id} value={g.id}>{g.full_name}</option>
                               ))}
                             </select>
                           ) : (
                             <div className={`w-full px-2 py-1.5 rounded text-[11px] font-bold ${
                               lead.gestor_id ? 'bg-[#b8995a]/10 border border-[#b8995a]/30 text-yellow-800' : 'bg-gray-50 text-gray-400 border border-gray-100'
                             }`}>
                               {gestores.find(g => g.id === lead.gestor_id)?.full_name || 'Aguardando Admin'}
                             </div>
                           )}
                         </div>

                         {/* Bloco do Consultor */}
                         <div className="flex flex-col gap-1">
                           <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                             <UserPlus className="w-3 h-3" /> Atendimento
                           </div>
                           <select 
                            value={lead.vendedor_id || ""}
                            onChange={(e) => handleAssignConsultor(lead.id, lead.tabela_fonte, e.target.value)}
                            className={`w-full px-2 py-1.5 rounded text-[11px] font-bold appearance-none cursor-pointer border hover:shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-cota-green ${
                              lead.vendedor_id ? 'bg-cota-green/10 border-cota-green/30 text-cota-green-dark' : 'bg-white border-gray-200 text-gray-500'
                            }`}
                          >
                            <option value="">+ Designar Consultor</option>
                            {consultores.map(c => (
                              <option key={c.id} value={c.id}>{c.full_name}</option>
                            ))}
                          </select>
                         </div>

                       </div>
                    </td>

                    {/* COLUNA: FINANCEIRO (WALLET EPSA) */}
                    <td className="px-4 py-4 align-top w-[20%] min-w-[200px]">
                      <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 h-full">
                        {editingFinId === lead.id ? (
                          <div className="flex flex-col gap-2">
                            <div>
                              <label className="text-[10px] text-gray-500 font-bold uppercase">Valor da Carta (R$)</label>
                              <input 
                                type="number" 
                                value={finValorCarta}
                                onChange={(e) => setFinValorCarta(Number(e.target.value))}
                                className="w-full px-2 py-1.5 border border-cota-green/50 rounded text-xs focus:outline-none focus:ring-1 focus:ring-cota-green bg-white mt-0.5"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 font-bold uppercase">Status Comissão</label>
                              <select 
                                value={finStatusPagamento}
                                onChange={(e) => setFinStatusPagamento(e.target.value)}
                                className="w-full px-2 py-1.5 border border-cota-green/50 rounded text-xs focus:outline-none focus:ring-1 focus:ring-cota-green bg-white mt-0.5"
                              >
                                <option value="Pendente">Pendente</option>
                                <option value="Liberado">Liberado</option>
                                <option value="Pago">Pago</option>
                              </select>
                            </div>
                            <div className="flex gap-2 mt-1">
                              <button onClick={() => saveFinancial(lead.id, lead.tabela_fonte)} disabled={savingFin} className="flex-1 bg-cota-green text-white py-1.5 rounded text-[10px] font-bold hover:bg-cota-green-light flex items-center justify-center gap-1">
                                <Check className="w-3 h-3"/> Salvar
                              </button>
                              <button onClick={() => setEditingFinId(null)} disabled={savingFin} className="px-2 py-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">
                                <X className="w-3 h-3"/>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col h-full justify-between gap-2 relative group/fin">
                            <button 
                              onClick={() => startFinancialEdit(lead)}
                              className="absolute top-0 right-0 p-1 text-gray-300 hover:text-cota-green hover:bg-cota-green/10 rounded opacity-0 group-hover/fin:opacity-100 transition-all"
                              title="Editar Financeiro"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase">Carta</p>
                              <p className="text-xs font-bold text-gray-800">{formatCurrency(lead.valor_carta || 0)}</p>
                            </div>
                            
                            {lead.tabela_fonte === 'pistas' && (
                              <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                                  <DollarSign className="w-3 h-3 text-[#b8995a]"/> Repasse Parc.
                                </p>
                                <p className="text-sm font-black text-[#b8995a]">{formatCurrency(lead.comissao_parceiro || 0)}</p>
                              </div>
                            )}

                            <div>
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                lead.status_pagamento === 'Liberado' ? 'bg-green-100 text-green-700' :
                                lead.status_pagamento === 'Pago' ? 'bg-gray-200 text-gray-600' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {lead.status_pagamento || 'Pendente'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* COLUNA: STATUS & ATENDIMENTO */}
                    <td className="px-4 py-4 align-top text-center w-[20%] min-w-[160px]">
                      <div className="flex flex-col items-center gap-3">
                        <select 
                          value={lead.status || 'Novo'}
                          onChange={(e) => handleUpdateStatus(lead.id, lead.tabela_fonte, e.target.value)}
                          className={`w-full px-3 py-1.5 rounded-lg text-[11px] font-bold text-center appearance-none cursor-pointer border hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-200 ${getStatusColor(lead.status)} border-transparent`}
                        >
                          <option value="Novo">🔵 Novo (Pendente)</option>
                          <option value="Em atendimento">🟡 Em Atendimento</option>
                          <option value="Proposta">🟣 Proposta Enviada</option>
                          <option value="Fechado">🟢 Negócio Fechado</option>
                          <option value="Perdido">🔴 Perdido</option>
                        </select>

                        <button 
                          onClick={() => openWhatsApp(lead.telefone)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg text-[11px] font-bold transition-all shadow-sm shadow-[#25D366]/20 w-full justify-center"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}