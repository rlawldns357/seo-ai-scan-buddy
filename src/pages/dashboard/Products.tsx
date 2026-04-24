import { useEffect, useState, FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { Plus, Trash2, ExternalLink, ShoppingBag, Eye, EyeOff, Edit2, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserSite } from "@/features/publish/useUserSite";
import PageHeader from "@/features/publish/ui/PageHeader";

type Product = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  keywords: string[];
  price: string | null;
  image_url: string | null;
  is_active: boolean;
  click_count: number;
  sort_order: number;
};

const MAX_PRODUCTS = 50;

export default function DashboardProducts() {
  const { site, loading: siteLoading } = useUserSite();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [prefillUrl, setPrefillUrl] = useState<string | null>(null);
  const [quickUrl, setQuickUrl] = useState("");

  const load = async (siteId: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("site_products")
      .select("id, title, url, description, keywords, price, image_url, is_active, click_count, sort_order")
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

  return (
    <>
      <Helmet>
        <title>제품 카탈로그 | AutoBlog</title>
      </Helmet>
      <PageHeader
        icon={ShoppingBag}
        chip="Products"
        title="제품 카탈로그"
        subtitle="등록한 제품은 발행되는 모든 글 끝에 자동으로 노출됩니다. AI가 글 키워드를 보고 가장 잘 맞는 1~3개를 골라 추천해요."
        tone="primary"
        right={
          editingId !== "new" && items.length < MAX_PRODUCTS ? (
            <Button size="sm" className="rounded-full" onClick={() => setEditingId("new")}>
              <Plus className="w-4 h-4" /> 새 제품
            </Button>
          ) : undefined
        }
      />

      {/* 인라인 추가/편집 폼 */}
      {editingId === "new" && (
        <ProductForm
          siteId={site.id}
          onClose={() => setEditingId(null)}
          onSaved={(p) => {
            setItems((prev) => [p, ...prev]);
            setEditingId(null);
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
          <Button size="sm" className="rounded-full" onClick={() => setEditingId("new")}>
            <Plus className="w-4 h-4" /> 첫 제품 등록
          </Button>
        </Card>
      )}

      {/* 목록 */}
      {!loading && items.length > 0 && (
        <div className="grid gap-3 mt-4">
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
                className={`p-4 rounded-2xl border-border/60 bg-card transition ${!p.is_active ? "opacity-60" : ""}`}
              >
                <div className="flex gap-3 items-start">
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
                      className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-0.5 line-clamp-1"
                    >
                      {p.url} <ExternalLink className="w-3 h-3 shrink-0" />
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
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {p.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>{p.is_active ? "노출 중" : "숨김"}</span>
                    <span>·</span>
                    <span className="tabular-nums">클릭 {p.click_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
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
  onSaved,
  onClose,
}: {
  siteId: string;
  initial?: Product;
  onSaved: (p: Product) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [keywordsText, setKeywordsText] = useState((initial?.keywords ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [autofilling, setAutofilling] = useState(false);

  const handleAutofill = async () => {
    const target = url.trim();
    if (!target || !/^https?:\/\//i.test(target)) {
      toast.error("먼저 제품 URL을 입력해주세요 (https://...)");
      return;
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
      url: url.trim(),
      description: description.trim() || null,
      price: price.trim() || null,
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
            <Label htmlFor="p-price" className="text-xs">가격 (선택)</Label>
            <Input id="p-price" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="29,000원" />
          </div>
          <div>
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
