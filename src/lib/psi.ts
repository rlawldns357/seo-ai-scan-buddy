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

export type PsiStrategy = 'mobile' | 'desktop';

const RETRYABLE: Set<PsiError['type']> = new Set(['unreachable', 'timeout']);

async function fetchPsiOnce(url: string, strategy: PsiStrategy): Promise<{ data?: PsiResult; error?: PsiError }> {
  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/psi-proxy`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 100000);

    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ url, strategy }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error('psi-proxy HTTP error:', res.status, errBody);
      return { error: { type: 'unknown', message: `프록시 오류 (${res.status}): ${errBody}` } };
    }

    const json = await res.json();
    const status = json.status as number;
    const body = json.body;

    if (status === 429) {
      return { error: { type: 'quota', message: 'Lighthouse API 요청 한도를 초과했어요. 잠시 후 다시 시도해 주세요.' } };
    }

    if (status !== 200) {
      const errMsg = body?.error?.message || '';
      if (errMsg.includes('DNS_FAILURE') || errMsg.includes('FAILED_DOCUMENT_REQUEST')) {
        return { error: { type: 'unreachable', message: '해당 URL에 접근할 수 없어요. URL이 정확한지, 사이트가 정상 운영 중인지 확인해 주세요.' } };
      }
      if (errMsg.includes('ERRORED_DOCUMENT_REQUEST') || errMsg.includes('robots')) {
        return { error: { type: 'blocked', message: 'robots.txt 또는 서버 설정으로 접근이 차단되었어요. robots.txt를 확인해 주세요.' } };
      }
      if (errMsg.includes('NO_FCP') || errMsg.includes('NO_NAVSTART') || errMsg.includes('no content')) {
        return { error: { type: 'unreachable', message: '페이지가 콘텐츠를 렌더링하지 못했어요. JS만으로 구성된 SPA이거나 로딩이 매우 느릴 수 있어요. 잠시 후 다시 시도해 주세요.' } };
      }
      return { error: { type: 'unknown', message: `측정 중 오류가 발생했어요. (${status})` } };
    }

    const lhr = body.lighthouseResult;
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

export async function fetchPsi(url: string, strategy: PsiStrategy = 'mobile'): Promise<{ data?: PsiResult; error?: PsiError }> {
  const first = await fetchPsiOnce(url, strategy);
  if (first.data) return first;

  // 자동 재시도: SPA 등에서 NO_FCP 류 에러 시 캐시 덕에 두 번째 성공 가능
  if (first.error && RETRYABLE.has(first.error.type)) {
    console.log(`[psi] Retrying ${strategy} for ${url} (${first.error.type})`);
    const second = await fetchPsiOnce(url, strategy);
    if (second.data) return second;
    return second;
  }

  return first;
}
