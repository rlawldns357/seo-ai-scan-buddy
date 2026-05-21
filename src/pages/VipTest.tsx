import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BRAND_LABEL,
  getStoredVipBrand,
  setStoredVipBrand,
  type VipBrand,
} from "@/lib/vipBrand";

const VipTest = () => {
  const [current, setCurrent] = useState<VipBrand | null>(null);

  useEffect(() => {
    setCurrent(getStoredVipBrand());
  }, []);

  const apply = (brand: VipBrand) => {
    setStoredVipBrand(brand);
    setCurrent(brand);
  };

  const clear = () => {
    try {
      localStorage.removeItem("vip_brand");
      window.dispatchEvent(new Event("vip-brand-change"));
    } catch {
      /* ignore */
    }
    setCurrent(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">VIP 브랜드 테스트</h1>
          <p className="text-sm text-muted-foreground mt-1">
            현재 저장된 브랜드:{" "}
            <span className="font-semibold text-foreground">
              {current ? BRAND_LABEL[current] : "없음 (일반)"}
            </span>
          </p>
        </div>

        <div className="grid gap-3">
          <Button
            variant={current === "growthbridge" ? "default" : "outline"}
            onClick={() => apply("growthbridge")}
            className="justify-start"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
            GrowthBridge (초록 닷)
          </Button>
          <Button
            variant={current === "progressmedia" ? "default" : "outline"}
            onClick={() => apply("progressmedia")}
            className="justify-start"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
            ProgressMedia (파란 닷)
          </Button>
          <Button variant="ghost" onClick={clear}>
            초기화 (일반 사용자로)
          </Button>
        </div>

        <Link
          to="/"
          className="block text-center text-sm text-primary hover:underline"
        >
          → 메인으로 가서 확인하기
        </Link>
      </div>
    </div>
  );
};

export default VipTest;
