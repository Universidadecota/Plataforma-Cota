import { useEffect, useState } from "react";
import { Bell, AlertCircle, Info, AlertTriangle, Megaphone } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { PRIORITY_LABELS } from "@/constants";
import { toast } from "sonner";
import type { Announcement } from "@/types";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

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
          'announcements', 
          'GET', 
          undefined, 
          'is_published=eq.true&select=*&order=created_at.desc'
        );
        setAnnouncements(data || []);
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar comunicados.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const priorityConfig: Record<string, { color: string; bg: string; border: string; icon: React.ElementType }> = {
    urgent: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200", icon: AlertCircle },
    high: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: AlertTriangle },
    normal: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", icon: Info },
    low: { color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200", icon: Bell },
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <h1 className="page-header">Comunicados</h1>
      <p className="page-subtitle">Avisos, novidades e informações importantes da plataforma</p>

      {announcements.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Megaphone className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum comunicado no momento</p>
          <p className="text-sm text-gray-400">As novidades serão publicadas aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => {
            const config = priorityConfig[ann.priority] || priorityConfig.normal;
            const Icon = config.icon;
            return (
              <div key={ann.id}
                className={`rounded-xl border p-5 ${config.bg} ${config.border}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${ann.priority === "urgent" ? "bg-red-100" : ann.priority === "high" ? "bg-amber-100" : ann.priority === "normal" ? "bg-blue-100" : "bg-gray-100"}`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className={`font-bold text-base ${config.color}`}>{ann.title}</h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
                          {PRIORITY_LABELS[ann.priority]}
                        </span>
                      </div>
                    </div>
                    <p className={`text-sm leading-relaxed ${config.color} opacity-80`}>{ann.content}</p>
                    <p className="text-xs text-gray-400 mt-3">{formatDateTime(ann.created_at)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}