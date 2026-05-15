import { Link } from "react-router-dom";
import { GraduationCap, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cota-green-dark flex items-center justify-center p-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-cota-gold flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-cota-green-dark" />
          </div>
          <p className="text-cota-gold font-black text-2xl tracking-widest">C.O.T.A.</p>
        </div>

        <h1 className="text-8xl font-black text-cota-gold mb-4">404</h1>
        <h2 className="text-2xl font-bold text-white mb-3">Página não encontrada</h2>
        <p className="text-white/60 mb-8 max-w-sm mx-auto">
          A página que você está buscando não existe ou foi movida.
        </p>

        <Link to="/"
          className="inline-flex items-center gap-2 bg-cota-gold hover:bg-cota-gold-dark text-cota-green-dark px-6 py-3 rounded-xl font-bold transition-colors">
          <Home className="w-4 h-4" /> Voltar ao início
        </Link>
      </div>
    </div>
  );
}
