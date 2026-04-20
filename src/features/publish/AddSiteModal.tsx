import { useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/useAuth";
import { slugify, useUserSites } from "./useUserSite";
import { toast } from "@/hooks/use-toast";

const FREE_SITE_LIMIT = 1;

export default function AddSiteModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (siteId: string) => void;
}) {
  const { user } = useAuth();
  const { sites, refresh, setActiveSiteId } = useUserSites();
  const [siteUrl, setSiteUrl] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isLocked = sites.length >= FREE_SITE_LIMIT;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteUrl || !title || !user || isLocked) return;
    setSubmitting(true);
    try {
      const normalizedUrl = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
      const baseSlug = slugify(siteUrl);
      let slug = baseSlug;
      const { data: existing } = await supabase
        .from("user_sites")
        .select("id")
        .eq("site_slug", slug)
        .maybeSingle();
      if (existing) slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

      const { data: created, error } = await (supabase as any)
        .from("user_sites")
        .insert({
          owner_email: user.email!,
          site_url: normalizedUrl,
          site_slug: slug,
          title,
          user_id: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      await refresh();
      if (created?.id) {
        setActiveSiteId(created.id);
        onCreated?.(created.id);
      }
      toast({ title: "사이트가 추가되었습니다", description: `/sites/${slug}` });
      setSiteUrl("");
      setTitle("");
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "오류",
        description: err instanceof Error ? err.message : "생성 실패",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {isLocked ? (
          <>
            <DialogHeader>
              <div className="mx-auto p-3 rounded-full bg-muted mb-2">
                <Lock className="w-6 h-6 text-muted-foreground" />
              </div>
              <DialogTitle className="text-center">유료 플랜이 필요해요</DialogTitle>
              <DialogDescription className="text-center">
                무료 플랜은 콘텐츠 허브 1개를 제공합니다.
                <br />
                추가 사이트는 곧 출시될 유료 플랜에서 운영할 수 있어요.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground space-y-1.5">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                준비 중인 PRO 플랜
              </div>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>추가 콘텐츠 허브 운영</li>
                <li>사이트별 자동 발행 큐 분리</li>
                <li>통합 리포트 / 도메인 연결</li>
              </ul>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">
                알겠어요
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>새 콘텐츠 허브 만들기</DialogTitle>
              <DialogDescription>
                자동 발행할 사이트의 URL과 표시 제목을 입력하세요.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="add-site-url" className="text-xs">사이트 URL</Label>
                <Input
                  id="add-site-url"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="example.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-site-title" className="text-xs">사이트 제목</Label>
                <Input
                  id="add-site-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="내 콘텐츠 허브"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">
                  취소
                </Button>
                <Button type="submit" disabled={submitting} className="rounded-full">
                  {submitting ? "만드는 중..." : "사이트 추가"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
