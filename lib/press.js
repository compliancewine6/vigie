// Veille presse pro : parsing RSS/Atom générique + classification légère.
// Ne touche JAMAIS à `requirements` — alimente uniquement `watch_alerts`,
// un flux que la qualité triage manuellement.
import crypto from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.EXTRACT_MODEL || 'claude-sonnet-4-5';
const UA = 'VigieWineCompliance/1.0 (veille presse; contact: cl.fustier@gmail.com)';

function decodeEntities(s = '') {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? decodeEntities(m[1].replace(/<[^>]+>/g, ' ').trim()) : '';
}
function linkOf(block) {
  // RSS: <link>url</link> ; Atom: <link href="url"/>
  const rss = block.match(/<link[^>]*>([^<]+)<\/link>/i);
  if (rss?.[1]) return decodeEntities(rss[1]);
  const atom = block.match(/<link[^>]+href="([^"]+)"/i);
  return atom?.[1] || '';
}

// Parse un flux RSS 2.0 ou Atom en une liste d'items bruts.
export function parseFeed(xml) {
  const items = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  for (const block of itemBlocks) {
    const title = tag(block, 'title');
    const url = linkOf(block);
    if (!title || !url) continue;
    const summary = tag(block, 'description') || tag(block, 'summary') || tag(block, 'content');
    const dateStr = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated');
    const publishedAt = dateStr ? new Date(dateStr) : null;
    items.push({
      title, url, summary: summary.slice(0, 1500),
      publishedAt: publishedAt && !isNaN(publishedAt) ? publishedAt.toISOString() : null
    });
  }
  return items;
}

export async function fetchFeed(feedUrl) {
  const r = await fetch(feedUrl, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status} sur ${feedUrl}`);
  return parseFeed(await r.text());
}

export function hashOf(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

// Classification légère (pas d'extraction d'exigence — juste un triage :
// pertinent ou pas, pays/section probables, résumé court). Volontairement
// peu coûteux : petit modèle de sortie, contexte réduit à titre+résumé.
const SECTIONS = 'analytique,composes,microbiologie,allergenes,etiquetage,packaging,certifications,documents,import,rse,taxes,pricing';
export async function classifyArticle({ title, summary }) {
  const msg = await anthropic.messages.create({
    model: MODEL, max_tokens: 300,
    system: `Tu tries des articles de presse professionnelle vin/viti pour un système de veille réglementaire.
Réponds en JSON strict: {"relevant": bool, "jurisdiction_guess": "EU"|"UK"|"US"|null, "section_guess": "${SECTIONS}"|null, "summary": "résumé en une phrase, en français"}
"relevant" = true seulement si l'article parle d'une évolution réglementaire, norme, ou obligation de conformité concernant le vin (pas une simple actualité marché/dégustation).`,
    messages: [{ role: 'user', content: `Titre: ${title}\nRésumé/extrait: ${summary || '(aucun)'}` }]
  });
  try {
    const j = JSON.parse(msg.content[0].text.match(/\{[\s\S]*\}/)[0]);
    return j;
  } catch {
    return { relevant: false, jurisdiction_guess: null, section_guess: null, summary: title };
  }
}
