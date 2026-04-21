import Navbar from "@/components/Navbar";
import MarketingLanding from "@/features/publish/landing/MarketingLanding";

/**
 * Public marketing route for Autoblog product details.
 * Separated from /dashboard so URLs map 1:1 with intent:
 *   - /          → 공개 진단 메인 (고정)
 *   - /autoblog  → 공개 Autoblog 상세 소개 (이 페이지)
 *   - /dashboard → 로그인 사용자 운영 대시보드
 */
export default function AutoblogPage() {
  return (
    <div className="min-h-screen flex flex-col w-full bg-background overflow-x-hidden">
      <Navbar />
      <main className="flex-1">
        <MarketingLanding />
      </main>
    </div>
  );
}
