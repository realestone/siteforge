import { useState, useEffect, useRef } from "react";
import { HomeScreen } from "./components/HomeScreen";
import { SiteEditor } from "./components/SiteEditor";
import { SiteProvider, useSiteContext } from "./context/SiteContext";
import { WorkflowProvider } from "./context/WorkflowContext";
import { NavigationProvider } from "./context/NavigationContext";
import { Toaster } from "./components/ui/sonner";

function AppContent() {
  const [currentView, setCurrentView] = useState<"home" | "editor">("home");
  const { projectId, loadProject, clearProject, projectLoading } =
    useSiteContext();

  // Auto-navigate to editor when project is restored from localStorage on mount.
  // Uses projectLoading transition (true → false with projectId set) to detect restore
  // completion, rather than watching projectId directly — which would also fire during
  // OneDrive import and prematurely switch away from the import/kickstart flow.
  const prevLoading = useRef(false);
  useEffect(() => {
    if (
      prevLoading.current &&
      !projectLoading &&
      projectId &&
      currentView === "home"
    ) {
      setCurrentView("editor");
    }
    prevLoading.current = projectLoading;
  }, [projectLoading, projectId, currentView]);

  const handleSiteSelect = async (siteId: string) => {
    // If this project is already loaded in context (e.g. from OneDrive import flow),
    // skip reloading — just switch to editor. Reloading would overwrite TSSR fields
    // that were just set but not yet persisted (debounced sync).
    if (projectId === siteId) {
      setCurrentView("editor");
      return;
    }
    const ok = await loadProject(siteId);
    if (ok) {
      setCurrentView("editor");
    }
  };

  const handleBackToHome = () => {
    clearProject();
    setCurrentView("home");
  };

  if (projectLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <NavigationProvider onNavigateHome={handleBackToHome}>
      {currentView === "home" && <HomeScreen onSiteSelect={handleSiteSelect} />}
      {currentView === "editor" && <SiteEditor />}
    </NavigationProvider>
  );
}

export default function App() {
  return (
    <WorkflowProvider>
      <SiteProvider>
        <AppContent />
        <Toaster />
      </SiteProvider>
    </WorkflowProvider>
  );
}
