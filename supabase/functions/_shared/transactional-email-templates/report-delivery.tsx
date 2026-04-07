import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "SearchTune OS"

interface ReportDeliveryProps {
  domain?: string
  seoScore?: number
  aeoScore?: number
  geoScore?: number
  downloadUrl?: string
}

function gradeEmoji(score: number) {
  if (score >= 80) return '🟢'
  if (score >= 60) return '🟡'
  return '🔴'
}

const ReportDeliveryEmail = ({
  domain = 'example.com',
  seoScore = 75,
  aeoScore = 60,
  geoScore = 45,
  downloadUrl = 'https://searchtuneos.com',
}: ReportDeliveryProps) => (
  <Html lang="ko" dir="ltr">
    <Head />
    <Preview>{domain} SEO·AEO·GEO 분석 리포트가 준비되었습니다</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>분석 리포트가 준비되었습니다! 📊</Heading>
        <Text style={text}>
          <strong style={{ color: 'hsl(220, 15%, 13%)' }}>{domain}</strong> 사이트의
          SEO·AEO·GEO 분석이 완료되었습니다.
        </Text>

        <Section style={scoreSection}>
          <Text style={scoreRow}>
            {gradeEmoji(seoScore ?? 0)} <strong>SEO</strong> 검색 최적화: <strong>{seoScore}점</strong>
          </Text>
          <Text style={scoreRow}>
            {gradeEmoji(aeoScore ?? 0)} <strong>AEO</strong> AI 답변 채택: <strong>{aeoScore}점</strong>
          </Text>
          <Text style={scoreRow}>
            {gradeEmoji(geoScore ?? 0)} <strong>GEO</strong> 생성형 AI 인용: <strong>{geoScore}점</strong>
          </Text>
        </Section>

        <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
          <Button style={button} href={downloadUrl}>
            📥 PDF 리포트 다운로드
          </Button>
        </Section>

        <Text style={text}>
          리포트에는 각 영역별 상세 분석과 개선 우선순위가 포함되어 있습니다.
          다운로드 링크는 7일간 유효합니다.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          {SITE_NAME} 팀 드림 · searchtuneos.com
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReportDeliveryEmail,
  subject: (data: Record<string, any>) =>
    `${data.domain || '사이트'} SEO·AEO·GEO 분석 리포트 - ${SITE_NAME}`,
  displayName: 'Report delivery',
  previewData: {
    domain: 'example.com',
    seoScore: 78,
    aeoScore: 62,
    geoScore: 45,
    downloadUrl: 'https://searchtuneos.com',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Noto Sans KR', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '520px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(220, 15%, 13%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(220, 8%, 50%)', lineHeight: '1.6', margin: '0 0 16px' }
const scoreSection = {
  backgroundColor: '#f8fafc',
  borderRadius: '12px',
  padding: '20px 24px',
  margin: '16px 0',
}
const scoreRow = {
  fontSize: '15px',
  color: 'hsl(220, 15%, 13%)',
  lineHeight: '2',
  margin: '0',
}
const button = {
  backgroundColor: 'hsl(221, 83%, 53%)',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
}
const hr = { borderColor: 'hsl(220, 13%, 92%)', margin: '24px 0' }
const footer = { fontSize: '12px', color: 'hsl(220, 8%, 50%)', margin: '0' }
