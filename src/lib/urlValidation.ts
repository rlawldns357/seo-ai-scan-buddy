export interface UrlValidationResult {
  isValid: boolean;
  finalUrl: string;
  isSubpage: boolean;
  rootUrl: string;
  errorMessage?: string;
}

const UNSUPPORTED_SCHEMES = /^(ftp|file|mailto|tel|data|javascript):/i;

const LOCAL_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
];

const LOCAL_IP_PATTERNS = [
  /^10\.\d+\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
];

const FILE_EXTENSIONS = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z|tar|gz|jpg|jpeg|png|gif|svg|webp|mp4|mp3|wav|avi|mov)$/i;

export function validateUrl(input: string): UrlValidationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { isValid: false, finalUrl: '', isSubpage: false, rootUrl: '', errorMessage: 'URL을 입력해 주세요.' };
  }

  // Block unsupported schemes
  if (UNSUPPORTED_SCHEMES.test(trimmed)) {
    return { isValid: false, finalUrl: trimmed, isSubpage: false, rootUrl: '', errorMessage: '지원하지 않는 URL 형식이에요. http 또는 https URL을 입력해 주세요.' };
  }

  // Auto-prepend https
  let finalUrl = trimmed;
  if (!/^https?:\/\//i.test(finalUrl)) {
    finalUrl = 'https://' + finalUrl;
  }

  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(finalUrl);
  } catch {
    return { isValid: false, finalUrl, isSubpage: false, rootUrl: '', errorMessage: 'URL 형식을 확인해 주세요. 예: https://example.com' };
  }

  // Block non-http(s) after parse
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { isValid: false, finalUrl, isSubpage: false, rootUrl: '', errorMessage: '지원하지 않는 URL 형식이에요. http 또는 https URL을 입력해 주세요.' };
  }

  // Block localhost / internal IPs
  const hostname = parsed.hostname.toLowerCase();
  if (LOCAL_HOSTS.includes(hostname) || LOCAL_IP_PATTERNS.some(p => p.test(hostname))) {
    return { isValid: false, finalUrl, isSubpage: false, rootUrl: '', errorMessage: '로컬 또는 내부 네트워크 주소는 분석할 수 없어요.' };
  }

  // Block direct file links
  if (FILE_EXTENSIONS.test(parsed.pathname)) {
    return { isValid: false, finalUrl, isSubpage: false, rootUrl: '', errorMessage: '파일 직접 링크는 분석할 수 없어요. 웹페이지 URL을 입력해 주세요.' };
  }

  // Check subpage
  const pathname = parsed.pathname.replace(/\/+$/, '');
  const isSubpage = pathname.length > 0 && pathname !== '';
  const rootUrl = `${parsed.protocol}//${parsed.host}`;

  return { isValid: true, finalUrl, isSubpage, rootUrl };
}
