import { Menu, Bell, Star } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuthStore();

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between gap-2 px-4 md:px-6 flex-shrink-0 shadow-sm w-full min-w-0 relative z-30">
      <div className="flex items-center gap-3 min-w-0">
        {/* Menu Hamburguer para Mobile */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-cota-green"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        <div className="hidden sm:block">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            {new Intl.DateTimeFormat("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date())}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-shrink-0">
        {/* Badge de Pontos */}
        <div className="flex items-center gap-1.5 bg-cota-gold/10 text-cota-gold px-2 sm:px-3 py-1.5 rounded-full flex-shrink-0">
          <Star className="w-3.5 h-3.5 fill-cota-gold" />
          <span className="text-xs font-bold">{user?.points || 0} pts</span>
        </div>

        {/* Notificações */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cota-gold rounded-full ring-2 ring-white" />
        </button>

        {/* Perfil */}
        <div className="flex items-center gap-3 border-l border-gray-100 pl-2 md:pl-4 min-w-0 flex-shrink-0">
          <div className="hidden md:block text-right mr-1">
            <p className="text-sm font-bold text-gray-800 leading-tight">
              {user?.full_name?.split(' ')[0] || user?.username}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-cota-green flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-cota-green/20 flex-shrink-0">
            {(user?.full_name || user?.username || "U").charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}