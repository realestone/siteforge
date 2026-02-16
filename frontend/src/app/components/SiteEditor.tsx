import React from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';
import { TopBar } from './TopBar';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { BottomPanel } from './BottomPanel';
import { SiteProvider } from '../context/SiteContext';
import { WorkflowProvider } from '../context/WorkflowContext';

// Main SiteForge editor with workflow and comments support
export const SiteEditor: React.FC = () => {
  return (
    <WorkflowProvider>
      <SiteProvider>
        <div className="h-screen flex flex-col overflow-hidden">
          <TopBar />
          
          <ResizablePanelGroup direction="vertical" className="flex-1">
            <ResizablePanel defaultSize={75} minSize={50}>
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={45} minSize={30}>
                  <LeftPanel />
                </ResizablePanel>
                
                <ResizableHandle withHandle />
                
                <ResizablePanel defaultSize={55} minSize={30}>
                  <RightPanel />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel defaultSize={25} minSize={15} maxSize={50}>
              <BottomPanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </SiteProvider>
    </WorkflowProvider>
  );
};