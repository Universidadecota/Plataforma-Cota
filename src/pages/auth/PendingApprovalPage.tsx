import { LogOut, Clock, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function PendingApprovalPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      localStorage.clear();
      toast.success("Sessão encerrada.");
      navigate("/login", { replace: true });
    } catch {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-gray-100 shadow-xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-cota-gold/20 flex items-center justify-center mx-auto mb-5">
          <Clock className="w-8 h-8 text-cota-gold" />
        </div>

        <p className="text-[11px] uppercase tracking-[0.25em] text-cota-green font-black mb-3">
          Universidade EPSA
        </p>

        <h1 className="text-2xl font-black text-gray-900 mb-3">
          Seu cadastro está em análise
        </h1>

        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          Recebemos sua solicitação de acesso como parceiro. Antes de liberar o portal,
          nossa equipe precisa validar seus dados e homologar sua conta.
        </p>

        <div className="rounded-2xl bg-cota-green/5 border border-cota-green/10 p-5 text-left mb-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-cota-green mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-gray-900 mb-1">
                Status atual: aguardando aprovação
              </h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                Assim que sua conta for aprovada, você poderá acessar o Portal do Parceiro,
                cadastrar leads e acompanhar suas oportunidades em tempo real.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-cota-green text-white py-3 rounded-xl text-sm font-bold hover:bg-cota-green-light transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair e voltar para o login
        </button>

        <p className="text-[11px] text-gray-400 mt-5">
          Em caso de urgência, entre em contato com a equipe EPSA responsável pela homologação.
        </p>
      </div>
    </div>
  );
}