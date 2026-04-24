/** Escape HTML for safe rendering inside code blocks */
export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Inline markdown: images, links, bold, italic, inline code */
export function inline(text: string) {
  // images ![alt](src)
  let s = text.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    '<img src="$2" alt="$1" class="inline-block max-w-full rounded my-2" loading="lazy" />',
  );
  // links [text](url)
  s = s.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    '<a href="$2" class="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  // bold + italic
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  // inline code
  s = s.replace(
    /`([^`]+)`/g,
    '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">$1</code>',
  );
  return s;
}

/** Markdown→HTML supporting headings, ul/ol, GFM tables, code blocks, blockquotes, hr */
export function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const html: string[] = [];
  let inUl = false;
  let inOl = false;
  let inCode = false;
  let codeBuf: string[] = [];
  let codeLang = "";
  let tableBuf: string[] = [];

  const closeLists = () => {
    if (inUl) {
      html.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      html.push("</ol>");
      inOl = false;
    }
  };

  const flushTable = () => {
    if (tableBuf.length === 0) return;
    const rows = tableBuf.map((l) =>
      l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()),
    );
    const headerRow = rows[0];
    let bodyRows = rows.slice(1);
    if (bodyRows.length > 0 && bodyRows[0].every((c) => /^:?-{2,}:?$/.test(c))) {
      bodyRows = bodyRows.slice(1);
    }
    const thead = `<thead><tr>${headerRow.map((c) => `<th class="border border-border px-3 py-2 text-left text-sm font-semibold text-foreground bg-muted/50">${inline(c)}</th>`).join("")}</tr></thead>`;
    const tbody = `<tbody>${bodyRows.map((r) => `<tr>${r.map((c) => `<td class="border border-border px-3 py-2 text-sm text-muted-foreground align-top">${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
    html.push(`<div class="my-6 overflow-x-auto"><table class="w-full border-collapse">${thead}${tbody}</table></div>`);
    tableBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^```/.test(line.trim())) {
      if (!inCode) {
        closeLists();
        flushTable();
        inCode = true;
        codeLang = line.trim().slice(3).trim();
        codeBuf = [];
      } else {
        const langLabel = codeLang
          ? `<div class="px-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/60 border-b border-border">${escapeHtml(codeLang)}</div>`
          : "";
        html.push(
          `<div class="my-6 rounded-lg border border-border overflow-hidden bg-muted/30">${langLabel}<pre class="p-4 overflow-x-auto text-sm font-mono text-foreground"><code>${escapeHtml(codeBuf.join("\n"))}</code></pre></div>`,
        );
        inCode = false;
        codeBuf = [];
        codeLang = "";
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(raw);
      continue;
    }

    if (line.startsWith("|") && line.endsWith("|")) {
      closeLists();
      tableBuf.push(line);
      continue;
    } else if (tableBuf.length > 0) {
      flushTable();
    }

    if (line.trim() === "") {
      closeLists();
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      closeLists();
      html.push('<hr class="my-8 border-border" />');
      continue;
    }

    if (line.startsWith("#### ")) {
      closeLists();
      html.push(`<h4 class="text-base font-bold text-foreground mt-6 mb-2">${inline(line.slice(5))}</h4>`);
      continue;
    }
    if (line.startsWith("### ")) {
      closeLists();
      html.push(`<h3 class="text-lg font-bold text-foreground mt-8 mb-3">${inline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      closeLists();
      html.push(`<h2 class="text-xl font-bold text-foreground mt-10 mb-4">${inline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      closeLists();
      html.push(`<h2 class="text-2xl font-bold text-foreground mt-10 mb-4">${inline(line.slice(2))}</h2>`);
      continue;
    }

    if (line.startsWith("> ")) {
      closeLists();
      html.push(
        `<blockquote class="border-l-4 border-primary/30 pl-4 my-6 text-muted-foreground italic">${inline(line.slice(2))}</blockquote>`,
      );
      continue;
    }

    const olMatch = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (olMatch) {
      if (inUl) {
        html.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        html.push('<ol class="list-decimal pl-6 space-y-1.5 my-4 text-muted-foreground">');
        inOl = true;
      }
      html.push(`<li>${inline(olMatch[2])}</li>`);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      if (inOl) {
        html.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        html.push('<ul class="list-disc pl-6 space-y-1.5 my-4 text-muted-foreground">');
        inUl = true;
      }
      html.push(`<li>${inline(line.replace(/^\s*[-*+]\s+/, ""))}</li>`);
      continue;
    }

    closeLists();
    html.push(`<p class="text-muted-foreground leading-relaxed my-4">${inline(line)}</p>`);
  }

  if (inCode) {
    html.push(
      `<pre class="my-6 p-4 rounded-lg bg-muted/30 border border-border overflow-x-auto text-sm font-mono text-foreground"><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`,
    );
  }
  flushTable();
  closeLists();
  return html.join("\n");
}
