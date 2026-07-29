// Extraction structurée par Claude. Un seul point d'entrée pour les deux
// veilles : le LLM n'intervient QU'À l'ingestion, jamais à la consultation.
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.EXTRACT_MODEL || 'claude-sonnet-4-5';
const CHUNK = 120_000; // caractères par appel

const SECTIONS = `analytique (paramètres physico-chimiques, LMR pesticides, métaux lourds, contaminants),
composes (additifs, auxiliaires, pratiques œnologiques autorisées/interdites, doses max),
microbiologie, allergenes, etiquetage (mentions obligatoires, langues, pictogrammes, e-label),
packaging (bouteille, bouchage, contact alimentaire, REP/recyclage), certifications (bio, IFS/BRC, durabilité),
documents (preuves, certificats, analyses par lot, traçabilité, DOCUMENTS D'ACCOMPAGNEMENT DE TRANSPORT type e-AD/DAA/VI-1 — bien les distinguer des documents de preuve produit dans le libellé "parameter"),
import (douane, licences, procédures), taxes (droits d'accise, fiscalité spécifique alcool, TVA sectorielle),
rse (audit, social, carbone, exigences hors réglementaire),
pricing (prix plancher/minimum unit pricing, contraintes de commercialisation liées au prix — ex: Ecosse/Galles)`;

const SYSTEM = `Tu es un expert en réglementation vitivinicole et cahiers des charges de la grande distribution.
Tu extrais des EXIGENCES structurées applicables AU VIN UNIQUEMENT (produit + packaging + étiquetage + logistique + fiscalité + transport).
Lecture FINE, exhaustive : ne rate ni les seuils chiffrés, ni les interdictions, ni les documents de preuve/transport exigés,
ni les obligations fiscales. Un oubli ici peut faire refuser un produit en douane — sois systématique, relis le texte
section par section plutôt que de survoler.

ATTENTION — documents multi-catégories : certains documents clients (chartes qualité, politiques groupe) couvrent
PLUSIEURS familles de produits à la fois (ex: une politique "produits sous restriction d'âge" qui traite dans le même
texte couteaux, feux d'artifice, substances corrosives, CBD, jeux à gratter, ET alcool). Le vin est concerné par une
exigence dans DEUX cas : (1) le passage mentionne explicitement le vin/l'alcool/les boissons alcoolisées, OU (2) le
passage est formulé comme une obligation GÉNÉRALE à tous les fournisseurs/tous les produits/toutes les denrées
alimentaires (ex: "Business Partners must...", "all suppliers shall...", une politique hygiène/sécurité/traçabilité
sans restriction de catégorie) — dans ce cas elle s'applique aussi au vin même si le mot "vin" n'apparaît jamais, et tu
dois l'extraire. Exclus uniquement les passages qui concernent EXPLICITEMENT et EXCLUSIVEMENT une autre famille de
produits nommément identifiée et sans lien avec le vin (ex: emballage sécurisé des couteaux, catégories de feux
d'artifice, produits CBD) — ceux-là ne s'appliquent pas au vin, ne les extrais pas. En cas de doute entre "obligation
générale" et "hors sujet", penche pour l'extraction : un faux négatif (exigence ratée) est pire ici qu'une ligne à
rejeter en validation qualité.

Règles:
- Une exigence = une ligne. Ne fusionne pas des seuils différents (ex: SO2 rouge vs blanc = 2 lignes).
- section_id parmi exactement: ${SECTIONS.replace(/\n/g, ' ')}
- source_ref OBLIGATOIRE et précis (article/annexe/paragraphe pour une loi, page/section pour un document).
- Un seuil "<X" ou "ND" est une vraie valeur (reporter X en limit_value avec operator '<'), pas une absence.
- effective_date si le texte donne une date d'application, sinon null.
- mandatory_test: true si le texte impose de RÉALISER/DÉCLARER une analyse ou un document systématiquement
  (ex: "le certificat d'analyse mentionne obligatoirement..."), false si c'est juste une limite à respecter sans
  obligation documentaire explicite, null si le texte ne précise pas.
- N'invente RIEN : si une valeur est illisible/ambiguë, mets-la en requirement en texte et signale "(à vérifier)".
Réponds UNIQUEMENT avec un tableau JSON d'objets:
{section_id, parameter, requirement, operator|null, limit_value|null, unit|null, applies_to|null, source_ref, effective_date|null, mandatory_test|null}`;

// Ne renvoie plus jamais un échec silencieux : si le JSON ne se parse pas,
// on garde un extrait brut de la réponse pour comprendre pourquoi (texte
// tronqué par max_tokens, réponse hors format, etc.) plutôt qu'un [] muet.
function parseJson(text) {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return { rows: [], parseError: 'aucun tableau JSON détecté dans la réponse' };
  try { return { rows: JSON.parse(m[0]), parseError: null }; }
  catch (e) { return { rows: [], parseError: `JSON invalide (probablement tronqué) : ${e.message}` }; }
}

async function callClaude(content, contextNote, maxTokens = 16000) {
  const t0 = Date.now();
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: SYSTEM,
    messages: [{ role: 'user', content: [
      { type: 'text', text: `Contexte du document: ${contextNote}\nExtrais toutes les exigences.` },
      ...(Array.isArray(content) ? content : [{ type: 'text', text: content }])
    ]}]
  });
  const rawText = msg.content.map(b => b.text || '').join('');
  const { rows, parseError } = parseJson(rawText);
  return {
    rows, ms: Date.now() - t0, stopReason: msg.stop_reason, parseError,
    rawPreview: rows.length === 0 ? rawText.slice(0, 1500) : null
  };
}

// Texte long -> découpage avec léger recouvrement, puis dédoublonnage.
// Retourne { rows, diagnostics } — diagnostics toujours rempli, même
// quand rows est vide, pour ne jamais retomber dans un échec muet.
export async function extractFromText(text, contextNote) {
  const rows = [];
  const chunks = [];
  for (let i = 0; i < text.length; i += CHUNK - 5000) {
    const r = await callClaude(text.slice(i, i + CHUNK), contextNote);
    rows.push(...r.rows);
    chunks.push({ ms: r.ms, stopReason: r.stopReason, parseError: r.parseError, rawPreview: r.rawPreview, rowsFound: r.rows.length });
    if (text.length <= CHUNK) break;
  }
  const seen = new Set();
  const deduped = rows.filter(r => {
    const k = `${r.section_id}|${r.parameter}|${r.applies_to}|${r.limit_value}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
  return { rows: deduped, diagnostics: { textLength: text.length, chunks } };
}

// PDF envoyé en un seul appel (pas de découpage possible sur un binaire) —
// max_tokens relevé à 64k (plafond Sonnet 4.5) pour limiter le risque de
// troncature sur un document long, qui produirait un JSON invalide et
// donc 0 exigence extraite sans qu'on sache pourquoi.
export async function extractFromPdf(pdfBase64, contextNote) {
  const r = await callClaude(
    [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } }],
    contextNote, 64000
  );
  return {
    rows: r.rows,
    diagnostics: {
      pdfBytes: Math.round(pdfBase64.length * 0.75), ms: r.ms, stopReason: r.stopReason,
      parseError: r.parseError, rawPreview: r.rawPreview,
      truncated: r.stopReason === 'max_tokens'
    }
  };
}

// Classification d'un document client déposé (type + date d'application)
export async function classifyDocument(excerpt, filename) {
  const msg = await anthropic.messages.create({
    model: MODEL, max_tokens: 500,
    messages: [{ role: 'user', content:
      `Fichier "${filename}". Extrait:\n${excerpt.slice(0, 8000)}\n\n` +
      `Classe ce document. Réponds en JSON: {"doc_type":"cdc|charte_qualite|plan_controle|spec_packaging|autre",` +
      `"effective_date":"YYYY-MM-DD"|null,"short_label":"libellé court pour nom de fichier (ascii, tirets)"}` }]
  });
  try { return JSON.parse(msg.content[0].text.match(/\{[\s\S]*\}/)[0]); }
  catch { return { doc_type: 'autre', effective_date: null, short_label: 'document' }; }
}
