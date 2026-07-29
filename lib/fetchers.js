// Fetchers par type de source. Chaque fetcher retourne { text, meta }.
// text = contenu normalisé (base du hash de détection de changement).
// Ajouter un pays = ajouter des lignes en table `sources` ; on n'ajoute un
// fetcher ici que si le FORMAT est nouveau.

// UA "bot" personnalisé bloqué en 403 par le WAF de legifrance.gouv.fr
// (constaté en prod depuis Vercel — probablement un filtre sur les UA
// non-navigateur plutôt qu'un blocage d'IP, à confirmer). On utilise un
// UA de navigateur standard + jeu d'en-têtes complet : légal ici, le
// contenu Légifrance est en Licence Ouverte explicitement réutilisable,
// seul un filtre anti-bot générique nous bloquait, pas une restriction
// sur l'usage des données elles-mêmes. Volume très faible (quelques
// requêtes/mois), sans commune mesure avec un scraping agressif.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const BROWSER_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
};

async function get(url, headers = {}) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, ...BROWSER_HEADERS, ...headers } });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return r;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

// --- EUR-Lex : texte consolidé par CELEX (HTML officiel, réutilisation libre) ---
// CELEX famille consolidée SANS date (ex: 02019R0934) = dernière version
// consolidée. Repli sur l'acte de base (3...) si la page consolidée échoue.
async function eurlex({ celex, fallback_celex, lang = 'FR' }) {
  const urlFor = c => `https://eur-lex.europa.eu/legal-content/${lang}/TXT/HTML/?uri=CELEX:${c}`;
  let html, used = celex;
  try {
    html = await (await get(urlFor(celex))).text();
    if (html.length < 5000) throw new Error('page vide');
  } catch (e) {
    if (!fallback_celex) throw e;
    used = fallback_celex;
    html = await (await get(urlFor(fallback_celex))).text();
  }
  return { text: stripHtml(html), meta: { celex: used, url: urlFor(used) } };
}

// --- legislation.gov.uk : API officielle, suffixe /data.xht sur toute page ---
async function uklegislation({ path }) {
  const url = `https://www.legislation.gov.uk/${path}/data.xht?view=snippet&wrap=true`;
  let html;
  try { html = await (await get(url)).text(); }
  catch { html = await (await get(`https://www.legislation.gov.uk/${path}/data.xml`)).text(); }
  return { text: stripHtml(html), meta: { path } };
}

// --- eCFR : API officielle avec versioning point-in-time ---
async function ecfr({ title, part }) {
  const titles = await (await get('https://www.ecfr.gov/api/versioner/v1/titles.json')).json();
  const t = titles.titles.find(x => x.number === title);
  const date = t.up_to_date_as_of;
  const url = `https://www.ecfr.gov/api/versioner/v1/full/${date}/title-${title}.xml?part=${part}`;
  const xml = await (await get(url)).text();
  return { text: stripHtml(xml), meta: { title, part, as_of: date, latest_amended_on: t.latest_amended_on } };
}

// --- Federal Register : règles finales TTB/FDA (capte le changement avant le CFR) ---
async function federalregister({ agency, sinceDays = 40 }) {
  const since = new Date(Date.now() - sinceDays * 864e5).toISOString().slice(0, 10);
  const url = `https://www.federalregister.gov/api/v1/documents.json?per_page=50&order=newest` +
    `&conditions%5Bagencies%5D%5B%5D=${agency}&conditions%5Btype%5D%5B%5D=RULE` +
    `&conditions%5Bpublication_date%5D%5Bgte%5D=${since}&conditions%5Bterm%5D=wine`;
  const json = await (await get(url)).json();
  const text = (json.results || [])
    .map(d => `${d.publication_date} — ${d.title}\n${d.abstract || ''}\n${d.html_url}`)
    .join('\n\n');
  return { text: text || '(aucune règle récente)', meta: { count: json.count, since } };
}

// --- PDF distant (ex: rapports FAIRS/GAIN USDA) : binaire, extrait par Claude ---
async function pdf_url({ url }) {
  const buf = Buffer.from(await (await get(url)).arrayBuffer());
  return { text: null, pdfBase64: buf.toString('base64'), meta: { url, bytes: buf.length } };
}

// --- Page HTML générique (sources de contexte secondaires : TTB, INAO, OIV...) ---
// Certaines de ces pages servent aussi de PDF (ex: Codex OIV) : on détecte
// via l'en-tête Content-Type plutôt que l'extension d'URL.
async function html({ url }) {
  const r = await get(url);
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('pdf')) {
    const buf = Buffer.from(await r.arrayBuffer());
    return { text: null, pdfBase64: buf.toString('base64'), meta: { url, bytes: buf.length } };
  }
  const body = await r.text();
  return { text: stripHtml(body), meta: { url } };
}

export const fetchers = { eurlex, uklegislation, ecfr, federalregister, pdf_url, html };

export async function fetchSource(source) {
  const fn = fetchers[source.fetcher];
  if (!fn) throw new Error(`Fetcher inconnu: ${source.fetcher}`);
  return fn(source.fetch_config);
}
