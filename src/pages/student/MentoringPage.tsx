import { useEffect, useState } from "react";
import { Calendar, Clock, ExternalLink, Users, Video } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import type { MentoringSession } from "@/types";

export default function MentoringPage() {
  const [sessions, setSessions] = useState<MentoringSession[]>([]);
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
          "mentoring_sessions", 
          "GET", 
          undefined, 
          "is_published=eq.true&select=*&order=scheduled_at.asc"
        );
        setSessions(data || []);
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar as sessões de mentoria.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const isPast = (date: string | null) => date ? new Date(date) < new Date() : false;
  const upcoming = sessions.filter((s) => !isPast(s.scheduled_at));
  const past = sessions.filter((s) => isPast(s.scheduled_at));

  const SessionCard = ({ session }: { session: MentoringSession }) => {
    const past = isPast(session.scheduled_at);
    return (
      <div className={`bg-white rounded-xl border shadow-sm p-5 ${past ? "opacity-70 border-gray-100" : "border-gray-100 hover:shadow-md"} transition-shadow`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${past ? "bg-gray-100" : "bg-cota-green/10"}`}>
            <Video className={`w-6 h-6 ${past ? "text-gray-400" : "text-cota-green"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-gray-800 text-sm leading-tight">{session.title}</h3>
              {past ? (
                <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">Encerrada</span>
              ) : (
                <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">Em breve</span>
              )}
            </div>

            {session.description && (
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{session.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-400">
              {session.scheduled_at && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDateTime(session.scheduled_at)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {session.duration_minutes} minutos
              </span>
            </div>

            {!past && session.meeting_url && (
              <a href={session.meeting_url} target="_blank" rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 bg-cota-green hover:bg-cota-green-light text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> Acessar Sessão
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-lg bg-cota-green/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-cota-green" />
        </div>
        <h1 className="page-header mb-0">Mentorias</h1>
      </div>
      <p className="page-subtitle ml-12">Sessões ao vivo com instrutores especializados em consórcio</p>

      {sessions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma mentoria agendada</p>
          <p className="text-sm text-gray-400">As próximas sessões serão anunciadas em breve.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="font-bold text-gray-800 mb-4">Próximas Sessões</h2>
              <div className="space-y-3">
                {upcoming.map((s) => <SessionCard key={s.id} session={s} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-500 mb-4">Sessões Anteriores</h2>
              <div className="space-y-3">
                {past.map((s) => <SessionCard key={s.id} session={s} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}