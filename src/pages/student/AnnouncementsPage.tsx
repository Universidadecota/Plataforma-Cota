import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  AlertCircle,
  Info,
  AlertTriangle,
  Megaphone,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { PRIORITY_LABELS } from "@/constants";
import { toast } from "sonner";
import type { Announcement } from "@/types";

function normalizeMarkdown(text: string) {
  return (text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripMarkdownPrefix(text: string) {
  return text
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[-*+]\s*/, "")
    .replace(/^\d+\.\s*/, "")
    .trim();
}

function getAnnouncementPreview(content: string, maxLength = 150) {
  const normalized = normalizeMarkdown(content)
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[-*+]\s*/gm, "")
    .replace(/^\d+\.\s*/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
}

function renderAnnouncementContent(content: string, announcementTitle?: string) {
  const normalized = normalizeMarkdown(content);
  if (!normalized) return null;

  let blocks = normalized
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (announcementTitle && blocks.length > 0) {
    const firstBlockClean = stripMarkdownPrefix(blocks[0]).toLowerCase();
    const titleClean = announcementTitle.trim().toLowerCase();

    if (firstBlockClean === titleClean) {
      blocks = blocks.slice(1);
    }
  }

  return blocks.map((block, index) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return null;

    const singleLine = lines.join(" ");

    if (/^#\s+/.test(block)) {
      return (
        <h4
          key={index}
          className="text-lg md:text-xl font-bold text-gray-900 mt-1 mb-3"
        >
          {block.replace(/^#\s+/, "")}
        </h4>
      );
    }

    if (/^##\s+/.test(block)) {
      return (
        <h5
          key={index}
          className="text-base md:text-lg font-semibold text-gray-900 mt-5 mb-2"
        >
          {block.replace(/^##\s+/, "")}
        </h5>
      );
    }

    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      return (
        <ul
          key={index}
          className="list-disc pl-5 space-y-2 text-sm md:text-[15px] leading-7 text-gray-700 mb-4"
        >
          {lines.map((line, i) => (
            <li key={i}>{line.replace(/^[-*]\s+/, "")}</li>
          ))}
        </ul>
      );
    }

    if (lines.every((line) => /^\d+\.\s+/.test(line))) {
      return (
        <ol
          key={index}
          className="list-decimal pl-5 space-y-2 text-sm md:text-[15px] leading-7 text-gray-700 mb-4"
        >
          {lines.map((line, i) => (
            <li key={i}>{line.replace(/^\d+\.\s+/, "")}</li>
          ))}
        </ol>
      );
    }

    const inlineNumberedItems = singleLine.match(/\d+\.\s.*?(?=(\s\d+\.\s)|$)/g);
    if (inlineNumberedItems && inlineNumberedItems.length >= 3) {
      return (
        <ol
          key={index}
          className="list-decimal pl-5 space-y-2 text-sm md:text-[15px] leading-7 text-gray-700 mb-4"
        >
          {inlineNumberedItems.map((item, i) => (
            <li key={i}>{item.replace(/^\d+\.\s+/, "").trim()}</li>
          ))}
        </ol>
      );
    }

    return (
      <p
        key={index}
        className="text-sm md:text-[15px] leading-7 text-gray-700 mb-4 whitespace-pre-line"
      >
        {singleLine}
      </p>
    );
  });
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const directApiCall = async (
    tableName: string,
    method: string,
    body?: any,
    query?: string
  ) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    let token = supabaseAnonKey;

    try {
      const storageKey = Object.keys(localStorage).find(
        (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
      );

      if (storageKey) {
        const sessionData = JSON.parse(
          localStorage.getItem(storageKey) || "{}"
        );
        if (sessionData?.access_token) token = sessionData.access_token;
      }
    } catch (err) {
      console.error(err);
    }

    const endpoint = `${supabaseUrl}/rest/v1/${tableName}${
      query ? `?${query}` : ""
    }`;

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
    async function load() {
      try {
        setLoading(true);

        const data = await directApiCall(
          "announcements",
          "GET",
          undefined,
          "is_published=eq.true&select=*&order=created_at.desc"
        );

        const list = data || [];
        setAnnouncements(list);

        if (list.length > 0) {
          setOpenId(list[0].id);
        }
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar comunicados.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const priorityConfig: Record<
    string,
    {
      color: string;
      badge: string;
      border: string;
      soft: string;
      icon: React.ElementType;
      accent: string;
    }
  > = {
    urgent: {
      color: "text-red-700",
      badge: "bg-red-100 text-red-700 border-red-200",
      border: "border-red-200",
      soft: "bg-red-50",
      icon: AlertCircle,
      accent: "bg-red-500",
    },
    high: {
      color: "text-amber-700",
      badge: "bg-amber-100 text-amber-700 border-amber-200",
      border: "border-amber-200",
      soft: "bg-amber-50",
      icon: AlertTriangle,
      accent: "bg-amber-500",
    },
    normal: {
      color: "text-blue-700",
      badge: "bg-blue-100 text-blue-700 border-blue-200",
      border: "border-blue-200",
      soft: "bg-blue-50",
      icon: Info,
      accent: "bg-blue-500",
    },
    low: {
      color: "text-gray-600",
      badge: "bg-gray-100 text-gray-700 border-gray-200",
      border: "border-gray-200",
      soft: "bg-gray-50",
      icon: Bell,
      accent: "bg-gray-400",
    },
  };

  const filteredAnnouncements = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return announcements;

    return announcements.filter((ann) => {
      return (
        ann.title?.toLowerCase().includes(term) ||
        ann.content?.toLowerCase().includes(term) ||
        ann.priority?.toLowerCase().includes(term)
      );
    });
  }, [announcements, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-header">Comunicados</h1>
          <p className="page-subtitle">
            Avisos, novidades e informações importantes da plataforma
          </p>
        </div>

        {announcements.length > 1 && (
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar comunicados..."
              className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/20 focus:border-cota-green"
            />
          </div>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Megaphone className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            Nenhum comunicado no momento
          </p>
          <p className="text-sm text-gray-400">
            As novidades serão publicadas aqui.
          </p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-500 font-medium">
            Nenhum comunicado encontrado
          </p>
          <p className="text-sm text-gray-400">
            Tente buscar por outra palavra.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((ann) => {
            const config = priorityConfig[ann.priority] || priorityConfig.normal;
            const Icon = config.icon;
            const isOpen = openId === ann.id;

            return (
              <article
                key={ann.id}
                className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${config.border}`}
              >
                <div
                  className={`absolute left-0 top-0 h-full w-1.5 ${config.accent}`}
                />

                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : ann.id)}
                  className="w-full text-left p-4 md:p-5 pl-5 md:pl-6 focus:outline-none focus:ring-2 focus:ring-cota-green/20"
                >
                  <div className="flex items-start gap-3 md:gap-4">
                    <div
                      className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${config.soft}`}
                    >
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base md:text-xl font-bold text-gray-900 leading-snug break-words">
                            {ann.title}
                          </h3>

                          <p className="text-xs md:text-sm text-gray-500 mt-1">
                            Publicado em {formatDateTime(ann.created_at)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={`hidden sm:inline-flex items-center w-fit px-3 py-1 rounded-full text-xs font-semibold border ${config.badge}`}
                          >
                            {PRIORITY_LABELS[ann.priority] || "Normal"}
                          </span>

                          <span className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </span>
                        </div>
                      </div>

                      {!isOpen && (
                        <p className="text-sm text-gray-500 leading-6 mt-3 line-clamp-2">
                          {getAnnouncementPreview(ann.content)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 md:px-5 pb-5 pl-5 md:pl-6">
                    <div className="ml-0 md:ml-[60px] rounded-xl border border-gray-100 bg-gray-50/70 p-4 md:p-5">
                      <div className="prose prose-sm max-w-none prose-p:my-0 prose-headings:my-0 prose-li:my-0">
                        {renderAnnouncementContent(ann.content, ann.title)}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
