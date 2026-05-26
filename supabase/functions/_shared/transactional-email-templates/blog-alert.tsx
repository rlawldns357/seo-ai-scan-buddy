import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface BlogAlertProps {
  alertType?: 'backfill_success' | 'backfill_failed' | 'no_posts_24h'
  title?: string
  message?: string
  details?: string[]
}

const BlogAlertEmail = ({ alertType = 'backfill_success', title, message, details = [] }: BlogAlertProps) => {
  const icon =
    alertType === 'backfill_success' ? '✅'
    : alertType === 'backfill_failed' ? '⚠️'
    : '🚨'
  const heading = title || (
    alertType === 'backfill_success' ? '블로그 누락분 자동 복구 완료'
    : alertType === 'backfill_failed' ? '블로그 자동 발행 실패'
    : '24시간 이상 블로그 발행 없음'
  )

  return (
    <Html lang="ko" dir="ltr">
      <Head />
      <Preview>{icon} {heading}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{icon} {heading}</Heading>
          {message ? <Text style={text}>{message}</Text> : null}
          {details.length > 0 ? (
            <Section style={box}>
              {details.map((d, i) => (
                <Text key={i} style={detail}>• {d}</Text>
              ))}
            </Section>
          ) : null}
          <Text style={footer}>SearchTune OS — 자동 모니터링 시스템</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: BlogAlertEmail,
  subject: (data: Record<string, any>) => {
    const t = data?.alertType
    if (t === 'backfill_success') return '✅ [SearchTune] 블로그 누락분 자동 복구 완료'
    if (t === 'backfill_failed') return '⚠️ [SearchTune] 블로그 자동 발행 실패'
    if (t === 'no_posts_24h') return '🚨 [SearchTune] 24시간 이상 블로그 발행 없음'
    return '[SearchTune] 블로그 시스템 알림'
  },
  displayName: '블로그 시스템 알림',
  previewData: {
    alertType: 'backfill_success',
    message: '최근 7일 스캔 중 누락된 1일치를 자동으로 채웠어요.',
    details: ['2026-05-25 — natural-backlink-blueprint-...-20260525'],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '20px', fontWeight: 'bold', color: '#0a0a0a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const box = { backgroundColor: '#f8fafc', borderRadius: '8px', padding: '12px 16px', margin: '12px 0' }
const detail = { fontSize: '13px', color: '#475569', lineHeight: '1.6', margin: '0 0 6px' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0' }
