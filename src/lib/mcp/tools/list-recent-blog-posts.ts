import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

/**
 * Returns the most recent published blog posts (title, slug, excerpt, date).
 * Read-only, public data — uses the Supabase REST endpoint with the anon key.
 */
export default defineTool({
  name: "list_recent_blog_posts",
  title: "List recent blog posts",
  description:
    "Return the most recent published SearchTune OS blog posts (title, slug, excerpt, published date). Read-only public content.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("How many posts to return (1-20). Defaults to 5."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }) => {
    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return {
        content: [{ type: "text", text: "Backend is not configured." }],
        isError: true,
      };
    }
    const n = Math.min(Math.max(limit ?? 5, 1), 20);
    const endpoint = `${url}/rest/v1/blog_posts?select=title,slug,excerpt,published_at&status=eq.published&order=published_at.desc&limit=${n}`;
    const res = await fetch(endpoint, {
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
    });
    if (!res.ok) {
      return {
        content: [{ type: "text", text: `Failed to fetch posts: ${res.status}` }],
        isError: true,
      };
    }
    const rows = (await res.json()) as Array<{
      title: string;
      slug: string;
      excerpt: string | null;
      published_at: string | null;
    }>;
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { posts: rows },
    };
  },
});
