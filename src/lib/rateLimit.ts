export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  limit: number;
  usageCount: number;
  emailUnlocked: boolean;
  /** True when caller's IP is on the team whitelist (rate limit bypassed). */
  whitelisted?: boolean;
}

const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-rate-limit`;
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
};

export async function checkRateLimit(): Promise<RateLimitStatus> {
  try {
    const res = await fetch(functionUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "check" }),
    });
    return await res.json();
  } catch {
    // On error, allow (fail open) to not block users
    return { allowed: true, remaining: 99, limit: 99, usageCount: 0, emailUnlocked: false };
  }
}

export async function incrementUsage(): Promise<RateLimitStatus> {
  try {
    const res = await fetch(functionUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "increment" }),
    });
    return await res.json();
  } catch {
    return { allowed: true, remaining: 99, limit: 99, usageCount: 0, emailUnlocked: false };
  }
}

export async function unlockWithEmail(email: string): Promise<RateLimitStatus> {
  try {
    const res = await fetch(functionUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "unlock", email }),
    });
    return await res.json();
  } catch {
    return { allowed: true, remaining: 99, limit: 99, usageCount: 0, emailUnlocked: false };
  }
}
