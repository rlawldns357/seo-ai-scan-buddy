import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Row, Column, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  email?: string
  source?: string
  landing_url?: string
  analyzed_url?: string
  seo?: number
  aeo?: number
  geo?: number
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  admin_url?: string
}

const AdminNewLead = (props: Props) => {
  const {
    email = '(unknown)',
    source = 'unknown',
    landing_url,
    analyzed_url,
    seo,
    aeo,
    geo,
    utm_source,
    utm_medium,
    utm_campaign,
    admin_url = 'https://www.searchtuneos.com/admin/insights',
  } = props
  const scoreStr = [seo, aeo, geo].filter((v) => typeof v === 'number').length > 0
    ? `SEO ${seo ?? '-'} · AEO ${aeo ?? '-'} · GEO ${geo ?? '-'}`
    : '스코어 없음'

  return (
    <Html lang="ko" dir="ltr">
      <Head />
      <Preview>새 인바운드 리드: {email}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🔔 새 인바운드 리드</Heading>
          <Text style={lead}><strong style={{ color: '#111' }}>{email}</strong></Text>

          <Section style={card}>
            <Row><Column style={k}>소스</Column><Column style={v}>{source}</Column></Row>
            <Row><Column style={k}>스코어</Column><Column style={v}>{scoreStr}</Column></Row>
            {analyzed_url && (<Row><Column style={k}>진단 URL</Column><Column style={v}>{analyzed_url}</Column></Row>)}
            {landing_url && (<Row><Column style={k}>랜딩</Column><Column style={v}>{landing_url}</Column></Row>)}
            {(utm_source || utm_medium || utm_campaign) && (
              <Row><Column style={k}>UTM</Column><Column style={v}>
                {[utm_source, utm_medium, utm_campaign].filter(Boolean).join(' / ')}
              </Column></Row>
            )}
          </Section>

          <Text style={text}>
            <Link href={admin_url} style={btn}>어드민에서 열기 →</Link>
          </Text>

          <Hr style={hr} />
          <Text style={footer}>SearchTune OS · 리드 알림</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminNewLead,
  subject: (d: Record<string, any>) => `🔔 새 리드: ${d?.email ?? 'unknown'}`,
  displayName: 'Admin: New Lead Notification',
  previewData: {
    email: 'lead@example.com',
    source: 'funnel_step1',
    analyzed_url: 'https://example.com',
    seo: 62, aeo: 41, geo: 38,
    utm_source: 'kakao', utm_medium: 'share',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Noto Sans KR', Arial, sans-serif" }
const container = { padding: '32px 24px', maxWidth: '560px' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#111', margin: '0 0 12px' }
const lead = { fontSize: '16px', color: '#111', margin: '0 0 20px' }
const card = { backgroundColor: '#f7f8fa', borderRadius: '12px', padding: '16px 18px', margin: '0 0 20px' }
const k = { fontSize: '12px', color: '#6b7280', width: '80px', padding: '4px 0' }
const v = { fontSize: '13px', color: '#111', padding: '4px 0', wordBreak: 'break-all' as const }
const text = { fontSize: '14px', margin: '0 0 12px' }
const btn = { display: 'inline-block', padding: '10px 18px', borderRadius: '8px', backgroundColor: '#111', color: '#fff', textDecoration: 'none', fontWeight: 600 as const, fontSize: '13px' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0 12px' }
const footer = { fontSize: '11px', color: '#9ca3af', margin: '0' }
