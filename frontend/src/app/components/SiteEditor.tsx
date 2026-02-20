import React, { useState } from 'react';
import { TopBar } from './TopBar';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { SiteProvider } from '../context/SiteContext';
import { WorkflowProvider } from '../context/WorkflowContext';
import { PanelRight, X } from 'lucide-react';

// Main SiteForge editor with workflow and comments support
export const SiteEditor: React.FC = () => {
  const [boqOpen, setBoqOpen] = useState(false);

  return (
    <WorkflowProvider>
      <SiteProvider>
        <div className="h-screen flex flex-col overflow-hidden">
          <TopBar />

          <div className="flex-1 flex relative overflow-hidden">
            {/* Left panel — always full width when BOQ closed */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <LeftPanel />
            </div>

            {/* BOQ toggle tab — visible when panel is closed */}
            {!boqOpen && (
              <button
                onClick={() => setBoqOpen(true)}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 bg-white border border-r-0 border-gray-300 rounded-l-lg px-2 py-3 shadow-sm hover:bg-gray-50 transition-colors"
                title="Open BOQ Live View"
              >
                <PanelRight className="h-4 w-4 text-gray-600" />
                <span className="text-xs font-medium text-gray-600 [writing-mode:vertical-lr] rotate-180">
                  BOQ
                </span>
              </button>
            )}

            {/* BOQ right panel — slides in from right */}
            <div
              className={`border-l border-gray-200 transition-all duration-300 ease-in-out ${
                boqOpen ? 'w-[55%] min-w-[400px]' : 'w-0'
              } overflow-hidden`}
            >
              <div className="h-full min-w-[400px] relative">
                {/* Close button inside panel header */}
                <button
                  onClick={() => setBoqOpen(false)}
                  className="absolute top-3 right-3 z-10 p-1 rounded hover:bg-gray-100 transition-colors"
                  title="Close BOQ Live View"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
                <RightPanel />
              </div>
            </div>
          </div>
        </div>
      </SiteProvider>
    </WorkflowProvider>
  );
};
