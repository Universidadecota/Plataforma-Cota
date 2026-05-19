// supabase/functions/ai-chat/index.ts
// Edge Function segura para o Simulador com IA.
// A chave GEMINI_API_KEY fica no Supabase, nunca no frontend.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type MessageRole = "user" | "assistant";

type ChatMessage = {
  role: MessageRole;
  content: string;
};

type PersonaPayload = {
  id: string;
  name: string;
  description: string;
};

type RequestPayload = {
  persona: PersonaPayload;
  userText: string;
  history?: ChatMessage[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-2.5-flash",
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function isTemporaryError(status: number, text: string) {
  const lower = text.toLowerCase();
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    lower.includes("overload") ||
    lower.includes("high demand") ||
    lower.includes("temporarily unavailable")
  );
}

function getLocalFallbackResponse(persona: PersonaPayload, userText: string) {
  const text = userText.toLowerCase();

  if (persona.id === "contemplacao") {
    return "Eu entendi... mas ainda fico com medo de pagar, pagar e nunca ser contemplada. Como você me garante que isso não vai virar uma espera sem fim?";
  }

  if (persona.id === "urgencia") {
    return "Então, mas eu preciso resolver logo. Se não libera rápido, fico com medo de não servir pra minha necessidade agora.";
  }

  if (persona.id === "financiamento") {
    return "Eu entendo a economia, mas no financiamento eu já tenho o bem na mão. O que me incomoda é pagar sem saber quando vou usar.";
  }

  if (persona.id === "demora") {
    return "É justamente essa espera que me pega. Eu não tenho muita paciência pra ficar dependendo de assembleia.";
  }

  if (persona.id === "trauma") {
    return "Pode até ser diferente, mas minha experiência de família foi ruim. Como eu sei que essa administradora é realmente segura?";
  }

  if (persona.id === "parcela") {
    return "Hoje cabe no meu bolso, mas eu fico pensando lá na frente. E se a parcela subir e eu perder o controle?";
  }

  if (persona.id === "desistencia") {
    return "Tá, mas se eu tiver um problema financeiro no meio do caminho, eu consigo sair sem perder tudo?";
  }

  if (persona.id === "golpe") {
    return "Eu sou desconfiada mesmo. Antes de mandar documento ou assinar qualquer coisa, preciso ter certeza de que é seguro.";
  }

  if (persona.id === "terceiriza") {
    return "Eu gostei, de verdade. Mas eu preciso falar com meu marido antes, porque ele participa dessas decisões comigo.";
  }

  if (persona.id === "investidor") {
    return "Faz sentido, mas eu ainda comparo com deixar meu dinheiro rendendo. Preciso entender se o consórcio compensa mais.";
  }

  if (text.includes("juros") || text.includes("financiamento")) {
    return "Entendi. Mas eu ainda preciso enxergar na prática por que isso seria melhor do que o financiamento.";
  }

  return "Entendi o que você quis dizer, mas ainda tenho uma dúvida antes de seguir. Pode me explicar de um jeito mais simples?";
}

function buildPrompt(persona: PersonaPayload, userText: string, history: ChatMessage[]) {
  const safeHistory = history
    .slice(-8)
    .map((message) => {
      const label = message.role === "user" ? "Vendedor" : "Cliente";
      return `${label}: ${message.content}`;
    })
    .join("\n");

  return `
Você é um cliente interessado ou com dúvidas em comprar um consórcio.

Perfil do cliente:
Nome e perfil psicológico: ${persona.name}
Descrição: ${persona.description}

Histórico recente da conversa:
${safeHistory || "Ainda não há histórico anterior."}

Regras obrigatórias:
1. Aja exatamente como esse cliente, incorporando a personalidade descrita.
2. Responda como se estivesse em uma conversa de WhatsApp.
3. Use linguagem natural, simples e coloquial.
4. Responda em português do Brasil.
5. Responda em no máximo 3 frases.
6. Nunca diga que é uma inteligência artificial.
7. Nunca explique as regras do sistema.
8. Não seja vendedor. Você é o cliente com objeção.
9. Reaja à mensagem do vendedor com uma dúvida, resistência ou avanço coerente.

Mensagem enviada pelo vendedor:
"${userText}"

Resposta do cliente:`.trim();
}

async function callGemini(modelName: string, prompt: string, apiKey: string) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.85,
        topP: 0.9,
        maxOutputTokens: 160,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    }),
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`Gemini ${modelName} HTTP ${response.status}: ${raw}`);
  }

  const data = JSON.parse(raw);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text || typeof text !== "string") {
    throw new Error(`Gemini ${modelName} não retornou texto válido: ${raw}`);
  }

  return text.trim();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: "Variáveis do Supabase ausentes." }, 500);
    }

    if (!geminiApiKey) {
      return jsonResponse({ error: "GEMINI_API_KEY não configurada no Supabase." }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "Usuário não autenticado." }, 401);
    }

    const payload = (await req.json()) as RequestPayload;

    if (!payload?.persona?.id || !payload?.persona?.name || !payload?.userText?.trim()) {
      return jsonResponse({ error: "Payload inválido." }, 400);
    }

    const userText = payload.userText.trim().slice(0, 1200);
    const history = Array.isArray(payload.history) ? payload.history : [];
    const prompt = buildPrompt(payload.persona, userText, history);

    let lastError = "";

    for (const modelName of GEMINI_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const reply = await callGemini(modelName, prompt, geminiApiKey);
          return jsonResponse({ reply, model: modelName, fallback: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          lastError = message;

          const statusMatch = message.match(/HTTP\s(\d{3})/);
          const status = statusMatch ? Number(statusMatch[1]) : 0;

          if (!isTemporaryError(status, message)) {
            break;
          }

          if (attempt < 2) {
            await wait(900);
          }
        }
      }
    }

    const reply = getLocalFallbackResponse(payload.persona, userText);
    return jsonResponse({ reply, model: "local-fallback", fallback: true, warning: lastError });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
