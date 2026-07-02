import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, h1, text, hr, badge, ScoreBlock, CtaBlock, Signoff, type SoapProps } from './_soap-shared.tsx'

const SoapDay4 = ({ url, seo, aeo, geo }: SoapProps) => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>90점이 되어도 트래픽이 안 오는 이유가 있어요</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={badge('hsl(35, 90%, 50%)')}>Day 4 · 숨은 함정</Text>
        <Heading style={h1}>90점이 되어도<br/>트래픽이 안 올 수 있습니다</Heading>
        <Text style={text}>
          어제까지 3축 이야기 잘 따라오셨죠. 오늘은 솔직해질게요.
        </Text>
        <Text style={text}>
          <strong>점수가 90점이 되어도, 매출이 안 늘 수 있습니다.</strong>
        </Text>
        <ScoreBlock url={url} seo={seo} aeo={aeo} geo={geo} />
        <Text style={text}>
          왜냐하면 진짜 문제는 <strong>"점수"가 아니라 "전략"</strong>에 있기 때문이에요.
        </Text>
        <Text style={text}>
          저희가 최근 200개 사이트를 진단하며 반복해서 본 3가지 패턴입니다:
        </Text>
        <Text style={text}>
          🚨 키워드는 잘 잡았는데, <strong>고객이 실제로 검색하는 표현</strong>과 어긋남<br/>
          🚨 콘텐츠는 많은데, <strong>경쟁사가 훨씬 깊이</strong> 다루고 있음<br/>
          🚨 AI에 추천되고 싶지만, <strong>브랜드 정체성</strong>이 모호해서 인용이 안 됨
        </Text>
        <Text style={text}>
          이건 <strong>점수표만 봐서는 안 보여요.</strong> 사람이 사이트를 열어서, 경쟁사 5곳이랑 나란히 놓고 봐야 그제서야 보입니다.
        </Text>
        <Text style={text}>
          저희가 매주 하는 상담이 정확히 그 작업이에요. 30분간 사이트를 뜯어보고, 3가지 중 어디가 문제인지 <strong>같이 짚어드립니다.</strong>
        </Text>
        <CtaBlock label="30분 무료 상담 신청 →" />
        <Text style={text}>
          내일이 마지막 메일입니다. <strong>한 가지 제안</strong>을 드리고 편지를 마칠게요.
        </Text>
        <Hr style={hr} />
        <Signoff />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SoapDay4,
  subject: '[Day 4] 90점이 되어도 트래픽이 안 오는 이유',
  displayName: 'Soap Opera · Day 4 (Hidden Pitfall)',
  previewData: { url: 'https://example.com', seo: 78, aeo: 80, geo: 58 },
} satisfies TemplateEntry
