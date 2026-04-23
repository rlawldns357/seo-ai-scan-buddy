export const WORKFLOW_CHANGED_EVENT = "stos:workflow-changed";

export type WorkflowChangedDetail = {
  siteId: string;
  postId?: string;
  source?: "recommendations" | "workflow";
};

export function emitWorkflowChanged(detail: WorkflowChangedDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<WorkflowChangedDetail>(WORKFLOW_CHANGED_EVENT, { detail }));
}

export function onWorkflowChanged(handler: (detail: WorkflowChangedDetail) => void) {
  if (typeof window === "undefined") return () => undefined;

  const listener: EventListener = (event) => {
    const customEvent = event as CustomEvent<WorkflowChangedDetail>;
    if (customEvent.detail) handler(customEvent.detail);
  };

  window.addEventListener(WORKFLOW_CHANGED_EVENT, listener);
  return () => window.removeEventListener(WORKFLOW_CHANGED_EVENT, listener);
}