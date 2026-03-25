import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "AI SEO Score"

const LeadConfirmationEmail = () => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>{SITE_NAME} 등록이 완료되었습니다</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>등록이 완료되었습니다! 🎉</Heading>
        <Text style={text}>
          {SITE_NAME}에 관심을 가져주셔서 감사합니다.
        </Text>
        <Text style={text}>
          정식 출시 소식과 리포트 업데이트를 가장 먼저 이메일로 보내드릴게요.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          {SITE_NAME} 팀 드림
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LeadConfirmationEmail,
  subject: `${SITE_NAME} 등록이 완료되었습니다`,
  displayName: 'Lead confirmation',
  previewData: {},
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Noto Sans KR', Arial, sans-serif" }
const container = { padding: '40px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(220, 15%, 13%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(220, 8%, 50%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(220, 13%, 92%)', margin: '24px 0' }
const footer = { fontSize: '12px', color: 'hsl(220, 8%, 50%)', margin: '0' }
