// Tests hors-ligne : logique de diff, parsing, clés. (Les fetchers réseau
// sont testés par tests/live_check.js, à lancer manuellement.)
import { test } from 'node:test';
import assert from 'node:assert';

test('stripHtml conserve le texte utile', async () => {
  const { fetchers } = await import('../lib/fetchers.js');
  assert.ok(fetchers.eurlex && fetchers.ecfr && fetchers.uklegislation && fetchers.federalregister && fetchers.pdf_url);
});

test('clé de dédoublonnage insensible à la casse/espaces', () => {
  const keyOf = r => [r.section_id, (r.parameter||'').toLowerCase().trim(), (r.applies_to||'').toLowerCase().trim()].join('|');
  assert.strictEqual(keyOf({ section_id:'analytique', parameter:'SO2 Total ', applies_to:'Vin rouge' }),
                     keyOf({ section_id:'analytique', parameter:'so2 total', applies_to:'vin rouge' }));
});

test('parsing JSON tolérant au texte autour', () => {
  const m = 'Voici:\n[{"a":1}]\nfin'.match(/\[[\s\S]*\]/);
  assert.deepStrictEqual(JSON.parse(m[0]), [{ a: 1 }]);
});

test('parseFeed lit un flux RSS 2.0 classique', async () => {
  const { parseFeed } = await import('../lib/press.js');
  const xml = `<?xml version="1.0"?><rss><channel>
    <item><title>Nouvelle réglementation SO2</title><link>https://example.com/a</link>
    <description><![CDATA[Un <b>résumé</b> de l'article]]></description>
    <pubDate>Mon, 20 Jul 2026 10:00:00 GMT</pubDate></item>
    <item><title>Sans lien</title></item>
  </channel></rss>`;
  const items = parseFeed(xml);
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].title, 'Nouvelle réglementation SO2');
  assert.strictEqual(items[0].url, 'https://example.com/a');
  assert.match(items[0].summary, /résumé/);
  assert.ok(items[0].publishedAt);
});

test('parseFeed lit un flux Atom', async () => {
  const { parseFeed } = await import('../lib/press.js');
  const xml = `<feed><entry><title>Titre Atom</title><link href="https://example.com/b"/>
    <summary>Résumé atom</summary><updated>2026-07-20T10:00:00Z</updated></entry></feed>`;
  const items = parseFeed(xml);
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].url, 'https://example.com/b');
});

test('hashOf est stable et déterministe', async () => {
  const { hashOf } = await import('../lib/press.js');
  assert.strictEqual(hashOf('https://x.com/a'), hashOf('https://x.com/a'));
  assert.notStrictEqual(hashOf('https://x.com/a'), hashOf('https://x.com/b'));
});
