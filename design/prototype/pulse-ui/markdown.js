/**
 * Minimal markdown → HTML for prototype (no external deps).
 * Supports: # ## ###, **bold**, *italic*, `code`, ```fence```, - lists, 1. lists, [links](url), paragraphs.
 */
(function () {
  function escHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function inline(s) {
    let t = escHtml(s);
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/_([^_]+)_/g, "<em>$1</em>");
    t = t.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return t;
  }

  function render(md) {
    if (!md || !String(md).trim()) return '<p class="md-empty">（空）</p>';
    const lines = String(md).replace(/\r\n/g, "\n").split("\n");
    const out = [];
    let i = 0;
    let inCode = false;
    let codeBuf = [];
    let listType = null; // ul | ol
    let listBuf = [];

    function flushList() {
      if (!listType) return;
      const tag = listType;
      out.push("<" + tag + ">" + listBuf.map((x) => "<li>" + inline(x) + "</li>").join("") + "</" + tag + ">");
      listType = null;
      listBuf = [];
    }

    while (i < lines.length) {
      const line = lines[i];
      if (line.startsWith("```")) {
        flushList();
        if (!inCode) {
          inCode = true;
          codeBuf = [];
        } else {
          out.push("<pre><code>" + escHtml(codeBuf.join("\n")) + "</code></pre>");
          inCode = false;
          codeBuf = [];
        }
        i++;
        continue;
      }
      if (inCode) {
        codeBuf.push(line);
        i++;
        continue;
      }
      if (!line.trim()) {
        flushList();
        i++;
        continue;
      }
      const h = /^(#{1,3})\s+(.+)$/.exec(line);
      if (h) {
        flushList();
        const n = h[1].length;
        out.push("<h" + n + ">" + inline(h[2]) + "</h" + n + ">");
        i++;
        continue;
      }
      const ul = /^[-*]\s+(.+)$/.exec(line);
      if (ul) {
        if (listType && listType !== "ul") flushList();
        listType = "ul";
        listBuf.push(ul[1]);
        i++;
        continue;
      }
      const ol = /^\d+\.\s+(.+)$/.exec(line);
      if (ol) {
        if (listType && listType !== "ol") flushList();
        listType = "ol";
        listBuf.push(ol[1]);
        i++;
        continue;
      }
      const bq = /^>\s?(.*)$/.exec(line);
      if (bq) {
        flushList();
        out.push("<blockquote>" + inline(bq[1]) + "</blockquote>");
        i++;
        continue;
      }
      flushList();
      out.push("<p>" + inline(line) + "</p>");
      i++;
    }
    flushList();
    if (inCode) out.push("<pre><code>" + escHtml(codeBuf.join("\n")) + "</code></pre>");
    return '<div class="md">' + out.join("") + "</div>";
  }

  window.md = { render, escHtml };
})();
