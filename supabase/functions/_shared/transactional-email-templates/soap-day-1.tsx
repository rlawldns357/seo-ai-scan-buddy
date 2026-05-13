import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, main, container, h1, text, hr, badge, ScoreBlock, CtaBlock, Signoff, type SoapProps } from './_soap-shared.tsx'

const SoapDay1 = ({ url, seo, aeo, geo }: SoapProps) => {
  const worst = Math.min(seo ?? 100, aeo ?? 100, geo ?? 100)
  const worstLabel = worst === geo ? 'GEO' : worst === aeo ? 'AEO' : 'SEO'
  return (
    <Html lang="ko" dir="ltr">
      <Head />
      <Preview>방금 진단하신 결과… 솔직히 충격이었습니다</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={badge('hsl(0, 70%, 50%)')}>Day 1 · 진단 결과</Text>
          <Heading style={h1}>방금 진단하신 결과,<br/>솔직히 충격이었어요</Heading>
          <Text style={text}>
            안녕하세요, {SITE_NAME}입니다.
          </Text>
          <Text style={text}>
            방금 등록하신 사이트의 점수를 다시 한 번 보내드릴게요.
            특히 <strong>{worstLabel} {worst}점</strong>이 눈에 띄었습니다.
          </Text>
          <ScoreBlock url={url} seo={seo} aeo={aeo} geo={geo} />
          <Text style={text}>
            <strong>이 점수가 그대로 방치되면 어떻게 될까요?</strong>
          </Text>
          <Text style={text}>
            • 검색 결과 첫 페이지에서 점점 밀려납니다<br/>
            • ChatGPT·Perplexity가 경쟁사를 추천합니다<br/>
            • 잠재 고객은 당신의 브랜드를 <strong>'발견조차'</strong> 못 합니다
          </Text>
          <Text style={text}>
            앞으로 5일간, 왜 이런 일이 벌어지고 있는지 — 그리고 어떻게 뒤집을 수 있는지 — 짧게 보내드릴게요.
          </Text>
          <Text style={text}>
            내일 메일에서는 "왜 갑자기 SEO만으론 부족해진 걸까?"를 다룹니다.
          </Text>
          <Hr style={hr} />
          <Signoff />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SoapDay1,
  subject: (d: SoapProps) => `[Day 1] ${SITE_NAME} 진단 결과 — 가장 시급한 건 ${(d.geo ?? 100) <= (d.aeo ?? 100) && (d.geo ?? 100) <= (d.seo ?? 100) ? 'GEO' : (d.aeo ?? 100) <= (d.seo ?? 100) ? 'AEO' : 'SEO'} 입니다`,
  displayName: 'Soap Opera · Day 1 (Drama)',
  previewData: { url: 'https://example.com', seo: 78, aeo: 80, geo: 58 },
} satisfies TemplateEntry
