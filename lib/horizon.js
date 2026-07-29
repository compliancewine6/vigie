// Suivi HORIZON : textes réglementaires PAS ENCORE en vigueur
// (propositions, consultations). N'écrit JAMAIS dans `requirements` —
// alimente horizon_items, triés manuellement par la qualité, au même
// titre que watch_alerts pour la presse.
//
// Portée V1 volontairement restreinte au Federal Register US
// (TTB + FDA, filtre PROPOSED_RULE) : c'est la seule source qui offre
// une API structurée et fiable pour isoler "ce qui concerne le vin et
// n'est pas encore final". DEFRA "consultation finder" et EU "Have
// your say" existent (cf. context_sources) mais sont des portails
// génériques à ~800 procédures tous secteurs confondus, sans filtre
// fiable interrogeable depuis cet environnement — les y suivre en
// hash-diff produirait un bruit constant plutôt qu'un signal utile.
// Le fetcher 'html' reste supporté ici pour une URL ciblée qu'un
// humain identifierait plus tard (ex: une procédure EUR-Lex précise).
import crypto from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.EXTRACT_MODEL || 'claude-sonnet-4-5';
const UA = 'VigieWineCompliance/1.0 (veille horizon; contact: cl.fustier@gmail.com)';

async function get(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status} sur ${url}`);
  return r;
}

export function hashOf(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

// --- Federal Register : règles PROPOSÉES (pas encore finales) ---
export async function fetchProposedRules({ agency, sinceDays = 120 }) {
  const since = new Date(Date.now() - sinceDays * 864e5).toISOString().slice(0, 10);
  const url = `https://www.federalregister.gov/api/v1/documents.json?per_page=50&order=newest` +
    `&conditions%5Bagencies%5D%5B%5D=${agency}&conditions%5Btype%5D%5B%5D=PROPOSED_RULE` +
    `&conditions%5Bpublication_date%5D%5Bgte%5D=${since}&conditions%5Bterm%5D=wine`;
  const json = await (await get(url)).json();
  return (json.results || []).map(d => ({
    title: d.title,
    url: d.html_url,
    publishedAt: d.publication_date,
    summary: d.abstract || ''
  }));
}

// --- Page HTML ciblée (usage manuel ponctuel) : suivi par hash de la
// page entière — à réserver à une URL précise, pas un portail générique.
export async function fetchConsultationPage({ url }) {
  const r = await get(url);
  const body = await r.text();
  const text = body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
  return { text, url };
}

// Classification légère : la proposition/consultation est-elle
// pertinente pour la conformité vin, et à quel stade ?
const SECTIONS = 'analytique,composes,microbiologie,allergenes,etiquetage,packaging,certifications,documents,import,rse,taxes,pricing';
export async function classifyHorizonItem({ title, summary }) {
  const msg = await anthropic.messages.create({
    model: MODEL, max_tokens: 300,
    system: `Tu tries des textes réglementaires EN PRÉPARATION (proposition, consultation, pas encore en vigueur) pour un système de veille réglementaire vin.
Réponds en JSON strict: {"relevant": bool, "jurisdiction_guess": "EU"|"UK"|"US"|"FR"|"IE"|null, "section_guess": "${SECTIONS}"|null, "stage_guess": "consultation"|"proposed_rule"|"adopted_not_in_force"|"unknown", "summary": "résumé en une phrase, en français, avec l'horizon d'entrée en vigueur si mentionné"}
"relevant" = true seulement si ça concerne potentiellement une future obligation de conformité pour le vin (pas une simple actualité).`,
    messages: [{ role: 'user', content: `Titre: ${title}\nContenu/extrait: ${(summary || '').slice(0, 3000)}` }]
  });
  try {
    return JSON.parse(msg.content[0].text.match(/\{[\s\S]*\}/)[0]);
  } catch {
    return { relevant: false, jurisdiction_guess: null, section_guess: null, stage_guess: 'unknown', summary: title };
  }
}
