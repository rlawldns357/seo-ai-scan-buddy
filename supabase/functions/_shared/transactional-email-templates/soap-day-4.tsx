import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, h1, text, hr, badge, ScoreBlock, Signoff, type SoapProps } from './_soap-shared.tsx'

const SoapDay4 = ({ url, seo, aeo, geo }: SoapProps) => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>점수만 올려도 트래픽이 안 오는 이유</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={badge('hsl(35, 90%, 50%)')}>Day 4 · 숨은 함정</Text>
        <Heading style={h1}>점수만 올려도<br/>트래픽이 안 오는 이유</Heading>
        <Text style={text}>
          어제까지 SEO·AEO·GEO 3축을 보여드렸는데요.
        </Text>
        <Text style={text}>
          오늘 솔직히 말씀드릴게요. <strong>점수가 90점이 되어도, 트래픽이 안 늘 수 있습니다.</strong>
        </Text>
        <ScoreBlock url={url} seo={seo} aeo={aeo} geo={geo} />
        <Text style={text}>
          왜냐하면 진짜 문제는 <strong>"점수"가 아니라 "전략"</strong>에 있기 때문이에요.
        </Text>
        <Text style={text}>
          저희가 200개 사이트를 진단하며 발견한 패턴 3가지:
        </Text>
        <Text style={text}>
          • 키워드는 잘 잡았는데, <strong>고객이 실제로 검색하는 표현</strong>과 다름<br/>
          • 콘텐츠는 많은데, <strong>경쟁사가 더 깊이</strong> 다루고 있음<br/>
          • AI 추천 받고 싶은데, <strong>우리 브랜드 정체성</strong>이 모호함
        </Text>
        <Text style={text}>
          이건 점수표만 봐서는 안 보여요. <strong>사람이 직접 들여다봐야</strong> 보입니다.
        </Text>
        <Text style={text}>
          내일이 마지막 메일입니다. 진짜 도움이 될 한 가지 제안을 드릴게요.
        </Text>
        <Hr style={hr} />
        <Signoff />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SoapDay4,
  subject: '[Day 4] 점수만 올려도 트래픽이 안 오는 이유',
  displayName: 'Soap Opera · Day 4 (Hidden Pitfall)',
  previewData: { url: 'https://example.com', seo: 78, aeo: 80, geo: 58 },
} satisfies TemplateEntry
