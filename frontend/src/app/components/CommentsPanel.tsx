import React, { useState } from 'react';
import { useWorkflowContext } from '../context/WorkflowContext';
import { Comment } from '../types/site';
import { MessageSquare, Send, CheckCircle, User, Reply } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export const CommentsPanel: React.FC = () => {
  const { workflow, currentUser, canComment, addComment, replyToComment, resolveComment } = useWorkflowContext();
  const [newCommentText, setNewCommentText] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const sections = [
    { id: 'site-identity', label: 'Site Identity' },
    { id: 'radio-config', label: 'Radio Configuration' },
    { id: 'access-logistics', label: 'Access & Logistics' },
    { id: 'hse-safety', label: 'HSE / Safety' },
    { id: 'power-grounding', label: 'Power & Grounding' },
    { id: 'cable-routing', label: 'Cable Routing' },
    { id: 'antenna-mounting', label: 'Antenna Mounting' },
    { id: 'drawings', label: 'Drawings' },
    { id: 'boq', label: 'BOQ' },
  ];

  const filteredComments = workflow.comments.filter(comment => {
    if (filterStatus === 'resolved' && !comment.resolved) return false;
    if (filterStatus === 'unresolved' && comment.resolved) return false;
    return true;
  });

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;

    addComment({
      message: newCommentText,
      sectionId: selectedSection || undefined,
      resolved: false,
    });

    setNewCommentText('');
    setSelectedSection('');
  };

  const handleReply = (commentId: string) => {
    if (!replyText.trim()) return;

    replyToComment(commentId, replyText);
    setReplyingTo(null);
    setReplyText('');
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      maker: 'bg-blue-100 text-blue-700',
      checker: 'bg-purple-100 text-purple-700',
      spl: 'bg-green-100 text-green-700',
      electrician: 'bg-amber-100 text-amber-700',
      builder: 'bg-teal-100 text-teal-700',
      manager: 'bg-gray-100 text-gray-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const CommentCard: React.FC<{ comment: Comment }> = ({ comment }) => {
    const section = sections.find(s => s.id === comment.sectionId);
    const isReplying = replyingTo === comment.id;

    return (
      <div className={`border rounded-lg p-4 ${comment.resolved ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-gray-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-gray-900">{comment.authorName}</span>
              <Badge className={`text-xs ${getRoleBadgeColor(comment.authorRole)}`}>
                {comment.authorRole}
              </Badge>
              <span className="text-xs text-gray-500">{formatTimestamp(comment.timestamp)}</span>
              {comment.resolved && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Resolved
                </Badge>
              )}
            </div>
            
            {section && (
              <div className="mb-2">
                <Badge variant="outline" className="text-xs">
                  {section.label}
                </Badge>
              </div>
            )}
            
            <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{comment.message}</p>
            
            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3 space-y-3 border-l-2 border-gray-200 pl-4">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-3 w-3 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-xs text-gray-900">{reply.authorName}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${getRoleBadgeColor(reply.authorRole)}`}>
                          {reply.authorRole}
                        </Badge>
                        <span className="text-xs text-gray-500">{formatTimestamp(reply.timestamp)}</span>
                      </div>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Reply input */}
            {isReplying && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="min-h-[60px] text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleReply(comment.id)}>
                    <Send className="h-3 w-3 mr-1" />
                    Send Reply
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setReplyingTo(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3">
              {canComment && !isReplying && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setReplyingTo(comment.id)}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}
              {canComment && !comment.resolved && (currentUser.role === 'checker' || currentUser.id === comment.authorId) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-green-600 hover:text-green-700"
                  onClick={() => resolveComment(comment.id)}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Resolve
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-3">
        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Comments</SelectItem>
            <SelectItem value="unresolved">Unresolved</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>{filteredComments.length} comment{filteredComments.length !== 1 ? 's' : ''}</span>
          {workflow.comments.filter(c => !c.resolved).length > 0 && (
            <>
              <span>•</span>
              <span className="text-orange-600 font-medium">
                {workflow.comments.filter(c => !c.resolved).length} unresolved
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Comments list */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3">
          {filteredComments.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm font-medium">No comments yet</p>
              <p className="text-xs text-gray-400 mt-1">
                {filterStatus === 'resolved' 
                  ? 'No resolved comments' 
                  : filterStatus === 'unresolved'
                  ? 'No unresolved comments'
                  : 'Add a comment to start a discussion'}
              </p>
            </div>
          )}
          
          {filteredComments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))}
        </div>
      </ScrollArea>
      
      {/* Add comment */}
      {canComment && (
        <div className="border-t bg-white px-4 py-3 space-y-2">
          <div className="flex gap-2">
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Select section..." />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 min-h-[60px] text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleAddComment();
                }
              }}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {selectedSection ? sections.find(s => s.id === selectedSection)?.label : 'General comment'}
            </span>
            <Button size="sm" onClick={handleAddComment} disabled={!newCommentText.trim()}>
              <Send className="h-3 w-3 mr-1" />
              Add Comment
            </Button>
          </div>
        </div>
      )}
      
      {!canComment && (
        <div className="border-t bg-gray-50 px-4 py-3 text-center text-xs text-gray-500">
          You don't have permission to add comments
        </div>
      )}
    </div>
  );
};
