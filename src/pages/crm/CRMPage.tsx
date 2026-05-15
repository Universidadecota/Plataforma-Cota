import { useEffect, useState } from "react";
import { Plus, UserCircle, Phone, DollarSign, ArrowRight, CheckCircle2, XCircle, RefreshCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import type { Lead, LeadStatus } from "@/types";

const COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
  { id: "novo", label: "Novos", color: "border-blue-200 bg-blue-50 text-blue-700" },
  { id: "contatado", label: "Contatados", color: "border-amber-200 bg-amber-50 text-amber-700" },
  { id: "simulacao_enviada", label: "Simulação", color: "border-purple-200 bg-purple-50 text-purple-700" },
  { id: "negociacao", label: "Negociação", color: "border-orange-200 bg-orange-50 text-orange-700" },
  { id: "ganho", label: "Vendas (Ganhos)", color: "border-green-200 bg-green-50 text-green-700" },
  { id: "perdido", label: "Perdidos", color: "border-red-200 bg-red-50 text-red-700" },
];

export default function CRMPage() {
  const { user } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [interest, setInterest] = useState<"imovel" | "automovel" | "outros">("imovel");
  const [letterValue, setLetterValue] = useState("");

  useEffect(() => {
    loadLeads();
  }, [user]);

  async function loadLeads() {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("assigned_to", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar os teus leads.");
    } finally {
      setLoading(false);
    }
  }

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) { toast.error("Preenche nome e telefone."); return; }
    try {
      setLoading(true);
      const { error } = await supabase.from("leads").insert({
        name,
        phone,
        interest,
        estimated_letter_value: letterValue ? parseFloat(letterValue) : null,
        assigned_to: user?.id,
        status: "novo",
        origin: "Manual"
      });
      if (error) throw error;
      toast.success("Lead adicionado com sucesso!");
      setShowForm(false);
      setName(""); setPhone(""); setLetterValue("");
      loadLeads();
    } catch (error) {
      toast.error("Erro ao adicionar lead. Verifica a consola (F12).");
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "contatado") updates.first_contact_at = new Date().toISOString();
      if (newStatus === "simulacao_enviada") updates.simulation_sent_at = new Date().toISOString();
      
      const { error } = await supabase.from("leads").update(updates).eq("id", leadId);
      if (error) throw error;
      
      setLeads((prev) => prev.map(l => l.id === leadId ? { ...l, ...updates } : l));
      toast.success(`Lead movido para ${newStatus.replace("_", " ")}`);
    } catch (error) {
      toast.error("Erro ao atualizar lead.");
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "Valor não definido";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-end mb-6 flex-shrink-0">
        <div>
          <h1 className="page-header mb-0">Pipeline de Vendas</h1>
          <p className="page-subtitle">Acompanhe e feche negócios na sua carteira de clientes</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-cota-green text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-cota-green-light">
          <Plus className="w-4 h-4" /> Novo Lead
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddLead} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-6 flex-shrink-0 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nome do Cliente</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João Silva" className="w-full text-sm p-2 border rounded-lg focus:border-cota-green outline-none" required />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">WhatsApp</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="w-full text-sm p-2 border rounded-lg focus:border-cota-green outline-none" required />
          </div>
          <div className="w-32">
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Interesse</label>
            <select value={interest} onChange={e => setInterest(e.target.value as any)} className="w-full text-sm p-2 border rounded-lg focus:border-cota-green outline-none">
              <option value="imovel">Imóvel</option>
              <option value="automovel">Automóvel</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Valor da Carta (R$)</label>
            <input type="number" value={letterValue} onChange={e => setLetterValue(e.target.value)} placeholder="300000" className="w-full text-sm p-2 border rounded-lg focus:border-cota-green outline-none" />
          </div>
          <button type="submit" disabled={loading} className="bg-cota-gold text-cota-green-dark px-6 py-2 rounded-lg font-bold text-sm hover:opacity-90 h-[38px]">
            Salvar
          </button>
        </form>
      )}

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {COLUMNS.map(col => {
          const columnLeads = leads.filter(l => l.status === col.id);
          return (
            <div key={col.id} className="flex-1 min-w-[300px] flex flex-col bg-gray-50/50 rounded-xl border border-gray-100 p-3">
              <div className={`px-3 py-2 rounded-lg border text-sm font-bold flex justify-between items-center mb-4 ${col.color}`}>
                <span className="uppercase tracking-wider text-xs">{col.label}</span>
                <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs text-black/60">{columnLeads.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {columnLeads.map(lead => (
                  <div key={lead.id} className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group ${col.id === 'ganho' ? 'border-green-200' : col.id === 'perdido' ? 'border-red-200' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-800 text-sm truncate pr-2 flex items-center gap-1.5">
                        <UserCircle className="w-4 h-4 text-gray-400" /> {lead.name}
                      </h3>
                      {lead.interest === "imovel" ? (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Imóvel</span>
                      ) : (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Auto</span>
                      )}
                    </div>
                    
                    <div className="space-y-1.5 mb-4">
                      <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {lead.phone}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> {formatCurrency(lead.estimated_letter_value)}</p>
                    </div>

                    <div className="flex items-center gap-2 border-t border-gray-100 pt-3 mt-1">
                      {col.id === "novo" && <button onClick={() => updateLeadStatus(lead.id, "contatado")} className="flex-1 bg-gray-50 hover:bg-cota-green hover:text-white text-gray-600 text-xs font-semibold py-1.5 rounded flex items-center justify-center gap-1 transition-colors">Avançar <ArrowRight className="w-3 h-3" /></button>}
                      {col.id === "contatado" && <button onClick={() => updateLeadStatus(lead.id, "simulacao_enviada")} className="flex-1 bg-gray-50 hover:bg-cota-green hover:text-white text-gray-600 text-xs font-semibold py-1.5 rounded flex items-center justify-center gap-1 transition-colors">Avançar <ArrowRight className="w-3 h-3" /></button>}
                      {col.id === "simulacao_enviada" && <button onClick={() => updateLeadStatus(lead.id, "negociacao")} className="flex-1 bg-gray-50 hover:bg-cota-green hover:text-white text-gray-600 text-xs font-semibold py-1.5 rounded flex items-center justify-center gap-1 transition-colors">Avançar <ArrowRight className="w-3 h-3" /></button>}
                      
                      {col.id === "negociacao" && (
                        <>
                          <button onClick={() => updateLeadStatus(lead.id, "ganho")} className="flex-1 bg-green-50 hover:bg-green-500 hover:text-white text-green-700 text-xs font-bold py-1.5 rounded flex items-center justify-center gap-1 transition-colors">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Venda
                          </button>
                          <button onClick={() => updateLeadStatus(lead.id, "perdido")} className="flex-1 bg-red-50 hover:bg-red-500 hover:text-white text-red-700 text-xs font-bold py-1.5 rounded flex items-center justify-center gap-1 transition-colors">
                            <XCircle className="w-3.5 h-3.5" /> Perda
                          </button>
                        </>
                      )}

                      {col.id === "ganho" && (
                         <span className="text-xs text-green-600 font-bold italic w-full text-center py-1">🎉 Negócio Fechado</span>
                      )}

                      {col.id === "perdido" && (
                        <button onClick={() => updateLeadStatus(lead.id, "contatado")} className="flex-1 bg-gray-50 hover:bg-gray-200 text-gray-600 text-xs font-bold py-1.5 rounded flex items-center justify-center gap-1 transition-colors">
                          <RefreshCcw className="w-3.5 h-3.5" /> Restaurar Lead
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {columnLeads.length === 0 && (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs text-center px-4">
                    Vazio
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}