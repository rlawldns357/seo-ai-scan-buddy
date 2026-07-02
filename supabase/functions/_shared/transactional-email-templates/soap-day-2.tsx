import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, main, container, h1, text, hr, badge, ScoreBlock, CtaBlock, Signoff, type SoapProps } from './_soap-shared.tsx'

const SoapDay2 = ({ url, seo, aeo, geo }: SoapProps) => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>SEO만으론 이제 안 됩니다 — 3축의 시대</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={badge('hsl(220, 90%, 56%)')}>Day 2 · 패러다임 전환</Text>
        <Heading style={h1}>"검색"의 시대는 끝났어요<br/>이제 "질문"의 시대입니다</Heading>
        <Text style={text}>
          어제 받으신 점수, 다시 한 번 보세요.
        </Text>
        <ScoreBlock url={url} seo={seo} aeo={aeo} geo={geo} />
        <Text style={text}>
          많은 분들이 <strong>"SEO 점수만 올리면 되는 거 아냐?"</strong>라고 생각하세요.
          5년 전이라면 맞는 말이었습니다.
        </Text>
        <Text style={text}>
          하지만 2026년 지금, 사용자의 검색 행동은 이렇게 바뀌었어요:
        </Text>
        <Text style={text}>
          ✗ 구글에 키워드 입력<br/>
          ✓ <strong>ChatGPT에게 직접 질문</strong><br/><br/>
          ✗ 네이버 블로그 하나하나 열어보기<br/>
          ✓ <strong>Perplexity가 요약해서 즉시 알려줌</strong>
        </Text>
        <Text style={text}>
          이게 저희가 <strong>SEO·AEO·GEO 3축</strong>으로 진단하는 이유예요.
        </Text>
        <Text style={text}>
          • <strong>SEO</strong> — 구글·네이버에 잘 나오나?<br/>
          • <strong>AEO</strong> — 검색 결과의 "답변 박스"에 뽑히나?<br/>
          • <strong>GEO</strong> — ChatGPT·Perplexity가 <em>당신을</em> 추천하나?
        </Text>
        <Text style={text}>
          지금 점수 중 <strong>가장 낮은 축</strong>이 바로 매출이 새고 있는 구멍입니다.
        </Text>
        <Text style={text}>
          내일은 — <strong>경쟁사가 아직 모르는 GEO 노출 핵심 1가지</strong>를 알려드릴게요.
        </Text>
        <CtaBlock label="지금 30분 무료 상담 예약하기 →" />
        <Text style={text}>
          아, 그리고 — 점수가 걱정되시면 이번 주 안에 상담 잡아두시는 걸 추천드려요.
          매주 <strong>3자리</strong>만 여니까요.
        </Text>
        <Hr style={hr} />
        <Signoff />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SoapDay2,
  subject: '[Day 2] SEO만으론 이제 안 됩니다 — 3축의 시대가 왔어요',
  displayName: 'Soap Opera · Day 2 (Backstory)',
  previewData: { url: 'https://example.com', seo: 78, aeo: 80, geo: 58 },
} satisfies TemplateEntry
