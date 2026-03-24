export interface PsiResult {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  screenshot: string | null; // base64 data URI
  finalUrl: string;
  fetchTime: string; // ISO timestamp
}

export interface PsiError {
  type: 'blocked' | 'timeout' | 'quota' | 'unreachable' | 'unknown';
  message: string;
}

export async function fetchPsi(url: string): Promise<{ data?: PsiResult; error?: PsiError }> {
  const endpoint = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
  const params = new URLSearchParams({
    url,
    category: 'performance',
    strategy: 'mobile',
  });
  // PSI only accepts one category param per key, need to append multiples
  ['accessibility', 'best-practices', 'seo'].forEach(c => params.append('category', c));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(`${endpoint}?${params.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 429) {
      return { error: { type: 'quota', message: 'Lighthouse API 요청 한도를 초과했어요. 잠시 후 다시 시도해 주세요.' } };
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const errMsg = body?.error?.message || '';
      if (errMsg.includes('DNS_FAILURE') || errMsg.includes('FAILED_DOCUMENT_REQUEST')) {
        return { error: { type: 'unreachable', message: '해당 URL에 접근할 수 없어요. URL이 정확한지, 사이트가 정상 운영 중인지 확인해 주세요.' } };
      }
      if (errMsg.includes('ERRORED_DOCUMENT_REQUEST') || errMsg.includes('robots')) {
        return { error: { type: 'blocked', message: 'robots.txt 또는 서버 설정으로 접근이 차단되었어요. robots.txt를 확인해 주세요.' } };
      }
      return { error: { type: 'unknown', message: `측정 중 오류가 발생했어요. (${res.status})` } };
    }

    const data = await res.json();
    const lhr = data.lighthouseResult;
    if (!lhr) {
      return { error: { type: 'unknown', message: '측정 결과를 가져올 수 없었어요.' } };
    }

    const cats = lhr.categories || {};
    const screenshot = lhr.audits?.['final-screenshot']?.details?.data || null;

    return {
      data: {
        performance: Math.round((cats.performance?.score ?? 0) * 100),
        accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
        bestPractices: Math.round((cats['best-practices']?.score ?? 0) * 100),
        seo: Math.round((cats.seo?.score ?? 0) * 100),
        screenshot,
        finalUrl: lhr.finalUrl || url,
        fetchTime: lhr.fetchTime || new Date().toISOString(),
      },
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { error: { type: 'timeout', message: '측정 시간이 초과되었어요. 사이트 응답이 느릴 수 있어요. 다시 시도하거나 다른 URL을 입력해 주세요.' } };
    }
    return { error: { type: 'unknown', message: '네트워크 오류가 발생했어요. 인터넷 연결을 확인해 주세요.' } };
  }
}
