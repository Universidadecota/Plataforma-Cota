import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";

import LoginPage from "@/pages/auth/LoginPage";
import AppLayout from "@/components/layout/AppLayout";
import DashboardPage from "@/pages/student/DashboardPage";
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

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster richColors position="top-right" />
      <AuthInitializer>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="catalog" element={<CourseCatalogPage />} />
            <Route path="courses/:id" element={<CoursePage />} />
            <Route path="lessons/:id" element={<LessonPage />} />
            <Route path="materials" element={<MaterialsPage />} />
            <Route path="scripts" element={<WhatsAppScriptsPage />} />
            <Route path="objections" element={<ObjectionsPage />} />
            <Route path="quizzes" element={<QuizzesPage />} />
            <Route path="certificates" element={<CertificatesPage />} />
            <Route path="ranking" element={<RankingPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="mentoring" element={<MentoringPage />} />
            <Route path="crm" element={<CRMPage />} />
            <Route path="simulator" element={<AISimulatorPage />} />
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
            {/* Nova Rota Administrativa para Edição de Trilhas */}
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