import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, h1, text, hr, badge, ScoreBlock, CtaBlock, Signoff, type SoapProps } from './_soap-shared.tsx'

const SoapDay5 = ({ url, seo, aeo, geo }: SoapProps) => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>이번 주까지 무료 상담 슬롯 3자리만 남았어요</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={badge('hsl(0, 70%, 50%)')}>Day 5 · 마지막 제안</Text>
        <Heading style={h1}>이번 주까지<br/>무료 상담 슬롯 3자리</Heading>
        <Text style={text}>
          5일 동안 함께해 주셔서 감사합니다.
        </Text>
        <Text style={text}>
          마지막으로 — 점수가 아닌 <strong>전략</strong>이 진짜 문제라면, 가장 빠른 길은 한 가지예요.
        </Text>
        <Text style={text}>
          저희가 사이트를 직접 들여다보고, 30분간 <strong>1:1 무료 진단 상담</strong>을 드립니다.
        </Text>
        <ScoreBlock url={url} seo={seo} aeo={aeo} geo={geo} />
        <Text style={text}>
          <strong>상담에서 받게 되는 것:</strong>
        </Text>
        <Text style={text}>
          ✓ SEO·AEO·GEO 점수 뒤에 숨은 <strong>진짜 약점</strong> 진단<br/>
          ✓ 경쟁사 대비 <strong>30일 안에 뒤집을 수 있는</strong> 1가지 액션<br/>
          ✓ AI 검색 시대에 맞는 <strong>콘텐츠 전략</strong> 가이드
        </Text>
        <Text style={text}>
          비용은 <strong>0원</strong>이고, 부담스러운 영업도 없어요. 단, 이번 주 슬롯은 <strong>3자리</strong>만 남았습니다.
        </Text>
        <CtaBlock label="무료 상담 신청하기 →" />
        <Text style={text}>
          신청 후 영업일 기준 1일 안에 일정을 잡아드릴게요.
        </Text>
        <Hr style={hr} />
        <Signoff />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SoapDay5,
  subject: '[Day 5] 이번 주까지 — 무료 상담 슬롯 3자리만 남았습니다',
  displayName: 'Soap Opera · Day 5 (Urgency + Offer)',
  previewData: { url: 'https://example.com', seo: 78, aeo: 80, geo: 58 },
} satisfies TemplateEntry
