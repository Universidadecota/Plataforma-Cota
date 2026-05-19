import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, AlertCircle, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";

type Message = { id: string; role: "user" | "assistant"; content: string };
type Persona = { id: string; name: string; description: string; greeting: string };

const PERSONAS: Persona[] = [
  {
    id: "contemplacao",
    name: "Patrícia (Medo de não ser contemplada)",
    description: "Insegura. Tem o dinheiro da parcela, mas acha que vai pagar a vida toda e nunca vai pegar o bem.",
    greeting: "Oi, vi o anúncio. Mas eu tenho muito azar em sorteio. Se eu pagar e nunca for sorteada, vou ficar a vida inteira sem o imóvel?"
  },
  {
    id: "urgencia",
    name: "Roberto (Precisa pra ontem)",
    description: "Imediatista. Precisa do carro urgente para trabalhar e não entende a lógica da espera.",
    greeting: "Amigo, eu preciso de um carro pra semana que vem porque mudei de emprego. Consórcio libera o dinheiro rápido na hora que assina?"
  },
  {
    id: "financiamento",
    name: "Sérgio (Defensor do Financiamento)",
    description: "Calculista de curto prazo. Sabe que o juro é alto, mas prefere a garantia de ter a chave na mão logo.",
    greeting: "Cara, no financiamento eu pago juros mas pego a chave amanhã. Por que eu vou ficar pagando consórcio sem saber quando vou morar na casa?"
  },
  {
    id: "demora",
    name: "Marcos (Impaciente)",
    description: "Acha que consórcio demora muito, tem pressa, não tem paciência para assembleias.",
    greeting: "Boa tarde. 'Entrega programada' pra mim soa como 'vai demorar uma eternidade'. Não tenho paciência pra esperar assembleia não."
  },
  {
    id: "trauma",
    name: "Ricardo (Traumatizado)",
    description: "Já teve um familiar que perdeu dinheiro com empresa de consórcio que faliu. É desconfiado e na defensiva.",
    greeting: "Meu tio já perdeu 20 mil numa empresa de consórcio que sumiu do mapa. A verdade é que esse negócio é uma furada, não é?"
  },
  {
    id: "parcela",
    name: "Fernando (Inseguro Financeiro)",
    description: "Tem medo da parcela aumentar e perder o controle financeiro da família.",
    greeting: "Eu vi a simulação, a parcela cabe no bolso hoje. Mas eu soube que ela sobe todo ano. Tenho medo de não conseguir pagar lá na frente."
  },
  {
    id: "desistencia",
    name: "João (O Precavido)",
    description: "Tem medo de ficar desempregado e não saber como sair do grupo sem perder tudo.",
    greeting: "E se eu fechar, pagar um ano e ficar desempregado? Vou perder todo o meu dinheiro que já coloquei no grupo?"
  },
  {
    id: "golpe",
    name: "Juliana (Medo de Golpe Digital)",
    description: "Desconfia de vendas pela internet, tem medo de assinar contrato sem ver a pessoa e mandar documentos.",
    greeting: "Tudo muito bonito, mas eu não assino contrato por WhatsApp nem mando meus documentos pra quem eu nunca vi. Como vou saber que não é golpe?"
  },
  {
    id: "terceiriza",
    name: "Silvia (Precisa falar com o marido)",
    description: "Gostou da proposta, mas nunca toma decisão sozinha. Usa o marido como escudo para não fechar na hora.",
    greeting: "Eu adorei a simulação, achei que a parcela ficou boa. Mas eu não posso fechar nada sem falar com meu marido antes, ele que cuida dessa parte."
  },
  {
    id: "investidor",
    name: "Ana (Perfil Investidora)",
    description: "Tem dinheiro guardado, quer fugir dos juros, mas compara tudo com o rendimento da poupança e CDI.",
    greeting: "Oi! Tenho um valor guardado na poupança. Mas se eu der lance, não perco o rendimento que o banco me paga?"
  }
];

export default function AISimulatorPage() {
  const { user } = useAuthStore();
  const [activePersona, setActivePersona] = useState<Persona>(PERSONAS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ id: Date.now().toString(), role: "assistant", content: activePersona.greeting }]);
  }, [activePersona]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: userText };
    
    const currentHistory = [...messages]; 
    
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      let token = import.meta.env.VITE_SUPABASE_ANON_KEY;

      try {
        const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (storageKey) {
          const sessionData = JSON.parse(localStorage.getItem(storageKey) || '{}');
          if (sessionData?.access_token) token = sessionData.access_token;
        }
      } catch (err) {}

      const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          persona: activePersona,
          userText: userText,
          history: currentHistory
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erro na Edge Function: ${response.status} - ${errText}`);
      }

      const data = await response.json();

      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: data.reply }]);
      
    } catch (error) {
      console.error("DETALHES DO ERRO DA IA:", error);
      toast.error("Erro ao conectar com o simulador.");
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: "⚠️ (Sistema: Conexão com o simulador falhou.)" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([{ id: Date.now().toString(), role: "assistant", content: activePersona.greeting }]);
    toast.info("Simulação reiniciada.");
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col w-full max-w-5xl mx-auto min-w-0 overflow-hidden">
      <div className="mb-4 md:mb-6 flex-shrink-0 min-w-0">
        <div className="flex items-center gap-3 mb-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h1 className="page-header mb-0 truncate">Simulador com IA</h1>
          </div>
        </div>
        <p className="page-subtitle ml-0 sm:ml-13">Treine suas técnicas de vendas e quebra de objeções com clientes virtuais</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 min-h-0 min-w-0 overflow-hidden">
        {/* Painel Lateral - Escolha de Persona (Atualizado com UI de Carrossel) */}
        <div className="w-full lg:w-80 flex flex-row lg:flex-col gap-3 lg:gap-4 flex-shrink-0 overflow-x-auto lg:overflow-hidden lg:hover:overflow-y-auto pb-3 lg:pb-0 custom-scrollbar snap-x snap-mandatory">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 w-72 lg:w-full flex-shrink-0 snap-start">
            <p className="text-sm text-indigo-800 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>Escolha um perfil e treine a sua abordagem como se estivesse no WhatsApp.</span>
            </p>
          </div>

          {PERSONAS.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePersona(p)}
              className={`text-left p-4 rounded-xl border transition-all w-64 lg:w-full flex-shrink-0 snap-start ${
                activePersona.id === p.id
                  ? "bg-white border-cota-green shadow-md ring-1 ring-cota-green"
                  : "bg-white border-gray-200 hover:border-cota-green/50"
              }`}
            >
              <div className="flex items-center gap-3 mb-2 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  activePersona.id === p.id ? "bg-cota-green text-white" : "bg-gray-100 text-gray-600"
                }`}>
                  {p.name.charAt(0)}
                </div>
                <h3 className="font-bold text-gray-800 text-sm leading-snug truncate">{p.name}</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{p.description}</p>
            </button>
          ))}
        </div>

        {/* Janela do Chat */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-bold text-gray-800 text-sm truncate">Simulando: {activePersona.name}</span>
            </div>
            <button onClick={resetChat} className="text-gray-400 hover:text-cota-green flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-cota-green/10 transition-colors flex-shrink-0">
              <RefreshCcw className="w-3.5 h-3.5" /> Reiniciar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png')] bg-opacity-5">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] sm:max-w-[80%] min-w-0 rounded-2xl p-4 flex gap-3 shadow-sm ${
                  msg.role === "user" 
                    ? "bg-cota-green text-white rounded-tr-sm" 
                    : "bg-white border border-gray-100 text-gray-700 rounded-tl-sm"
                }`}>
                  {msg.role === "assistant" && <Bot className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />}
                  <p className="text-sm leading-relaxed break-words min-w-0">{msg.content}</p>
                  {msg.role === "user" && <User className="w-5 h-5 text-white/70 flex-shrink-0 mt-0.5" />}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-4 shadow-sm flex gap-2 items-center">
                  <Bot className="w-5 h-5 text-indigo-500" />
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-100">
            <form onSubmit={handleSendMessage} className="flex gap-3 min-w-0">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite a sua resposta como vendedor..."
                className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green focus:bg-white transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-cota-green text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-cota-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="w-5 h-5 ml-1" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}