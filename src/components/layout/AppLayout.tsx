import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden w-full relative">
      {/* Mobile sidebar overlay (Fundo escuro ao abrir o menu) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Menu Lateral) */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-[280px] bg-cota-green-dark transition-transform duration-300 ease-in-out shadow-2xl
          lg:static lg:translate-x-0 lg:z-auto lg:shadow-none
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content (Área de Conteúdo) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        {/* A trava 'overflow-x-hidden' impede que tabelas quebrem o ecrã inteiro para os lados */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth">
          <div className="w-full max-w-7xl mx-auto pb-20 lg:pb-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}