import { useEffect, useState } from "react";
import { Calendar, Clock, ExternalLink, Users, Video } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import type { MentoringSession } from "@/types";

export default function MentoringPage() {
  const [sessions, setSessions] = useState<MentoringSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("mentoring_sessions")
          .select("*")
          .eq("is_published", true)
          .order("scheduled_at", { ascending: true });
        if (error) throw error;
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