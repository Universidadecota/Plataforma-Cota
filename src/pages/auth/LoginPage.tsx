import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { GraduationCap, Eye, EyeOff, Mail, Lock, User, ArrowRight, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";
type RegisterStep = "email" | "otp" | "password";

export default function LoginPage() {
  const navigate = useNavigate();
  const { sendOtp, verifyOtpAndRegister, signIn } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<RegisterStep>("email");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao fazer login.";
      toast.error(msg.includes("Invalid login") ? "E-mail ou senha incorretos." : msg);
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Informe seu e-mail."); return; }
    setLoading(true);
    try {
      await sendOtp(email);
      toast.success("Código enviado para o seu e-mail!");
      setStep("otp");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar código.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) { toast.error("Informe o código recebido."); return; }
    setStep("password");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !password) { toast.error("Preencha todos os campos."); return; }
    if (password.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres."); return; }
    setLoading(true);
    try {
      await verifyOtpAndRegister(email, otp, password, fullName);
      toast.success("Conta criada! Bem-vindo(a) à Universidade C.O.T.A.!");
      navigate("/");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar conta.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-cota-green-dark flex-col justify-between p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full border-4 border-white" />
          <div className="absolute top-40 left-40 w-96 h-96 rounded-full border-4 border-white" />
          <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full border-4 border-cota-gold" />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-cota-gold flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-cota-green-dark" />
          </div>
          <div>
            <p className="text-white/80 text-sm font-medium">Universidade</p>
            <p className="text-cota-gold font-black text-2xl tracking-widest">C.O.T.A.</p>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Formação completa para{" "}
            <span className="text-cota-gold">alta performance</span> em consórcio
          </h1>
          <p className="text-white/70 text-lg mb-10 leading-relaxed">
            Capacite-se com as melhores trilhas de aprendizado, scripts de vendas,
            banco de objeções e certificações profissionais.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "10 Trilhas", desc: "especializadas" },
              { label: "100%", desc: "baseado em dados" },
              { label: "Certificados", desc: "reconhecidos" },
              { label: "Ranking", desc: "de desempenho" },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 rounded-xl p-4 border border-white/10">
                <p className="text-cota-gold font-bold text-lg">{item.label}</p>
                <p className="text-white/60 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-sm relative z-10">
          © {new Date().getFullYear()} Universidade C.O.T.A. Todos os direitos reservados.
        </p>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-cota-cream">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-lg bg-cota-green flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-cota-green text-xs font-medium">Universidade</p>
              <p className="text-cota-green font-black text-xl tracking-widest">C.O.T.A.</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            {(["login", "register"] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setStep("email"); }}
                className={cn(
                  "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all",
                  mode === m
                    ? "bg-cota-green text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {m === "login" ? "Entrar" : "Criar Conta"}
              </button>
            ))}
          </div>

          {/* Login Form */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green transition-all bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green transition-all bg-white"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-cota-green hover:bg-cota-green-light text-white py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>
                  Entrar <ArrowRight className="w-4 h-4" />
                </>}
              </button>
            </form>
          )}

          {/* Register Form */}
          {mode === "register" && (
            <div>
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6">
                {["E-mail", "Verificação", "Dados"].map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center",
                      i === 0 && step === "email" ? "bg-cota-green text-white" :
                      i === 1 && step === "otp" ? "bg-cota-green text-white" :
                      i === 2 && step === "password" ? "bg-cota-green text-white" :
                      (i === 0 && step !== "email") || (i === 1 && step === "password") ? "bg-cota-gold text-white" :
                      "bg-gray-200 text-gray-500"
                    )}>{i + 1}</div>
                    <span className="text-xs text-gray-500 hidden sm:block">{s}</span>
                    {i < 2 && <div className="w-6 h-px bg-gray-200" />}
                  </div>
                ))}
              </div>

              {step === "email" && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Seu e-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green transition-all bg-white" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Enviaremos um código de verificação para seu e-mail.</p>
                  <button type="submit" disabled={loading}
                    className="w-full bg-cota-green hover:bg-cota-green-light text-white py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Enviar Código <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              )}

              {step === "otp" && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-3">Enviamos um código de 8 dígitos para <strong>{email}</strong></p>
                  <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
                   placeholder="00000000" maxLength={8}
                   className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green transition-all bg-white text-center tracking-widest text-lg font-bold" />
                  </div>
                  </div>
                  <button type="submit" className="w-full bg-cota-green hover:bg-cota-green-light text-white py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2">
                    Verificar Código <ArrowRight className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setStep("email")} className="w-full text-sm text-gray-500 hover:text-gray-700">
                    Voltar e alterar e-mail
                  </button>
                </form>
              )}

              {step === "password" && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                        placeholder="Seu nome completo"
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green transition-all bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Crie sua senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cota-green/30 focus:border-cota-green transition-all bg-white" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-cota-gold hover:bg-cota-gold-dark text-cota-green-dark py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                    {loading ? <div className="w-4 h-4 border-2 border-cota-green border-t-transparent rounded-full animate-spin" /> : <>Criar minha conta <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              )}
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-8">
            Ao acessar, você concorda com nossos{" "}
            <span className="text-cota-green underline cursor-pointer">Termos de Uso</span>{" "}
            e <span className="text-cota-green underline cursor-pointer">Política de Privacidade</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
