import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import listRecentBlogPostsTool from "./tools/list-recent-blog-posts";

export default defineMcp({
  name: "searchtune-os-mcp",
  title: "SearchTune OS MCP",
  version: "0.1.0",
  instructions:
    "Tools for SearchTune OS. Use `echo` to verify connectivity. Use `list_recent_blog_posts` to fetch recent published SearchTune OS blog posts.",
  tools: [echoTool, listRecentBlogPostsTool],
});
