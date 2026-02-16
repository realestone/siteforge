import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  User,
  UserRole,
  WorkflowStatus,
  Comment,
  SectionReview,
  WorkflowTransition,
  ElectricalSignOff,
  BuilderTask,
  AsBuiltPhoto,
  ProjectWorkflow
} from '../types/site';
import { toast } from 'sonner';

interface WorkflowContextType {
  currentUser: User;
  workflow: ProjectWorkflow;
  canEdit: boolean;
  canComment: boolean;
  canApprove: boolean;
  canViewPricing: boolean;
  setCurrentUser: (user: User) => void;
  changeStatus: (newStatus: WorkflowStatus, note?: string) => void;
  addComment: (comment: Omit<Comment, 'id' | 'timestamp' | 'authorId' | 'authorName' | 'authorRole'>) => void;
  replyToComment: (commentId: string, message: string) => void;
  resolveComment: (commentId: string) => void;
  updateSectionReview: (sectionId: string, status: SectionReview['status']) => void;
  submitForReview: () => void;
  approveAndForward: () => void;
  requestChanges: () => void;
  rejectSubmission: (reason: string) => void;
  updateElectricalSignOff: (signOff: Partial<ElectricalSignOff>) => void;
  toggleBuilderTask: (taskId: string) => void;
  addAsBuiltPhoto: (photo: Omit<AsBuiltPhoto, 'uploadedBy' | 'uploadedAt'>) => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const useWorkflowContext = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflowContext must be used within WorkflowProvider');
  }
  return context;
};

// Available users for role switching
export const availableUsers: Record<UserRole, User> = {
  maker: { id: 'u1', name: 'Field Engineer', email: 'engineer@company.no', role: 'maker', company: 'Contractor AS' },
  checker: { id: 'u2', name: 'Internal Reviewer', email: 'reviewer@company.no', role: 'checker', company: 'Contractor AS' },
  spl: { id: 'u3', name: 'Operator Contact', email: 'contact@operator.no', role: 'spl', company: 'Operator' },
  electrician: { id: 'u4', name: 'Electrician', email: 'electrician@elektro.no', role: 'electrician', company: 'Elektro AS' },
  builder: { id: 'u5', name: 'Builder', email: 'builder@build.no', role: 'builder', company: 'BuildCo' },
  manager: { id: 'u6', name: 'Manager', email: 'manager@company.no', role: 'manager', company: 'Contractor AS' },
};

const getDefaultWorkflow = (): ProjectWorkflow => ({
  status: 'draft',
  history: [],
  comments: [],
  sectionReviews: [],
  builderTasks: [
    { id: 't1', category: 'Cabinet & Power', description: 'Install ACDB in technical room', completed: false },
    { id: 't2', category: 'Cabinet & Power', description: 'Install rectifier', completed: false },
    { id: 't3', category: 'Cabinet & Power', description: 'Install Flatpack2 modules', completed: false },
    { id: 't4', category: 'Cabinet & Power', description: 'Install battery strings', completed: false },
    { id: 't5', category: 'Cabinet & Power', description: 'AC cable from basement', completed: false },
    { id: 't6', category: 'Antenna & Radio', description: 'Install gravitation frames', completed: false },
    { id: 't7', category: 'Antenna & Radio', description: 'Install antennas', completed: false },
    { id: 't8', category: 'Antenna & Radio', description: 'Install RRH units', completed: false },
    { id: 't9', category: 'Antenna & Radio', description: 'Install MAA units', completed: false },
    { id: 't10', category: 'Antenna & Radio', description: 'Install ATOA units', completed: false },
    { id: 't11', category: 'Cables', description: 'Cable ladder on roof', completed: false },
    { id: 't12', category: 'Cables', description: 'DC cable installation', completed: false },
    { id: 't13', category: 'Cables', description: 'DC 10mm\u00B2 cable installation', completed: false },
    { id: 't14', category: 'Cables', description: 'Trunk fiber installation', completed: false },
    { id: 't15', category: 'Cables', description: 'Jumper installation', completed: false },
    { id: 't16', category: 'Cables', description: 'RET cable installation', completed: false },
    { id: 't17', category: 'Grounding', description: 'JR115 bar at antenna position', completed: false },
    { id: 't18', category: 'Grounding', description: 'Ground cable installation', completed: false },
    { id: 't19', category: 'Final', description: 'Walk test', completed: false },
    { id: 't20', category: 'Final', description: 'External alarm connection', completed: false },
    { id: 't21', category: 'Final', description: 'Commissioning', completed: false },
    { id: 't22', category: 'Final', description: 'As-built photos', completed: false },
  ],
  asBuiltPhotos: [],
});

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(availableUsers.maker);
  const [workflow, setWorkflow] = useState<ProjectWorkflow>(getDefaultWorkflow());

  const canEdit = currentUser.role === 'maker' &&
    (workflow.status === 'draft' || workflow.status === 'changes-requested' || workflow.status === 'rejected');

  const canComment = ['maker', 'checker', 'spl', 'electrician'].includes(currentUser.role);

  const canApprove = (currentUser.role === 'checker' && workflow.status === 'internal-review') ||
    (currentUser.role === 'spl' && workflow.status === 'submitted');

  const canViewPricing = currentUser.role === 'checker' || currentUser.role === 'manager';

  const changeStatus = useCallback((newStatus: WorkflowStatus, note?: string) => {
    setWorkflow(prev => {
      const transition: WorkflowTransition = {
        id: `t-${Date.now()}`,
        fromStatus: prev.status,
        toStatus: newStatus,
        userId: currentUser.id,
        userName: currentUser.name,
        timestamp: Date.now(),
        note,
      };

      let assignedTo: User | undefined;
      let assignedAt: number | undefined;

      if (newStatus === 'internal-review') {
        assignedTo = availableUsers.checker;
        assignedAt = Date.now();
        toast.info('Submitted for review', { description: `Assigned to ${availableUsers.checker.name}` });
      } else if (newStatus === 'changes-requested') {
        assignedTo = availableUsers.maker;
        assignedAt = Date.now();
        toast.warning('Changes requested', { description: `Assigned back to ${availableUsers.maker.name}` });
      } else if (newStatus === 'submitted') {
        assignedTo = availableUsers.spl;
        assignedAt = Date.now();
        toast.success('Submitted to operator', { description: `Sent to ${availableUsers.spl.company}` });
      } else if (newStatus === 'approved') {
        assignedTo = availableUsers.builder;
        assignedAt = Date.now();
        toast.success('Approved!', { description: 'Ready for installation' });
      } else if (newStatus === 'building') {
        toast.info('Installation started', { description: 'Builder has begun work' });
      } else if (newStatus === 'rejected') {
        assignedTo = availableUsers.maker;
        assignedAt = Date.now();
        toast.error('Submission rejected', { description: note || 'See comments for details' });
      }

      return {
        ...prev,
        status: newStatus,
        assignedTo,
        assignedAt,
        history: [...prev.history, transition],
      };
    });
  }, [currentUser]);

  const addComment = useCallback((comment: Omit<Comment, 'id' | 'timestamp' | 'authorId' | 'authorName' | 'authorRole'>) => {
    setWorkflow(prev => {
      const newComment: Comment = {
        ...comment,
        id: `c-${Date.now()}`,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorRole: currentUser.role,
        timestamp: Date.now(),
        resolved: false,
      };
      return { ...prev, comments: [...prev.comments, newComment] };
    });
    toast.success('Comment added');
  }, [currentUser]);

  const replyToComment = useCallback((commentId: string, message: string) => {
    setWorkflow(prev => {
      const comments = prev.comments.map(c => {
        if (c.id === commentId) {
          const reply: Comment = {
            id: `r-${Date.now()}`,
            authorId: currentUser.id,
            authorName: currentUser.name,
            authorRole: currentUser.role,
            message,
            timestamp: Date.now(),
            resolved: false,
          };
          return { ...c, replies: [...(c.replies || []), reply] };
        }
        return c;
      });
      return { ...prev, comments };
    });
    toast.success('Reply added');
  }, [currentUser]);

  const resolveComment = useCallback((commentId: string) => {
    setWorkflow(prev => {
      const comments = prev.comments.map(c =>
        c.id === commentId ? { ...c, resolved: true } : c
      );
      return { ...prev, comments };
    });
    toast.success('Comment resolved');
  }, []);

  const updateSectionReview = useCallback((sectionId: string, status: SectionReview['status']) => {
    setWorkflow(prev => {
      const existing = prev.sectionReviews.find(r => r.sectionId === sectionId);
      const updated: SectionReview = {
        sectionId,
        status,
        reviewerId: currentUser.id,
        reviewerName: currentUser.name,
        timestamp: Date.now(),
        comments: existing?.comments || [],
      };
      const sectionReviews = prev.sectionReviews.filter(r => r.sectionId !== sectionId);
      return { ...prev, sectionReviews: [...sectionReviews, updated] };
    });
  }, [currentUser]);

  const submitForReview = useCallback(() => {
    changeStatus('internal-review', 'Ready for internal review');
  }, [changeStatus]);

  const approveAndForward = useCallback(() => {
    if (currentUser.role === 'checker') {
      changeStatus('submitted', 'Internal review complete, submitting to operator');
    } else if (currentUser.role === 'spl') {
      changeStatus('approved', 'Operator approval granted');
    }
  }, [currentUser.role, changeStatus]);

  const requestChanges = useCallback(() => {
    changeStatus('changes-requested', 'Review complete - changes requested');
  }, [changeStatus]);

  const rejectSubmission = useCallback((reason: string) => {
    changeStatus('rejected', reason);
  }, [changeStatus]);

  const updateElectricalSignOff = useCallback((signOff: Partial<ElectricalSignOff>) => {
    setWorkflow(prev => ({
      ...prev,
      electricalSignOff: {
        ...prev.electricalSignOff,
        ...signOff,
        timestamp: Date.now(),
      } as ElectricalSignOff,
    }));
    if (signOff.signedOff) {
      toast.success('Electrical sign-off complete');
    }
  }, []);

  const toggleBuilderTask = useCallback((taskId: string) => {
    setWorkflow(prev => {
      const tasks = (prev.builderTasks || []).map(task =>
        task.id === taskId
          ? {
              ...task,
              completed: !task.completed,
              completedBy: !task.completed ? currentUser.name : undefined,
              completedAt: !task.completed ? Date.now() : undefined,
            }
          : task
      );
      return { ...prev, builderTasks: tasks };
    });
  }, [currentUser]);

  const addAsBuiltPhoto = useCallback((photo: Omit<AsBuiltPhoto, 'uploadedBy' | 'uploadedAt'>) => {
    setWorkflow(prev => {
      const newPhoto: AsBuiltPhoto = {
        ...photo,
        uploadedBy: currentUser.name,
        uploadedAt: Date.now(),
      };
      return { ...prev, asBuiltPhotos: [...(prev.asBuiltPhotos || []), newPhoto] };
    });
    toast.success('As-built photo uploaded');
  }, [currentUser]);

  return (
    <WorkflowContext.Provider
      value={{
        currentUser,
        workflow,
        canEdit,
        canComment,
        canApprove,
        canViewPricing,
        setCurrentUser,
        changeStatus,
        addComment,
        replyToComment,
        resolveComment,
        updateSectionReview,
        submitForReview,
        approveAndForward,
        requestChanges,
        rejectSubmission,
        updateElectricalSignOff,
        toggleBuilderTask,
        addAsBuiltPhoto,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
};
