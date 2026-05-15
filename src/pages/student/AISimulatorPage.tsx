import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, AlertCircle, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { GoogleGenerativeAI } from "@google/generative-ai";

type Message = { id: string; role: "user" | "assistant"; content: string };
type Persona = { id: string; name: string; description: string; greeting: string };

const PERSONAS: Persona[] = [
  {
    id: "frio",
    name: "Marcos (Cliente Desconfiado)",
    description: "Acha que consórcio demora muito e prefere financiamento. É impaciente e cético.",
    greeting: "Olá. Vi o anúncio de vocês, mas já vou avisando que tenho pressa para pegar a chave da minha casa. Consórcio demora muito, não é?"
  },
  {
    id: "investidor",
    name: "Ana (Perfil Investidora)",
    description: "Tem dinheiro guardado, quer fugir dos juros, mas compara tudo com o rendimento da poupança e CDI.",
    greeting: "Oi! Tenho um valor guardado na poupança e pensei em usar para comprar um carro mais novo. Por que eu faria um consórcio em vez de comprar à vista?"
  },
  {
    id: "curioso",
    name: "Carlos (Iniciante)",
    description: "Não entende absolutamente nada de consórcio, taxa de administração ou lances. Faz muitas perguntas básicas.",
    greeting: "Boa tarde. Um amigo me falou que consórcio não tem juros, mas não entendi muito bem. Como a administradora ganha dinheiro então?"
  }
];

export default function AISimulatorPage() {
  const { user } = useAuthStore();
  const [activePersona, setActivePersona] = useState<Persona>(PERSONAS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // =======================================================================
  // 🔍 DIAGNÓSTICO: DESCOBRINDO OS MODELOS LIBERADOS PARA A SUA CHAVE
  // =======================================================================
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
        .then(res => res.json())
        .then(data => {
          if (data.models) {
            const validModels = data.models
              .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
              .map((m: any) => m.name.replace('models/', ''));
            
            console.log("✅ DIAGNÓSTICO DA IA CONCLUÍDO!");
            console.log("Copie UM destes nomes abaixo e coloque na linha 83 do código:");
            console.log(validModels);
          } else {
            console.error("A API respondeu, mas não listou modelos. Verifique se o projeto no Google Cloud tem a API ativada.", data);
          }
        })
        .catch(err => console.error("Erro ao rodar diagnóstico:", err));
    }
  }, []);
  // =======================================================================

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
    
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Chave da API não encontrada");

      const genAI = new GoogleGenerativeAI(apiKey);
      
      // 👇 SE DER ERRO 404 DE NOVO, TROQUE O NOME ABAIXO POR UM DOS QUE APARECERAM NO CONSOLE!
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        Você é um cliente interessado (ou com dúvidas) em comprar um consórcio.
        Seu nome e seu perfil psicológico: ${activePersona.name} - ${activePersona.description}
        
        Regras muito importantes:
        1. Aja EXATAMENTE como este cliente. Incorpore a personalidade descrita.
        2. Seja natural, use linguagem coloquial do dia a dia, como se estivesse mandando mensagem no WhatsApp.
        3. Suas respostas devem ser curtas (no máximo 3 frases).
        4. NUNCA diga que você é uma Inteligência Artificial ou um assistente virtual.
        5. O vendedor acabou de te mandar esta mensagem: "${userText}". Responda a ele agora:
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const aiText = response.text();

      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: aiText }]);
      
    } catch (error) {
      console.error("DETALHES DO ERRO DA IA:", error);
      toast.error("Erro ao conectar com a IA. Olhe o console F12.");
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
    <div className="h-[calc(100vh-100px)] flex flex-col max-w-5xl mx-auto">
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="page-header mb-0">Simulador com IA</h1>
          </div>
        </div>
        <p className="page-subtitle ml-13">Treine suas técnicas de vendas e quebra de objeções com clientes virtuais</p>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Painel Lateral - Escolha de Persona */}
        <div className="w-80 flex flex-col gap-4 flex-shrink-0 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-2">
            <p className="text-sm text-indigo-800 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>Escolha um perfil de cliente abaixo e treine a sua abordagem como se estivesse no WhatsApp.</span>
            </p>
          </div>

          {PERSONAS.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePersona(p)}
              className={`text-left p-4 rounded-xl border transition-all ${
                activePersona.id === p.id
                  ? "bg-white border-cota-green shadow-md ring-1 ring-cota-green"
                  : "bg-white border-gray-200 hover:border-cota-green/50"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  activePersona.id === p.id ? "bg-cota-green text-white" : "bg-gray-100 text-gray-600"
                }`}>
                  {p.name.charAt(0)}
                </div>
                <h3 className="font-bold text-gray-800 text-sm">{p.name}</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{p.description}</p>
            </button>
          ))}
        </div>

        {/* Janela do Chat */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          {/* Header do Chat */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-bold text-gray-800 text-sm">Simulando conversa com: {activePersona.name}</span>
            </div>
            <button onClick={resetChat} className="text-gray-400 hover:text-cota-green flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-cota-green/10 transition-colors">
              <RefreshCcw className="w-3.5 h-3.5" /> Reiniciar
            </button>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png')] bg-opacity-5">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl p-4 flex gap-3 shadow-sm ${
                  msg.role === "user" 
                    ? "bg-cota-green text-white rounded-tr-sm" 
                    : "bg-white border border-gray-100 text-gray-700 rounded-tl-sm"
                }`}>
                  {msg.role === "assistant" && <Bot className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />}
                  <p className="text-sm leading-relaxed">{msg.content}</p>
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

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite a sua resposta como vendedor..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green focus:bg-white transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-cota-green text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-cota-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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