export interface IndexingResult {
  google: {
    domainIndexed: boolean;
    domainPages: number;
    urlIndexed: boolean;
    topResults: { title: string; url: string }[];
  };
  naver: {
    checkUrl: string;
  };
}

export async function checkIndexing(url: string): Promise<IndexingResult | null> {
  try {
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-indexing`;
    const res = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    return json as IndexingResult;
  } catch {
    return null;
  }
}
