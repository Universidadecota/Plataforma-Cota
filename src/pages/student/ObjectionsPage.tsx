import { useEffect, useState } from "react";
import { Search, ChevronDown, ChevronUp, Lightbulb, ShieldCheck, Filter } from "lucide-react";
import { toast } from "sonner";
import type { Objection } from "@/types";

export default function ObjectionsPage() {
  const [objections, setObjections] = useState<Objection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

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
          "objections", 
          "GET", 
          undefined, 
          "select=*&order=created_at.desc"
        );
        setObjections(data || []);
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar o banco de objeções.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = [...new Set(objections.map((o) => o.category).filter(Boolean))];

  const filtered = objections.filter((o) => {
    const matchSearch =
      o.objection.toLowerCase().includes(search.toLowerCase()) ||
      o.response.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || o.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const categoryColors: Record<string, string> = {
    Financeiro: "bg-red-100 text-red-700",
    Comparação: "bg-blue-100 text-blue-700",
    Funcionamento: "bg-purple-100 text-purple-700",
    "Experiência negativa": "bg-amber-100 text-amber-700",
    Procrastinação: "bg-orange-100 text-orange-700",
    Custo: "bg-rose-100 text-rose-700",
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-red-500" />
        </div>
        <h1 className="page-header mb-0">Banco de Objeções</h1>
      </div>
      <p className="page-subtitle ml-12">Respostas estratégicas para as principais objeções do mercado de consórcio</p>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar objeções..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 text-gray-700 bg-white"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat!}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <ShieldCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma objeção encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((obj) => (
            <div key={obj.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === obj.id ? null : obj.id)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-500 text-sm">❝</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm leading-tight">{obj.objection}</p>
                    {obj.category && (
                      <span className={`inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[obj.category] || "bg-gray-100 text-gray-600"}`}>
                        {obj.category}
                      </span>
                    )}
                  </div>
                </div>
                {expanded === obj.id ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
              </button>

              {expanded === obj.id && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-cota-green uppercase tracking-wide mb-2">✦ Resposta Recomendada</p>
                    <div className="bg-cota-green/5 border border-cota-green/20 rounded-lg p-4">
                      <p className="text-sm text-gray-700 leading-relaxed italic">"{obj.response}"</p>
                    </div>
                  </div>
                  {obj.tips && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-3.5 h-3.5 text-cota-gold" />
                        <p className="text-xs font-bold text-cota-gold-dark uppercase tracking-wide">Dica do Instrutor</p>
                      </div>
                      <div className="bg-cota-gold/5 border border-cota-gold/20 rounded-lg p-4">
                        <p className="text-sm text-gray-700 leading-relaxed">{obj.tips}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}