import { useEffect, useState } from "react";
import { Award, Download, Calendar, Hash, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { Certificate, Course } from "@/types";

interface CertWithCourse extends Certificate {
  courses: Course;
}

export default function CertificatesPage() {
  const { user } = useAuthStore();
  const [certificates, setCertificates] = useState<CertWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState<string | null>(null);

  // =====================================================================
  // O MOTOR CENTRAL "MODO DEUS": Lê e Envia TUDO nativamente (Sem Cache)
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
    async function load() {
      try {
        setLoading(true);
        const data = await directApiCall(
          'certificates', 
          'GET', 
          undefined, 
          `student_id=eq.${user!.id}&select=*,courses(*)&order=issued_at.desc`
        );
          
        setCertificates((data as CertWithCourse[]) || []);
      } catch (error) {
        console.error("Erro ao carregar certificados:", error);
        toast.error("Ocorreu um erro ao carregar os teus certificados.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handlePrint = (cert: CertWithCourse) => {
    setPrinting(cert.id);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Certificado - ${cert.courses.title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Georgia', serif; background: #fff; }
          .certificate { width: 297mm; height: 210mm; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px; border: 20px solid #1B3A2D; box-shadow: inset 0 0 0 4px #C9A84C; }
          .logo { font-size: 14px; color: #1B3A2D; font-weight: bold; letter-spacing: 6px; margin-bottom: 8px; }
          .brand { font-size: 48px; color: #1B3A2D; font-weight: 900; letter-spacing: 12px; margin-bottom: 30px; }
          .certifies { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 16px; }
          .name { font-size: 36px; color: #1B3A2D; font-weight: bold; border-bottom: 2px solid #C9A84C; padding-bottom: 8px; margin-bottom: 16px; }
          .completed { font-size: 14px; color: #666; margin-bottom: 8px; }
          .course { font-size: 24px; color: #1B3A2D; font-weight: bold; margin-bottom: 30px; }
          .footer { display: flex; justify-content: space-between; width: 100%; margin-top: 40px; font-size: 11px; color: #999; }
          .gold { color: #C9A84C; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="logo">UNIVERSIDADE</div>
          <div class="brand">C.O.T.A.</div>
          <div class="certifies">Certifica que</div>
          <div class="name">${user?.full_name || user?.username}</div>
          <div class="completed">concluiu com êxito a trilha de formação</div>
          <div class="course">${cert.courses.title}</div>
          <div class="footer">
            <span>Emitido em: ${formatDate(cert.issued_at)}</span>
            <span class="gold">Universidade C.O.T.A. · Formação em Consórcio</span>
            <span>Nº ${cert.certificate_number}</span>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
    setPrinting(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <h1 className="page-header">Meus Certificados</h1>
      <p className="page-subtitle">Certificados conquistados ao concluir as trilhas de formação</p>

      {certificates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Award className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium text-lg">Nenhum certificado ainda</p>
          <p className="text-sm text-gray-400 mb-6">
            Conclua uma trilha de formação para conquistar seu primeiro certificado.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {certificates.map((cert) => (
            <div key={cert.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-gradient-to-br from-cota-green-dark to-cota-green p-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute top-2 left-2 w-24 h-24 rounded-full border-4 border-white" />
                  <div className="absolute bottom-2 right-2 w-16 h-16 rounded-full border-4 border-cota-gold" />
                </div>
                <p className="text-white/60 text-xs font-medium tracking-widest uppercase relative z-10">
                  Universidade
                </p>
                <p className="text-cota-gold font-black text-3xl tracking-widest relative z-10">C.O.T.A.</p>
                <div className="w-16 h-px bg-cota-gold/40 mx-auto my-3 relative z-10" />
                <Award className="w-10 h-10 text-cota-gold mx-auto relative z-10" />
              </div>

              <div className="p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Certificado de Conclusão</p>
                <h3 className="font-bold text-gray-800 text-sm mb-3 leading-tight">{cert.courses.title}</h3>

                <div className="space-y-1.5 text-xs text-gray-500 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Emitido em {formatDate(cert.issued_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5" />
                    <span className="font-mono text-xs">{cert.certificate_number}</span>
                  </div>
                </div>

                <button
                  onClick={() => handlePrint(cert)}
                  disabled={printing === cert.id}
                  className="w-full flex items-center justify-center gap-2 bg-cota-gold/10 hover:bg-cota-gold/20 text-cota-gold-dark border border-cota-gold/30 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  {printing === cert.id
                    ? <div className="w-4 h-4 border-2 border-cota-gold border-t-transparent rounded-full animate-spin" />
                    : <><Download className="w-4 h-4" /> Baixar / Imprimir</>
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}