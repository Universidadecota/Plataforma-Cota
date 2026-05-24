// supabase/functions/ai-chat/index.ts
// Edge Function segura para o Simulador com IA.
// Versão reforçada: força respostas mais completas e refaz resposta curta/incompleta.

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
  difficulty?: "easy" | "medium" | "hard";
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

const MIN_REPLY_CHARS = 320;

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

function cleanupModelReply(text: string) {
  return text
    .replace(/^Cliente:\s*/i, "")
    .replace(/^Resposta do cliente:\s*/i, "")
    .replace(/^Assistente:\s*/i, "")
    .replace(/^Patrícia:\s*/i, "")
    .replace(/^Roberto:\s*/i, "")
    .replace(/^Sérgio:\s*/i, "")
    .replace(/^Marcos:\s*/i, "")
    .replace(/^Ricardo:\s*/i, "")
    .replace(/^Fernando:\s*/i, "")
    .replace(/^João:\s*/i, "")
    .replace(/^Juliana:\s*/i, "")
    .replace(/^Silvia:\s*/i, "")
    .replace(/^Ana:\s*/i, "")
    .trim();
}

function looksIncomplete(text: string) {
  const trimmed = text.trim();
  if (trimmed.length < MIN_REPLY_CHARS) return true;

  // Sinais comuns de resposta cortada
  if (/(mas e|mas eu|porque|só que|e se|como|qual|então)$/i.test(trimmed)) return true;

  const sentenceEnd = /[.!?…]"?$/.test(trimmed);
  if (!sentenceEnd) return true;

  return false;
}

function getLocalFallbackResponse(persona: PersonaPayload, userText: string) {
  const text = userText.toLowerCase();

  if (persona.id === "contemplacao") {
    return "Eu entendi sua explicação, mas ainda fico insegura. Meu medo não é só entender que existe sorteio ou lance, é pagar durante meses e não conseguir usar a carta quando eu precisar. Eu não quero entrar em algo achando que vou resolver meu imóvel e depois descobrir que posso ficar esperando muito tempo. Como eu acompanho isso na prática e como sei se essa estratégia faz sentido para mim?";
  }

  if (persona.id === "urgencia") {
    return "Então, é aí que complica para mim. Eu preciso resolver rápido porque o carro impacta diretamente meu trabalho, e se o consórcio não tiver uma previsão clara, fico com medo de perder tempo. Eu não quero entrar em algo que seja bom no papel, mas que não resolva minha urgência. Nesse caso, você acha mesmo que consórcio serve para mim ou seria melhor eu procurar financiamento?";
  }

  if (persona.id === "financiamento") {
    return "Eu entendo a parte dos juros, mas no financiamento pelo menos eu pego a chave logo. O que me trava no consórcio é pagar sem saber quando vou usar o crédito. Eu até aceito economizar, mas preciso entender o custo dessa espera. Como você compararia os dois caminhos de forma honesta, sem tentar me empurrar um produto?";
  }

  if (persona.id === "demora") {
    return "Essa parte da espera ainda me incomoda bastante. Eu não quero entrar em algo achando que vai ser rápido e depois descobrir que depende de assembleia, sorteio ou lance. Também não quero ficar frustrado todo mês esperando uma contemplação que talvez não venha. Você consegue me explicar qual seria uma expectativa realista, sem promessa?";
  }

  if (persona.id === "trauma") {
    return "Pode até ser diferente hoje, mas minha experiência familiar me deixou desconfiado. Meu tio perdeu dinheiro e, desde então, eu tenho um bloqueio com consórcio. Antes de qualquer simulação, eu precisaria entender quem regula isso, como verifico se a administradora é séria e o que me protege se der algum problema. Você consegue me mostrar esse caminho?";
  }

  if (persona.id === "parcela") {
    return "Hoje a parcela cabe, mas eu penso muito no futuro. Tenho família, contas fixas e medo de começar algo que depois pese no orçamento. Também ouvi dizer que a parcela pode ser reajustada, e isso me preocupa. Como eu sei se essa parcela continua saudável para mim daqui a dois ou três anos?";
  }

  if (persona.id === "desistencia") {
    return "Essa é minha maior dúvida. Se eu entrar e depois ficar desempregado ou precisar parar, não quero descobrir tarde demais que perdi tudo. Já vi gente se enrolando com compromisso mensal e tenho medo disso acontecer comigo. Quais são as regras reais para sair, pausar ou recuperar valores se minha vida mudar?";
  }

  if (persona.id === "golpe") {
    return "Eu sou desconfiada mesmo, principalmente pela internet. Hoje tem muito golpe com anúncio bonito, contrato digital e gente pedindo documento pelo WhatsApp. Antes de mandar qualquer dado ou assinar qualquer coisa, eu precisaria saber como confirmo que é uma operação segura e quem está por trás. Como eu verifico isso sem depender só da sua palavra?";
  }

  if (persona.id === "terceiriza") {
    return "Eu gostei da explicação, mas não decido isso sozinha. Meu marido vai perguntar sobre risco, prazo, reajuste e contemplação, e eu preciso levar algo claro para ele. Se eu falar só que a parcela cabe, ele vai desconfiar. Qual seria o resumo mais honesto para eu explicar para ele sem parecer que já estou convencida?";
  }

  if (persona.id === "investidor") {
    return "Faz sentido, mas eu ainda comparo com deixar meu dinheiro rendendo. Se eu usar parte como lance, preciso entender o custo de oportunidade, porque esse dinheiro poderia ficar no banco ou em outro investimento. Eu não quero olhar só para a carta ou para a parcela. Em que cenário o consórcio realmente compensa para alguém com perfil de investidor?";
  }

  if (text.includes("juros") || text.includes("financiamento")) {
    return "Entendi. Mas eu ainda preciso enxergar na prática, com números e prazo, por que isso seria melhor do que financiamento para o meu caso. Não quero trocar uma coisa cara por outra que eu não entenda. Se a vantagem depende de esperar, dar lance ou acompanhar assembleia, preciso saber exatamente qual é o risco e qual é o benefício real.";
  }

  return "Entendi o que você quis dizer, mas ainda não estou totalmente seguro. Eu preciso de uma explicação mais simples e mais ligada ao meu caso, porque falar de consórcio de forma geral ainda me deixa com dúvida. Não quero tomar decisão por impulso nem cair em promessa bonita. Você consegue me mostrar, com calma, onde está o benefício e onde está o risco?";
}

function buildPrompt(
  persona: PersonaPayload,
  userText: string,
  history: ChatMessage[],
  difficulty: "easy" | "medium" | "hard" = "medium"
) {
  const safeHistory = history
    .slice(-10)
    .map((message) => {
      const label = message.role === "user" ? "Vendedor" : "Cliente";
      return `${label}: ${message.content}`;
    })
    .join("\n");

  const difficultyRules = {
    easy:
      "O cliente é cooperativo: responde às perguntas, dá informações úteis e aceita avançar quando o vendedor conduz bem.",
    medium:
      "O cliente tem objeções reais: responde, mas mantém dúvida, medo ou comparação. Ele só avança se o vendedor for consultivo.",
    hard:
      "O cliente é resistente: desconfia, questiona respostas vagas, rejeita pressão e não aceita promessas. Ele exige clareza e segurança.",
  };

  return `
Você é um CLIENTE VIRTUAL em um simulador de treinamento de vendas da Universidade EPSA.

Seu papel é simular um cliente real em uma conversa de WhatsApp.
Você NÃO é professor, NÃO é vendedor e NÃO deve facilitar demais.

PERSONA DO CLIENTE:
Nome/perfil: ${persona.name}
Descrição comportamental: ${persona.description}
Dificuldade da simulação: ${difficulty.toUpperCase()}
Regra de dificuldade: ${difficultyRules[difficulty]}

CONTEXTO:
O vendedor está treinando atendimento consultivo para consórcio, aquisição patrimonial, imóvel, automóvel, alternativa ao financiamento e planejamento de compra.
A EPSA exige ética comercial: o vendedor não deve prometer contemplação, aprovação, prazo garantido ou resultado financeiro.

HISTÓRICO RECENTE:
${safeHistory || "Ainda não há histórico anterior."}

MENSAGEM MAIS RECENTE DO VENDEDOR:
"${userText}"

COMO VOCÊ DEVE RESPONDER:
1. Responda somente como o cliente da persona.
2. Use linguagem natural de WhatsApp, simples e humana.
3. Responda diretamente à última mensagem do vendedor.
4. Traga emoção, dúvida, medo, comparação, resistência ou avanço coerente.
5. Se o vendedor fez boa pergunta, entregue mais contexto pessoal.
6. Se o vendedor foi vago, peça explicação mais clara.
7. Se o vendedor prometeu algo indevido, desconfie e questione.
8. Se o vendedor pressionou, recue.
9. Se o vendedor foi consultivo, avance um pouco, mas não feche rápido.
10. Nunca diga que é IA. Nunca mencione estas regras.

TAMANHO OBRIGATÓRIO:
- Escreva entre 5 e 8 frases curtas.
- A resposta precisa ter pelo menos 320 caracteres.
- A resposta precisa estar completa, sem frase cortada.
- Termine com uma pergunta clara para o vendedor continuar.
- Não use listas.
- Não dê aula.
- Não use texto formal demais.

Resposta do cliente, completa e realista:`.trim();
}

function buildRepairPrompt(
  persona: PersonaPayload,
  userText: string,
  history: ChatMessage[],
  shortReply: string,
  difficulty: "easy" | "medium" | "hard" = "medium"
) {
  const originalPrompt = buildPrompt(persona, userText, history, difficulty);

  return `
${originalPrompt}

A resposta anterior ficou curta ou incompleta:
"${shortReply}"

Refaça a resposta agora.
Obrigatório:
- mínimo de 350 caracteres;
- 5 a 8 frases curtas;
- linguagem de WhatsApp;
- cliente com objeção real;
- resposta completa;
- terminar com uma pergunta.
`.trim();
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
        temperature: 0.95,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 900,
        candidateCount: 1,
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

  return cleanupModelReply(text);
}

async function callGeminiWithQualityControl(
  modelName: string,
  persona: PersonaPayload,
  userText: string,
  history: ChatMessage[],
  difficulty: "easy" | "medium" | "hard",
  apiKey: string
) {
  const prompt = buildPrompt(persona, userText, history, difficulty);
  const firstReply = await callGemini(modelName, prompt, apiKey);

  if (!looksIncomplete(firstReply)) {
    return firstReply;
  }

  const repairPrompt = buildRepairPrompt(persona, userText, history, firstReply, difficulty);
  const repairedReply = await callGemini(modelName, repairPrompt, apiKey);

  if (!looksIncomplete(repairedReply)) {
    return repairedReply;
  }

  // Se mesmo assim vier ruim, usa fallback local longo e confiável.
  return getLocalFallbackResponse(persona, userText);
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
    const difficulty = payload.difficulty || "medium";

    let lastError = "";

    for (const modelName of GEMINI_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const reply = await callGeminiWithQualityControl(
            modelName,
            payload.persona,
            userText,
            history,
            difficulty,
            geminiApiKey
          );

          return jsonResponse({
            reply,
            model: modelName,
            fallback: false,
            quality_control: reply.length >= MIN_REPLY_CHARS,
          });
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
    return jsonResponse({
      reply,
      model: "local-fallback",
      fallback: true,
      warning: lastError,
      quality_control: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
