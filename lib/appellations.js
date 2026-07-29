// Sync de la liste des appellations depuis le jeu de données officiel
// INAO ("Aires et produits AOC/AOP et IGP", data.gouv.fr, licence
// ouverte). Ne fait QUE peupler la liste à suivre (statut pending_link)
// — jamais d'extraction tant qu'un humain n'a pas confirmé le lien du
// cahier des charges. Parsing défensif : colonnes non reconnues sont
// signalées plutôt que silencieusement ignorées.
const DATASET_URL = 'https://www.data.gouv.fr/api/1/datasets/r/0f6a69d8-6452-4e3a-99e0-9278e72b5709';
const UA = 'VigieWineCompliance/1.0 (veille appellations; contact: cl.fustier@gmail.com)';

// Filtrage : régions explicitement exclues par consigne (hors périmètre V1)
const EXCLUDED_REGIONS = [
  /loire/i, /alsace/i, /nantais/i, /anjou/i, /saumur/i, /touraine/i,
  /sancerre/i, /pouilly/i, /chinon/i, /bourgueil/i, /vouvray/i, /muscadet/i
];
// Filtre vin. ATTENTION : un nom d'appellation (« Comté », « Margaux »)
// est un nom propre — aucun mot-clé lexical ne le distingue de manière
// fiable. Le SEUL filtre fiable est une colonne "secteur/filière" du
// fichier source. Si elle est absente, on bascule sur une liste blanche
// de mots-clés reconnus dans le libellé produit (vin/crémant/champagne)
// plutôt qu'une liste noire par exclusion — plus sûr (faux négatifs
// visibles en revue qualité plutôt que des fromages qui passeraient).
const WINE_SECTOR_KEYWORDS = /vin|viti|œno|oeno/i;
const WINE_NAME_FALLBACK = /\bvin\b|vins?\b|crémant|cremant|champagne|clairette|muscat|banyuls|maury|rivesaltes|rasteau/i;

function detectDelimiter(sample) {
  const counts = { ';': (sample.match(/;/g) || []).length, ',': (sample.match(/,/g) || []).length };
  return counts[';'] >= counts[','] ? ';' : ',';
}

// Parseur CSV minimal (gère les guillemets, pas de dépendance externe)
export function parseCsv(text) {
  const delim = detectDelimiter(text.slice(0, 2000));
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  if (!lines.length) return { headers: [], rows: [] };
  const parseLine = line => {
    const out = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === delim) { out.push(cur); cur = ''; }
        else cur += c;
      }
    }
    out.push(cur);
    return out.map(s => s.trim());
  };
  const headers = parseLine(lines[0]).map(h => h.toLowerCase());
  const rows = lines.slice(1).map(parseLine).map(vals => {
    const o = {};
    headers.forEach((h, i) => { o[h] = vals[i] ?? ''; });
    return o;
  });
  return { headers, rows };
}

// Cherche la colonne la plus probable parmi plusieurs libellés candidats
function findCol(headers, candidates) {
  for (const cand of candidates) {
    const hit = headers.find(h => h.includes(cand));
    if (hit) return hit;
  }
  return null;
}

export async function fetchAppellationsDataset() {
  const r = await fetch(DATASET_URL, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status} sur le jeu de données INAO`);
  return r.text();
}

// Retourne { appellations: [{name, region, wine_type}], stats, unmapped_columns }
export function extractWineAppellations(csvText) {
  const { headers, rows } = parseCsv(csvText);
  const colProduit = findCol(headers, ['produit', 'denomination', 'dénomination', 'nom']);
  const colRegion = findCol(headers, ['region', 'région', 'departement', 'département', 'zone', 'commune']);
  const colType = findCol(headers, ['type', 'signe', 'siqo', 'categorie', 'catégorie']);
  const colSector = findCol(headers, ['secteur', 'filiere', 'filière', 'famille']);
  const filterMethod = colSector ? 'sector_column' : 'name_keyword_fallback_unreliable';

  const stats = {
    total_rows: rows.length, wine_rows: 0, excluded_region: 0, unique_appellations: 0,
    filter_method: filterMethod
  };
  const seen = new Map();

  for (const row of rows) {
    const produit = colProduit ? row[colProduit] : '';
    const region = colRegion ? row[colRegion] : '';
    const typeRaw = colType ? row[colType] : '';
    const sector = colSector ? row[colSector] : '';
    if (!produit) continue;

    const isWine = colSector ? WINE_SECTOR_KEYWORDS.test(sector) : WINE_NAME_FALLBACK.test(produit);
    if (!isWine) continue;
    stats.wine_rows++;

    if (EXCLUDED_REGIONS.some(re => re.test(region) || re.test(produit))) {
      stats.excluded_region++;
      continue;
    }
    const wineType = /igp/i.test(typeRaw) || /igp/i.test(sector) ? 'IGP' : 'AOC';
    if (!seen.has(produit)) seen.set(produit, { name: produit, region, wine_type: wineType });
  }
  stats.unique_appellations = seen.size;
  return {
    appellations: [...seen.values()],
    stats,
    unmapped_columns: { produit: !!colProduit, region: !!colRegion, type: !!colType, secteur: !!colSector }
  };
}
