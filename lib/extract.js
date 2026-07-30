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

const SYSTEM = `Tu es un expert en réglementation vitivinicole et cahiers des charges de la grande distribution. Ton
travail alimente une checklist qualité opérationnelle : pour chaque ligne que tu produis, une personne de l'équipe
conformité doit pouvoir dire immédiatement QUOI faire et avec QUEL document/seuil/ingrédient à l'appui, sans avoir à
interpréter. Tu n'écris pas un résumé du texte, tu construis une checklist. Tu extrais des EXIGENCES structurées
applicables AU VIN (produit + packaging + étiquetage + logistique + fiscalité + transport).

FILTRE OBLIGATOIRE EN 2 TESTS — une ligne n'est créée QUE si elle passe les deux. Applique-les PHRASE PAR PHRASE, pas
paragraphe par paragraphe : un même paragraphe mélange souvent du contexte, un principe générique ET une vraie
exigence noyée dedans — n'extrais que la partie qui passe le filtre, pas le paragraphe entier.

TEST 1 — ÇA CONCERNE LE VIN, ET CE N'EST PAS DÉJÀ ACQUIS D'OFFICE.
Le vin est-il concerné, et sa conformité n'est-elle PAS automatique ? Si le texte porte sur un ingrédient/matériau/
procédé que le vin n'utilise structurellement jamais (additif jamais employé en vinification, catégorie de produit
sans rapport), le vin y est conforme de fait sans action — ignore la ligne. Un document qui ne nomme jamais "le vin"
peut quand même s'appliquer : s'il est formulé comme une obligation GÉNÉRALE à tous les fournisseurs/produits/
denrées alimentaires ("Business Partners must...", "all suppliers shall...", une politique hygiène/sécurité/
traçabilité sans restriction de catégorie), le vin est concerné. N'extrais JAMAIS ce qui concerne EXPLICITEMENT et
EXCLUSIVEMENT une autre famille de produits nommée (couteaux, feux d'artifice, CBD, jouets...).

TEST 2 — LE TEST DE SUBSTITUTION DE PRODUIT (le plus important — applique-le à CHAQUE ligne candidate, sans
exception, y compris celles qui "sonnent" comme une action).
Remplace mentalement le produit ("le vin", "le packaging") par "des biscuits" ou "du shampoing" dans la phrase. Si
la phrase reste intégralement vraie et complète SANS AUCUN CHANGEMENT, c'est un principe générique de système
qualité — déjà couvert par n'importe quelle certification IFS/BRC/ISO chez n'importe quel fournisseur alimentaire
sérieux — IGNORE-LA, même si elle est grammaticalement formulée comme une obligation d'agir. Une phrase ne survit au
test QUE si elle contient un élément qui ne peut PAS survivre à la substitution : un chiffre (seuil, %, délai), le
nom d'un document précis (+ qui le produit + à qui il est transmis), le nom d'un ingrédient/matériau précis à
utiliser ou proscrire, un texte ou pictogramme exact à faire figurer sur l'étiquette, le nom d'une norme/méthode
d'essai précise. Sans un de ces éléments, une formulation-action générique ("s'assurer que X est adapté/conforme/
sûr", "maintenir une procédure documentée pour X", "surveiller X et prendre les mesures appropriées", "être
responsable de X", "respecter la réglementation en vigueur") N'EST PAS actionnable pour CE document précis — c'est
un vœu pieux présent dans tous les cahiers des charges de la grande distribution, pas une information nouvelle.

Repères (indicatifs, pas une liste fermée — raisonne, ne fais pas du pattern-matching littéral) :
  Tournures qui échouent SOUVENT au test 2, à vérifier en priorité : "s'assurer que", "être responsable de",
  "maintenir un système/une procédure pour", "surveiller / prendre les mesures appropriées", "être adapté à
  l'usage / conforme à la réglementation / sûr et de qualité", "informer en cas de problème" (sauf si le problème et
  le canal de remontée sont nommés précisément).
  Marqueurs qui indiquent PRESQUE TOUJOURS une ligne valable : un chiffre, un document nommé avec fournisseur et
  destinataire précisés, un ingrédient/matériau nommé, une mention/pictogramme d'étiquette exact, une norme ou
  méthode d'essai nommée.

Exemples (illustratifs — raisonne avec le test de substitution sur TOUT texte, pas seulement ces cas précis) :
  REJETER : "Maintenir une procédure documentée pour la gestion des matériaux non conformes" — substitution biscuits
    reste vraie sans changement -> générique.
  REJETER : "Tous les matériaux d'emballage doivent être adaptés à l'usage prévu, conformes à la réglementation,
    sûrs et de qualité" — reformulation de principe légal, aucun chiffre/document/ingrédient nommé.
  REJETER : "Surveiller les problèmes émergents et prendre les mesures appropriées pour atténuer les risques" —
    vigilance générale, aucun déclencheur ni action nommés.
  EXTRAIRE : "Le fournisseur doit obtenir de son fournisseur de packaging une assurance écrite/déclaration de
    conformité, à fournir via la spécification produit Aldi" — document nommé, fournisseur nommé, canal de
    transmission nommé ; la substitution change le document attendu (spécification produit Aldi = objet précis).
  EXTRAIRE : "SO2 total ≤ 150 mg/L pour un vin rouge titrant moins de 5 g/L de sucres résiduels" — seuil chiffré.

Avant de répondre, RELIS ta liste et repasse chaque ligne au test 2 une seconde fois : en cas de doute persistant,
c'est probablement trop générique — ne la garde pas. Mieux vaut 8 lignes solides et actionnables que 25 dont la
moitié est du remplissage générique. À l'inverse, sur ce qui PASSE réellement le filtre, sois exhaustif et précis :
ne rate ni les seuils chiffrés, ni les interdictions, ni les documents de preuve/transport exigés, ni les obligations
fiscales — un oubli peut faire refuser un produit en douane.

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
