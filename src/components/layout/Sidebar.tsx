import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, ShieldAlert, Trophy, Award, Bell, Users, Settings,
  LogOut, GraduationCap, MessageCircle, BarChart3, X,
  FileText, Video, Briefcase, Sparkles
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/constants";

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
  { to: "/simulator", icon: Sparkles, label: "Simulador IA" },
  { to: "/crm", icon: Briefcase, label: "CRM Comercial" },
  {
    to: "/manager",
    icon: BarChart3,
    label: "Painel do Gestor",
    roles: ["admin", "manager"],
  },
  {
    to: "/admin",
    icon: Settings,
    label: "Administração",
    roles: ["admin"],
  },
];

interface SidebarProps {
  onClose: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { user } = useAuthStore();
  const { signOut } = useAuth();

  // Função VERDADEIRAMENTE blindada (Sem await)
  const handleSignOut = () => {
    // 1. Limpa a memória local IMEDIATAMENTE antes de falar com o servidor
    localStorage.clear();
    sessionStorage.clear();

    // 2. Manda o aviso para o Supabase, mas NÃO espera por ele (sem await)
    signOut().catch(() => console.warn("Sessão ignorada."));

    // 3. Atira o utilizador para a tela de login na mesma hora
    window.location.href = "/login";
  };

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role || "student")
  );

  return (
    <div className="flex flex-col h-full bg-cota-green-dark">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cota-gold flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-cota-green-dark" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">
              Universidade
            </p>
            <p className="text-cota-gold font-black text-base leading-tight tracking-wider">
              C.O.T.A.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden text-white/50 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "sidebar-item",
                  isActive ? "sidebar-item-active" : "sidebar-item-default"
                )
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User info */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-cota-gold/30 flex items-center justify-center text-cota-gold font-bold text-sm flex-shrink-0">
            {(user?.full_name || user?.username || "U")
              .charAt(0)
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">
              {user?.full_name || user?.username}
            </p>
            <p className="text-cota-gold/80 text-xs">
              {ROLE_LABELS[user?.role || "student"]}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </div>
  );
}