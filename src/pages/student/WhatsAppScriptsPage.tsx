import { useEffect, useState } from "react";
import { Copy, Check, Search, MessageCircle, Filter } from "lucide-react";
import { toast } from "sonner";
import type { WhatsAppScript } from "@/types";

export default function WhatsAppScriptsPage() {
  const [scripts, setScripts] = useState<WhatsAppScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [copied, setCopied] = useState<string | null>(null);

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
          "whatsapp_scripts", 
          "GET", 
          undefined, 
          "select=*&order=created_at.desc"
        );
        setScripts(data || []);
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar scripts de WhatsApp.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCopy = async (script: WhatsAppScript) => {
    await navigator.clipboard.writeText(script.content);
    setCopied(script.id);
    toast.success("Script copiado para a área de transferência!");
    setTimeout(() => setCopied(null), 2000);
  };

  const categories = [...new Set(scripts.map((s) => s.category).filter(Boolean))];

  const filtered = scripts.filter((s) => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.content.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || s.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const categoryColors: Record<string, string> = {
    Captação: "bg-blue-100 text-blue-700",
    "Follow-up": "bg-purple-100 text-purple-700",
    Reativação: "bg-amber-100 text-amber-700",
    Proposta: "bg-green-100 text-green-700",
    "Pós-venda": "bg-teal-100 text-teal-700",
    Relacionamento: "bg-pink-100 text-pink-700",
    Indicação: "bg-indigo-100 text-indigo-700",
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h1 className="page-header mb-0">Banco de Scripts</h1>
        </div>
      </div>
      <p className="page-subtitle ml-12">Scripts prontos para WhatsApp Business — copie, personalize e converta</p>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar scripts..."
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
          <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum script encontrado</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((script) => (
            <div key={script.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">{script.title}</h3>
                  {script.category && (
                    <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${categoryColors[script.category] || "bg-gray-100 text-gray-600"}`}>
                      {script.category}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleCopy(script)}
                  className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    copied === script.id
                      ? "bg-green-100 text-green-700"
                      : "bg-cota-green/10 text-cota-green hover:bg-cota-green hover:text-white"
                  }`}
                >
                  {copied === script.id ? <><Check className="w-3 h-3" /> Copiado!</> : <><Copy className="w-3 h-3" /> Copiar</>}
                </button>
              </div>

              <div className="flex-1 bg-gray-50 rounded-lg p-4 text-sm text-gray-600 leading-relaxed border border-gray-100 font-mono">
                {script.content}
              </div>

              {script.tags && script.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {script.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}