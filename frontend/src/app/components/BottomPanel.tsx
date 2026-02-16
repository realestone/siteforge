import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CheckCircle2, AlertCircle, AlertTriangle, Clock, MessageSquare } from 'lucide-react';
import { useSiteContext } from '../context/SiteContext';
import { useWorkflowContext } from '../context/WorkflowContext';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { CommentsPanel } from './CommentsPanel';

export const BottomPanel: React.FC = () => {
  const { validationResults, changeLog } = useSiteContext();
  const { workflow } = useWorkflowContext();
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'agent'; message: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  
  const errorCount = validationResults.filter(r => r.type === 'error').length;
  const warningCount = validationResults.filter(r => r.type === 'warning').length;
  const successCount = validationResults.filter(r => r.type === 'success').length;
  const unresolvedComments = workflow.comments.filter(c => !c.resolved).length;
  
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    
    setChatMessages(prev => [
      ...prev,
      { role: 'user', message: chatInput },
      { role: 'agent', message: 'AI chat is currently in demo mode. This feature will analyze your request and suggest changes to the TSSR and BOQ.' },
    ]);
    setChatInput('');
  };
  
  return (
    <div className="border-t bg-white">
      <Tabs defaultValue="validation" className="h-full flex flex-col">
        <div className="border-b px-4">
          <TabsList className="h-12">
            <TabsTrigger value="validation" className="gap-2">
              Validation
              {errorCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5">
                  {errorCount}
                </Badge>
              )}
              {warningCount > 0 && errorCount === 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 bg-amber-100 text-amber-800">
                  {warningCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments
              {unresolvedComments > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 bg-orange-100 text-orange-800">
                  {unresolvedComments}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="changes" className="gap-2">
              <Clock className="h-4 w-4" />
              Changes
              {changeLog.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5">
                  {changeLog.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="validation" className="flex-1 m-0 p-4">
          <ScrollArea className="h-[calc(100%-2rem)]">
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-sm pb-3 border-b">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-green-700 font-medium">{successCount} rules passed</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-700 font-medium">{warningCount} warnings</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-700 font-medium">{errorCount} errors</span>
                </div>
              </div>
              
              {validationResults.map((result) => (
                <div
                  key={result.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    result.type === 'error'
                      ? 'bg-red-50 border-red-200'
                      : result.type === 'warning'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  {result.type === 'error' && <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />}
                  {result.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />}
                  {result.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />}
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-medium">{result.code}:</span> {result.message}
                    </div>
                    {result.fields && result.fields.length > 0 && (
                      <div className="mt-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          Highlight fields
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {validationResults.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No validation results yet. Click "Validate All" to run checks.
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="comments" className="flex-1 m-0">
          <CommentsPanel />
        </TabsContent>
        
        <TabsContent value="chat" className="flex-1 m-0 p-4 flex flex-col">
          <ScrollArea className="flex-1 mb-4">
            <div className="space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm">Ask the AI to help modify your TSSR or BOQ</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Example: "Change sector C cable route to 40m"
                  </p>
                </div>
              )}
              
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="text-xs font-medium mb-1 opacity-70">
                      {msg.role === 'user' ? 'You' : 'Agent'}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button onClick={handleSendMessage} className="bg-teal-600 hover:bg-teal-700">
              Send
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="changes" className="flex-1 m-0 p-4">
          <ScrollArea className="h-[calc(100%-2rem)]">
            <div className="space-y-2">
              {changeLog.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No changes yet
                </div>
              )}
              
              {changeLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-gray-50"
                >
                  <Clock className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-600 font-medium">{entry.timestamp}</span>
                      {entry.itemsChanged > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {entry.itemsChanged} items changed
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-900">{entry.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};