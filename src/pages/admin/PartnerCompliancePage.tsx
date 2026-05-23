import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  ShieldCheck,
  FileText,
  CheckCircle2,
  UserCheck,
  Monitor,
  CalendarClock,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";

type UserProfile = {
  id: string;
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
  phone?: string | null;
  role?: string | null;
  bio?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  terms_accepted_at?: string | null;
  privacy_accepted_at?: string | null;
  lgpd_partner_declaration_at?: string | null;
  partner_source_responsibility?: boolean | null;
  partner_terms_version?: string | null;
  partner_approved_by?: string | null;
  partner_approved_at?: string | null;
};

type AcceptanceLog = {
  id: string;
  partner_id: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  company_type?: string | null;
  terms_version?: string | null;
  privacy_version?: string | null;
  terms_accepted_at?: string | null;
  privacy_accepted_at?: string | null;
  lgpd_declaration_at?: string | null;
  partner_source_responsibility?: boolean | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: string | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return "Não registrado";

  try {
    return new Date(value).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return value;
  }
}

function formatStatus(value?: string | null) {
  switch (value) {
    case "partner":
      return "Parceiro aprovado";
    case "pending_partner":
      return "Aguardando aprovação";
    case "student":
      return "Aluno";
    case "admin":
      return "Administrador";
    case "manager":
      return "Gestor";
    case "consultant":
      return "Consultor";
    default:
      return value || "Não informado";
  }
}

function InfoRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value?: string | number | boolean | null;
  strong?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[210px_1fr] gap-1 sm:gap-4 py-3 border-b border-gray-100 last:border-b-0">
      <dt className="text-[10px] font-black uppercase tracking-[0.13em] text-gray-500">
        {label}
      </dt>
      <dd className={`text-sm break-words ${strong ? "font-bold text-gray-950" : "text-gray-800"}`}>
        {typeof value === "boolean" ? (value ? "Sim" : "Não") : value || "Não registrado"}
      </dd>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden print-section">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 bg-gray-50/70">
        <div className="w-8 h-8 rounded-lg bg-cota-green/10 text-cota-green flex items-center justify-center">
          {icon}
        </div>
        <h3 className="font-black text-gray-900 text-sm uppercase tracking-wide">{title}</h3>
      </div>
      <div className="px-5 py-2">
        {children}
      </div>
    </section>
  );
}

export default function PartnerCompliancePage() {
  const { id } = useParams();
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [approver, setApprover] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<AcceptanceLog[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (err) {}

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

  useEffect(() => {
    async function loadData() {
      if (!id) return;

      try {
        setLoading(true);

        const partnerData = await directApiCall(
          "user_profiles",
          "GET",
          undefined,
          `select=*&id=eq.${id}&limit=1`
        );

        const currentPartner = partnerData?.[0] || null;
        setPartner(currentPartner);

        const logData = await directApiCall(
          "partner_acceptance_logs",
          "GET",
          undefined,
          `select=*&partner_id=eq.${id}&order=created_at.desc`
        );
        setLogs(logData || []);

        if (currentPartner?.partner_approved_by) {
          const approverData = await directApiCall(
            "user_profiles",
            "GET",
            undefined,
            `select=id,email,full_name,username&id=eq.${currentPartner.partner_approved_by}&limit=1`
          );

          setApprover(approverData?.[0] || null);
        }
      } catch (error: any) {
        console.error(error);
        toast.error(error.message || "Erro ao carregar comprovante de compliance.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const latestLog = logs[0];

  const handlePrintCurrentPartner = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-[70vh] bg-gray-50 p-8">
        <Link to="/admin" className="text-cota-green font-bold">
          Voltar
        </Link>
        <p className="mt-6 text-gray-600">Parceiro não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-gray-800 compliance-page">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          html,
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          .compliance-print-root,
          .compliance-print-root * {
            visibility: visible !important;
          }

          .compliance-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .no-print {
            display: none !important;
          }

          .print-card {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
          }

          .print-section {
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .screen-only {
            display: none !important;
          }

          .print-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 16px !important;
          }

          .print-title {
            font-size: 24px !important;
            line-height: 1.15 !important;
          }

          .print-muted {
            color: #4b5563 !important;
          }
        }
      `}</style>

      <div className="no-print border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-cota-green mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao painel administrativo
            </Link>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-cota-green-dark flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-cota-gold" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-cota-green font-black">
                  Compliance do parceiro
                </p>
                <h1 className="text-xl sm:text-2xl font-black text-gray-950">
                  Comprovante individual de aceite e homologação
                </h1>
              </div>
            </div>
          </div>

          <button
            onClick={handlePrintCurrentPartner}
            className="inline-flex items-center justify-center gap-2 bg-cota-green text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-cota-green-light transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Imprimir este parceiro
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 compliance-print-root">
        <section className="print-card bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 border-b border-gray-100 pb-8 mb-8">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.35em] text-cota-green font-black mb-3">
                Comprovante institucional
              </p>
              <h2 className="print-title text-3xl lg:text-4xl font-black text-gray-950 tracking-tight leading-tight">
                Aceite de Termos, LGPD e Homologação de Parceiro
              </h2>
              <p className="print-muted text-sm text-gray-500 mt-3 leading-relaxed">
                Documento individual gerado eletronicamente pela plataforma Universidade EPSA.
                Este comprovante se refere exclusivamente ao parceiro identificado abaixo.
              </p>
            </div>

            <div className="rounded-2xl bg-cota-green-dark text-white p-5 min-w-[230px]">
              <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.18em]">
                Status atual
              </p>
              <p className="text-xl font-black text-cota-gold mt-1">
                {formatStatus(partner.role)}
              </p>
              <p className="text-[11px] text-white/50 mt-3">
                Emitido em {formatDateTime(new Date().toISOString())}
              </p>
            </div>
          </div>

          <div className="print-grid grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SectionCard icon={<FileText className="w-4 h-4" />} title="Dados do parceiro">
              <dl>
                <InfoRow label="Nome / Razão Social" value={partner.full_name || partner.username} strong />
                <InfoRow label="E-mail" value={partner.email} />
                <InfoRow label="Telefone" value={partner.phone} />
                <InfoRow label="ID do usuário" value={partner.id} />
                <InfoRow label="Tipo de atuação" value={latestLog?.company_type || partner.bio} />
                <InfoRow label="Cadastro criado em" value={formatDateTime(partner.created_at)} />
              </dl>
            </SectionCard>

            <SectionCard icon={<CheckCircle2 className="w-4 h-4" />} title="Aceites e LGPD">
              <dl>
                <InfoRow label="Versão dos termos" value={latestLog?.terms_version || partner.partner_terms_version} />
                <InfoRow label="Versão da privacidade" value={latestLog?.privacy_version || "epsa-privacy-v1"} />
                <InfoRow label="Aceite dos termos" value={formatDateTime(latestLog?.terms_accepted_at || partner.terms_accepted_at)} />
                <InfoRow label="Aceite da privacidade" value={formatDateTime(latestLog?.privacy_accepted_at || partner.privacy_accepted_at)} />
                <InfoRow label="Declaração LGPD" value={formatDateTime(latestLog?.lgpd_declaration_at || partner.lgpd_partner_declaration_at)} />
                <InfoRow label="Origem lícita dos leads" value={latestLog?.partner_source_responsibility ?? partner.partner_source_responsibility} />
              </dl>
            </SectionCard>

            <SectionCard icon={<UserCheck className="w-4 h-4" />} title="Homologação interna">
              <dl>
                <InfoRow label="Aprovado por" value={approver?.full_name || approver?.username || partner.partner_approved_by} strong />
                <InfoRow label="E-mail do aprovador" value={approver?.email} />
                <InfoRow label="Data/hora da aprovação" value={formatDateTime(partner.partner_approved_at)} />
                <InfoRow label="Status homologado" value={formatStatus(partner.role)} />
              </dl>
            </SectionCard>

            <SectionCard icon={<Monitor className="w-4 h-4" />} title="Registro técnico">
              <dl>
                <InfoRow label="Data do log de aceite" value={formatDateTime(latestLog?.created_at)} />
                <InfoRow label="IP registrado" value={latestLog?.ip_address} />
                <InfoRow label="Dispositivo / navegador" value={latestLog?.user_agent} />
                <InfoRow label="ID do log" value={latestLog?.id} />
              </dl>
            </SectionCard>
          </div>

          <div className="mt-6 rounded-2xl border border-cota-gold/20 bg-cota-gold/10 p-5 print-section">
            <div className="flex items-center gap-2 mb-3">
              <BadgeCheck className="w-5 h-5 text-cota-green" />
              <h3 className="font-black text-gray-950">Declarações aceitas eletronicamente</h3>
            </div>

            <ul className="space-y-2 text-sm text-gray-700 leading-relaxed">
              <li>1. Li e aceito os Termos de Parceria da Universidade EPSA.</li>
              <li>2. Li e aceito a Política de Privacidade da Universidade EPSA.</li>
              <li>3. Declaro que somente enviarei leads obtidos de forma lícita, com ciência do titular, e que não cadastrarei dados comprados, extraídos ou compartilhados sem autorização.</li>
            </ul>
          </div>

          {logs.length > 1 && (
            <div className="mt-6 rounded-2xl border border-gray-100 bg-white overflow-hidden no-print">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50/70">
                <CalendarClock className="w-5 h-5 text-cota-green" />
                <h3 className="font-black text-gray-900">Histórico de aceites deste parceiro</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Data</th>
                      <th className="px-4 py-3 text-left">Termos</th>
                      <th className="px-4 py-3 text-left">Privacidade</th>
                      <th className="px-4 py-3 text-left">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-4 py-3">{formatDateTime(log.created_at)}</td>
                        <td className="px-4 py-3">{log.terms_version}</td>
                        <td className="px-4 py-3">{log.privacy_version}</td>
                        <td className="px-4 py-3">{log.ip_address || "Não registrado"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 leading-6 mt-8 border-t border-gray-100 pt-6">
            Este comprovante reflete os registros eletrônicos disponíveis na plataforma no momento da emissão.
            Recomenda-se manter os registros históricos de aceite, versão dos termos e logs técnicos para fins de auditoria,
            governança e conformidade.
          </p>
        </section>
      </main>
    </div>
  );
}
