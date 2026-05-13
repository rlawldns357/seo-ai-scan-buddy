import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, main, container, h1, text, hr, badge, ScoreBlock, Signoff, type SoapProps } from './_soap-shared.tsx'

const SoapDay2 = ({ url, seo, aeo, geo }: SoapProps) => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>왜 갑자기 SEO만으론 부족해진 걸까요?</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={badge('hsl(220, 90%, 56%)')}>Day 2 · 패러다임 전환</Text>
        <Heading style={h1}>"검색"의 시대가 끝나고<br/>"질문"의 시대가 왔습니다</Heading>
        <Text style={text}>
          어제 받으신 점수, 다시 한 번 보세요.
        </Text>
        <ScoreBlock url={url} seo={seo} aeo={aeo} geo={geo} />
        <Text style={text}>
          많은 분들이 "SEO 점수만 올리면 되는 거 아냐?"라고 생각하세요. 5년 전이라면 맞았습니다.
        </Text>
        <Text style={text}>
          하지만 2026년 지금, 사용자는 이렇게 검색합니다:
        </Text>
        <Text style={text}>
          <strong>구글에 키워드 입력 → ChatGPT에게 직접 질문</strong><br/>
          <strong>네이버 블로그 탐색 → Perplexity가 요약해서 알려줌</strong>
        </Text>
        <Text style={text}>
          이게 우리가 SEO·AEO·GEO를 <strong>3축으로</strong> 측정하는 이유예요.
        </Text>
        <Text style={text}>
          • <strong>SEO</strong>: 구글·네이버에 잘 나오나?<br/>
          • <strong>AEO</strong>: 검색결과의 "답변 박스"에 뽑히나?<br/>
          • <strong>GEO</strong>: ChatGPT가 당신을 추천하나?
        </Text>
        <Text style={text}>
          내일은 — 경쟁사가 모르는 GEO 노출 1가지를 알려드릴게요.
        </Text>
        <Hr style={hr} />
        <Signoff />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SoapDay2,
  subject: '[Day 2] 왜 SEO만으론 부족해졌을까요?',
  displayName: 'Soap Opera · Day 2 (Backstory)',
  previewData: { url: 'https://example.com', seo: 78, aeo: 80, geo: 58 },
} satisfies TemplateEntry
