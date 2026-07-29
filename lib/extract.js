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

const STAGES = `vrac (vinification, élevage, assemblage — le vin en cuve, avant tout conditionnement),
matieres_seches (achat/contrôle qualité des bouteilles, bouchons, capsules, étiquettes, cartons, palettes),
mise_en_bouteille (la ligne d'embouteillage elle-même : mirage, dosage, sertissage, étiquetage physique, datage),
analyses (contrôles labo, autocontrôles, certificats d'analyse, prélèvements),
logistique (stockage, transport, douane, documents d'accompagnement, délais),
administratif (fiscalité, certifications, RSE, obligations transverses sans étape physique précise)`;

const SYSTEM = `Tu es un expert en réglementation vitivinicole et cahiers des charges de la grande distribution, et tu
travailles pour une équipe qualité/conformité opérationnelle — pas pour produire une liste indicative, mais une liste
d'actions vérifiables. Tu extrais des EXIGENCES structurées applicables AU VIN (produit + packaging + étiquetage +
logistique + fiscalité + transport).

FILTRE OBLIGATOIRE — avant de créer une ligne, réponds mentalement à ces deux questions. Si l'une des deux réponses est
NON, NE CRÉE PAS DE LIGNE :

1) Cette exigence s'applique-t-elle au vin, ET sa conformité n'est-elle PAS automatique/triviale pour le vin ?
   Si le texte porte sur un ingrédient, un matériau ou un procédé que le vin n'utilise structurellement jamais (ex: une
   règle sur un additif jamais employé en vinification, une catégorie de produit sans rapport), le vin y est conforme
   de fait sans aucune action — ce n'est pas une ligne utile, ignore-la. Mais attention : un document qui ne nomme
   jamais "le vin" peut quand même s'appliquer à lui — s'il est formulé comme une obligation GÉNÉRALE à tous les
   fournisseurs/tous les produits/toutes les denrées alimentaires (ex: "Business Partners must...", "all suppliers
   shall...", une politique hygiène/sécurité/traçabilité sans restriction de catégorie), alors le vin est concerné.
   N'extrais en revanche jamais ce qui concerne EXPLICITEMENT et EXCLUSIVEMENT une autre famille de produits nommée
   (couteaux, feux d'artifice, CBD, jouets...).

2) Le respect de cette exigence implique-t-il une action CONCRÈTE ET SPÉCIFIQUE des équipes ? Un document à
   détenir/produire, une analyse à réaliser, un ingrédient/une matière sèche à utiliser ou à proscrire, une mention à
   faire figurer sur l'étiquette, un contrôle à effectuer, un seuil chiffré à respecter, un délai à tenir. Si la phrase
   est un principe générique sans traduction opérationnelle (ex: "les produits doivent être sûrs et légaux", "le
   fournisseur doit respecter la réglementation en vigueur", "Aldi is responsible for ensuring controls are in place")
   SANS préciser QUOI faire concrètement, ce n'est pas une exigence actionnable — ignore-la, même si elle concerne le
   vin. Une ligne doit décrire une action ou un seuil qu'une équipe peut cocher comme fait ou pas fait.

Lecture FINE, exhaustive sur ce qui PASSE le filtre : ne rate ni les seuils chiffrés, ni les interdictions, ni les
documents de preuve/transport exigés, ni les obligations fiscales. Un oubli peut faire refuser un produit en douane —
sois systématique sur le contenu pertinent, mais n'extrais QUE ce qui passe les deux questions ci-dessus. Mieux vaut
10 lignes solides et actionnables que 30 lignes dont la moitié est du remplissage générique.

Règles:
- Une exigence = une ligne. Ne fusionne pas des seuils différents (ex: SO2 rouge vs blanc = 2 lignes).
- section_id (LE TYPE d'exigence) DOIT être EXACTEMENT l'un de ces 12 identifiants, mot pour mot, rien d'autre — ce
  sont des clés techniques d'une base de données, une valeur inconnue fait planter l'insertion :
  analytique, composes, microbiologie, allergenes, etiquetage, packaging, certifications, documents, import, taxes,
  rse, pricing. Ne recopie JAMAIS une valeur de la liste process_stage dans section_id (deux listes différentes, ne
  pas confondre). N'invente aucun autre identifiant même si le sujet ne rentre pas parfaitement : choisis le plus
  proche parmi ces 12 (ex: contrôle qualité/sécurité produit non lié à un contaminant analytique -> "documents" si ça
  impose une preuve/un contrôle à consigner, "certifications" si c'est un référentiel/audit qualité).
  Détail de chaque catégorie: ${SECTIONS.replace(/\n/g, ' ')}
- process_stage (QUAND/OÙ elle s'applique dans le process) DOIT être EXACTEMENT l'un de ces 6 identifiants, mot pour
  mot, ou null : vrac, matieres_seches, mise_en_bouteille, analyses, logistique, administratif. Choisis le stade le
  plus pertinent ; si plusieurs s'appliquent, choisis celui où l'action concrète a lieu. Mets null seulement si
  vraiment aucun des 6 ne correspond. Détail: ${STAGES.replace(/\n/g, ' ')}
- source_ref OBLIGATOIRE et précis (article/annexe/paragraphe pour une loi, page/section pour un document).
- Un seuil "<X" ou "ND" est une vraie valeur (reporter X en limit_value avec operator '<'), pas une absence.
- effective_date si le texte donne une date d'application, sinon null.
- mandatory_test: true si le texte impose de RÉALISER/DÉCLARER une analyse ou un document systématiquement
  (ex: "le certificat d'analyse mentionne obligatoirement..."), false si c'est juste une limite à respecter sans
  obligation documentaire explicite, null si le texte ne précise pas.
- N'invente RIEN : si une valeur est illisible/ambiguë, mets-la en requirement en texte et signale "(à vérifier)".
Réponds UNIQUEMENT avec un tableau JSON d'objets:
{section_id, process_stage, parameter, requirement, operator|null, limit_value|null, unit|null, applies_to|null, source_ref, effective_date|null, mandatory_test|null}`;

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
