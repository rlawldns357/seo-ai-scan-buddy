/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Section, Text, Button } from 'npm:@react-email/components@0.0.22'

export const SITE_NAME = 'SearchTune OS'
export const SITE_URL = 'https://searchtuneos.com'

export const main = { backgroundColor: '#ffffff', fontFamily: "'Noto Sans KR', Arial, sans-serif" }
export const container = { padding: '40px 25px', maxWidth: '560px' }
export const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(220, 15%, 13%)', margin: '0 0 16px', lineHeight: '1.4' }
export const text = { fontSize: '15px', color: 'hsl(220, 15%, 25%)', lineHeight: '1.7', margin: '0 0 16px' }
export const small = { fontSize: '13px', color: 'hsl(220, 8%, 50%)', lineHeight: '1.6', margin: '0' }
export const hr = { borderColor: 'hsl(220, 13%, 92%)', margin: '24px 0' }
export const ctaBtn = {
  backgroundColor: 'hsl(220, 90%, 56%)',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '999px',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
export const badge = (color: string) => ({
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: 'bold' as const,
  letterSpacing: '0.05em',
  color,
  background: `${color}1A`,
  padding: '4px 10px',
  borderRadius: '999px',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
})

export interface SoapProps {
  url?: string
  seo?: number
  aeo?: number
  geo?: number
}

export function ScoreBlock({ seo, aeo, geo, url }: SoapProps) {
  if (seo == null && aeo == null && geo == null) return null
  const cellStyle = {
    flex: '1',
    padding: '14px 8px',
    textAlign: 'center' as const,
    borderRight: '1px solid hsl(220, 13%, 92%)',
  }
  const lastCell = { ...cellStyle, borderRight: 'none' }
  const labelStyle = { fontSize: '11px', color: 'hsl(220, 8%, 50%)', margin: '0 0 4px', fontWeight: 'bold' as const }
  const scoreStyle = (s?: number) => ({
    fontSize: '22px',
    fontWeight: 'bold' as const,
    color: s == null ? 'hsl(220, 8%, 70%)' : s < 60 ? 'hsl(0, 70%, 50%)' : s < 80 ? 'hsl(35, 90%, 50%)' : 'hsl(140, 60%, 40%)',
    margin: '0',
  })
  return (
    <Section style={{ border: '1px solid hsl(220, 13%, 92%)', borderRadius: '12px', overflow: 'hidden', margin: '8px 0 24px' }}>
      {url && (
        <Text style={{ fontSize: '12px', color: 'hsl(220, 8%, 50%)', padding: '10px 14px 0', margin: '0', wordBreak: 'break-all' as const }}>
          {url}
        </Text>
      )}
      <div style={{ display: 'flex', padding: '4px 0' }}>
        <div style={cellStyle}>
          <p style={labelStyle}>SEO</p>
          <p style={scoreStyle(seo)}>{seo ?? '—'}</p>
        </div>
        <div style={cellStyle}>
          <p style={labelStyle}>AEO</p>
          <p style={scoreStyle(aeo)}>{aeo ?? '—'}</p>
        </div>
        <div style={lastCell}>
          <p style={labelStyle}>GEO</p>
          <p style={scoreStyle(geo)}>{geo ?? '—'}</p>
        </div>
      </div>
    </Section>
  )
}

export function CtaBlock({ label = '무료 상담 신청하기', href = `${SITE_URL}/?consult=1&utm_source=soap&utm_medium=email&utm_campaign=day5` }: { label?: string; href?: string }) {
  return (
    <Section style={{ textAlign: 'center', margin: '24px 0' }}>
      <Button href={href} style={ctaBtn}>{label}</Button>
    </Section>
  )
}

export function Signoff() {
  return (
    <Text style={small}>
      — {SITE_NAME} 팀 드림
    </Text>
  )
}
