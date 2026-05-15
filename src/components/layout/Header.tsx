import { Menu, Bell, Star } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { ROLE_LABELS } from "@/constants";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuthStore();

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 flex-shrink-0 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <div className="hidden sm:block">
          <p className="text-xs text-gray-400">
            {new Intl.DateTimeFormat("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date())}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Points badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-cota-gold/10 text-cota-gold px-3 py-1.5 rounded-full">
          <Star className="w-3.5 h-3.5 fill-cota-gold" />
          <span className="text-xs font-bold">{user?.points || 0} pts</span>
        </div>

        {/* Notification bell */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-cota-gold rounded-full" />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-cota-green flex items-center justify-center text-white font-bold text-sm">
            {(user?.full_name || user?.username || "U").charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block text-right">
            <p className="text-sm font-semibold text-gray-800 leading-tight">
              {user?.full_name || user?.username}
            </p>
            <p className="text-xs text-gray-400">
              {ROLE_LABELS[user?.role || "student"]}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
