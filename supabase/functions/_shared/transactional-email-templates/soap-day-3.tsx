import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, h1, text, hr, badge, ScoreBlock, Signoff, type SoapProps } from './_soap-shared.tsx'

const SoapDay3 = ({ url, seo, aeo, geo }: SoapProps) => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>경쟁사가 절대 모르는 GEO 노출 1가지</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={badge('hsl(280, 70%, 50%)')}>Day 3 · 숨은 깨달음</Text>
        <Heading style={h1}>경쟁사가 모르는<br/>GEO 노출 핵심 1가지</Heading>
        <Text style={text}>
          오늘은 실전 한 가지만 알려드릴게요.
        </Text>
        <Text style={text}>
          <strong>ChatGPT·Perplexity는 "출처가 명확한 페이지"를 인용합니다.</strong>
        </Text>
        <Text style={text}>
          구체적으로는:
        </Text>
        <Text style={text}>
          1. <strong>JSON-LD 구조화 데이터</strong> (Organization, Product, FAQPage)<br/>
          2. <strong>명확한 정의문</strong> ("X는 Y이다" 형식의 첫 문장)<br/>
          3. <strong>날짜·저자 메타데이터</strong> (최신성·신뢰도 신호)
        </Text>
        <Text style={text}>
          이 3가지가 갖춰진 페이지는, 같은 키워드에서 <strong>경쟁사보다 5~10배</strong> 자주 인용됩니다.
        </Text>
        <ScoreBlock url={url} seo={seo} aeo={aeo} geo={geo} />
        <Text style={text}>
          위 점수에서 <strong>GEO가 60점 미만</strong>이면, 십중팔구 이 3가지 중 1개 이상이 빠져 있어요.
        </Text>
        <Text style={text}>
          내일은 더 무서운 이야기 — "점수만 올려도 트래픽이 안 오는 이유"를 다룹니다.
        </Text>
        <Hr style={hr} />
        <Signoff />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SoapDay3,
  subject: '[Day 3] 경쟁사가 모르는 GEO 노출 1가지',
  displayName: 'Soap Opera · Day 3 (Hidden Benefit)',
  previewData: { url: 'https://example.com', seo: 78, aeo: 80, geo: 58 },
} satisfies TemplateEntry
