// Fetches the Medium RSS feed and writes a static JSON snapshot that the
// Blog tab reads client-side (data/medium-posts.json). Run by
// .github/workflows/update-medium-feed.yml on a schedule, so the site
// never depends on a third-party CORS/RSS proxy at page-load time.
//
// Node 20+, no npm dependencies (uses the built-in global fetch).

import { writeFile, mkdir } from 'node:fs/promises';

const RSS_URL = 'https://medium.com/feed/@getnetdemil';
const OUT_PATH = 'data/medium-posts.json';
const MAX_ITEMS = 10;

function decodeEntities(str) {
  return (str || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractTag(block, tag) {
  const re = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>');
  const m = block.match(re);
  if (!m) return '';
  let val = m[1].trim();
  const cdata = val.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  if (cdata) val = cdata[1];
  return val;
}

async function main() {
  const res = await fetch(RSS_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; medium-feed-fetcher/1.0)' },
  });
  if (!res.ok) {
    throw new Error('Feed fetch failed: HTTP ' + res.status);
  }
  const xml = await res.text();

  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const items = itemBlocks.slice(0, MAX_ITEMS).map((block) => {
    const content = extractTag(block, 'content:encoded') || extractTag(block, 'description');
    return {
      title: decodeEntities(extractTag(block, 'title')),
      link: extractTag(block, 'link').split('?')[0],
      pubDate: extractTag(block, 'pubDate'),
      description: decodeEntities(extractTag(block, 'description')),
      content,
    };
  });

  if (!items.length) {
    throw new Error('No items parsed from feed — Medium RSS format may have changed');
  }

  await mkdir('data', { recursive: true });
  const payload = {
    status: 'ok',
    updatedAt: new Date().toISOString(),
    items,
  };
  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + '\n');
  console.log('Wrote', items.length, 'items to', OUT_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
