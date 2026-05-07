import { SiNaver } from "@icons-pack/react-simple-icons";
import { NaverStoreInfo } from "@/lib/naverStore";

interface NaverStoreDetectedBannerProps {
  info: NaverStoreInfo;
}

const NaverStoreDetectedBanner = ({ info }: NaverStoreDetectedBannerProps) => {
  const typeLabel = info.type === "brand" ? "브랜드 스토어" : "스마트스토어";
  return (
    <div className="max-w-2xl mx-auto mt-3 flex items-center gap-2.5 rounded-full border border-naver/30 bg-naver/5 px-4 py-2 animate-fade-in">
      <span
        style={{ color: "#03C75A" }}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white border border-border shrink-0"
      >
        <SiNaver className="w-2.5 h-2.5" />
      </span>
      <p className="text-xs font-medium text-foreground leading-tight truncate">
        네이버 {typeLabel} 감지 <span className="text-muted-foreground">· 전용 진단으로 실행</span>
      </p>
    </div>
  );
};

export default NaverStoreDetectedBanner;
