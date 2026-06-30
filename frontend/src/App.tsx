import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import Layout from "./components/layout/Layout";
import { useAccessibilityStore } from "./store/useAppStore";
import { useVoiceNavigation } from "./lib/useVoiceNavigation";

import HomePage from "./pages/HomePage";
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const SimulatorPage = lazy(() => import("./pages/SimulatorPage"));
const ScreeningPage = lazy(() => import("./pages/ScreeningPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const TreatmentsPage = lazy(() => import("./pages/TreatmentsPage"));
const AssistantPage = lazy(() => import("./pages/AssistantPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
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

  useEffect(() => {
    document.documentElement.dataset.contrast = highContrast ? "high" : "normal";
    document.documentElement.dataset.textSize = largeText ? "large" : "normal";
  }, [highContrast, largeText]);

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
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
