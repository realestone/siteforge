import React, { createContext, useContext, useState, useCallback } from "react";
import { toast } from "sonner";

// ── Types ───────────────────────────────────────────────────────────

export type WorkflowRole = "maker" | "reviewer";

export type WorkflowStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "building"
  | "as_built_complete";

const STATUS_ORDER: WorkflowStatus[] = [
  "draft",
  "in_review",
  "changes_requested",
  "approved",
  "building",
  "as_built_complete",
];

export interface WorkflowUser {
  id: string;
  name: string;
  email: string;
  role: WorkflowRole;
}

export interface WorkflowComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: WorkflowRole;
  sectionId?: string;
  fieldPath?: string;
  message: string;
  timestamp: number;
  resolved: boolean;
  replies?: WorkflowComment[];
}

export interface WorkflowTransition {
  id: string;
  fromStatus: WorkflowStatus;
  toStatus: WorkflowStatus;
  userId: string;
  userName: string;
  timestamp: number;
  note?: string;
}

// ── Context type ────────────────────────────────────────────────────

interface WorkflowContextType {
  currentUser: WorkflowUser;
  status: WorkflowStatus;
  comments: WorkflowComment[];
  history: WorkflowTransition[];
  canEdit: boolean;
  isReviewer: boolean;
  isAtLeastStatus: (target: WorkflowStatus) => boolean;
  setCurrentUser: (user: WorkflowUser) => void;
  changeStatus: (newStatus: WorkflowStatus, note?: string) => void;
  submitForReview: () => void;
  approve: () => void;
  requestChanges: (note?: string) => void;
  startBuild: () => void;
  completeAsBuilt: () => void;
  addComment: (comment: {
    message: string;
    sectionId?: string;
    fieldPath?: string;
  }) => void;
  replyToComment: (commentId: string, message: string) => void;
  resolveComment: (commentId: string) => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(
  undefined,
);

export const useWorkflowContext = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useWorkflowContext must be used within WorkflowProvider");
  }
  return context;
};

// ── Available users ─────────────────────────────────────────────────

export const availableUsers: Record<WorkflowRole, WorkflowUser> = {
  maker: {
    id: "u1",
    name: "Field Engineer",
    email: "engineer@company.no",
    role: "maker",
  },
  reviewer: {
    id: "u2",
    name: "Reviewer",
    email: "reviewer@company.no",
    role: "reviewer",
  },
};

// ── Provider ────────────────────────────────────────────────────────

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<WorkflowUser>(
    availableUsers.maker,
  );
  const [status, setStatus] = useState<WorkflowStatus>("draft");
  const [comments, setComments] = useState<WorkflowComment[]>([]);
  const [history, setHistory] = useState<WorkflowTransition[]>([]);

  const canEdit =
    currentUser.role === "maker" &&
    (status === "draft" || status === "changes_requested");

  const isReviewer = currentUser.role === "reviewer";

  const isAtLeastStatus = useCallback(
    (target: WorkflowStatus) => {
      return STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf(target);
    },
    [status],
  );

  const changeStatus = useCallback(
    (newStatus: WorkflowStatus, note?: string) => {
      setStatus((prev) => {
        const transition: WorkflowTransition = {
          id: `t-${Date.now()}`,
          fromStatus: prev,
          toStatus: newStatus,
          userId: currentUser.id,
          userName: currentUser.name,
          timestamp: Date.now(),
          note,
        };
        setHistory((h) => [...h, transition]);
        return newStatus;
      });
    },
    [currentUser],
  );

  const submitForReview = useCallback(() => {
    changeStatus("in_review", "Submitted for review");
    toast.info("Submitted for review");
  }, [changeStatus]);

  const approve = useCallback(() => {
    changeStatus("approved", "Review approved");
    toast.success("Approved!");
  }, [changeStatus]);

  const requestChanges = useCallback(
    (note?: string) => {
      changeStatus("changes_requested", note || "Changes requested");
      toast.warning("Changes requested");
    },
    [changeStatus],
  );

  const startBuild = useCallback(() => {
    changeStatus("building", "Build started");
    toast.info("Build phase started");
  }, [changeStatus]);

  const completeAsBuilt = useCallback(() => {
    changeStatus("as_built_complete", "As-built documentation complete");
    toast.success("As-built complete!");
  }, [changeStatus]);

  const addComment = useCallback(
    (comment: { message: string; sectionId?: string; fieldPath?: string }) => {
      const newComment: WorkflowComment = {
        ...comment,
        id: `c-${Date.now()}`,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorRole: currentUser.role,
        timestamp: Date.now(),
        resolved: false,
      };
      setComments((prev) => [...prev, newComment]);
      toast.success("Comment added");
    },
    [currentUser],
  );

  const replyToComment = useCallback(
    (commentId: string, message: string) => {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            const reply: WorkflowComment = {
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
        }),
      );
    },
    [currentUser],
  );

  const resolveComment = useCallback((commentId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, resolved: true } : c)),
    );
    toast.success("Comment resolved");
  }, []);

  return (
    <WorkflowContext.Provider
      value={{
        currentUser,
        status,
        comments,
        history,
        canEdit,
        isReviewer,
        isAtLeastStatus,
        setCurrentUser,
        changeStatus,
        submitForReview,
        approve,
        requestChanges,
        startBuild,
        completeAsBuilt,
        addComment,
        replyToComment,
        resolveComment,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
};
