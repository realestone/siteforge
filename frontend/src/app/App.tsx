import { useState } from "react";
import { HomeScreen } from "./components/HomeScreen";
import { SiteEditor } from "./components/SiteEditor";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  const [currentView, setCurrentView] = useState<"home" | "editor">("home");

  const handleSiteSelect = (_siteId: string) => {
    setCurrentView("editor");
  };

  return (
    <>
      {currentView === "home" && <HomeScreen onSiteSelect={handleSiteSelect} />}
      {currentView === "editor" && <SiteEditor />}
      <Toaster />
    </>
  );
}
