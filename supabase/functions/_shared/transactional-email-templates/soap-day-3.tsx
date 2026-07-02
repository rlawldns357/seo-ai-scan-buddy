import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, h1, text, hr, badge, ScoreBlock, CtaBlock, Signoff, type SoapProps } from './_soap-shared.tsx'

const SoapDay3 = ({ url, seo, aeo, geo }: SoapProps) => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>경쟁사가 아직 모르는 GEO 노출 핵심 1가지</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={badge('hsl(280, 70%, 50%)')}>Day 3 · 숨은 깨달음</Text>
        <Heading style={h1}>경쟁사가 아직 모르는<br/>GEO 노출 핵심 1가지</Heading>
        <Text style={text}>
          오늘은 실전 하나만 알려드릴게요. 무겁지 않게 짧게 갑니다.
        </Text>
        <Text style={text}>
          <strong>ChatGPT·Perplexity가 인용하는 페이지에는 공통점이 있습니다.</strong>
          "출처 신뢰도 신호"가 셋 이상 있는 페이지만 뽑아요.
        </Text>
        <Text style={text}>
          1. <strong>JSON-LD 구조화 데이터</strong> — Organization, Product, FAQPage<br/>
          2. <strong>정의문으로 시작하는 첫 문장</strong> — "X는 Y다" 형식<br/>
          3. <strong>날짜·저자 메타데이터</strong> — 최신성 + 권위 신호
        </Text>
        <Text style={text}>
          이 3가지가 갖춰진 페이지는, 같은 키워드에서 <strong>경쟁사보다 5~10배</strong> 자주 AI에 인용됩니다.
        </Text>
        <ScoreBlock url={url} seo={seo} aeo={aeo} geo={geo} />
        <Text style={text}>
          위 점수에서 <strong>GEO가 60점 미만</strong>이시라면, 십중팔구 이 3가지 중 최소 1개가 빠져 있어요.
          어떤 게 빠졌는지는, <strong>페이지를 직접 열어봐야</strong> 보입니다.
        </Text>
        <Text style={text}>
          솔직히 말씀드리면 — 저희가 30분간 사이트를 뜯어보면 대부분 그 자리에서 찾아드려요.
          점수표로는 절대 안 보이는 것들이거든요.
        </Text>
        <CtaBlock label="30분 무료 상담 — 지금 예약 →" />
        <Text style={text}>
          내일은 더 무거운 이야기 — <strong>"점수만 올려도 트래픽이 안 오는 이유"</strong>를 다룹니다.
        </Text>
        <Hr style={hr} />
        <Signoff />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SoapDay3,
  subject: '[Day 3] 경쟁사가 아직 모르는 GEO 노출 핵심 1가지',
  displayName: 'Soap Opera · Day 3 (Hidden Benefit)',
  previewData: { url: 'https://example.com', seo: 78, aeo: 80, geo: 58 },
} satisfies TemplateEntry
