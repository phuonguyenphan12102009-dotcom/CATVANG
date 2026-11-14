// utils/rss.js
// Bộ đọc RSS tối giản cho Google News (không cần cài thêm thư viện).

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(str) {
  return str
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

function textOf(block, tag) {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return "";
  let v = m[1].trim();
  const cdata = v.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) v = cdata[1];
  return v;
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function parseGoogleNewsRss(xml, limit = 12) {
  const items = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  for (const block of blocks) {
    let title = stripTags(textOf(block, "title"));
    const link = decodeEntities(textOf(block, "link")).trim();
    if (!title || !/^https?:\/\//i.test(link)) continue; // chỉ nhận link http(s)

    const source = stripTags(textOf(block, "source"));
    // Google News ghi tiêu đề dạng "Tiêu đề bài - Tên báo": bỏ phần đuôi tên báo cho gọn
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));

    const pub = textOf(block, "pubDate");
    const date = pub ? new Date(pub) : null;

    items.push({
      title,
      link,
      source: source || "",
      publishedAt: date && !isNaN(date) ? date.toISOString() : null,
    });
    if (items.length >= limit) break;
  }
  return items;
}

module.exports = { parseGoogleNewsRss, decodeEntities };
