// Contexte / interprétation à la demande pour une exigence déjà
// validée. Consulte des sources secondaires FIXES (par juridiction),
// jamais en tâche de fond, jamais utilisé pour juger de la
// conformité — purement informatif, toujours cité.
import Anthropic from '@anthropic-ai/sdk';
import { db, requireAdmin } from '../lib/db.js';
import { fetchSource } from '../lib/fetchers.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.EXTRACT_MODEL || 'claude-sonnet-4-5';
const MAX_SOURCES_PER_SEARCH = 3;

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  const action = req.query.action;

  try {
    if (action === 'list') {
      const { data, error } = await db.from('requirement_context')
        .select('*, context_sources(name, url_human)')
        .eq('requirement_id', req.query.requirement_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json(data);
    }

    if (action === 'search' && req.method === 'POST') {
      const { requirement_id, requested_by } = req.body;
      const { data: reqt, error: e1 } = await db.from('requirements').select('*').eq('id', requirement_id).single();
      if (e1 || !reqt) return res.status(404).json({ error: 'exigence introuvable' });

      // Sources transverses (OIV, jurisdiction NULL) + sources de la juridiction concernée
      const { data: srcs, error: e2 } = await db.from('context_sources')
        .select('*').eq('active', true)
        .or(`jurisdiction.is.null,jurisdiction.eq.${reqt.jurisdiction || '__none__'}`)
        .limit(MAX_SOURCES_PER_SEARCH);
      if (e2) throw e2;
      if (!srcs?.length) return res.json({ results: [] });

      const fetched = [];
      for (const s of srcs) {
        try {
          const f = await fetchSource(s);
          fetched.push({ source: s, text: f.text, pdfBase64: f.pdfBase64 });
        } catch { /* source indisponible, on continue avec les autres */ }
      }
      if (!fetched.length) return res.json({ results: [], warning: 'Aucune source de contexte accessible pour le moment.' });

      const content = [
        { type: 'text', text:
          `Exigence à éclairer : "${reqt.parameter}" — ${reqt.requirement}` +
          (reqt.limit_value != null ? ` (limite: ${reqt.operator || ''} ${reqt.limit_value} ${reqt.unit || ''})` : '') +
          `\nSource légale d'origine: ${reqt.source_ref}\n\n` +
          `Voici ${fetched.length} source(s) secondaire(s) (guidance pratique, notes techniques, recommandations). ` +
          `Pour chacune, si elle contient une précision utile sur l'application pratique de cette exigence ` +
          `(méthode de mesure, tolérance, exception courante, procédure), extrais un passage court reformulé. ` +
          `Ignore une source si elle n'apporte rien de pertinent à CETTE exigence précise.\n\n` +
          fetched.map((f, i) => `--- Source ${i} : ${f.source.name} ---\n${(f.text || '(document PDF joint)').slice(0, 15000)}`).join('\n\n')
        }
      ];
      for (const f of fetched) {
        if (f.pdfBase64) content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.pdfBase64 } });
      }

      const msg = await anthropic.messages.create({
        model: MODEL, max_tokens: 2000,
        system: `Réponds UNIQUEMENT en JSON: {"notes":[{"source_index": n, "note": "passage reformulé, en français", "source_ref": "section/page si identifiable"}]}. Tableau vide si rien de pertinent.`,
        messages: [{ role: 'user', content }]
      });
      let notes = [];
      try { notes = JSON.parse(msg.content.map(b => b.text || '').join('').match(/\{[\s\S]*\}/)[0]).notes || []; } catch {}

      const inserted = [];
      for (const n of notes) {
        const src = fetched[n.source_index]?.source;
        if (!src) continue;
        const { data: row, error } = await db.from('requirement_context').insert({
          requirement_id, context_source_id: src.id, note: n.note,
          source_ref: n.source_ref || null, source_url: src.url_human, requested_by
        }).select('*, context_sources(name, url_human)').single();
        if (!error) inserted.push(row);
      }
      return res.json({ results: inserted });
    }

    res.status(400).json({ error: 'action inconnue' });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
