import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, h1, text, hr, badge, ScoreBlock, CtaBlock, Signoff, type SoapProps } from './_soap-shared.tsx'

const SoapDay5 = ({ url, seo, aeo, geo }: SoapProps) => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>이번 주 무료 상담 슬롯 3자리 — 마지막 안내입니다</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={badge('hsl(0, 70%, 50%)')}>Day 5 · 마지막 제안</Text>
        <Heading style={h1}>이번 주 무료 상담<br/>슬롯 3자리, 마지막 안내</Heading>
        <Text style={text}>
          5일 동안 함께해 주셔서 감사합니다.
        </Text>
        <Text style={text}>
          지난 4일간 반복해서 말씀드린 결론은 하나예요 —
          <strong>점수가 아니라 전략이 진짜 문제</strong>이고, 그건 <strong>사람이 봐야만 보인다</strong>는 것.
        </Text>
        <ScoreBlock url={url} seo={seo} aeo={aeo} geo={geo} />
        <Text style={text}>
          그래서 저희가 매주 <strong>3자리</strong>만 여는 30분 무료 상담이 있습니다.
          이번 주 슬롯이 아직 남아 있어요.
        </Text>
        <Text style={text}>
          <strong>상담에서 받으시는 것:</strong>
        </Text>
        <Text style={text}>
          ✓ 점수 뒤에 숨은 <strong>진짜 약점 3가지</strong> — 사이트 열어서 같이 확인<br/>
          ✓ 경쟁사 대비 <strong>30일 안에 뒤집을 수 있는 액션 1가지</strong><br/>
          ✓ AI 검색 시대에 맞는 <strong>콘텐츠 전략</strong> 30분 컨설팅
        </Text>
        <Text style={text}>
          비용은 <strong>0원</strong>. 부담스러운 영업 없어요.
        </Text>
        <Text style={text}>
          상담 마지막 5분 즈음, <strong>"직접 고치실 건지, 저희에게 맡기실 건지"</strong>만 여쭤봅니다.
          맡기고 싶으시면 실행 옵션을 안내드리고, 직접 하시겠다면 진단서만 가져가시면 돼요. 정말 부담 없이 오세요.
        </Text>
        <CtaBlock label="무료 상담 신청하기 (남은 슬롯 3자리) →" />
        <Text style={text}>
          신청 후 영업일 기준 <strong>1일 안</strong>에 일정 잡아드립니다.
          이번 주 넘기면 다음 3자리는 다음 주에 열려요.
        </Text>
        <Text style={text}>
          — 5일간의 편지는 여기까지입니다. 오늘 결정이 아니어도 좋아요. 다만, 점수가 저 상태로 방치되는 시간이 <strong>매일 매출을 새게 하고 있다는 것</strong>만 기억해 주세요.
        </Text>
        <Hr style={hr} />
        <Signoff />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SoapDay5,
  subject: '[Day 5] 이번 주 무료 상담 슬롯 3자리 — 마지막 안내입니다',
  displayName: 'Soap Opera · Day 5 (Urgency + Offer)',
  previewData: { url: 'https://example.com', seo: 78, aeo: 80, geo: 58 },
} satisfies TemplateEntry
