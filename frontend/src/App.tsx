import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import Layout from "./components/layout/Layout";
import { useAccessibilityStore, useAuthStore } from "./store/useAppStore";
import { useVoiceNavigation } from "./lib/useVoiceNavigation";

import HomePage from "./pages/HomePage";
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const SimulatorPage = lazy(() => import("./pages/SimulatorPage"));
const ScreeningPage = lazy(() => import("./pages/ScreeningPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const TreatmentsPage = lazy(() => import("./pages/TreatmentsPage"));
const AssistantPage = lazy(() => import("./pages/AssistantPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const ReportPage = lazy(() => import("./pages/ReportPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));


function PageFallback() {

  return (
    <div className="container" style={{ padding: "var(--sp-9) 0", textAlign: "center", color: "var(--color-body)" }}>
      Loading…
    </div>
  );
}

function VoiceNavListener() {
  useVoiceNavigation();
  return null;
}

export default function App() {
  const { highContrast, largeText } = useAccessibilityStore();
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    document.documentElement.dataset.contrast = highContrast ? "high" : "normal";
    document.documentElement.dataset.textSize = largeText ? "large" : "normal";
  }, [highContrast, largeText]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <VoiceNavListener />
      <Layout>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="/screening" element={<ScreeningPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/treatments" element={<TreatmentsPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/report/:sessionId" element={<ReportPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
