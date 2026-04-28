import { Store } from "lucide-react";
import { NaverStoreInfo } from "@/lib/naverStore";

interface NaverStoreDetectedBannerProps {
  info: NaverStoreInfo;
}

/**
 * 메인 입력창 아래에 노출되는 네이버 스토어 감지 안내.
 * SubpageWarning과 동일한 톤(인라인 카드)으로, 일반 분석이 아닌 전용 진단으로
 * 자동 전환된다는 점을 미리 알려 사용자 혼란을 줄임.
 */
const NaverStoreDetectedBanner = ({ info }: NaverStoreDetectedBannerProps) => {
  const typeLabel = info.type === "brand" ? "브랜드 스토어" : "스마트스토어";
  return (
    <div className="max-w-lg mx-auto mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 animate-fade-up">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <Store className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-emerald-900 mb-1">
            네이버 {typeLabel}가 감지되었어요
          </p>
          <p className="text-xs text-emerald-900/80 leading-relaxed mb-3">
            일반 SEO/AEO/GEO 점수는 적용되지 않아요. <br />
            대신 <span className="font-semibold">권위 누수율 · AI 인용 가능성 · 외부 채널 점유율</span>을 측정하는
            네이버 스토어 전용 진단이 자동 실행돼요.
          </p>
          <p className="text-[11px] text-emerald-900/70 truncate">
            <span className="font-medium">대상:</span> {info.storeUrl}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NaverStoreDetectedBanner;
