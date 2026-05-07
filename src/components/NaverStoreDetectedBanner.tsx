import { SiNaver } from "@icons-pack/react-simple-icons";
import { NaverStoreInfo } from "@/lib/naverStore";

interface NaverStoreDetectedBannerProps {
  info: NaverStoreInfo;
}

const NaverStoreDetectedBanner = ({ info }: NaverStoreDetectedBannerProps) => {
  const typeLabel = info.type === "brand" ? "브랜드 스토어" : "스마트스토어";
  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground animate-fade-in">
      <SiNaver className="w-3 h-3 shrink-0" style={{ color: "#03C75A" }} />
      <span>네이버 {typeLabel} 감지</span>
      <span className="text-muted-foreground">· 전용 진단으로 실행</span>
    </div>
  );
};

export default NaverStoreDetectedBanner;
