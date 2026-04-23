export type KanbanStatus = "idea" | "draft" | "scheduled" | "published";

export type KanbanPost = {
  id: string;
  site_id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  status: KanbanStatus;
  source_axis: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  view_count: number;
  seo_score: number | null;
  aeo_score: number | null;
  geo_score: number | null;
  keywords: string[] | null;
};

export const COLUMN_ORDER: KanbanStatus[] = ["idea", "draft", "scheduled", "published"];

export const COLUMN_META: Record<
  KanbanStatus,
  { label: string; emoji: string; description: string; accent: string }
> = {
  idea: {
    label: "아이디어",
    emoji: "💡",
    description: "초안으로 끌어오면 AI가 본문을 생성합니다",
    accent: "border-l-amber-400/60",
  },
  draft: {
    label: "초안",
    emoji: "✍️",
    description: "검토 후 발행 대기로 옮기세요",
    accent: "border-l-blue-400/60",
  },
  scheduled: {
    label: "발행 대기",
    emoji: "⏳",
    description: "발행됨으로 옮기면 즉시 라이브",
    accent: "border-l-violet-400/60",
  },
  published: {
    label: "발행됨",
    emoji: "✅",
    description: "라이브 사이트에 노출 중",
    accent: "border-l-emerald-400/60",
  },
};
