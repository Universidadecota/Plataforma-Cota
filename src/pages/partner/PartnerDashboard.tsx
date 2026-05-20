import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Users, Send, Activity, Clock, ShieldCheck } from "lucide-react";

type Lead = {
  id: string;
  nome: string;
  telefone: string;
  status: string;
  criado_em: string;
};

export default function PartnerDashboard() {
  const { user } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [nomeLead, setNomeLead] = useState("");
  const [telefoneLead, setTelefoneLead] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // =====================================================================
  // O MOTOR CENTRAL "MODO DEUS"
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

  const loadLeads = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Busca apenas as pistas (leads) onde o parceiro atual é o dono
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
        partner_id: user?.id,
        origem: "Parceiro",
        status: "Novo"
      });
      toast.success("Lead cadastrado com sucesso! 🚀");
      setNomeLead(""); 
      setTelefoneLead("");
      await loadLeads();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao cadastrar lead. Tente novamente.");
    } finally {
      setSaving(false);
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

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 pb-10 min-w-0">
      
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-cota-green flex items-center justify-center flex-shrink-0 shadow-sm">
          <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">Portal do Parceiro</h1>
          <p className="text-xs sm:text-sm text-gray-500 truncate">Gerencie seus leads e acompanhe as conversões em tempo real</p>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-gray-500 font-medium">Total Enviado</p>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{leads.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-gray-500 font-medium">Em Atendimento</p>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {leads.filter(l => l.status === 'Em atendimento').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-gray-500 font-medium">Propostas</p>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {leads.filter(l => l.status === 'Proposta').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-gray-500 font-medium">Fechados</p>
            <ShieldCheck className="w-4 h-4 text-cota-green" />
          </div>
          <p className="text-2xl font-bold text-cota-green">
            {leads.filter(l => l.status === 'Fechado').length}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        
        {/* Formulário de Cadastro de Novo Lead */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-bold text-gray-800 text-sm">Enviar Novo Lead</h2>
            <p className="text-xs text-gray-500 mt-0.5">Cadastre o cliente reprovado</p>
          </div>
          <form onSubmit={handleAddLead} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Nome do Cliente</label>
              <input 
                type="text" 
                value={nomeLead} 
                onChange={(e) => setNomeLead(e.target.value)}
                placeholder="Ex: João da Silva" 
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cota-green focus:ring-1 focus:ring-cota-green/30" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Telefone / WhatsApp</label>
              <input 
                type="text" 
                value={telefoneLead} 
                onChange={(e) => setTelefoneLead(e.target.value)}
                placeholder="(21) 99999-9999" 
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cota-green focus:ring-1 focus:ring-cota-green/30" 
              />
            </div>
            <button 
              type="submit" 
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-cota-green text-white py-2.5 rounded-lg text-sm font-bold hover:bg-cota-green-light transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {saving ? "Enviando..." : "Enviar para a Base"}
            </button>
          </form>
        </div>

        {/* Tabela de Acompanhamento */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 className="font-bold text-gray-800 text-sm">Meus Leads Enviados</h2>
              <p className="text-xs text-gray-500 mt-0.5">Rastreabilidade em tempo real</p>
            </div>
          </div>
          
          {loading ? (
             <div className="flex items-center justify-center py-12">
               <div className="w-6 h-6 border-2 border-cota-green border-t-transparent rounded-full animate-spin" />
             </div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">Nenhum lead enviado ainda.</p>
              <p className="text-xs text-gray-400 mt-1">Preencha o formulário ao lado para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Cliente</th>
                    <th className="px-5 py-3 font-semibold">Contato</th>
                    <th className="px-5 py-3 font-semibold">Data de Envio</th>
                    <th className="px-5 py-3 font-semibold text-center">Status Atual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {leads.map(lead => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800 whitespace-nowrap">{lead.nome}</td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{lead.telefone}</td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {new Date(lead.criado_em).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-5 py-3 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${getStatusColor(lead.status)}`}>
                          {lead.status || 'Novo'}
                        </span>
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