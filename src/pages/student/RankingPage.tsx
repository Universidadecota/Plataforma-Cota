import { useEffect, useState } from "react";
import { Trophy, Star, Crown, Medal } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { ROLE_LABELS } from "@/constants";
import { toast } from "sonner";
import type { UserProfile } from "@/types";

export default function RankingPage() {
  const { user } = useAuthStore();
  const [ranking, setRanking] = useState<UserProfile[]>([]);
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
          "user_profiles", 
          "GET", 
          undefined, 
          "select=*&order=points.desc&limit=50"
        );
        setRanking(data || []);
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar o ranking de desempenho.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const myPosition = ranking.findIndex((u) => u.id === user?.id) + 1;

  const podiumColors = [
    "bg-gradient-to-b from-yellow-400 to-yellow-500 text-white",
    "bg-gradient-to-b from-gray-400 to-gray-500 text-white",
    "bg-gradient-to-b from-amber-600 to-amber-700 text-white",
  ];

  const positionIcon = (pos: number) => {
    if (pos === 1) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (pos === 2) return <Medal className="w-4 h-4 text-gray-400" />;
    if (pos === 3) return <Medal className="w-4 h-4 text-amber-600" />;
    return <span className="text-sm font-bold text-gray-500">#{pos}</span>;
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <div>
      <h1 className="page-header">Ranking de Desempenho</h1>
      <p className="page-subtitle">Acompanhe sua posição e inspire-se nos líderes da plataforma</p>

      {/* My position */}
      {myPosition > 0 && (
        <div className="bg-cota-green text-white rounded-xl p-4 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-cota-gold" />
          </div>
          <div>
            <p className="text-white/80 text-sm">Sua posição no ranking</p>
            <p className="font-black text-2xl text-cota-gold">#{myPosition}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-white/60 text-xs">Seus pontos</p>
            <p className="font-bold text-lg flex items-center gap-1 justify-end">
              <Star className="w-4 h-4 text-cota-gold fill-cota-gold" />
              {user?.points || 0}
            </p>
          </div>
        </div>
      )}

      {/* Podium */}
      {top3.length >= 3 && (
        <div className="flex items-end justify-center gap-3 mb-8">
          {/* 2nd */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-lg mb-2">
              {(top3[1]?.full_name || top3[1]?.username || "?").charAt(0).toUpperCase()}
            </div>
            <p className="text-xs font-semibold text-gray-700 mb-2 max-w-[80px] truncate text-center">
              {top3[1]?.full_name?.split(" ")[0] || top3[1]?.username}
            </p>
            <div className={`w-20 h-20 ${podiumColors[1]} rounded-t-xl flex items-center justify-center flex-col`}>
              <Medal className="w-5 h-5 mb-1" />
              <p className="font-black text-xl">2º</p>
            </div>
          </div>
          {/* 1st */}
          <div className="flex flex-col items-center">
            <Crown className="w-6 h-6 text-yellow-500 mb-1" />
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold text-xl mb-2">
              {(top3[0]?.full_name || top3[0]?.username || "?").charAt(0).toUpperCase()}
            </div>
            <p className="text-xs font-semibold text-gray-700 mb-2 max-w-[80px] truncate text-center">
              {top3[0]?.full_name?.split(" ")[0] || top3[0]?.username}
            </p>
            <div className={`w-20 h-28 ${podiumColors[0]} rounded-t-xl flex items-center justify-center flex-col`}>
              <Crown className="w-5 h-5 mb-1" />
              <p className="font-black text-2xl">1º</p>
            </div>
          </div>
          {/* 3rd */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-700 font-bold text-lg mb-2">
              {(top3[2]?.full_name || top3[2]?.username || "?").charAt(0).toUpperCase()}
            </div>
            <p className="text-xs font-semibold text-gray-700 mb-2 max-w-[80px] truncate text-center">
              {top3[2]?.full_name?.split(" ")[0] || top3[2]?.username}
            </p>
            <div className={`w-20 h-14 ${podiumColors[2]} rounded-t-xl flex items-center justify-center flex-col`}>
              <Medal className="w-5 h-5 mb-1" />
              <p className="font-black text-xl">3º</p>
            </div>
          </div>
        </div>
      )}

      {/* Full ranking table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Classificação Geral</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {ranking.map((profile, idx) => {
            const pos = idx + 1;
            const isMe = profile.id === user?.id;
            return (
              <div key={profile.id}
                className={`flex items-center gap-4 px-5 py-3.5 ${isMe ? "bg-cota-green/5 border-l-4 border-cota-green" : "hover:bg-gray-50"} transition-colors`}>
                <div className="w-7 flex items-center justify-center flex-shrink-0">
                  {positionIcon(pos)}
                </div>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${isMe ? "bg-cota-green text-white" : "bg-gray-100 text-gray-600"}`}>
                  {(profile.full_name || profile.username || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${isMe ? "text-cota-green" : "text-gray-800"}`}>
                    {profile.full_name || profile.username}
                    {isMe && <span className="ml-2 text-xs text-cota-green font-normal">(você)</span>}
                  </p>
                  <p className="text-xs text-gray-400">{ROLE_LABELS[profile.role]}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Star className={`w-4 h-4 ${pos <= 3 ? "text-cota-gold fill-cota-gold" : "text-gray-300"}`} />
                  <span className={`font-bold text-sm ${isMe ? "text-cota-green" : "text-gray-700"}`}>
                    {profile.points} pts
                  </span>
                </div>
              </div>
            );
          })}

          {ranking.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <Trophy className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              <p>Nenhum usuário no ranking ainda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}