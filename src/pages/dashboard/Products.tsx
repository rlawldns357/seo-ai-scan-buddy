import { useEffect, useState, FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ExternalLink, ShoppingBag, Eye, EyeOff, Edit2, X, Sparkles, Loader2, RefreshCw, Flame, CheckSquare, Square, Copy, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserSite } from "@/features/publish/useUserSite";
import { useUserTier } from "@/features/auth/useUserTier";
import PageHeader from "@/features/publish/ui/PageHeader";
import LockedFeature from "@/features/publish/LockedFeature";
import CopyCatalogModal from "@/features/publish/CopyCatalogModal";
import { cleanProductUrl } from "@/lib/cleanProductUrl";

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
  click_count: number;
  sort_order: number;
};

const MAX_PRODUCTS = 50;

export default function DashboardProducts() {
  const { site, loading: siteLoading } = useUserSite();
  const { tier, productLimit, loading: tierLoading } = useUserTier();
  const navigate = useNavigate();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [prefillUrl, setPrefillUrl] = useState<string | null>(null);
  const [quickUrl, setQuickUrl] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  const effectiveLimit = Math.min(MAX_PRODUCTS, productLimit);
  const isLocked = !tierLoading && productLimit === 0;
  const atLimit = items.length >= effectiveLimit;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectAll = () => setSelectedIds(new Set(items.map((i) => i.id)));

  /** 긴 URL을 도메인 + 마지막 경로 한 조각으로 축약 */
  const shortenUrl = (raw: string): string => {
    try {
      const u = new URL(raw);
      const segs = u.pathname.split("/").filter(Boolean);
      if (segs.length === 0) return u.host;
      const last = decodeURIComponent(segs[segs.length - 1]);
      const trimmed = last.length > 28 ? last.slice(0, 26) + "…" : last;
      return segs.length > 1 ? `${u.host}/…/${trimmed}` : `${u.host}/${trimmed}`;
    } catch {
      return raw.length > 50 ? raw.slice(0, 48) + "…" : raw;
    }
  };

  const handleBulkToggle = async (next: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    const ids = Array.from(selectedIds);
    const { error } = await (supabase as any)
      .from("site_products")
      .update({ is_active: next })
      .in("id", ids);
    setBulkBusy(false);
    if (error) {
      toast.error("일괄 변경에 실패했어요");
      return;
    }
    setItems((prev) => prev.map((p) => (selectedIds.has(p.id) ? { ...p, is_active: next } : p)));
    toast.success(`${ids.length}개 제품을 ${next ? "노출" : "숨김"} 처리했어요`);
    clearSelection();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개 제품을 삭제할까요? 되돌릴 수 없어요.`)) return;
    setBulkBusy(true);
    const ids = Array.from(selectedIds);
    const { error } = await (supabase as any).from("site_products").delete().in("id", ids);
    setBulkBusy(false);
    if (error) {
      toast.error("일괄 삭제에 실패했어요");
      return;
    }
    setItems((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    toast.success(`${ids.length}개 제품을 삭제했어요`);
    clearSelection();
  };

  const load = async (siteId: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("site_products")
      .select("id, title, url, description, keywords, price, image_url, compare_at_price, sale_label, sale_ends_at, is_active, click_count, sort_order")
      .eq("site_id", siteId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error("제품 목록을 불러오지 못했어요");
    setItems((data ?? []) as Product[]);
    setLoading(false);
  };

  useEffect(() => {
    if (site?.id) void load(site.id);
  }, [site?.id]);

  const handleDelete = async (id: string) => {
    if (!confirm("이 제품을 삭제할까요?")) return;
    const { error } = await (supabase as any).from("site_products").delete().eq("id", id);
    if (error) {
      toast.error("삭제에 실패했어요");
      return;
    }
    setItems((prev) => prev.filter((p) => p.id !== id));
    toast.success("삭제했어요");
  };

  const [refillingId, setRefillingId] = useState<string | null>(null);

  const handleRefillSale = async (p: Product) => {
    setRefillingId(p.id);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-product-info", {
        body: { url: p.url },
      });
      if (error) throw error;
      const info = (data as any)?.data ?? {};
      const updates: Record<string, string | null> = {};
      if (info.compare_at_price) updates.compare_at_price = info.compare_at_price;
      if (info.sale_label) updates.sale_label = info.sale_label;
      if (info.price && !p.price) updates.price = info.price;
      if (info.image_url && !p.image_url) updates.image_url = info.image_url;

      if (Object.keys(updates).length === 0) {
        toast.info("이 페이지에서 할인 정보를 못 찾았어요. 직접 입력해보세요.");
        return;
      }
      const { data: updated, error: upErr } = await (supabase as any)
        .from("site_products")
        .update(updates)
        .eq("id", p.id)
        .select()
        .single();
      if (upErr) throw upErr;
      setItems((prev) => prev.map((x) => (x.id === p.id ? (updated as Product) : x)));
      toast.success("할인 정보를 채웠어요");
    } catch (err: any) {
      toast.error(err?.message ?? "할인 정보 가져오기에 실패했어요");
    } finally {
      setRefillingId(null);
    }
  };

  const handleToggle = async (id: string, next: boolean) => {
    const { error } = await (supabase as any)
      .from("site_products")
      .update({ is_active: next })
      .eq("id", id);
    if (error) {
      toast.error("변경에 실패했어요");
      return;
    }
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: next } : p)));
  };

  if (siteLoading || !site) {
    return (
      <>
        <Helmet><title>제품 카탈로그 | AutoBlog</title></Helmet>
        <PageHeader icon={ShoppingBag} chip="Products" title="제품 카탈로그" tone="primary" />
        <p className="text-sm text-muted-foreground">사이트를 불러오는 중…</p>
      </>
    );
  }

  // Tier-locked: Free / Beta
  if (isLocked) {
    return (
      <>
        <Helmet><title>제품 카탈로그 | AutoBlog</title></Helmet>
        <PageHeader icon={ShoppingBag} chip="Products" title="제품 카탈로그" tone="primary" />
        <LockedFeature
          title="제품 카탈로그는 Lite 플랜부터 사용할 수 있어요"
          description={`현재 ${tier.toUpperCase()} 플랜이에요. Lite로 업그레이드하면 카탈로그 1개를 등록할 수 있고, Pro부터 최대 ${MAX_PRODUCTS}개까지 가능해요. 등록한 제품은 발행되는 모든 글 끝에 자동으로 노출됩니다.`}
          ctaLabel="플랜 알아보기"
          onCta={() => navigate("/autoblog#pricing")}
        />
      </>
    );
  }

  const canAddNew = editingId !== "new" && !atLimit;

  return (
    <>
      <Helmet>
        <title>제품 카탈로그 | AutoBlog</title>
      </Helmet>
      <PageHeader
        icon={ShoppingBag}
        chip="Products"
        title="제품 카탈로그"
        subtitle={`등록한 제품은 발행되는 모든 글 끝에 자동으로 노출됩니다. AI가 글 키워드를 보고 가장 잘 맞는 1~3개를 골라 추천해요. (${items.length}/${effectiveLimit})`}
        tone="primary"
        right={
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full gap-1"
                onClick={() => setCopyOpen(true)}
              >
                <Copy className="w-3.5 h-3.5" /> 다른 사이트로 복사
              </Button>
            )}
            {canAddNew ? (
              <Button size="sm" className="rounded-full" onClick={() => setEditingId("new")}>
                <Plus className="w-4 h-4" /> 새 제품
              </Button>
            ) : atLimit ? (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full gap-1"
                onClick={() => navigate("/autoblog#pricing")}
                title={`${tier.toUpperCase()} 플랜 한도(${effectiveLimit}개) 도달`}
              >
                <Lock className="w-3.5 h-3.5" /> 한도 도달 · 업그레이드
              </Button>
            ) : null}
          </div>
        }
      />

      {/* Lite teaser banner */}
      {tier === "lite" && items.length > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-2.5">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-foreground leading-relaxed break-keep flex-1">
            <span className="font-semibold">Lite 플랜은 카탈로그 맛보기 1개</span>까지 등록할 수 있어요. Pro로 업그레이드하면 최대 {MAX_PRODUCTS}개까지 등록 가능해요.
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full h-7 text-[11px] text-primary shrink-0"
            onClick={() => navigate("/autoblog#pricing")}
          >
            업그레이드
          </Button>
        </div>
      )}

      {/* 인라인 추가/편집 폼 */}
      {editingId === "new" && (
        <ProductForm
          siteId={site.id}
          prefillUrl={prefillUrl ?? undefined}
          autoFillOnMount={!!prefillUrl}
          onClose={() => { setEditingId(null); setPrefillUrl(null); }}
          onSaved={(p) => {
            setItems((prev) => [p, ...prev]);
            setEditingId(null);
            setPrefillUrl(null);
          }}
        />
      )}

      {/* 비어있을 때 */}
      {!loading && items.length === 0 && editingId !== "new" && (
        <Card className="p-8 rounded-2xl border-dashed border-border/60 bg-muted/20 text-center">
          <ShoppingBag className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground">아직 등록된 제품이 없어요</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            대표 제품을 1~5개 등록하면 모든 발행 글 끝에 자동으로 노출돼요.
          </p>

          {/* URL 빠른 추가 — 붙여넣으면 ✨ AI가 자동으로 제품 정보를 채워요 */}
          <form
              onSubmit={(e) => {
                e.preventDefault();
                const v = quickUrl.trim();
                if (!v) return;
                if (!/^https?:\/\//i.test(v)) {
                  toast.error("https:// 로 시작하는 URL을 입력해주세요");
                  return;
                }
                const cleaned = cleanProductUrl(v);
                setPrefillUrl(cleaned);
                setEditingId("new");
                setQuickUrl("");
              }}
            className="max-w-md mx-auto flex flex-col sm:flex-row gap-2 mb-3"
          >
            <Input
              type="url"
              inputMode="url"
              placeholder="제품 URL 붙여넣기 (예: https://...)"
              value={quickUrl}
              onChange={(e) => setQuickUrl(e.target.value)}
              className="rounded-full h-10 text-sm"
            />
            <Button
              type="submit"
              size="sm"
              className="rounded-full h-10 gap-1 shrink-0"
              disabled={!quickUrl.trim()}
            >
              <Sparkles className="w-3.5 h-3.5" /> AI로 자동 채우기
            </Button>
          </form>

          <div className="flex items-center gap-3 max-w-md mx-auto my-3">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-[10px] text-muted-foreground/70">또는</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditingId("new")}>
            <Plus className="w-4 h-4" /> 직접 입력하기
          </Button>
        </Card>
      )}

      {/* 일괄 액션 바 */}
      {!loading && items.length > 0 && (
        <div className="flex items-center justify-between gap-2 mt-4 px-1">
          <button
            type="button"
            onClick={selectedIds.size === items.length ? clearSelection : selectAll}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            {selectedIds.size === items.length ? (
              <CheckSquare className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
            {selectedIds.size > 0 ? `${selectedIds.size}개 선택됨` : "전체 선택"}
          </button>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1 rounded-full"
                disabled={bulkBusy}
                onClick={() => void handleBulkToggle(true)}
              >
                <Eye className="w-3 h-3" /> 노출
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1 rounded-full"
                disabled={bulkBusy}
                onClick={() => void handleBulkToggle(false)}
              >
                <EyeOff className="w-3 h-3" /> 숨김
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1 rounded-full text-destructive hover:text-destructive"
                disabled={bulkBusy}
                onClick={() => void handleBulkDelete()}
              >
                <Trash2 className="w-3 h-3" /> 삭제
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={clearSelection}
                aria-label="선택 해제"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 목록 */}
      {!loading && items.length > 0 && (
        <div className="grid gap-3 mt-2">
          {items.map((p) =>
            editingId === p.id ? (
              <ProductForm
                key={p.id}
                siteId={site.id}
                initial={p}
                onClose={() => setEditingId(null)}
                onSaved={(updated) => {
                  setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                  setEditingId(null);
                }}
              />
            ) : (
              <Card
                key={p.id}
                className={`p-4 rounded-2xl transition ${
                  selectedIds.has(p.id) ? "border-primary/60 bg-primary/[0.03]" : "border-border/60 bg-card"
                } ${!p.is_active ? "opacity-60" : ""}`}
              >
                <div className="flex gap-3 items-start">
                  <button
                    type="button"
                    onClick={() => toggleSelect(p.id)}
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={selectedIds.has(p.id) ? "선택 해제" : "선택"}
                  >
                    {selectedIds.has(p.id) ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="h-14 w-14 rounded-lg object-cover bg-muted shrink-0" />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-muted shrink-0 flex items-center justify-center text-muted-foreground/40">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <h3 className="text-sm font-semibold text-foreground line-clamp-1 flex-1">{p.title}</h3>
                      {p.price && (
                        <span className="text-xs font-mono font-bold text-primary tabular-nums shrink-0">{p.price}</span>
                      )}
                    </div>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      title={p.url}
                      className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-0.5 max-w-full"
                    >
                      <span className="truncate">{shortenUrl(p.url)}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                    )}
                    {p.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.keywords.slice(0, 6).map((k) => (
                          <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            #{k}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/40">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                    {p.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>{p.is_active ? "노출 중" : "숨김"}</span>
                    <span>·</span>
                    <span className="tabular-nums">클릭 {p.click_count}</span>
                    <span>·</span>
                    {p.compare_at_price || p.sale_label ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-semibold">
                        <Flame className="w-2.5 h-2.5" /> 할인 강조 ON
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                        ⚠️ 할인 정보 없음
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!(p.compare_at_price || p.sale_label) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] gap-1 rounded-full"
                        onClick={() => void handleRefillSale(p)}
                        disabled={refillingId === p.id}
                      >
                        {refillingId === p.id ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> 분석</>
                        ) : (
                          <><RefreshCw className="w-3 h-3" /> 할인 채우기</>
                        )}
                      </Button>
                    )}
                    <Switch
                      checked={p.is_active}
                      onCheckedChange={(v) => void handleToggle(p.id, v)}
                      aria-label="노출 토글"
                    />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(p.id)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => void handleDelete(p.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ),
          )}
        </div>
      )}

      {items.length >= MAX_PRODUCTS && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          최대 {MAX_PRODUCTS}개까지 등록할 수 있어요.
        </p>
      )}
    </>
  );
}

function ProductForm({
  siteId,
  initial,
  prefillUrl,
  autoFillOnMount,
  onSaved,
  onClose,
}: {
  siteId: string;
  initial?: Product;
  prefillUrl?: string;
  autoFillOnMount?: boolean;
  onSaved: (p: Product) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? prefillUrl ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price ?? "");
  const [compareAtPrice, setCompareAtPrice] = useState(initial?.compare_at_price ?? "");
  const [saleLabel, setSaleLabel] = useState(initial?.sale_label ?? "");
  const [saleEndsAt, setSaleEndsAt] = useState(
    initial?.sale_ends_at ? new Date(initial.sale_ends_at).toISOString().slice(0, 16) : "",
  );
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [keywordsText, setKeywordsText] = useState((initial?.keywords ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [autofilling, setAutofilling] = useState(false);

  const handleAutofill = async () => {
    const raw = url.trim();
    if (!raw || !/^https?:\/\//i.test(raw)) {
      toast.error("먼저 제품 URL을 입력해주세요 (https://...)");
      return;
    }
    const target = cleanProductUrl(raw);
    if (target !== raw) {
      setUrl(target);
      toast.message("URL의 추적 파라미터를 정리했어요", { description: "utm·gclid 등은 자동 제거됩니다." });
    }
    setAutofilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-product-info", {
        body: { url: target },
      });
      if (error) throw error;
      const info = (data as any)?.data ?? {};
      let filled = 0;
      if (info.title && !title.trim()) { setTitle(info.title); filled++; }
      if (info.description && !description.trim()) { setDescription(info.description); filled++; }
      if (info.price && !price.trim()) { setPrice(info.price); filled++; }
      if (info.compare_at_price && !compareAtPrice.trim()) { setCompareAtPrice(info.compare_at_price); filled++; }
      if (info.sale_label && !saleLabel.trim()) { setSaleLabel(info.sale_label); filled++; }
      if (info.image_url && !imageUrl.trim()) { setImageUrl(info.image_url); filled++; }
      if (Array.isArray(info.keywords) && info.keywords.length > 0 && !keywordsText.trim()) {
        setKeywordsText(info.keywords.join(", "));
        filled++;
      }
      if (filled === 0) {
        toast.info("이미 채워진 항목이 있어 덮어쓰지 않았어요. 빈 칸을 비우고 다시 시도해보세요.");
      } else {
        toast.success(`${filled}개 항목을 자동으로 채웠어요`);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "자동 채우기에 실패했어요");
    } finally {
      setAutofilling(false);
    }
  };

  // 빈 카탈로그에서 URL을 붙여넣고 들어온 경우 마운트 직후 1회 자동 실행
  useEffect(() => {
    if (autoFillOnMount && (prefillUrl ?? "").trim()) {
      void handleAutofill();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      toast.error("제목과 URL은 필수예요");
      return;
    }
    setSaving(true);
    const keywords = keywordsText
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
      .slice(0, 12);

    const payload = {
      site_id: siteId,
      title: title.trim(),
      url: cleanProductUrl(url.trim()),
      description: description.trim() || null,
      price: price.trim() || null,
      compare_at_price: compareAtPrice.trim() || null,
      sale_label: saleLabel.trim() || null,
      sale_ends_at: saleEndsAt ? new Date(saleEndsAt).toISOString() : null,
      image_url: imageUrl.trim() || null,
      keywords,
    };

    try {
      if (initial) {
        const { data, error } = await (supabase as any)
          .from("site_products")
          .update(payload)
          .eq("id", initial.id)
          .select()
          .single();
        if (error) throw error;
        toast.success("제품을 수정했어요");
        onSaved(data as Product);
      } else {
        const { data, error } = await (supabase as any)
          .from("site_products")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        toast.success("제품을 등록했어요");
        onSaved(data as Product);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "저장에 실패했어요");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 rounded-2xl border-primary/30 bg-primary/[0.02] mt-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-foreground">{initial ? "제품 수정" : "새 제품 등록"}</h3>
          <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="p-title" className="text-xs">제품명 *</Label>
            <Input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="p-url" className="text-xs">제품 URL *</Label>
            <div className="flex gap-2">
              <Input
                id="p-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://"
                required
                className="flex-1"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full shrink-0 gap-1"
                onClick={() => void handleAutofill()}
                disabled={autofilling || !url.trim()}
              >
                {autofilling ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 분석 중…</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" /> 자동 채우기</>
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              URL을 붙여넣고 ✨ 버튼을 누르면 제품명·설명·가격·이미지·키워드를 AI가 자동으로 채워줘요.
            </p>
          </div>
          <div>
            <Label htmlFor="p-price" className="text-xs">판매가 (할인 적용된 최종가)</Label>
            <Input id="p-price" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="29,000원" />
          </div>
          <div>
            <Label htmlFor="p-compare" className="text-xs">원가 (취소선 표시)</Label>
            <Input id="p-compare" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} placeholder="59,000원" />
          </div>
          <div>
            <Label htmlFor="p-sale-label" className="text-xs">세일 라벨 (선택)</Label>
            <Input id="p-sale-label" value={saleLabel} onChange={(e) => setSaleLabel(e.target.value)} maxLength={30} placeholder="예) 오늘만, 단독특가, 재고소진임박" />
          </div>
          <div>
            <Label htmlFor="p-sale-ends" className="text-xs">행사 종료 시각 (선택)</Label>
            <Input id="p-sale-ends" type="datetime-local" value={saleEndsAt} onChange={(e) => setSaleEndsAt(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="p-image" className="text-xs">이미지 URL (선택)</Label>
            <Input id="p-image" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="p-desc" className="text-xs">설명 (선택, 1~2줄)</Label>
            <Input
              id="p-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="이 제품이 어떤 글에 어울리는지 짧게"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="p-kw" className="text-xs">매칭 키워드 (쉼표로 구분, 최대 12개)</Label>
            <Input
              id="p-kw"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              placeholder="예) 오버사이즈, 티셔츠, 캐주얼"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              글 키워드/본문에 이 단어가 들어가면 AI가 우선적으로 이 제품을 추천해요.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
          <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button type="submit" size="sm" className="rounded-full" disabled={saving}>
            {saving ? "저장 중…" : initial ? "수정" : "등록"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
