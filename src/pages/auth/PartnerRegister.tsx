import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { ShieldCheck, Mail, Lock, User, Phone, Briefcase, ArrowRight, CheckCircle } from "lucide-react";

export default function PartnerRegister() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyType, setCompanyType] = useState("Corretor Autônomo");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptLgpdResponsibility, setAcceptLgpdResponsibility] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !phone) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (!acceptTerms || !acceptPrivacy || !acceptLgpdResponsibility) {
      toast.error("Para solicitar acesso, aceite os termos, a política de privacidade e a declaração LGPD.");
      return;
    }

    try {
      setLoading(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // 1. Criar a credencial de acesso no Auth do Supabase
      const signupResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!signupResponse.ok) {
        const errData = await signupResponse.json();
        throw new Error(errData.msg || errData.error_description || "Erro ao criar credenciais de acesso.");
      }

      const signupData = await signupResponse.json();
      const session = signupData.session;
      const authUser = signupData.user || session?.user;

      if (!authUser) {
        throw new Error("Não foi possível obter o ID de autenticação.");
      }

      const token = session?.access_token || supabaseAnonKey;
      const acceptedAt = new Date().toISOString();

      // 2. Registrar/atualizar o perfil como "pending_partner" via RPC segura no Supabase.
      // Essa função evita que o trigger padrão mantenha o usuário como "student".
      const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/register_pending_partner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          p_user_id: authUser.id,
          p_email: email.trim(),
          p_full_name: fullName.trim(),
          p_phone: phone.trim(),
          p_company_type: companyType,
          p_accepted_at: acceptedAt,
          p_user_agent: navigator.userAgent
        }),
      });

      if (!rpcResponse.ok) {
        const errText = await rpcResponse.text();
        throw new Error(`Erro ao registrar perfil de parceiro: ${errText}`);
      }

      // Sucesso! Avisa o usuário que ele precisa esperar e manda para o login.
      toast.success("Cadastro recebido! Sua conta passará por aprovação. 🚀");
      navigate("/login");

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao processar o cadastro de parceiro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gray-50">
      
      <div className="hidden lg:flex flex-col justify-between bg-cota-green-dark p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(57,255,106,0.15),transparent_40%)]" />
        
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-cota-gold flex items-center justify-center shadow-md">
            <ShieldCheck className="w-5 h-5 text-cota-green-dark" />
          </div>
          <span className="font-black tracking-wider text-sm uppercase text-cota-gold">Universidade EPSA</span>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <h2 className="text-4xl font-extrabold leading-tight">
            Transforme rejeição bancária em <span className="text-cota-gold">faturamento imobiliário</span>.
          </h2>
          <p className="text-white/75 text-sm leading-relaxed">
            Não jogue dinheiro fora com leads descartados. Cadastre clientes que autorizaram o encaminhamento para análise de alternativas patrimoniais, acompanhe a esteira de consórcios em tempo real e receba 30% de split de comissão.
          </p>

          <div className="space-y-3 pt-4">
            {[
              "Cadastro simplificado de leads em 2 passos",
              "Pipeline de tratativas transparente e em tempo real",
              "Acesso à infraestrutura de conversão especializada",
              "Dupla monetização: consórcio + venda futura"
            ].map((text) => (
              <div key={text} className="flex items-center gap-3 text-xs font-medium text-white/90">
                <CheckCircle className="w-4 h-4 text-cota-gold flex-shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/40 font-medium tracking-wide uppercase">
          Ambiente Corporativo · Rastreabilidade Garantida
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md space-y-6">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-cota-green uppercase bg-cota-green/10 px-2.5 py-1 rounded-full">Seja um Parceiro</span>
            <h1 className="text-2xl font-black text-gray-900 mt-3">Criar Conta Comercial</h1>
            <p className="text-xs text-gray-500 mt-1">Insira os dados da sua operação para começar a enviar leads hoje.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Nome Completo / Razão Social</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Imobiliária Rio Central" 
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cota-green focus:ring-1 focus:ring-cota-green/30" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">WhatsApp de Contato</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(21) 99999-9999" 
                    required
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cota-green focus:ring-1 focus:ring-cota-green/30" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Tipo de Atuação</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <select 
                    value={companyType} 
                    onChange={(e) => setCompanyType(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-cota-green focus:ring-1 focus:ring-cota-green/30 appearance-none"
                  >
                    <option value="Corretor Autônomo">Corretor Autônomo</option>
                    <option value="Imobiliária">Imobiliária</option>
                    <option value="Construtora">Construtora</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">E-mail Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parceiro@empresa.com" 
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cota-green focus:ring-1 focus:ring-cota-green/30" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Senha de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cota-green focus:ring-1 focus:ring-cota-green/30" 
                />
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-cota-gold/30 bg-cota-gold/5 p-4">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-cota-green focus:ring-cota-green"
                />
                <span className="text-[11px] text-gray-600 leading-relaxed">
                  Li e aceito os <Link to="/termos-de-parceria" target="_blank" className="font-bold text-cota-green hover:underline">Termos de Parceria da Universidade EPSA</Link>.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptPrivacy}
                  onChange={(e) => setAcceptPrivacy(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-cota-green focus:ring-cota-green"
                />
                <span className="text-[11px] text-gray-600 leading-relaxed">
                  Li e aceito a <Link to="/politica-de-privacidade" target="_blank" className="font-bold text-cota-green hover:underline">Política de Privacidade da Universidade EPSA</Link>.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptLgpdResponsibility}
                  onChange={(e) => setAcceptLgpdResponsibility(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-cota-green focus:ring-cota-green"
                />
                <span className="text-[11px] text-gray-600 leading-relaxed">
                  Declaro que somente enviarei leads obtidos de forma lícita, com ciência do titular, e que não cadastrarei dados comprados, extraídos ou compartilhados sem autorização.
                </span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={loading || !acceptTerms || !acceptPrivacy || !acceptLgpdResponsibility}
              className="w-full flex items-center justify-center gap-2 bg-cota-green text-white py-2.5 rounded-xl text-sm font-bold hover:bg-cota-green-light transition-colors shadow-sm disabled:opacity-50 mt-2"
            >
              {loading ? "Processando Credenciais..." : "Solicitar Acesso Parceiro"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Já possui homologação?{" "}
              <Link to="/login" className="text-cota-green font-bold hover:underline">
                Acesse sua conta
              </Link>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}