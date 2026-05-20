import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";

import LoginPage from "@/pages/auth/LoginPage";
import PartnerRegister from "@/pages/auth/PartnerRegister";
import AppLayout from "@/components/layout/AppLayout";
import DashboardPage from "@/pages/student/DashboardPage";
import PartnerDashboard from "@/pages/partner/PartnerDashboard";
import CourseCatalogPage from "@/pages/student/CourseCatalogPage";
import CoursePage from "@/pages/student/CoursePage";
import LessonPage from "@/pages/student/LessonPage";
import MaterialsPage from "@/pages/student/MaterialsPage";
import WhatsAppScriptsPage from "@/pages/student/WhatsAppScriptsPage";
import ObjectionsPage from "@/pages/student/ObjectionsPage";
import QuizzesPage from "@/pages/student/QuizzesPage";
import CertificatesPage from "@/pages/student/CertificatesPage";
import RankingPage from "@/pages/student/RankingPage";
import AnnouncementsPage from "@/pages/student/AnnouncementsPage";
import MentoringPage from "@/pages/student/MentoringPage";
import ManagerDashboard from "@/pages/manager/ManagerDashboard";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import CourseEditorPage from "@/pages/admin/CourseEditorPage";
import NotFound from "@/pages/NotFound";
import CRMPage from "@/pages/crm/CRMPage";
import AISimulatorPage from "@/pages/student/AISimulatorPage";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cota-green-dark">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-cota-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/70 text-sm">Carregando Universidade C.O.T.A...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: string[];
}) {
  const { user, loading } = useAuthStore();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role))
    return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AuthInitializer({ children }: { children: ReactNode }) {
  useAuth();
  return <>{children}</>;
}

// Seletor Inteligente para a rota raiz "/"
function IndexRouteSelector() {
  const { user } = useAuthStore();

  // Parceiro aprovado cai direto no portal de envio de leads
  if (user?.role === "partner") {
    return <PartnerDashboard />;
  }
  // Alunos, Admins, Gestores e Parceiros Pendentes usam o Dashboard base
  return <DashboardPage />;
}

export default function App() {
  // Lista de cargos que possuem acesso ao conteúdo educacional/estágios de aluno
  const studentCoreRoles = ["admin", "manager", "instructor", "student", "consultant"];

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster richColors position="top-right" />
      <AuthInitializer>
        <Routes>
          <Route path="/seja-parceiro" element={<PartnerRegister />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Rota Raiz Dinâmica baseada no Perfil */}
            <Route index element={<IndexRouteSelector />} />
            
            {/* Rotas Educacionais Protegidas contra Parceiros Comerciais */}
            <Route path="catalog" element={
              <ProtectedRoute allowedRoles={studentCoreRoles}>
                <CourseCatalogPage />
              </ProtectedRoute>
            } />
            <Route path="courses/:id" element={
              <ProtectedRoute allowedRoles={studentCoreRoles}>
                <CoursePage />
              </ProtectedRoute>
            } />
            <Route path="lessons/:id" element={
              <ProtectedRoute allowedRoles={studentCoreRoles}>
                <LessonPage />
              </ProtectedRoute>
            } />
            <Route path="materials" element={
              <ProtectedRoute allowedRoles={studentCoreRoles}>
                <MaterialsPage />
              </ProtectedRoute>
            } />
            <Route path="scripts" element={
              <ProtectedRoute allowedRoles={studentCoreRoles}>
                <WhatsAppScriptsPage />
              </ProtectedRoute>
            } />
            <Route path="objections" element={
              <ProtectedRoute allowedRoles={studentCoreRoles}>
                <ObjectionsPage />
              </ProtectedRoute>
            } />
            <Route path="quizzes" element={
              <ProtectedRoute allowedRoles={studentCoreRoles}>
                <QuizzesPage />
              </ProtectedRoute>
            } />
            <Route path="certificates" element={
              <ProtectedRoute allowedRoles={studentCoreRoles}>
                <CertificatesPage />
              </ProtectedRoute>
            } />
            <Route path="ranking" element={
              <ProtectedRoute allowedRoles={studentCoreRoles}>
                <RankingPage />
              </ProtectedRoute>
            } />
            <Route path="announcements" element={
              <ProtectedRoute allowedRoles={studentCoreRoles}>
                <AnnouncementsPage />
              </ProtectedRoute>
            } />
            <Route path="mentoring" element={
              <ProtectedRoute allowedRoles={studentCoreRoles}>
                <MentoringPage />
              </ProtectedRoute>
            } />
            <Route path="simulator" element={
              <ProtectedRoute allowedRoles={studentCoreRoles}>
                <AISimulatorPage />
              </ProtectedRoute>
            } />

            {/* Gestão interna de leads e CRM corporativo */}
            <Route path="crm" element={
              <ProtectedRoute allowedRoles={["admin", "manager", "instructor"]}>
                <CRMPage />
              </ProtectedRoute>
            } />
            <Route
              path="manager"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            
            <Route path="crm" element={
              <ProtectedRoute allowedRoles={["admin", "manager", "consultant"]}>
                <CRMPage />
              </ProtectedRoute>
            } />
            
            <Route
              path="admin/courses/:id"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <CourseEditorPage />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthInitializer>
    </BrowserRouter>
  );
}