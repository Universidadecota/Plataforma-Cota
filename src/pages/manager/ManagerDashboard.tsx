import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  Check,
  ClipboardList,
  Download,
  DollarSign,
  Edit2,
  Eye,
  Filter,
  MessageCircle,
  Phone,
  Search,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";

type SourceTable = "leads" | "pistas";

type UnifiedLead = {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  motivo?: string;
  observacoes?: string;
  status: string;
  etapa_funil: string;
  temperatura: string;
  prioridade?: string;
  origem: string;
  origem_detalhada?: string;
  data_criacao: string;
  updated_at?: string;
  tabela_fonte: SourceTable;
  vendedor_id?: string | null;
  gestor_id?: string | null;
  partner_id?: string | null;
  lead_source_type?: string | null;
  lead_source_label?: string | null;
  lead_source_id?: string | null;
  sdr_id?: string | null;
  closer_id?: string | null;
  valor_carta?: number;
  comissao_epsa?: number;
  comissao_parceiro?: number;
  status_pagamento?: string;
  ultimo_contato_em?: string | null;
  proxima_acao?: string | null;
  proxima_acao_em?: string | null;
  motivo_perda?: string | null;
};

type EquipeMember = {
  id: string;
  full_name: string;
  role: string;
  email?: string;
};

type FinancialSplit = {
  id: string;
  lead_id: string;
  tabela_fonte: SourceTable;
  source_type: string;
  source_label?: string | null;
  event_type: "parcela_consorcio" | "fechamento_imovel";
  event_number: number;
  actor_type: "partner" | "traffic_reserve" | "sdr" | "closer" | "manager" | "epsa_house";
  actor_id?: string | null;
  actor_ref: string;
  description: string;
  base_amount: number;
  gross_event_amount: number;
  percentage: number;
  amount: number;
  status: "previsto" | "recebido_pela_epsa" | "liberado_para_pagamento" | "pago" | "cancelado";
  due_at?: string | null;
  epsa_received_at?: string | null;
  released_at?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
};

const SOURCE_TYPE_OPTIONS = [
  { value: "partner", label: "Parceiro" },
  { value: "paid_traffic", label: "Tráfego pago" },
  { value: "organic", label: "Orgânico" },
  { value: "epsa_base", label: "Base EPSA" },
  { value: "referral", label: "Indicação" },
  { value: "real_estate_agency", label: "Imobiliária" },
  { value: "construction_company", label: "Construtora" },
];

type DateFilter = "all" | "today" | "7d" | "30d" | "month";

const FUNNEL_STAGES = [
  "Novo",
  "Primeiro contato",
  "Diagnóstico",
  "Simulação enviada",
  "Follow-up",
  "Proposta",
  "Fechado",
  "Perdido",
  "Reativar futuramente",
];

const STATUS_OPTIONS = FUNNEL_STAGES;
const TEMPERATURE_OPTIONS = ["Frio", "Morno", "Quente"];

function formatCurrency(value?: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDateTime(value?: string | null) {
  if (!value) return "Não registrado";
  return new Date(value).toLocaleString("pt-BR");
}

function daysAgo(value?: string | null) {
  if (!value) return null;
  const diff = Date.now() - new Date(value).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getInitials(name?: string) {
  return (name || "?")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function ManagerDashboard() {
  const { user } = useAuthStore();

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";

  const [leads, setLeads] = useState<UnifiedLead[]>([]);
  const [financialSplits, setFinancialSplits] = useState<FinancialSplit[]>([]);
  const [gestores, setGestores] = useState<EquipeMember[]>([]);
  const [consultores, setConsultores] = useState<EquipeMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeView, setActiveView] = useState<"geral" | "funil" | "consultores" | "origens" | "financeiro" | "leads">("geral");
  const [statusFilter, setStatusFilter] = useState("");
  const [origemFilter, setOrigemFilter] = useState("");
  const [consultorFilter, setConsultorFilter] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("30d");
  const [minhaBaseFilter, setMinhaBaseFilter] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [editingFinId, setEditingFinId] = useState<string | null>(null);
  const [finValorCarta, setFinValorCarta] = useState(0);
  const [finStatusPagamento, setFinStatusPagamento] = useState("Pendente");
  const [savingFin, setSavingFin] = useState(false);

  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [actionText, setActionText] = useState("");
  const [actionDate, setActionDate] = useState("");

  const directApiCall = async (tableName: string, method: string, body?: any, query?: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    let token = supabaseAnonKey;

    try {
      const storageKey = Object.keys(localStorage).find(
        (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
      );
      if (storageKey) {
        const sessionData = JSON.parse(localStorage.getItem(storageKey) || "{}");
        if (sessionData?.access_token) token = sessionData.access_token;
      }
    } catch (err) {
      console.error(err);
    }

    const endpoint = `${supabaseUrl}/rest/v1/${tableName}${query ? `?${query}` : ""}`;

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
        Prefer: method === "POST" ? "return=representation" : "return=minimal",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro ${response.status}: ${errText}`);
    }

    if (method === "GET" || method === "POST") {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }

    return true;
  };

  const writeActivity = async (
    lead: UnifiedLead,
    activityType: string,
    title: string,
    description?: string,
    oldValue?: string,
    newValue?: string
  ) => {
    try {
      await directApiCall("lead_activities", "POST", {
        lead_id: lead.id,
        tabela_fonte: lead.tabela_fonte,
        activity_type: activityType,
        title,
        description,
        old_value: oldValue,
        new_value: newValue,
        performed_by: user?.id || null,
      });
    } catch (err) {
      console.warn("Não foi possível registrar atividade:", err);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);

      const [pistasData, leadsData, equipeData, splitData] = await Promise.all([
        directApiCall("pistas", "GET", undefined, "order=criado_em.desc"),
        directApiCall("leads", "GET", undefined, "order=created_at.desc").catch(() => []),
        directApiCall(
          "user_profiles",
          "GET",
          undefined,
          "role=in.(admin,manager,consultant,instructor,partner,pending_partner)&select=id,full_name,role,email"
        ),
        directApiCall("lead_financial_splits", "GET", undefined, "select=*&order=created_at.desc").catch(() => []),
      ]);

      setFinancialSplits(splitData || []);

      const equipeList = equipeData || [];
      setGestores(equipeList.filter((m: EquipeMember) => ["admin", "manager"].includes(m.role)));
      setConsultores(
        equipeList.filter((m: EquipeMember) =>
          ["admin", "manager", "consultant", "instructor"].includes(m.role)
        )
      );

      const mappedPistas: UnifiedLead[] = (pistasData || []).map((p: any) => ({
        id: p.id,
        nome: p.nome,
        telefone: p.telefone,
        email: p.email,
        motivo: p.motivo || p.interesse,
        observacoes: p.observacoes,
        status: p.status || "Novo",
        etapa_funil: p.etapa_funil || p.status || "Novo",
        temperatura: p.temperatura || "Morno",
        prioridade: p.prioridade || "Normal",
        origem: p.origem || "Parceiro",
        origem_detalhada: p.origem_detalhada,
        data_criacao: p.criado_em,
        updated_at: p.atualizado_em,
        tabela_fonte: "pistas",
        vendedor_id: p.vendedor_id || p.atribuido_a,
        gestor_id: p.gestor_id,
        partner_id: p.partner_id,
        lead_source_type: p.lead_source_type || (p.partner_id ? "partner" : "epsa_base"),
        lead_source_label: p.lead_source_label || p.origem_detalhada || p.origem || "Parceiro",
        lead_source_id: p.lead_source_id || p.partner_id,
        sdr_id: p.sdr_id,
        closer_id: p.closer_id || p.vendedor_id || p.atribuido_a,
        valor_carta: Number(p.valor_carta || p.valor_da_letra_estimado || 0),
        comissao_epsa: Number(p.comissao_epsa || Number(p.valor_carta || 0) * 0.035 || 0),
        comissao_parceiro: Number(p.comissao_parceiro || 0),
        status_pagamento: p.status_pagamento || "Pendente",
        ultimo_contato_em: p.ultimo_contato_em,
        proxima_acao: p.proxima_acao,
        proxima_acao_em: p.proxima_acao_em,
        motivo_perda: p.motivo_perda,
      }));

      const mappedLeads: UnifiedLead[] = (leadsData || []).map((l: any) => ({
        id: l.id,
        nome: l.name || l.nome || "Sem nome",
        telefone: l.phone || l.telefone || "",
        email: l.email,
        motivo: l.motivo || l.interest || "Captação interna",
        observacoes: l.observacoes,
        status: l.status || "Novo",
        etapa_funil: l.etapa_funil || l.status || "Novo",
        temperatura: l.temperatura || "Morno",
        prioridade: l.prioridade || "Normal",
        origem: l.origin || l.origem || "Interno",
        origem_detalhada: l.origem_detalhada,
        data_criacao: l.created_at,
        updated_at: l.updated_at,
        tabela_fonte: "leads",
        vendedor_id: l.vendedor_id || l.assigned_to,
        gestor_id: l.gestor_id,
        lead_source_type: l.lead_source_type || "epsa_base",
        lead_source_label: l.lead_source_label || l.origin || "Base EPSA",
        lead_source_id: l.lead_source_id,
        sdr_id: l.sdr_id,
        closer_id: l.closer_id || l.vendedor_id || l.assigned_to,
        valor_carta: Number(l.valor_carta || l.estimated_letter_value || 0),
        comissao_epsa: Number(l.comissao_epsa || Number(l.valor_carta || 0) * 0.035 || 0),
        comissao_parceiro: Number(l.comissao_parceiro || 0),
        status_pagamento: l.status_pagamento || "Pendente",
        ultimo_contato_em: l.ultimo_contato_em || l.last_follow_up_at || l.first_contact_at,
        proxima_acao: l.proxima_acao,
        proxima_acao_em: l.proxima_acao_em,
        motivo_perda: l.motivo_perda || l.loss_reason,
      }));

      const unified = [...mappedPistas, ...mappedLeads].sort(
        (a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime()
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

  const filteredLeads = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return leads.filter((lead) => {
      let temPermissaoDeVisao = false;

      if (isAdmin) {
        temPermissaoDeVisao = true;
      } else if (isManager) {
        temPermissaoDeVisao = lead.gestor_id === user?.id || lead.vendedor_id === user?.id;
      } else {
        temPermissaoDeVisao = lead.vendedor_id === user?.id;
      }

      if (!temPermissaoDeVisao) return false;

      const created = new Date(lead.data_criacao);
      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "today" && created >= startOfToday) ||
        (dateFilter === "7d" && created >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) ||
        (dateFilter === "30d" && created >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) ||
        (dateFilter === "month" && created >= startOfMonth);

      const matchesStatus = statusFilter ? lead.etapa_funil === statusFilter || lead.status === statusFilter : true;
      const matchesOrigem = origemFilter ? lead.origem?.toLowerCase() === origemFilter.toLowerCase() || lead.tabela_fonte === origemFilter : true;
      const matchesConsultor = consultorFilter ? lead.vendedor_id === consultorFilter || lead.gestor_id === consultorFilter : true;
      const matchesBase = minhaBaseFilter ? lead.vendedor_id === user?.id || lead.gestor_id === user?.id : true;
      const matchesSearch = searchTerm
        ? `${lead.nome} ${lead.telefone} ${lead.email || ""} ${lead.motivo || ""}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        : true;

      return matchesDate && matchesStatus && matchesOrigem && matchesConsultor && matchesBase && matchesSearch;
    });
  }, [leads, statusFilter, origemFilter, consultorFilter, dateFilter, minhaBaseFilter, searchTerm, isAdmin, isManager, user?.id]);

  const metrics = useMemo(() => {
    const total = filteredLeads.length;
    const fechados = filteredLeads.filter((l) => l.etapa_funil === "Fechado" || l.status === "Fechado");
    const perdidos = filteredLeads.filter((l) => l.etapa_funil === "Perdido" || l.status === "Perdido");
    const propostas = filteredLeads.filter((l) => ["Proposta", "Simulação enviada"].includes(l.etapa_funil) || l.status === "Proposta");
    const novos = filteredLeads.filter((l) => l.etapa_funil === "Novo" || l.status === "Novo");
    const semAtendimento = novos.filter((l) => !l.ultimo_contato_em);
    const parados = filteredLeads.filter((l) => {
      const baseDate = l.ultimo_contato_em || l.updated_at || l.data_criacao;
      const days = daysAgo(baseDate);
      return days !== null && days >= 3 && !["Fechado", "Perdido"].includes(l.etapa_funil);
    });

    const valorCartas = filteredLeads.reduce((sum, l) => sum + Number(l.valor_carta || 0), 0);
    const comissaoEpsa = filteredLeads.reduce((sum, l) => sum + Number(l.comissao_epsa || Number(l.valor_carta || 0) * 0.035), 0);
    const repasseParceiro = filteredLeads.reduce((sum, l) => sum + Number(l.comissao_parceiro || 0), 0);

    return {
      total,
      novos: novos.length,
      semAtendimento: semAtendimento.length,
      propostas: propostas.length,
      fechados: fechados.length,
      perdidos: perdidos.length,
      parados: parados.length,
      conversao: total ? (fechados.length / total) * 100 : 0,
      valorCartas,
      comissaoEpsa,
      repasseParceiro,
    };
  }, [filteredLeads]);

  const financialMetrics = useMemo(() => {
    const visibleIds = new Set(filteredLeads.map((lead) => `${lead.tabela_fonte}:${lead.id}`));

    const visibleSplits = financialSplits.filter((item) =>
      visibleIds.has(`${item.tabela_fonte}:${item.lead_id}`)
    );

    const activeSplits = visibleSplits.filter((item) => item.status !== "cancelado");

    const epsaPrevisto = activeSplits
      .filter((item) => item.actor_type === "epsa_house" && item.status === "previsto")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const epsaRecebido = activeSplits
      .filter((item) =>
        item.actor_type === "epsa_house" &&
        ["recebido_pela_epsa", "liberado_para_pagamento", "pago"].includes(item.status)
      )
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const parceiroPrevisto = activeSplits
      .filter((item) => item.actor_type === "partner" && item.status !== "pago")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const trafegoReservado = activeSplits
      .filter((item) => item.actor_type === "traffic_reserve" && item.status !== "pago")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const atoresInternosPrevisto = activeSplits
      .filter((item) => ["sdr", "closer", "manager"].includes(item.actor_type) && item.status !== "pago")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const totalPago = activeSplits
      .filter((item) => item.status === "pago")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const consorcioTotal = activeSplits
      .filter((item) => item.event_type === "parcela_consorcio")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const imovelTotal = activeSplits
      .filter((item) => item.event_type === "fechamento_imovel")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      epsaPrevisto,
      epsaRecebido,
      parceiroPrevisto,
      trafegoReservado,
      atoresInternosPrevisto,
      totalPago,
      consorcioTotal,
      imovelTotal,
      totalLinhas: visibleSplits.length,
      visibleSplits,
    };
  }, [financialSplits, filteredLeads]);

  const funnelData = useMemo(() => {
    return FUNNEL_STAGES.map((stage) => {
      const total = filteredLeads.filter((l) => l.etapa_funil === stage || l.status === stage).length;
      return { stage, total, percent: filteredLeads.length ? (total / filteredLeads.length) * 100 : 0 };
    });
  }, [filteredLeads]);

  const productionByConsultant = useMemo(() => {
    const map = new Map<string, any>();

    filteredLeads.forEach((lead) => {
      const id = lead.vendedor_id || "sem-consultor";
      const member = consultores.find((c) => c.id === id);
      const current = map.get(id) || {
        id,
        name: member?.full_name || "Sem consultor",
        leads: 0,
        proposals: 0,
        closed: 0,
        lost: 0,
        valorCartas: 0,
        comissao: 0,
        stalled: 0,
      };

      current.leads += 1;
      if (["Proposta", "Simulação enviada"].includes(lead.etapa_funil)) current.proposals += 1;
      if (lead.etapa_funil === "Fechado" || lead.status === "Fechado") current.closed += 1;
      if (lead.etapa_funil === "Perdido" || lead.status === "Perdido") current.lost += 1;
      if (!["Fechado", "Perdido"].includes(lead.etapa_funil) && (daysAgo(lead.ultimo_contato_em || lead.updated_at || lead.data_criacao) || 0) >= 3) current.stalled += 1;
      current.valorCartas += Number(lead.valor_carta || 0);
      current.comissao += Number(lead.comissao_epsa || Number(lead.valor_carta || 0) * 0.035);

      map.set(id, current);
    });

    return Array.from(map.values())
      .map((item) => ({ ...item, conversion: item.leads ? (item.closed / item.leads) * 100 : 0 }))
      .sort((a, b) => b.closed - a.closed || b.valorCartas - a.valorCartas);
  }, [filteredLeads, consultores]);

  const productionByOrigin = useMemo(() => {
    const map = new Map<string, any>();

    filteredLeads.forEach((lead) => {
      const key = lead.lead_source_label || lead.lead_source_type || lead.origem || lead.tabela_fonte;
      const current = map.get(key) || {
        origin: key,
        leads: 0,
        closed: 0,
        proposals: 0,
        valorCartas: 0,
        repasse: 0,
      };

      current.leads += 1;
      if (lead.etapa_funil === "Fechado" || lead.status === "Fechado") current.closed += 1;
      if (["Proposta", "Simulação enviada"].includes(lead.etapa_funil)) current.proposals += 1;
      current.valorCartas += Number(lead.valor_carta || 0);
      current.repasse += Number(lead.comissao_parceiro || 0);

      map.set(key, current);
    });

    return Array.from(map.values())
      .map((item) => ({ ...item, conversion: item.leads ? (item.closed / item.leads) * 100 : 0 }))
      .sort((a, b) => b.leads - a.leads);
  }, [filteredLeads]);

  const handleUpdateStatus = async (lead: UnifiedLead, novoStatus: string) => {
    try {
      await directApiCall(lead.tabela_fonte, "PATCH", { status: novoStatus, etapa_funil: novoStatus }, `id=eq.${lead.id}`);
      await writeActivity(lead, "status", "Status atualizado", `Status alterado para ${novoStatus}`, lead.etapa_funil, novoStatus);
      toast.success(`Status atualizado para: ${novoStatus}`);
      setLeads((prev) => prev.map((item) => (item.id === lead.id ? { ...item, status: novoStatus, etapa_funil: novoStatus } : item)));
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar status.");
    }
  };

  const handleUpdateTemperature = async (lead: UnifiedLead, temperatura: string) => {
    try {
      await directApiCall(lead.tabela_fonte, "PATCH", { temperatura }, `id=eq.${lead.id}`);
      await writeActivity(lead, "temperatura", "Temperatura atualizada", `Temperatura alterada para ${temperatura}`, lead.temperatura, temperatura);
      setLeads((prev) => prev.map((item) => (item.id === lead.id ? { ...item, temperatura } : item)));
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar temperatura.");
    }
  };

  const handleAssignConsultor = async (lead: UnifiedLead, vendedorId: string) => {
    try {
      const patch = lead.tabela_fonte === "leads"
        ? { vendedor_id: vendedorId || null, assigned_to: vendedorId || null, closer_id: vendedorId || null }
        : { vendedor_id: vendedorId || null, atribuido_a: vendedorId || null, closer_id: vendedorId || null };

      await directApiCall(lead.tabela_fonte, "PATCH", patch, `id=eq.${lead.id}`);
      await writeActivity(lead, "distribuicao", "Consultor atribuído", "Responsável de atendimento atualizado.", lead.vendedor_id || "", vendedorId);
      toast.success("Consultor atribuído com sucesso!");
      setLeads((prev) => prev.map((item) => (item.id === lead.id ? { ...item, vendedor_id: vendedorId || null, closer_id: vendedorId || null } : item)));
      await regenerateSplitsForLead(lead, { vendedor_id: vendedorId || null, closer_id: vendedorId || null });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atribuir consultor.");
    }
  };

  const handleAssignGestor = async (lead: UnifiedLead, gestorId: string) => {
    try {
      await directApiCall(lead.tabela_fonte, "PATCH", { gestor_id: gestorId || null }, `id=eq.${lead.id}`);
      await writeActivity(lead, "distribuicao", "Gestor vinculado", "Gestor da carteira atualizado.", lead.gestor_id || "", gestorId);
      toast.success("Gestor vinculado à carteira do lead!");
      setLeads((prev) => prev.map((item) => (item.id === lead.id ? { ...item, gestor_id: gestorId || null } : item)));
    } catch (err) {
      console.error(err);
      toast.error("Erro ao vincular gestor.");
    }
  };

  const handleAssignSDR = async (lead: UnifiedLead, sdrId: string) => {
    try {
      await directApiCall(lead.tabela_fonte, "PATCH", { sdr_id: sdrId || null }, `id=eq.${lead.id}`);
      await writeActivity(lead, "distribuicao", "SDR atribuído", "Responsável pela qualificação atualizado.", lead.sdr_id || "", sdrId);
      toast.success("SDR atribuído com sucesso!");
      setLeads((prev) => prev.map((item) => (item.id === lead.id ? { ...item, sdr_id: sdrId || null } : item)));
      await regenerateSplitsForLead(lead, { sdr_id: sdrId || null });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atribuir SDR.");
    }
  };

  const startFinancialEdit = (lead: UnifiedLead) => {
    setEditingFinId(lead.id);
    setFinValorCarta(lead.valor_carta || 0);
    setFinStatusPagamento(lead.status_pagamento || "Pendente");
  };

  const saveFinancial = async (lead: UnifiedLead) => {
    try {
      setSavingFin(true);
      const comissaoEpsa = Number((finValorCarta * 0.035).toFixed(2));
      const comissaoParceiro = Number((comissaoEpsa * 0.30).toFixed(2));

      const body = {
        valor_carta: finValorCarta,
        comissao_epsa: comissaoEpsa,
        comissao_parceiro: comissaoParceiro,
        status_pagamento: finStatusPagamento,
      };

      await directApiCall(lead.tabela_fonte, "PATCH", body, `id=eq.${lead.id}`);

      try {
        await directApiCall(
          "rpc/epsa_generate_financial_splits",
          "POST",
          {
            p_lead_id: lead.id,
            p_tabela_fonte: lead.tabela_fonte,
            p_base_amount: finValorCarta,
            p_source_type: lead.lead_source_type || (lead.tabela_fonte === "pistas" ? "partner" : "epsa_base"),
            p_source_label: lead.lead_source_label || lead.origem || null,
            p_partner_id: lead.partner_id || null,
            p_gestor_id: lead.gestor_id || null,
            p_sdr_id: lead.sdr_id || null,
            p_closer_id: lead.closer_id || lead.vendedor_id || null,
            p_user_id: user?.id || null,
          }
        );

        const refreshedSplits = await directApiCall(
          "lead_financial_splits",
          "GET",
          undefined,
          "select=*&order=created_at.desc"
        ).catch(() => []);

        setFinancialSplits(refreshedSplits || []);
      } catch (scheduleError) {
        console.warn("Não foi possível atualizar o cronograma de repasse:", scheduleError);
      }

      await writeActivity(lead, "financeiro", "Financeiro atualizado", `Carta: ${formatCurrency(finValorCarta)} | Comissão EPSA estimada: ${formatCurrency(comissaoEpsa)}`);
      toast.success("Dados financeiros salvos.");

      setLeads((prev) =>
        prev.map((item) =>
          item.id === lead.id
            ? {
                ...item,
                valor_carta: finValorCarta,
                comissao_epsa: comissaoEpsa,
                comissao_parceiro: comissaoParceiro,
                status_pagamento: finStatusPagamento,
              }
            : item
        )
      );

      setEditingFinId(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar financeiro.");
    } finally {
      setSavingFin(false);
    }
  };

  const saveNextAction = async (lead: UnifiedLead) => {
    try {
      const body = {
        proxima_acao: actionText || null,
        proxima_acao_em: actionDate ? new Date(actionDate).toISOString() : null,
      };

      await directApiCall(lead.tabela_fonte, "PATCH", body, `id=eq.${lead.id}`);
      await writeActivity(lead, "follow_up", "Próxima ação definida", actionText, "", actionDate);
      toast.success("Próxima ação salva.");

      setLeads((prev) =>
        prev.map((item) =>
          item.id === lead.id
            ? {
                ...item,
                proxima_acao: body.proxima_acao,
                proxima_acao_em: body.proxima_acao_em,
              }
            : item
        )
      );

      setEditingActionId(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar próxima ação.");
    }
  };

  const regenerateSplitsForLead = async (lead: UnifiedLead, overrides?: Partial<UnifiedLead>) => {
    const nextLead = { ...lead, ...overrides };
    const baseAmount = Number(nextLead.valor_carta || 0);

    if (baseAmount <= 0) return;

    await directApiCall(
      "rpc/epsa_generate_financial_splits",
      "POST",
      {
        p_lead_id: nextLead.id,
        p_tabela_fonte: nextLead.tabela_fonte,
        p_base_amount: baseAmount,
        p_source_type: nextLead.lead_source_type || (nextLead.tabela_fonte === "pistas" ? "partner" : "epsa_base"),
        p_source_label: nextLead.lead_source_label || nextLead.origem || null,
        p_partner_id: nextLead.partner_id || null,
        p_gestor_id: nextLead.gestor_id || null,
        p_sdr_id: nextLead.sdr_id || null,
        p_closer_id: nextLead.closer_id || nextLead.vendedor_id || null,
        p_user_id: user?.id || null,
      }
    );

    const refreshedSplits = await directApiCall(
      "lead_financial_splits",
      "GET",
      undefined,
      "select=*&order=created_at.desc"
    ).catch(() => []);

    setFinancialSplits(refreshedSplits || []);
  };

  const handleUpdateSourceType = async (lead: UnifiedLead, sourceType: string) => {
    try {
      const sourceLabel = SOURCE_TYPE_OPTIONS.find((item) => item.value === sourceType)?.label || sourceType;

      await directApiCall(
        lead.tabela_fonte,
        "PATCH",
        {
          lead_source_type: sourceType,
          lead_source_label: sourceLabel,
        },
        `id=eq.${lead.id}`
      );

      const overrides = { lead_source_type: sourceType, lead_source_label: sourceLabel };
      setLeads((prev) => prev.map((item) => (item.id === lead.id ? { ...item, ...overrides } : item)));

      await regenerateSplitsForLead(lead, overrides);
      await writeActivity(lead, "origem", "Origem financeira atualizada", `Origem alterada para ${sourceLabel}`, lead.lead_source_type || "", sourceType);

      toast.success("Origem financeira atualizada.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar origem financeira.");
    }
  };

  const updateFinancialSplitStatus = async (item: FinancialSplit, status: FinancialSplit["status"]) => {
    try {
      const now = new Date().toISOString();

      const patch: any = {
        status,
        updated_at: now,
        updated_by: user?.id || null,
      };

      if (status === "recebido_pela_epsa") patch.epsa_received_at = now;
      if (status === "liberado_para_pagamento") patch.released_at = now;
      if (status === "pago") patch.paid_at = now;

      await directApiCall("lead_financial_splits", "PATCH", patch, `id=eq.${item.id}`);

      setFinancialSplits((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, ...patch } : row))
      );

      toast.success("Status financeiro atualizado.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar status financeiro.");
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleanPhone}`, "_blank");
  };

  const exportCSV = () => {
    const headers = [
      "Nome",
      "Telefone",
      "Email",
      "Origem",
      "Status",
      "Temperatura",
      "Valor Carta",
      "Comissão EPSA",
      "Repasse Parceiro",
      "Próxima Ação",
      "Data Próxima Ação",
      "Criado Em",
    ];

    const rows = filteredLeads.map((lead) => [
      lead.nome,
      lead.telefone,
      lead.email || "",
      lead.origem,
      lead.etapa_funil,
      lead.temperatura,
      lead.valor_carta || 0,
      lead.comissao_epsa || 0,
      lead.comissao_parceiro || 0,
      lead.proxima_acao || "",
      lead.proxima_acao_em || "",
      lead.data_criacao,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-epsa-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const base = "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold";
    switch (status) {
      case "Novo":
        return `${base} bg-blue-50 text-blue-700 border border-blue-100`;
      case "Primeiro contato":
        return `${base} bg-cyan-50 text-cyan-700 border border-cyan-100`;
      case "Diagnóstico":
        return `${base} bg-amber-50 text-amber-700 border border-amber-100`;
      case "Simulação enviada":
        return `${base} bg-purple-50 text-purple-700 border border-purple-100`;
      case "Follow-up":
        return `${base} bg-orange-50 text-orange-700 border border-orange-100`;
      case "Proposta":
        return `${base} bg-indigo-50 text-indigo-700 border border-indigo-100`;
      case "Fechado":
        return `${base} bg-green-50 text-green-700 border border-green-100`;
      case "Perdido":
        return `${base} bg-red-50 text-red-700 border border-red-100`;
      default:
        return `${base} bg-gray-50 text-gray-700 border border-gray-100`;
    }
  };

  const MetricCard = ({ title, value, subtitle, icon: Icon, accent = "text-[#b8995a]", onClick }: any) => (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
        <div className="rounded-xl bg-gray-50 p-2">
          <Icon className={`h-4 w-4 ${accent}`} />
        </div>
      </div>
      <p className="text-lg sm:text-xl font-black text-gray-900 leading-snug break-words">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 px-2 pb-10 sm:px-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-[#b8995a]/30 bg-[#0a1a15] shadow-sm">
            <Activity className="h-6 w-6 text-[#b8995a]" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black text-gray-900 sm:text-3xl">
              {isAdmin ? "Mesa de Operações EPSA" : "CRM EPSA"}
            </h1>
            <p className="truncate text-sm text-gray-500">
              Gestão comercial, produção, funil, parceiros e financeiro
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => setMinhaBaseFilter(!minhaBaseFilter)}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition-all ${
              minhaBaseFilter
                ? "bg-[#b8995a] text-white ring-2 ring-[#b8995a]/30"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <UserCheck className="h-4 w-4" />
            {minhaBaseFilter ? "Minha Base Ativa" : "Ver Minha Base"}
          </button>

          <button
            onClick={exportCSV}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0a1a15] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#10261e]"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Leads na visão" value={metrics.total} subtitle="base filtrada" icon={Users} />
        <MetricCard title="Sem atendimento" value={metrics.semAtendimento} subtitle="novos sem contato" icon={AlertTriangle} accent="text-red-500" onClick={() => setStatusFilter("Novo")} />
        <MetricCard title="Propostas" value={metrics.propostas} subtitle="simulações/propostas" icon={Target} accent="text-purple-500" />
        <MetricCard title="Fechados" value={metrics.fechados} subtitle={`${metrics.conversao.toFixed(1)}% conversão`} icon={Check} accent="text-green-600" onClick={() => setStatusFilter("Fechado")} />
        <MetricCard title="Cartas" value={formatCurrency(metrics.valorCartas)} subtitle="valor potencial" icon={Wallet} />
        <MetricCard title="Receita EPSA" value={formatCurrency(metrics.comissaoEpsa)} subtitle="comissão prevista" icon={TrendingUp} />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente, telefone, email ou motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:border-[#b8995a] focus:outline-none focus:ring-1 focus:ring-[#b8995a]"
            />
          </div>

          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#b8995a] focus:outline-none">
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="month">Mês atual</option>
            <option value="all">Todo período</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#b8995a] focus:outline-none">
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select value={consultorFilter} onChange={(e) => setConsultorFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#b8995a] focus:outline-none">
            <option value="">Todos os responsáveis</option>
            {consultores.map((consultor) => (
              <option key={consultor.id} value={consultor.id}>{consultor.full_name}</option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("");
              setOrigemFilter("");
              setConsultorFilter("");
              setDateFilter("30d");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Limpar
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          ["geral", "Visão geral", BarChart3],
          ["funil", "Funil", BarChart3],
          ["consultores", "Consultores", Users],
          ["origens", "Origens", Building2],
          ["financeiro", "Financeiro", Wallet],
          ["leads", "Leads", ClipboardList],
        ].map(([key, label, Icon]: any) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              activeView === key
                ? "bg-[#0a1a15] text-white shadow-sm"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {(activeView === "geral" || activeView === "funil") && (
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">Funil comercial</h2>
                <p className="text-sm text-gray-500">Distribuição dos leads por etapa</p>
              </div>
              <TrendingUp className="h-5 w-5 text-[#b8995a]" />
            </div>

            <div className="space-y-4">
              {funnelData.map((item) => (
                <button
                  key={item.stage}
                  onClick={() => setStatusFilter(item.stage)}
                  className="w-full text-left"
                >
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-700">{item.stage}</span>
                    <span className="font-bold text-gray-900">{item.total}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[#b8995a] transition-all"
                      style={{ width: `${Math.max(item.percent, item.total > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">Alertas operacionais</h2>
                <p className="text-sm text-gray-500">Pontos que exigem atenção</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-sm font-bold text-red-700">Leads sem atendimento</p>
                <p className="mt-1 text-2xl font-black text-red-800">{metrics.semAtendimento}</p>
                <p className="text-xs text-red-600">Novos leads sem registro de contato.</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-700">Leads parados há 3+ dias</p>
                <p className="mt-1 text-2xl font-black text-amber-800">{metrics.parados}</p>
                <p className="text-xs text-amber-600">Revisar follow-up e próxima ação.</p>
              </div>
              <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                <p className="text-sm font-bold text-green-700">Repasse parceiro previsto</p>
                <p className="mt-1 text-2xl font-black text-green-800">{formatCurrency(metrics.repasseParceiro)}</p>
                <p className="text-xs text-green-600">Estimativa conforme valor de carta informado.</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {(activeView === "geral" || activeView === "consultores") && (
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900">Produção por consultor</h2>
              <p className="text-sm text-gray-500">Leads, propostas, fechamento, cartas e comissão</p>
            </div>
            <Users className="h-5 w-5 text-[#b8995a]" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Consultor</th>
                  <th className="px-4 py-3 text-center">Leads</th>
                  <th className="px-4 py-3 text-center">Propostas</th>
                  <th className="px-4 py-3 text-center">Fechados</th>
                  <th className="px-4 py-3 text-center">Conversão</th>
                  <th className="px-4 py-3 text-right">Cartas</th>
                  <th className="px-4 py-3 text-right">Comissão EPSA</th>
                  <th className="px-4 py-3 text-center">Parados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productionByConsultant.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0a1a15] text-xs font-black text-[#b8995a]">
                          {getInitials(item.name)}
                        </div>
                        <p className="font-bold text-gray-900">{item.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold">{item.leads}</td>
                    <td className="px-4 py-3 text-center">{item.proposals}</td>
                    <td className="px-4 py-3 text-center font-bold text-green-700">{item.closed}</td>
                    <td className="px-4 py-3 text-center">{item.conversion.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.valorCartas)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.comissao)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${item.stalled > 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                        {item.stalled}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeView === "origens" && (
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900">Produção por origem</h2>
              <p className="text-sm text-gray-500">Qualidade dos canais, parceiros e captação interna</p>
            </div>
            <Building2 className="h-5 w-5 text-[#b8995a]" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {productionByOrigin.map((item) => (
              <div key={item.origin} className="rounded-2xl border border-gray-100 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-black text-gray-900">{item.origin}</p>
                  <span className="rounded-full bg-gray-50 px-2 py-1 text-xs font-bold text-gray-600">{item.leads} leads</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Propostas</span><strong>{item.proposals}</strong></div>
                  <div className="flex justify-between"><span className="text-gray-500">Fechados</span><strong className="text-green-700">{item.closed}</strong></div>
                  <div className="flex justify-between"><span className="text-gray-500">Conversão</span><strong>{item.conversion.toFixed(1)}%</strong></div>
                  <div className="flex justify-between"><span className="text-gray-500">Cartas</span><strong>{formatCurrency(item.valorCartas)}</strong></div>
                  <div className="flex justify-between"><span className="text-gray-500">Repasse</span><strong>{formatCurrency(item.repasse)}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeView === "financeiro" && (
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900">Financeiro EPSA</h2>
              <p className="text-sm text-gray-500">
                Distribuição por origem: parceiro, tráfego/CAC, atores internos e EPSA
              </p>
            </div>
            <DollarSign className="h-5 w-5 text-[#b8995a]" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-[#0a1a15] p-5 text-white">
              <p className="text-sm text-gray-300">EPSA líquido previsto</p>
              <p className="mt-2 text-lg sm:text-xl lg:text-2xl font-black leading-snug break-words">
                {formatCurrency(financialMetrics.epsaPrevisto)}
              </p>
            </div>

            <div className="rounded-2xl bg-[#b8995a] p-5 text-white">
              <p className="text-sm text-white/80">Parceiro previsto</p>
              <p className="mt-2 text-lg sm:text-xl lg:text-2xl font-black leading-snug break-words">
                {formatCurrency(financialMetrics.parceiroPrevisto)}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
              <p className="text-sm text-amber-700">Reserva tráfego/CAC</p>
              <p className="mt-2 text-lg sm:text-xl lg:text-2xl font-black leading-snug break-words text-amber-900">
                {formatCurrency(financialMetrics.trafegoReservado)}
              </p>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5">
              <p className="text-sm text-purple-700">Atores internos</p>
              <p className="mt-2 text-lg sm:text-xl lg:text-2xl font-black leading-snug break-words text-purple-900">
                {formatCurrency(financialMetrics.atoresInternosPrevisto)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-800">EPSA já recebido</p>
              <p className="mt-1 text-xl font-black text-gray-900">
                {formatCurrency(financialMetrics.epsaRecebido)}
              </p>
              <p className="mt-1 text-xs text-gray-500">Splits marcados como recebidos/liberados/pagos.</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-800">Total pago</p>
              <p className="mt-1 text-xl font-black text-gray-900">
                {formatCurrency(financialMetrics.totalPago)}
              </p>
              <p className="mt-1 text-xs text-gray-500">Valores já baixados como pagos.</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-800">Fechamento imobiliário</p>
              <p className="mt-1 text-xl font-black text-gray-900">
                {formatCurrency(financialMetrics.imovelTotal)}
              </p>
              <p className="mt-1 text-xs text-gray-500">30% para parceiro ou CAC, conforme origem.</p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Destino</th>
                  <th className="px-4 py-3">Evento</th>
                  <th className="px-4 py-3 text-right">Base</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {financialMetrics.visibleSplits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                      Nenhum split financeiro encontrado para os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  financialMetrics.visibleSplits.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{item.description}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {SOURCE_TYPE_OPTIONS.find((source) => source.value === item.source_type)?.label || item.source_type}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">
                          {item.actor_type === "partner" && "Parceiro"}
                          {item.actor_type === "traffic_reserve" && "Tráfego/CAC"}
                          {item.actor_type === "sdr" && "SDR"}
                          {item.actor_type === "closer" && "Closer"}
                          {item.actor_type === "manager" && "Gestor"}
                          {item.actor_type === "epsa_house" && "EPSA"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {item.event_type === "parcela_consorcio" ? `${item.event_number}ª parcela` : "Fechamento imóvel"}
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.base_amount)}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#b8995a]">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            updateFinancialSplitStatus(item, e.target.value as FinancialSplit["status"])
                          }
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold"
                        >
                          <option value="previsto">Previsto</option>
                          <option value="recebido_pela_epsa">Recebido pela EPSA</option>
                          <option value="liberado_para_pagamento">Liberado para pagamento</option>
                          <option value="pago">Pago</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            Regra configurada: lead de parceiro gera split para parceiro. Lead de tráfego pago separa o mesmo percentual como reserva de tráfego/CAC. SDR, closer e gestor já estão estruturados, mas só entram no split quando seus percentuais forem ativados em commission_rules.
          </p>
        </section>
      )}

      <section className={`rounded-2xl border border-gray-100 bg-white shadow-sm ${activeView !== "leads" && activeView !== "geral" ? "hidden" : ""}`}>
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-lg font-black text-gray-900">Base operacional de leads</h2>
            <p className="text-sm text-gray-500">Atendimento, distribuição, financeiro e próxima ação</p>
          </div>
          <ClipboardList className="h-5 w-5 text-[#b8995a]" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#b8995a] border-t-transparent" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="mx-auto mb-3 h-12 w-12 text-gray-200" />
            <p className="text-sm font-medium text-gray-600">Nenhum lead encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredLeads.map((lead) => {
              const stalledDays = daysAgo(lead.ultimo_contato_em || lead.updated_at || lead.data_criacao);

              return (
                <div key={`${lead.tabela_fonte}-${lead.id}`} className="p-4 transition-colors hover:bg-gray-50">
                  <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr_0.9fr_1fr_0.9fr]">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-black text-gray-900">{lead.nome}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${lead.tabela_fonte === "pistas" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                          {lead.origem}
                        </span>
                        <span className={getStatusBadge(lead.etapa_funil)}>{lead.etapa_funil}</span>
                      </div>

                      <div className="space-y-1 text-xs text-gray-500">
                        <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {lead.telefone || "Sem telefone"}</p>
                        {lead.email && <p>{lead.email}</p>}
                        <p>Recebido em {formatDateTime(lead.data_criacao)}</p>
                      </div>

                      {lead.observacoes && (
                        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{lead.observacoes}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Distribuição</p>

                      {isAdmin ? (
                        <select value={lead.gestor_id || ""} onChange={(e) => handleAssignGestor(lead, e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold focus:border-[#b8995a] focus:outline-none">
                          <option value="">+ Vincular gestor</option>
                          {gestores.map((g) => <option key={g.id} value={g.id}>{g.full_name}</option>)}
                        </select>
                      ) : (
                        <p className="rounded-lg bg-gray-50 px-2 py-2 text-xs font-semibold text-gray-600">
                          {gestores.find((g) => g.id === lead.gestor_id)?.full_name || "Sem gestor"}
                        </p>
                      )}

                      <select value={lead.sdr_id || ""} onChange={(e) => handleAssignSDR(lead, e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold focus:border-[#b8995a] focus:outline-none">
                        <option value="">+ Designar SDR</option>
                        {consultores.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                      </select>

                      <select value={lead.closer_id || lead.vendedor_id || ""} onChange={(e) => handleAssignConsultor(lead, e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold focus:border-[#b8995a] focus:outline-none">
                        <option value="">+ Designar closer</option>
                        {consultores.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Status e temperatura</p>
                      <select value={lead.etapa_funil || "Novo"} onChange={(e) => handleUpdateStatus(lead, e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold focus:border-[#b8995a] focus:outline-none">
                        {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>

                      <select value={lead.temperatura || "Morno"} onChange={(e) => handleUpdateTemperature(lead, e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold focus:border-[#b8995a] focus:outline-none">
                        {TEMPERATURE_OPTIONS.map((temp) => <option key={temp} value={temp}>{temp}</option>)}
                      </select>

                      <select value={lead.lead_source_type || ""} onChange={(e) => handleUpdateSourceType(lead, e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold focus:border-[#b8995a] focus:outline-none">
                        <option value="">Origem financeira</option>
                        {SOURCE_TYPE_OPTIONS.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
                      </select>

                      {stalledDays !== null && stalledDays >= 3 && !["Fechado", "Perdido"].includes(lead.etapa_funil) && (
                        <p className="rounded-lg bg-red-50 px-2 py-1.5 text-[11px] font-bold text-red-700">Parado há {stalledDays} dias</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Financeiro</p>
                          <p className="text-xs text-gray-500">Carta e comissões</p>
                        </div>
                        <button onClick={() => startFinancialEdit(lead)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-[#b8995a]">
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>

                      {editingFinId === lead.id ? (
                        <div className="space-y-2">
                          <input type="number" value={finValorCarta} onChange={(e) => setFinValorCarta(Number(e.target.value))} className="w-full rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none" />
                          <select value={finStatusPagamento} onChange={(e) => setFinStatusPagamento(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none">
                            <option value="Pendente">Pendente</option>
                            <option value="Liberado">Liberado</option>
                            <option value="Pago">Pago</option>
                          </select>
                          <div className="flex gap-2">
                            <button onClick={() => saveFinancial(lead)} disabled={savingFin} className="flex-1 rounded-lg bg-[#0a1a15] px-2 py-2 text-xs font-bold text-white">Salvar</button>
                            <button onClick={() => setEditingFinId(null)} className="rounded-lg bg-gray-200 px-2 py-2 text-xs font-bold text-gray-600"><X className="h-3 w-3" /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between"><span className="text-gray-500">Carta</span><strong>{formatCurrency(lead.valor_carta)}</strong></div>
                          <div className="flex justify-between"><span className="text-gray-500">EPSA</span><strong>{formatCurrency(lead.comissao_epsa || Number(lead.valor_carta || 0) * 0.035)}</strong></div>
                          <div className="flex justify-between"><span className="text-gray-500">Parceiro</span><strong>{formatCurrency(lead.comissao_parceiro)}</strong></div>
                          <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">{lead.status_pagamento || "Pendente"}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Próxima ação</p>
                          <button
                            onClick={() => {
                              setEditingActionId(lead.id);
                              setActionText(lead.proxima_acao || "");
                              setActionDate(lead.proxima_acao_em ? lead.proxima_acao_em.slice(0, 16) : "");
                            }}
                            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-[#b8995a]"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {editingActionId === lead.id ? (
                          <div className="space-y-2">
                            <input value={actionText} onChange={(e) => setActionText(e.target.value)} placeholder="Ex.: Enviar follow-up" className="w-full rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none" />
                            <input type="datetime-local" value={actionDate} onChange={(e) => setActionDate(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none" />
                            <div className="flex gap-2">
                              <button onClick={() => saveNextAction(lead)} className="flex-1 rounded-lg bg-[#0a1a15] px-2 py-2 text-xs font-bold text-white">Salvar</button>
                              <button onClick={() => setEditingActionId(null)} className="rounded-lg bg-gray-200 px-2 py-2 text-xs font-bold text-gray-600">X</button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-gray-100 bg-white p-3">
                            <p className="text-xs font-semibold text-gray-700">{lead.proxima_acao || "Sem próxima ação"}</p>
                            <p className="mt-1 text-[11px] text-gray-500">{formatDateTime(lead.proxima_acao_em)}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => openWhatsApp(lead.telefone)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-xs font-black text-white shadow-sm">
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </button>
                        <button className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-600">
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
