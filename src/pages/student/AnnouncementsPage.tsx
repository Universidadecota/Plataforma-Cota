import { useEffect, useState } from "react";
import {
  Bell,
  AlertCircle,
  Info,
  AlertTriangle,
  Megaphone,
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

function renderAnnouncementContent(content: string, announcementTitle?: string) {
  const normalized = normalizeMarkdown(content);
  if (!normalized) return null;

  let blocks = normalized.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);

  // Evita repetir o título quando o conteúdo começa com um heading igual ao título do card
  if (announcementTitle && blocks.length > 0) {
    const firstBlockClean = stripMarkdownPrefix(blocks[0]).toLowerCase();
    const titleClean = announcementTitle.trim().toLowerCase();
    if (firstBlockClean === titleClean) {
      blocks = blocks.slice(1);
    }
  }

  return blocks.map((block, index) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
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
        <ul key={index} className="list-disc pl-5 space-y-2 text-sm md:text-[15px] leading-7 text-gray-700 mb-4">
          {lines.map((line, i) => (
            <li key={i}>{line.replace(/^[-*]\s+/, "")}</li>
          ))}
        </ul>
      );
    }

    if (lines.every((line) => /^\d+\.\s+/.test(line))) {
      return (
        <ol key={index} className="list-decimal pl-5 space-y-2 text-sm md:text-[15px] leading-7 text-gray-700 mb-4">
          {lines.map((line, i) => (
            <li key={i}>{line.replace(/^\d+\.\s+/, "")}</li>
          ))}
        </ol>
      );
    }

    // Caso de bloco em uma única linha com vários itens numerados: 1. ... 2. ... 3. ...
    const inlineNumberedItems = singleLine.match(/\d+\.\s.*?(?=(\s\d+\.\s)|$)/g);
    if (inlineNumberedItems && inlineNumberedItems.length >= 3) {
      return (
        <ol key={index} className="list-decimal pl-5 space-y-2 text-sm md:text-[15px] leading-7 text-gray-700 mb-4">
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
          "is_published=eq.true&select=*&order=priority.asc,created_at.desc"
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

  if (loading)
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-cota-green border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Comunicados</h1>
        <p className="page-subtitle">
          Avisos, novidades e informações importantes da plataforma
        </p>
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
      ) : (
        <div className="space-y-5">
          {announcements.map((ann) => {
            const config = priorityConfig[ann.priority] || priorityConfig.normal;
            const Icon = config.icon;

            return (
              <article
                key={ann.id}
                className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm ${config.border}`}
              >
                <div className={`absolute left-0 top-0 h-full w-1.5 ${config.accent}`} />

                <div className="p-5 md:p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${config.soft}`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4">
                        <div>
                          <h3 className="text-lg md:text-xl font-bold text-gray-900 leading-snug">
                            {ann.title}
                          </h3>
                          <p className="text-xs md:text-sm text-gray-500 mt-1">
                            Publicado em {formatDateTime(ann.created_at)}
                          </p>
                        </div>

                        <span
                          className={`inline-flex items-center w-fit px-3 py-1 rounded-full text-xs font-semibold border ${config.badge}`}
                        >
                          {PRIORITY_LABELS[ann.priority] || "Normal"}
                        </span>
                      </div>

                      <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 md:p-5">
                        <div className="prose prose-sm max-w-none prose-p:my-0 prose-headings:my-0 prose-li:my-0">
                          {renderAnnouncementContent(ann.content, ann.title)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
