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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>{siteName} 비밀번호 재설정</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>비밀번호 재설정</Heading>
        <Text style={text}>
          {siteName} 비밀번호 재설정 요청이 접수되었습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정해 주세요.
        </Text>
        <Button style={button} href={confirmationUrl}>
          비밀번호 재설정하기
        </Button>
        <Text style={footer}>
          본인이 요청하지 않으셨다면 이 이메일을 무시하셔도 됩니다. 비밀번호는 변경되지 않습니다.
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
