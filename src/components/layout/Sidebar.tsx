import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, ShieldAlert, Trophy, Award, Bell, Users, Settings,
  LogOut, GraduationCap, MessageCircle, BarChart3, X,
  FileText, Video, Sparkles
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/catalog", icon: BookOpen, label: "Catálogo de Trilhas" },
  { to: "/materials", icon: FileText, label: "Materiais" },
  { to: "/scripts", icon: MessageCircle, label: "Scripts WhatsApp" },
  { to: "/objections", icon: ShieldAlert, label: "Banco de Objeções" },
  { to: "/quizzes", icon: Video, label: "Quizzes" },
  { to: "/certificates", icon: Award, label: "Certificados" },
  { to: "/ranking", icon: Trophy, label: "Ranking" },
  { to: "/announcements", icon: Bell, label: "Comunicados" },
  { to: "/mentoring", icon: Users, label: "Mentorias" },
  { to: "/simulator", icon: Sparkles, label: "Simulador de IA" },
];

const adminItems: NavItem[] = [
  { to: "/manager", icon: BarChart3, label: "Painel do Gestor", roles: ["manager", "admin"] },
  { to: "/admin", icon: Settings, label: "Administração", roles: ["admin"] },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { user } = useAuthStore();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await Promise.race([
        signOut(),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
    } catch (e) {
      console.warn("Servidor lento, forçando limpeza local...");
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      window.location.replace("/login");
    }
  };

  const filteredNavItems = navItems.filter((item) => {
    if (user?.role === "partner" || user?.role === "pending_partner") {
      return item.to === "/";
    }
    return true;
  });

  const getLinkLabel = (item: NavItem) => {
    if (item.to === "/" && (user?.role === "partner" || user?.role === "pending_partner")) {
      return "Portal do Parceiro";
    }
    return item.label;
  };

  // Função independente para garantir que a etiqueta NUNCA fique em branco
  const getDisplayRole = (role?: string) => {
    switch(role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gestor Comercial';
      case 'instructor': return 'Instrutor';
      case 'partner': return 'Parceiro Comercial';
      case 'pending_partner': return 'Parceiro (Em Análise)';
      case 'consultant': return 'Consultor'; // <--- NOVA LINHA AQUI
      case 'student': return 'Aluno';
      default: return 'Aluno';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0D211A] text-gray-300 shadow-2xl">
      <div className="p-6 flex items-center justify-between flex-shrink-0 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cota-gold to-yellow-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <GraduationCap className="w-6 h-6 text-[#0D211A]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-white tracking-wider truncate">C.O.T.A.</h1>
            <p className="text-[10px] text-cota-gold uppercase tracking-widest font-bold">Universidade</p>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="lg:hidden p-2 -mr-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          aria-label="Fechar menu"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-5 px-4 space-y-1.5 custom-scrollbar">
        <p className="px-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Menu Principal</p>
        
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-cota-green text-white shadow-md shadow-cota-green/20"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">{getLinkLabel(item)}</span>
          </NavLink>
        ))}

        {(user?.role === "admin" || user?.role === "manager") && (
          <>
            <div className="h-px bg-white/5 my-6 mx-2" />
            <p className="px-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Gestão</p>
            {adminItems
              .filter((item) => !item.roles || item.roles.includes(user.role))
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-cota-gold/20 text-cota-gold border border-cota-gold/30 shadow-md"
                        : "text-gray-400 hover:bg-white/5 hover:text-cota-gold"
                    )
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
          </>
        )}
      </nav>

      <div className="p-4 bg-black/20 border-t border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-cota-gold/20 flex items-center justify-center text-cota-gold font-bold text-sm flex-shrink-0 border border-cota-gold/30">
            {(user?.full_name || user?.username || "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-gray-200 text-sm font-bold truncate">
              {user?.full_name || user?.username}
            </p>
            <p className="text-cota-green text-xs font-medium uppercase tracking-wider truncate">
              {/* O cargo sempre aparecerá aqui de forma confiável */}
              {getDisplayRole(user?.role)}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors border border-red-500/20"
        >
          <LogOut className="w-4 h-4" />
          Sair da Conta
        </button>
      </div>
    </div>
  );
}