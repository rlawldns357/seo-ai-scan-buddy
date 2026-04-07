

## 서치튠OS 자체 진단 피드백 반영 계획

서치튠OS가 스스로를 분석한 4가지 피드백을 반영합니다.

---

### 1. 간결한 서술 방식 (About 페이지 + FaqSection)

**현재**: About 페이지의 설명 문단이 길고 산만하여 AI가 요약하기 어려움

**변경**:
- About.tsx의 각 설명 문단 첫 문장을 **한 줄 직접 답변** 형태로 재작성
- 예: "왜 SEO만으로는 부족한가요?" → 첫 문장을 "AI 검색엔진이 기존 검색 결과를 대체하고 있기 때문입니다." 같은 명확한 답변으로 시작
- FAQ 답변도 핵심 한 문장을 앞에 배치하는 구조로 정리

### 2. 엔티티 정의 강화 (About 페이지 + JSON-LD)

**현재**: "서치튠OS"가 무엇인지에 대한 명확한 정의 문장이 About 상단에 없음

**변경**:
- About.tsx 상단에 **엔티티 정의 문단** 추가: "서치튠OS(SearchTune OS)는 2025년 출시된 한국어 기반 AI 검색 진단 도구로, URL만 입력하면 SEO·AEO·GEO 3개 축의 점수를 즉시 분석합니다."
- JSON-LD의 SoftwareApplication에 `datePublished`, `author`, `featureList` 등 누락된 속성 보강
- index.html의 Organization JSON-LD에 `foundingDate`, `description` 추가

### 3. robots.txt AI 크롤러 정책 (이미 완료 확인)

**현재**: robots.txt에 GPTBot, OAI-SearchBot 등 AI 크롤러가 **이미 명시적으로 Allow** 처리되어 있음

**변경**: 추가 AI 크롤러 3종 보강
- `Google-Extended` (Google AI 학습용)
- `PerplexityBot`
- `ClaudeBot`

### 4. 출처·데이터·업데이트 날짜 추가

**현재**: About 페이지와 메인 페이지에 통계나 업데이트 날짜가 없음

**변경**:
- About.tsx에 "마지막 엔진 업데이트: 2026년 4월" 같은 날짜 표기 추가
- "Google Lighthouse v12 기준", "Schema.org 2024 표준 기반" 등 구체적 출처/버전 명시
- index.html의 SoftwareApplication JSON-LD에 `softwareVersion`, `dateModified` 추가

---

### 수정 대상 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/About.tsx` | 엔티티 정의 문단 추가, 설명 문단 간결화, 업데이트 날짜·출처 명시 |
| `src/components/FaqSection.tsx` | FAQ 답변 첫 문장을 직접 답변 구조로 개선 |
| `src/components/JsonLd.tsx` | SoftwareApplication에 datePublished, featureList, softwareVersion 추가 |
| `index.html` | Organization에 foundingDate/description, SoftwareApplication에 dateModified 추가 |
| `public/robots.txt` | Google-Extended, PerplexityBot, ClaudeBot Allow 추가 |

