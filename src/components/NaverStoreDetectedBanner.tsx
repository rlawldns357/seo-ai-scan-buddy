import { SiNaver } from "@icons-pack/react-simple-icons";
import { NaverStoreInfo } from "@/lib/naverStore";

interface NaverStoreDetectedBannerProps {
  info: NaverStoreInfo;
}

const NaverStoreDetectedBanner = ({ info }: NaverStoreDetectedBannerProps) => {
  const typeLabel = info.type === "brand" ? "브랜드 스토어" : "스마트스토어";
  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground leading-none animate-fade-in">
      <SiNaver className="w-3 h-3 shrink-0 block relative -top-px" style={{ color: "#03C75A" }} />
      <span className="leading-none">네이버 {typeLabel} 감지</span>
      <span className="text-muted-foreground leading-none">· 전용 진단으로 실행</span>
    </div>
  );
};

export default NaverStoreDetectedBanner;
