/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>{siteName} 이메일 변경 확인</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>이메일 변경 확인</Heading>
        <Text style={text}>
          {siteName}의 이메일 주소를{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link>에서{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>
          (으)로 변경하는 요청이 접수되었습니다.
        </Text>
        <Text style={text}>
          아래 버튼을 클릭하여 변경을 확인해 주세요.
        </Text>
        <Button style={button} href={confirmationUrl}>
          이메일 변경 확인하기
        </Button>
        <Text style={footer}>
          본인이 요청하지 않으셨다면 즉시 계정 보안을 확인해 주세요.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Noto Sans KR', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(220, 15%, 13%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(220, 8%, 50%)', lineHeight: '1.5', margin: '0 0 25px' }
const link = { color: 'inherit', textDecoration: 'underline' }
const button = { backgroundColor: 'hsl(230, 80%, 56%)', color: '#ffffff', fontSize: '14px', borderRadius: '1rem', padding: '12px 20px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: 'hsl(220, 8%, 50%)', margin: '30px 0 0' }
