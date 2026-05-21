#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const blogFile = path.join(root, 'src/data/blogPosts.ts');
const source = fs.readFileSync(blogFile, 'utf8');

function countMatches(text, regex) {
  return (text.match(regex) || []).length;
}

function extractPostBlocks(src) {
  const start = src.indexOf('export const blogPosts');
  const arrStart = src.indexOf('[', start);
  const arrEnd = src.lastIndexOf('];');
  const body = src.slice(arrStart + 1, arrEnd);
  const blocks = [];
  let depth = 0;
  let inTpl = false;
  let inStr = null;
  let esc = false;
  let blockStart = -1;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    const prev = body[i - 1];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (inTpl) {
      if (ch === '`' && prev !== '\\') inTpl = false;
      continue;
    }
    if (inStr) {
      if (ch === inStr && prev !== '\\') inStr = null;
      continue;
    }
    if (ch === '`') { inTpl = true; continue; }
    if (ch === '"' || ch === "'") { inStr = ch; continue; }
    if (ch === '{') {
      if (depth === 0) blockStart = i;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && blockStart >= 0) {
        blocks.push(body.slice(blockStart, i + 1));
        blockStart = -1;
      }
    }
  }
  return blocks;
}

function getString(block, key) {
  const re = new RegExp(`${key}:\\s*([\"'])((?:\\\\.|(?!\\1).)*)\\1`, 's');
  const m = block.match(re);
  return m ? m[2] : null;
}

function getTemplate(block, key) {
  const re = new RegExp(key + ':\\s*`([\\s\\S]*?)`,');
  const m = block.match(re);
  return m ? m[1] : '';
}

const posts = extractPostBlocks(source).map((block) => {
  const slug = getString(block, 'slug') || 'unknown';
  const title = getString(block, 'title') || '';
  const excerpt = getString(block, 'excerpt') || '';
  const category = getString(block, 'category') || '';
  const content = getTemplate(block, 'content');
  const faqCount = countMatches(block, /question:\s*["']/g);
  const h2Count = countMatches(content, /^##\s+/gm);
  const h3Count = countMatches(content, /^###\s+/gm);
  const tableCount = countMatches(content, /^\|.*\|$/gm) > 1 ? 1 : 0;
  const internalLinks = countMatches(content, /\]\(\/blog\//g);
  const externalLinks = countMatches(content, /\]\(https?:\/\//g);
  const checklistItems = countMatches(content, /^\s*[-*+]\s+\[[ xX]\]/gm);
  const hasTldr = /TL;?DR|3줄 요약|핵심 요약/i.test(content);
  const hasFaqSection = /^##\s+FAQ/m.test(content) || faqCount >= 3;
  const hasInteractionCandidate = /(체크리스트|비교|진단|단계|점수|canonical|색인|SERP|AEO|GEO|SEO)/i.test(`${title}\n${content}`);
  const issues = [];
  if (title.length < 18 || title.length > 48) issues.push('title_length_review');
  if (excerpt.length < 70 || excerpt.length > 170) issues.push('excerpt_length_review');
  if (faqCount < 4) issues.push('faq_under_4');
  if (h2Count < 3) issues.push('h2_under_3');
  if (externalLinks < 1) issues.push('authority_link_missing');
  if (internalLinks < 2) issues.push('internal_links_under_2');
  if (!hasTldr) issues.push('tldr_missing');
  if (!hasFaqSection) issues.push('faq_section_missing');
  return {
    slug,
    canonicalUrl: `https://searchtuneos.com/blog/${slug}.html`,
    cleanUrl: `https://searchtuneos.com/blog/${slug}`,
    title,
    category,
    excerptLength: excerpt.length,
    faqCount,
    h2Count,
    h3Count,
    tableCount,
    internalLinks,
    externalLinks,
    checklistItems,
    hasTldr,
    hasInteractionCandidate,
    issues,
    severity: issues.length >= 5 ? 'high' : issues.length >= 3 ? 'medium' : issues.length ? 'low' : 'ok',
  };
});

const summary = {
  generatedAt: new Date().toISOString(),
  source: 'src/data/blogPosts.ts static corpus',
  totalPosts: posts.length,
  bySeverity: posts.reduce((acc, p) => { acc[p.severity] = (acc[p.severity] || 0) + 1; return acc; }, {}),
  issueCounts: posts.flatMap(p => p.issues).reduce((acc, k) => { acc[k] = (acc[k] || 0) + 1; return acc; }, {}),
  topPriority: posts
    .filter(p => p.severity !== 'ok')
    .sort((a, b) => b.issues.length - a.issues.length || a.slug.localeCompare(b.slug))
    .slice(0, 15),
};

const outDir = path.join(root, 'reports');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'blog-growth-loop-audit.json'), JSON.stringify({ summary, posts }, null, 2));

console.log(JSON.stringify(summary, null, 2));
