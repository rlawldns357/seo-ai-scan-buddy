/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>{siteName} 로그인 링크</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>로그인 링크</Heading>
        <Text style={text}>
          아래 버튼을 클릭하여 {siteName}에 로그인하세요. 이 링크는 곧 만료됩니다.
        </Text>
        <Button style={button} href={confirmationUrl}>
          로그인하기
        </Button>
        <Text style={footer}>
          본인이 요청하지 않으셨다면 이 이메일을 무시하셔도 됩니다.
        </Text>
      </Container>
    </Body>
  </Html>

const main = { backgroundColor: '#ffffff', fontFamily: "'Noto Sans KR', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(220, 15%, 13%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(220, 8%, 50%)', lineHeight: '1.5', margin: '0 0 25px' }
const button = { backgroundColor: 'hsl(230, 80%, 56%)', color: '#ffffff', fontSize: '14px', borderRadius: '1rem', padding: '12px 20px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: 'hsl(220, 8%, 50%)', margin: '30px 0 0' }
