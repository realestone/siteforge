import React, { useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { SiteEditor } from './components/SiteEditor';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'editor'>('home');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const handleSiteSelect = (siteId: string) => {
    setSelectedSiteId(siteId);
    setCurrentView('editor');
  };

  return (
    <>
      {currentView === 'home' && <HomeScreen onSiteSelect={handleSiteSelect} />}
      {currentView === 'editor' && <SiteEditor />}
      <Toaster />
    </>
  );
}
