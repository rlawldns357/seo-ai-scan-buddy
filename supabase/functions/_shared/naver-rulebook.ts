// 네이버 웹마스터 공식 룰북 - SearchTune OS 불변 베이스 규칙
// 출처: 네이버 웹마스터도구 팀 공식 가이드
// 우선순위: DB(engine_config.naver_webmaster_rulebook) → 이 상수 fallback
// 트렌드 자동 업데이트가 절대 덮어쓰지 못함

export const NAVER_WEBMASTER_RULEBOOK_FALLBACK = `# 네이버 웹마스터 공식 룰북 (Naver Webmaster Bible)

## 1. 검색 로봇 수집 (Crawl Access) - SEO 핵심
- Yeti(네이버 크롤러) 허용 필수: robots.txt에 User-agent: Yeti + Allow: / 명시 권장. 차단 시 한국 검색 노출 0%.
- 로봇 메타태그: <meta name="robots" content="index"> 명시 권장. noindex 발견 시 SEO 점수 캡(0~30).
- HTTP 200 정상 응답: 리다이렉트 체인 3단계 이상은 감점.
- sitemap.xml 제출: URL/lastmod/changefreq/priority 4요소 포함 시 가점.

## 2. 콘텐츠 관리 - SEO/AEO 핵심
- 고유 title 태그(페이지마다 다르게), meta description 50~160자, Open Graph 4종(og:title/description/image/url) 필수.
- 본문 텍스트 비중: HTML 코드 대비 25% 이상. 이미지/iframe만으로 구성된 페이지는 수집 불가 처리.

## 3. 사이트 구조 - SEO 핵심
- <frame>/<frameset> 금지(SEO 캡 40), 시맨틱 HTML(header/main/article/footer), 단일 H1, 내부 링크빌딩.

## 4. 사이트 활성화 - AEO/GEO 핵심
- 앵커 텍스트는 페이지 대표 키워드 사용. "여기 클릭"/"더보기" 금지.
- 모든 <img>에 의미있는 alt 속성 필수.
- 외부 백링크가 내부 링크보다 신뢰도에 유리.

## 5. 구조화 데이터 - AEO/GEO 핵심
- schema.org JSON-LD 우선. Organization/Person + sameAs로 SNS/네이버 채널 연결.
- BlogPosting/Article(author, datePublished, dateModified, image, headline 필수), FAQPage 5문항+.
- JSON-LD 0개 시 AEO 캡 50, GEO 캡 40.

## 6. 사이트 품질 10대 원칙
- 브랜드 도메인, 가벼운 페이지(LCP<2.5s), 리치미디어 절제, 중복 콘텐츠 금지(canonical),
  모바일 친화적, HTTPS 필수(HTTP는 SEO 캡 60), 외부 인용 확보, lastmod 신선도, 의미있는 URL slug.

## 한국 사이트 적용 룰
- .kr 도메인 또는 한글 콘텐츠 70%+ 감지 시 위 룰북을 분석/생성 프롬프트에 강제 주입.
- 트렌드 업데이트는 이 룰북을 변경할 수 없다. 신규 트렌드는 보조 시그널로만 추가.
`;

// DB에서 룰북 가져오기 (fallback 자동 처리). createClient된 supabase 인스턴스를 받음.
export async function loadNaverRulebook(supabase: any): Promise<string> {
  try {
    const { data } = await supabase
      .from("engine_config")
      .select("config_value")
      .eq("config_key", "naver_webmaster_rulebook")
      .maybeSingle();
    if (data?.config_value) return data.config_value;
  } catch (e) {
    console.warn("[naver-rulebook] DB load failed, using fallback:", e);
  }
  return NAVER_WEBMASTER_RULEBOOK_FALLBACK;
}

// 한국 사이트 감지 (URL + 본문 텍스트로 판단)
export function isKoreanSite(url: string, sampleText?: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith(".kr") || host.endsWith(".co.kr") || host.includes("naver.") || host.includes("kakao.")) {
      return true;
    }
  } catch { /* ignore */ }
  if (sampleText) {
    const sample = sampleText.slice(0, 2000);
    const hangul = (sample.match(/[\uAC00-\uD7AF]/g) || []).length;
    const total = sample.replace(/\s/g, "").length || 1;
    if (hangul / total >= 0.3) return true;
  }
  return false;
}
