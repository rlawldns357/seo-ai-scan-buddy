import { useEffect, useMemo, useState } from "react";
import { Copy, Globe, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserSites } from "@/features/publish/useUserSite";
import { useUserTier, PRODUCT_LIMIT } from "@/features/auth/useUserTier";

type Product = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  keywords: string[];
  price: string | null;
  image_url: string | null;
  compare_at_price: string | null;
  sale_label: string | null;
  sale_ends_at: string | null;
  is_active: boolean;
  sort_order: number;
};

interface Props {
  open: boolean;
  onClose: () => void;
  sourceSiteId: string;
  sourceSiteTitle: string;
  selectedProducts: Product[];
  allProducts: Product[];
}

/**
 * 사이트 간 카탈로그 복사 모달.
 * - 대상 사이트 선택 (본인 소유 다른 사이트만)
 * - 복사 범위: 전체 / 선택만 (선택된 항목 있으면 디폴트=선택)
 * - URL 중복은 자동 스킵
 * - 대상 사이트 티어 한도 검증
 */
export default function CopyCatalogModal({
  open,
  onClose,
  sourceSiteId,
  sourceSiteTitle,
  selectedProducts,
  allProducts,
}: Props) {
  const { sites, loading: sitesLoading } = useUserSites();
  const { tier } = useUserTier();
  const [targetId, setTargetId] = useState<string | null>(null);
  const [scope, setScope] = useState<"selected" | "all">(
    selectedProducts.length > 0 ? "selected" : "all"
  );
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ inserted: number; skipped: number } | null>(null);

  // candidate target sites (exclude source)
  const targets = useMemo(
    () => sites.filter((s) => s.id !== sourceSiteId),
    [sites, sourceSiteId]
  );

  useEffect(() => {
    if (open) {
      setScope(selectedProducts.length > 0 ? "selected" : "all");
      setTargetId(targets[0]?.id ?? null);
      setDone(null);
    }
  }, [open, selectedProducts.length, targets]);

  const sourceList = scope === "selected" ? selectedProducts : allProducts;
  const targetLimit = PRODUCT_LIMIT[tier];

  const handleCopy = async () => {
    if (!targetId) {
      toast.error("대상 사이트를 선택해주세요");
      return;
    }
    if (sourceList.length === 0) {
      toast.error("복사할 제품이 없어요");
      return;
    }
    setBusy(true);
    try {
      // 1. fetch existing target URLs (for dedupe) + count + max sort_order
      const { data: existingRows, error: fetchErr } = await (supabase as any)
        .from("site_products")
        .select("url, sort_order")
        .eq("site_id", targetId);
      if (fetchErr) throw fetchErr;

      const existingUrls = new Set(((existingRows ?? []) as { url: string }[]).map((r) => r.url));
      const currentCount = (existingRows ?? []).length;
      const maxSort =
        ((existingRows ?? []) as { sort_order: number | null }[]).reduce(
          (m, r) => Math.max(m, r.sort_order ?? 0),
          0
        ) ?? 0;

      // 2. dedupe by url
      const candidates = sourceList.filter((p) => !existingUrls.has(p.url));
      const skipped = sourceList.length - candidates.length;

      // 3. apply tier limit on target
      const remaining = Math.max(0, targetLimit - currentCount);
      const toInsert = candidates.slice(0, remaining);
      const limitTrimmed = candidates.length - toInsert.length;

      if (toInsert.length === 0) {
        if (limitTrimmed > 0) {
          toast.error(
            `대상 사이트가 한도(${targetLimit}개)에 도달했어요. 업그레이드 후 다시 시도해주세요.`
          );
        } else {
          toast.info("새로 복사할 제품이 없어요 (모두 중복).");
        }
        setBusy(false);
        return;
      }

      // 4. insert (preserve fields, reset click_count, append sort_order)
      const rows = toInsert.map((p, i) => ({
        site_id: targetId,
        title: p.title,
        url: p.url,
        description: p.description,
        keywords: p.keywords ?? [],
        price: p.price,
        image_url: p.image_url,
        compare_at_price: p.compare_at_price,
        sale_label: p.sale_label,
        sale_ends_at: p.sale_ends_at,
        is_active: p.is_active,
        sort_order: maxSort + i + 1,
      }));

      const { error: insErr } = await (supabase as any).from("site_products").insert(rows);
      if (insErr) throw insErr;

      setDone({ inserted: toInsert.length, skipped: skipped + limitTrimmed });
      toast.success(
        `${toInsert.length}개 제품을 복사했어요${skipped + limitTrimmed > 0 ? ` (${skipped + limitTrimmed}개 건너뜀)` : ""}`
      );
    } catch (err: any) {
      toast.error(err?.message ?? "복사에 실패했어요");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (busy) return;
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Copy className="w-4 h-4 text-primary" />
            다른 사이트로 카탈로그 복사
          </DialogTitle>
          <DialogDescription className="text-xs">
            <span className="font-semibold text-foreground">{sourceSiteTitle}</span>의 제품을 다른 사이트로 복사해요. URL이 중복되는 제품은 자동으로 건너뜁니다.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {done.inserted}개 제품을 복사했어요
            </p>
            {done.skipped > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {done.skipped}개는 중복 또는 한도 초과로 건너뛰었어요
              </p>
            )}
            <Button onClick={close} variant="outline" className="mt-4 rounded-full">
              닫기
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Scope */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                복사 범위
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScope("selected")}
                  disabled={selectedProducts.length === 0}
                  className={`p-3 rounded-xl border text-left transition ${
                    scope === "selected"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-foreground/20"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <p className="text-xs font-semibold text-foreground">선택 항목만</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {selectedProducts.length}개 선택됨
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  className={`p-3 rounded-xl border text-left transition ${
                    scope === "all"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-foreground/20"
                  }`}
                >
                  <p className="text-xs font-semibold text-foreground">전체</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {allProducts.length}개 전체
                  </p>
                </button>
              </div>
            </div>

            {/* Target site */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                대상 사이트
              </p>
              {sitesLoading ? (
                <p className="text-xs text-muted-foreground">사이트 불러오는 중…</p>
              ) : targets.length === 0 ? (
                <Card className="p-4 text-center border-dashed">
                  <p className="text-xs text-muted-foreground">
                    복사할 다른 사이트가 없어요. 사이드바에서 새 사이트를 먼저 만들어주세요.
                  </p>
                </Card>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {targets.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setTargetId(s.id)}
                      className={`w-full p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                        targetId === s.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-foreground/20"
                      }`}
                    >
                      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{s.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">/sites/{s.site_slug}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tier note */}
            <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 leading-relaxed break-keep">
              현재 플랜({tier.toUpperCase()}) 한도: 사이트당 <span className="font-semibold text-foreground">{targetLimit}개</span>. 한도 초과분은 자동으로 잘려요.
            </p>

            <div className="flex gap-2 pt-2">
              <Button onClick={close} variant="outline" className="flex-1 rounded-full" disabled={busy}>
                취소
              </Button>
              <Button
                onClick={handleCopy}
                disabled={busy || !targetId || targets.length === 0 || sourceList.length === 0}
                className="flex-1 rounded-full gap-1"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> 복사 중…
                  </>
                ) : (
                  <>
                    복사하기 <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
