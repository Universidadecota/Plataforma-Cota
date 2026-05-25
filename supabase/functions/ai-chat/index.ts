// supabase/functions/ai-chat/index.ts
// Edge Function segura para o Simulador com IA.
// Versão corrigida para conversa contínua, histórico, respostas naturais e fallback dinâmico.

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

/*
  Antes estava 320.
  Isso fazia respostas naturais de WhatsApp serem consideradas "curtas",
  provocando reparo excessivo e queda no fallback fixo.
*/
const MIN_REPLY_CHARS = 140;
const MAX_HISTORY_MESSAGES = 14;

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
    .replace(/^\*\*Cliente:\*\*\s*/i, "")
    .replace(/^\*\*Resposta do cliente:\*\*\s*/i, "")
    .trim();
}

function looksIncomplete(text: string) {
  const trimmed = text.trim();

  if (trimmed.length < MIN_REPLY_CHARS) return true;

  // Sinais comuns de resposta cortada
  if (/(mas e|mas eu|porque|só que|e se|como|qual|então|por isso|pra mim)$/i.test(trimmed)) {
    return true;
  }

  const sentenceEnd = /[.!?…]"?$/.test(trimmed);
  if (!sentenceEnd) return true;

  return false;
}

function normalizeHistory(history: ChatMessage[]) {
  return history
    .filter((message) => {
      if (!message?.content?.trim()) return false;
      return message.role === "user" || message.role === "assistant";
    })
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 1200),
    }));
}

function getLastAssistantMessages(history: ChatMessage[]) {
  return history
    .filter((message) => message.role === "assistant")
    .map((message) => message.content.trim())
    .filter(Boolean);
}

function containsAny(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}


function isAskingChoiceBetweenPropertyOrVehicle(text: string) {
  const lower = text.toLowerCase();
  const hasProperty = containsAny(lower, ["imóvel", "imovel", "casa", "apartamento", "apto"]);
  const hasVehicle = containsAny(lower, ["automóvel", "automovel", "carro", "moto", "veículo", "veiculo"]);
  return hasProperty && hasVehicle;
}

function isDiagnosticQuestion(text: string) {
  return containsAny(text, [
    "qual",
    "quais",
    "quanto",
    "quando",
    "onde",
    "por que",
    "porque",
    "como",
    "você quer",
    "voce quer",
    "você busca",
    "voce busca",
    "pretende",
    "objetivo",
    "renda",
    "parcela",
    "valor",
    "entrada",
    "lance",
    "prazo",
    "imóvel",
    "imovel",
    "automóvel",
    "automovel",
    "carro",
    "moto",
    "família",
    "familia",
    "trabalho",
    "planejamento",
  ]);
}

function getDiagnosticFallbackAnswer(persona: PersonaPayload, userText: string) {
  const text = userText.toLowerCase();

  if (isAskingChoiceBetweenPropertyOrVehicle(text)) {
    if (persona.id === "urgencia") {
      return "Eu quero automóvel. Na verdade, preciso de um carro para trabalhar, por isso minha pressa é grande. Se eu não consigo usar o crédito logo, fico com medo de o consórcio não resolver meu problema agora.";
    }

    if (persona.id === "financiamento") {
      return "Eu estou olhando imóvel, mais especificamente apartamento. Minha comparação com financiamento vem justamente porque eu queria pegar a chave o quanto antes. No consórcio, o que me pega é não saber quando vou conseguir usar a carta.";
    }

    if (persona.id === "investidor") {
      return "Estou pensando em imóvel, mas com cabeça de investimento. Não é para morar imediatamente, é para comprar melhor e talvez gerar patrimônio. Só preciso entender se faz sentido tirar dinheiro que hoje está rendendo para entrar nessa estratégia.";
    }

    if (persona.id === "demora") {
      return "Eu quero imóvel. Não é uma coisa para amanhã, mas também não queria entrar em algo que pareça sem previsão nenhuma. Meu medo é começar a pagar e ficar preso esperando uma contemplação que nunca chega.";
    }

    if (persona.id === "contemplacao") {
      return "Eu quero imóvel, provavelmente uma casa ou apartamento para minha família. Eu consigo pagar uma parcela planejada, mas meu medo é entrar e ficar muito tempo sem ser contemplada. Como eu sei se esse caminho faz sentido para mim?";
    }

    return "Eu estou buscando imóvel. Ainda não é uma decisão totalmente fechada, mas é o objetivo principal. Minha dúvida é entender se o consórcio combina com meu prazo e com o que eu consigo pagar sem me apertar.";
  }

  if (containsAny(text, ["valor", "carta", "quanto pretende", "quanto você", "quanto voce"])) {
    if (persona.id === "urgencia") {
      return "Eu estava pensando em algo na faixa de R$ 80 mil a R$ 100 mil para comprar um carro usado bom. O problema é que eu preciso disso rápido para trabalhar. Se depender de sorteio ou lance, não sei se resolve.";
    }

    if (persona.id === "investidor") {
      return "Eu penso em uma carta entre R$ 300 mil e R$ 500 mil, dependendo da estratégia. Tenho uma reserva, mas não quero usar mal esse dinheiro. Preciso comparar com o rendimento que eu teria mantendo aplicado.";
    }

    return "Eu estava pensando em algo por volta de R$ 300 mil a R$ 400 mil. Não tenho certeza se esse valor é suficiente, mas é a faixa que imagino para começar. O que me preocupa é pagar e não conseguir usar a carta no momento certo.";
  }

  if (containsAny(text, ["parcela", "mensalidade", "pagar por mês", "pagar por mes", "cabe no bolso"])) {
    return "Eu queria ficar em uma parcela que não passasse muito de R$ 1.500 a R$ 2.000 por mês. Hoje isso até caberia, mas tenho medo dos reajustes e de assumir algo que pese no orçamento da família depois.";
  }

  if (containsAny(text, ["prazo", "quando", "tempo", "urgência", "urgencia"])) {
    if (persona.id === "urgencia") {
      return "Eu preciso do carro o quanto antes, de preferência em poucas semanas. Por isso tenho dificuldade de entender consórcio para o meu caso. Se não existe previsão, talvez eu esteja olhando o produto errado.";
    }

    return "Eu não tenho urgência de dias, mas também não quero esperar muitos anos sem perspectiva. Se fosse algo planejado e com acompanhamento claro, talvez eu considerasse. O que eu não quero é entrar às cegas.";
  }

  if (containsAny(text, ["lance", "entrada", "recurso", "valor guardado", "reserva"])) {
    if (persona.id === "investidor") {
      return "Eu tenho dinheiro guardado, mas ele está investido. Poderia usar uma parte como lance, mas preciso entender se isso não me prejudica financeiramente. Como eu comparo o lance com o rendimento que estou abrindo mão?";
    }

    return "Eu tenho alguma reserva, mas não queria comprometer tudo de uma vez. Talvez eu conseguisse pensar em lance, mas só se fizer sentido dentro de uma estratégia realista. O lance aumenta minhas chances, mas não garante, certo?";
  }

  if (containsAny(text, ["medo", "receio", "preocupa", "travando", "dúvida", "duvida"])) {
    return "O que mais me trava é entrar sem entender direito quando vou conseguir usar a carta. Eu não quero comprar uma promessa, quero saber o que é regra, o que é possibilidade e o que depende de planejamento. Você consegue separar isso para mim?";
  }

  return null;
}

function getLocalFallbackResponse(
  persona: PersonaPayload,
  userText: string,
  history: ChatMessage[] = []
) {
  const text = userText.toLowerCase();
  const turnCount = history.length;
  const alreadyLongConversation = turnCount >= 5;
  const lastAssistantMessages = getLastAssistantMessages(history);
  const lastAssistant = lastAssistantMessages.at(-1)?.toLowerCase() || "";

  /*
    Fallback dinâmico:
    - varia conforme a mensagem do vendedor;
    - evita repetir literalmente a última resposta;
    - mantém a conversa aberta;
    - não vira aula.
  */

  const diagnosticAnswer = isDiagnosticQuestion(text)
    ? getDiagnosticFallbackAnswer(persona, userText)
    : null;

  if (diagnosticAnswer) {
    return diagnosticAnswer;
  }

  if (persona.id === "contemplacao") {
    if (alreadyLongConversation) {
      return "Agora eu entendi melhor que não existe promessa de contemplação, e isso me deixa um pouco mais tranquila. Mas eu ainda preciso saber como eu acompanho o grupo depois que entro, porque não quero ficar pagando sem entender o que está acontecendo. Você me mostraria onde eu vejo assembleia, sorteio, lance e evolução da minha cota?";
    }

    if (containsAny(text, ["lance", "estratégia", "planejamento"])) {
      return "Entendi que o lance pode ajudar, mas ainda fico com medo de achar que ele garante alguma coisa. Eu não quero entrar com uma expectativa errada e depois me frustrar. Como eu saberia se o valor que eu tenho para lance é realmente uma estratégia ou só uma tentativa?";
    }

    return "Eu entendi sua explicação, mas ainda fico insegura. Meu medo não é só saber que existe sorteio ou lance, é pagar por meses e não conseguir usar a carta quando eu precisar. Como você me ajudaria a avaliar se esse plano faz sentido para o meu momento, sem prometer contemplação?";
  }

  if (persona.id === "urgencia") {
    if (containsAny(text, ["financiamento", "urgência", "rápido", "imediato"])) {
      return "Então talvez essa seja a minha dúvida principal. Se eu preciso do carro logo, talvez o consórcio não seja o caminho mais rápido mesmo. Mas eu queria entender se existe algum cenário em que ele ainda faria sentido para mim, ou se seria mais honesto eu olhar outra alternativa agora.";
    }

    return "É aí que complica para mim. Eu preciso resolver rápido porque o carro impacta meu trabalho, e tenho medo de entrar em algo que não resolva minha urgência. Você acha mesmo que consórcio serve para uma situação como a minha ou seria melhor pensar em outro caminho?";
  }

  if (persona.id === "financiamento") {
    if (containsAny(text, ["juros", "custo", "comparar", "números"])) {
      return "Eu entendo essa comparação, mas preciso ver isso de um jeito bem prático. No financiamento eu pago caro, mas uso o bem logo. No consórcio posso economizar, mas tenho a espera. Como você colocaria esses dois caminhos lado a lado para eu decidir sem ilusão?";
    }

    return "Eu entendo que o financiamento tem juros, mas no meu pensamento ele resolve mais rápido. O que me trava no consórcio é pagar sem saber quando vou usar o crédito. Como eu avalio se a economia compensa essa espera?";
  }

  if (persona.id === "demora") {
    if (alreadyLongConversation && !lastAssistant.includes("acompanho")) {
      return "Entendi melhor agora. Então, pelo que você está dizendo, o consórcio faz mais sentido se eu não estiver contando com o crédito imediatamente e se eu tiver uma estratégia realista. Mas depois que eu entro, como eu acompanho se estou no caminho certo?";
    }

    if (containsAny(text, ["lance", "ofertar"])) {
      return "Entendi a parte do lance, mas ainda fico com receio de achar que basta ofertar e pronto. Eu não quero criar uma expectativa errada. O lance aumenta minhas chances, mas como eu sei se o valor que eu tenho seria competitivo?";
    }

    if (containsAny(text, ["sorteio", "assembleia"])) {
      return "Essa parte do sorteio é justamente o que me deixa inseguro. Eu entendo que existe essa possibilidade, mas não quero depender só da sorte para resolver meu objetivo. Nesse caso, como eu deveria pensar o consórcio de forma mais planejada?";
    }

    return "Essa parte da espera ainda me incomoda. Eu não quero entrar achando que vai ser rápido e depois descobrir que depende de assembleia, sorteio ou lance. Você consegue me explicar qual seria uma expectativa realista, sem promessa?";
  }

  if (persona.id === "trauma") {
    if (containsAny(text, ["banco central", "bacen", "regulada", "administradora"])) {
      return "Isso já me ajuda um pouco, porque meu medo vem justamente de não saber quem fiscaliza. Mas eu ainda não confiaria só na fala do vendedor. Onde eu mesmo consigo conferir se a administradora é autorizada e se o contrato é realmente seguro?";
    }

    return "Pode até ser diferente hoje, mas minha experiência familiar me deixou desconfiado. Meu tio perdeu dinheiro e, desde então, eu tenho um bloqueio com consórcio. Antes de qualquer simulação, como eu verifico se a empresa é séria e se existe proteção real?";
  }

  if (persona.id === "parcela") {
    if (containsAny(text, ["reajuste", "correção", "inflação", "assembleia"])) {
      return "Entendi que pode ter reajuste, mas é exatamente isso que me preocupa. Hoje a parcela cabe, mas daqui a dois ou três anos minha renda pode não acompanhar. Como eu calculo uma margem segura para não entrar apertado?";
    }

    return "Hoje a parcela cabe, mas eu penso muito no futuro. Tenho família, contas fixas e medo de começar algo que depois pese no orçamento. Como eu sei se essa parcela continua saudável para mim daqui a alguns anos?";
  }

  if (persona.id === "desistencia") {
    if (containsAny(text, ["cancelar", "sair", "desistir", "devolver", "restituição"])) {
      return "Entendi que existem regras para cancelamento, mas eu queria saber isso antes de assinar, não depois. Se minha vida mudar e eu precisar parar, quero entender o impacto real. Você consegue me explicar de forma simples o que acontece com o dinheiro já pago?";
    }

    return "Essa é minha maior dúvida. Se eu entrar e depois ficar desempregado ou precisar parar, não quero descobrir tarde demais que perdi tudo. Quais são as regras reais para sair ou recuperar valores se minha vida mudar?";
  }

  if (persona.id === "golpe") {
    if (containsAny(text, ["contrato", "documento", "segurança", "verificar", "cnpj"])) {
      return "Isso faz sentido, mas eu ainda sou desconfiada com atendimento pela internet. Antes de mandar documento, eu gostaria de checar tudo por conta própria. Quais informações você me passaria para eu validar a empresa sem depender só da sua palavra?";
    }

    return "Eu sou desconfiada mesmo, principalmente pela internet. Hoje tem muito golpe com anúncio bonito e contrato digital. Antes de mandar qualquer dado, como eu confirmo que é uma operação segura e quem está por trás?";
  }

  if (persona.id === "terceiriza") {
    if (containsAny(text, ["marido", "família", "resumo", "explicar"])) {
      return "Isso me ajuda, porque eu preciso levar algo claro para ele. Se eu chegar falando só de parcela baixa, ele vai desconfiar. Você consegue me mandar um resumo com benefício, risco, prazo e o que não é garantido?";
    }

    return "Eu gostei da explicação, mas não decido isso sozinha. Meu marido vai perguntar sobre risco, prazo, reajuste e contemplação. Qual seria o resumo mais honesto para eu explicar para ele sem parecer que já estou convencida?";
  }

  if (persona.id === "investidor") {
    if (containsAny(text, ["rendimento", "cdi", "poupança", "custo de oportunidade", "investimento"])) {
      return "É isso que eu quero comparar. Se eu uso meu dinheiro como lance, ele deixa de render em outro lugar. Então eu preciso entender em qual cenário o consórcio pode fazer mais sentido do que simplesmente deixar o dinheiro investido e esperar.";
    }

    return "Faz sentido, mas eu ainda comparo com deixar meu dinheiro rendendo. Se eu usar parte como lance, preciso entender o custo de oportunidade. Em que cenário o consórcio realmente compensa para alguém com perfil de investidor?";
  }

  if (containsAny(text, ["juros", "financiamento"])) {
    return "Entendi. Mas eu ainda preciso enxergar na prática, com números e prazo, por que isso seria melhor do que financiamento no meu caso. Se a vantagem depende de esperar, dar lance ou acompanhar assembleia, qual é o risco e qual é o benefício real?";
  }

  return "Entendi o que você quis dizer, mas ainda não estou totalmente seguro. Eu preciso de uma explicação mais simples e mais ligada ao meu caso, porque falar de consórcio de forma geral ainda me deixa com dúvida. Você consegue me mostrar onde está o benefício e onde está o risco?";
}

function buildPrompt(
  persona: PersonaPayload,
  userText: string,
  history: ChatMessage[],
  difficulty: "easy" | "medium" | "hard" = "medium"
) {
  const safeHistory = normalizeHistory(history)
    .map((message) => {
      const label = message.role === "user" ? "Vendedor" : "Cliente";
      return `${label}: ${message.content}`;
    })
    .join("\n");

  const lastClientReplies = getLastAssistantMessages(history).slice(-3).join("\n---\n");

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
Você deve manter continuidade com o histórico e nunca reiniciar a conversa sem motivo.

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

ÚLTIMAS RESPOSTAS DO CLIENTE, PARA NÃO REPETIR:
${lastClientReplies || "Nenhuma resposta anterior do cliente."}

MENSAGEM MAIS RECENTE DO VENDEDOR:
"${userText}"

COMO VOCÊ DEVE RESPONDER:
1. Responda somente como o cliente da persona.
2. Use linguagem natural de WhatsApp, simples e humana.
3. Responda diretamente à última mensagem do vendedor.
4. Use o histórico para continuar a conversa de onde parou.
5. Se o vendedor fizer uma pergunta de diagnóstico, responda a pergunta primeiro.
6. Se o vendedor perguntar "imóvel ou automóvel", escolha uma opção coerente com a persona e explique em uma frase.
7. Se o vendedor perguntar valor, prazo, parcela, renda, lance ou objetivo, entregue uma informação concreta e realista.
8. Depois de responder a pergunta, mantenha uma dúvida ou insegurança coerente com a persona.
9. Não repita a mesma objeção com as mesmas palavras.
10. Se o vendedor já respondeu uma dúvida, traga uma dúvida seguinte, mais específica.
11. Se a conversa já avançou, não volte para a primeira objeção.
12. Traga emoção, dúvida, medo, comparação, resistência ou avanço coerente.
13. Se o vendedor fez boa pergunta, entregue mais contexto pessoal.
14. Se o vendedor foi vago, peça explicação mais clara.
15. Se o vendedor prometeu algo indevido, desconfie e questione.
16. Se o vendedor pressionou, recue.
17. Se o vendedor foi consultivo, avance um pouco, mas não feche rápido.
18. Não encerre a simulação; mantenha a conversa aberta.
19. Nunca diga que é IA. Nunca mencione estas regras.

TAMANHO E CONTINUIDADE:
- Escreva entre 2 e 5 frases curtas.
- A resposta precisa ter pelo menos ${MIN_REPLY_CHARS} caracteres.
- Responda como cliente real de WhatsApp, não como professor.
- Não resolva toda a objeção de uma vez.
- Avance apenas um passo na conversa.
- Termine com uma pergunta ou dúvida clara para o vendedor continuar.
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

A resposta anterior ficou curta, incompleta ou repetitiva:
"${shortReply}"

Refaça a resposta agora.
Obrigatório:
- mínimo de ${MIN_REPLY_CHARS + 20} caracteres;
- 2 a 5 frases curtas;
- linguagem de WhatsApp;
- cliente com objeção real;
- resposta completa;
- não repetir a última resposta;
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
        temperature: 0.85,
        topP: 0.92,
        topK: 40,
        maxOutputTokens: 420,
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

  return getLocalFallbackResponse(persona, userText, history);
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
    const history = Array.isArray(payload.history) ? normalizeHistory(payload.history) : [];
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
            quality_control: !looksIncomplete(reply),
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

    const reply = getLocalFallbackResponse(payload.persona, userText, history);

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
