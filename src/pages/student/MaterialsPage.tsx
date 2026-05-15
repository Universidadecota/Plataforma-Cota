import { useEffect, useState } from "react";
import { Download, FileText, Search, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Material } from "@/types";

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<(Material & { courses?: { title: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("materials")
          .select("*, courses(title)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setMaterials(data || []);
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar os materiais de apoio.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = materials.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    (m.courses?.title || "").toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, mat) => {
    const key = mat.courses?.title || "Geral";
    if (!acc[key]) acc[key] = [];
    acc[key].push(mat);
    return acc;
  }, {});

  const typeIcon: Record<string, string> = {
    pdf: "📄", doc: "📝", xls: "📊", ppt: "📋", mp4: "🎬", default: "📎",
  };

  return (
    <div>
      <h1 className="page-header">Materiais de Apoio</h1>
      <p className="page-subtitle">Faça o download de materiais, apresentações e documentos das trilhas</p>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar materiais..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum material disponível</p>
          <p className="text-sm text-gray-400">Os materiais são disponibilizados pelos instrutores nas aulas.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([courseName, mats]) => (
            <div key={courseName} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cota-green" />
                <h2 className="font-semibold text-gray-700 text-sm">{courseName}</h2>
                <span className="ml-auto text-xs text-gray-400">{mats.length} arquivo(s)</span>
              </div>
              <div className="divide-y divide-gray-50">
                {mats.map((mat) => {
                  const ext = mat.file_url?.split(".").pop()?.toLowerCase() || "default";
                  return (
                    <a key={mat.id} href={mat.file_url || "#"} target="_blank" rel="noreferrer"
                      className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-cota-green/5 flex items-center justify-center text-xl flex-shrink-0">
                        {typeIcon[ext] || typeIcon.default}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-700 group-hover:text-cota-green text-sm transition-colors">{mat.title}</p>
                        {mat.file_size && <p className="text-xs text-gray-400">{mat.file_size}</p>}
                      </div>
                      <button className="flex items-center gap-1.5 text-xs text-cota-green font-semibold opacity-0 group-hover:opacity-100 transition-all bg-cota-green/10 px-3 py-1.5 rounded-lg">
                        <Download className="w-3.5 h-3.5" /> Baixar
                      </button>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}