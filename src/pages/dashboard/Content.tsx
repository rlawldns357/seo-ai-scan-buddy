import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useUserSite, slugify } from "@/features/publish/useUserSite";
import LockedFeature from "@/features/publish/LockedFeature";
import FlowStepper from "@/features/publish/FlowStepper";
import { useRequireAuthAction } from "@/features/auth/useRequireAuthAction";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Send } from "lucide-react";

export default function Content() {
  const { site } = useUserSite();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const guard = useRequireAuthAction();

  const [topic, setTopic] = useState(params.get("topic") || "");
  const [axis, setAxis] = useState(params.get("axis") || "SEO");
  const [draft, setDraft] = useState<{ title: string; slug: string; excerpt: string; content: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [queueing, setQueueing] = useState(false);

  useEffect(() => {
    setTopic(params.get("topic") || "");
    setAxis(params.get("axis") || "SEO");
  }, [params]);

  const generate = guard(async () => {
    if (!topic.trim() || !site) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content-draft", {
        body: { topic, targetAxis: axis, siteUrl: site.site_url },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDraft(data);
    } catch (e: any) {
      toast({ title: "생성 실패", description: e?.message || "오류", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  });

  const queueForPublish = guard(async () => {
    if (!draft || !site) return;
    setQueueing(true);
    try {
      const slug = draft.slug || slugify(draft.title);
      const { error } = await supabase.from("site_posts").insert({
        site_id: site.id,
        slug,
        title: draft.title,
        excerpt: draft.excerpt,
        content: draft.content,
        status: "queued",
        source_axis: axis,
      });
      if (error) throw error;
      toast({ title: "발행 큐에 추가되었습니다" });
      navigate("/dashboard/auto-publish");
    } catch (e: any) {
      toast({ title: "추가 실패", description: e?.message || "오류", variant: "destructive" });
    } finally {
      setQueueing(false);
    }
  });

  if (!site) {
    return (
      <>
        <Helmet><title>글 작성 | Autoblog</title></Helmet>
        <FlowStepper current="site" completed={["auth", "dashboard"]} />
        <LockedFeature
          title="먼저 내 콘텐츠 페이지를 만들어주세요"
          description="페이지가 있어야 생성된 글을 발행 큐에 담을 수 있어요."
          ctaLabel="페이지 만들러 가기"
          onCta={() => navigate("/dashboard")}
        />
      </>
    );
  }

  return (
    <>
      <Helmet><title>글 작성 | Autoblog</title></Helmet>
      <FlowStepper current={draft ? "edit" : "draft"} completed={["auth", "dashboard", "site"]} />
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">검색·AI 답변에 인용되는 글 작성</h1>
          <p className="text-sm text-muted-foreground">주제만 입력하면 AI가 SEO(검색 노출)·AEO(답변 채택)·GEO(AI 인용) 3개 축에 맞춘 초안을 만듭니다. 편집 후 ‘발행 큐에 추가’로 다음 단계로 넘어가요.</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-full shrink-0" onClick={() => navigate("/dashboard/recommendations")}>
          추천 주제에서 고르기
        </Button>
      </div>

      <Card className="p-5 mb-4">
        <div className="grid md:grid-cols-[1fr_auto_auto] gap-3 items-end">
          <div>
            <Label htmlFor="topic">주제</Label>
            <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: AEO를 위한 FAQ 작성법" />
          </div>
          <div>
            <Label htmlFor="axis">타겟 축</Label>
            <select
              id="axis"
              value={axis}
              onChange={(e) => setAxis(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="SEO">SEO</option>
              <option value="AEO">AEO</option>
              <option value="GEO">GEO</option>
            </select>
          </div>
          <Button onClick={generate} disabled={generating || !topic.trim()} className="rounded-full">
            <Sparkles className="w-4 h-4" /> {generating ? "생성 중..." : "AI로 작성"}
          </Button>
        </div>
      </Card>

      {draft && (
        <Card className="p-5 space-y-4">
          <div>
            <Label>제목</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>슬러그</Label>
              <Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
            </div>
            <div>
              <Label>요약</Label>
              <Input value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>본문 (마크다운)</Label>
            <textarea
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              className="w-full min-h-[400px] rounded-md border border-input bg-background p-3 text-sm font-mono"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={queueForPublish} disabled={queueing} className="rounded-full">
              <Send className="w-4 h-4" /> {queueing ? "추가 중..." : "발행 큐에 추가"}
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
