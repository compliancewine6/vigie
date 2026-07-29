// Suivi HORIZON (textes pas encore en vigueur). N'écrit JAMAIS dans
// `requirements` — flux à triager par la qualité (statuts : new,
// tracked = à surveiller, escalated = ajouter/màj une vraie source,
// dismissed).
import { db, requireAdmin } from '../lib/db.js';
import { fetchProposedRules, fetchConsultationPage, classifyHorizonItem, hashOf } from '../lib/horizon.js';

// Exportée pour être appelée depuis le bouton manuel (action=run) ET
// depuis /api/cron-weekly.js (cron Vercel combiné — plan Hobby limité
// à 2 crons).
export async function runHorizonWatch() {
  const { data: sources } = await db.from('horizon_sources').select('*').eq('active', true);
  const stats = { sources_checked: 0, new_items: 0, relevant: 0, errors: [] };

  for (const src of sources || []) {
    stats.sources_checked++;
    try {
      if (src.fetcher === 'federalregister_proposed') {
        const items = await fetchProposedRules(src.fetch_config);
        for (const item of items.slice(0, 30)) {
          const hash = hashOf(item.url);
          const { data: exists } = await db.from('horizon_items')
            .select('id').eq('horizon_source_id', src.id).eq('content_hash', hash).maybeSingle();
          if (exists) continue;
          stats.new_items++;
          const cls = await classifyHorizonItem({ title: item.title, summary: item.summary });
          if (!cls.relevant) continue;
          stats.relevant++;
          await db.from('horizon_items').insert({
            horizon_source_id: src.id, title: item.title, item_url: item.url,
            stage: cls.stage_guess || 'proposed_rule', summary: cls.summary || item.title,
            jurisdiction_guess: cls.jurisdiction_guess || src.jurisdiction || null,
            section_guess: cls.section_guess || null, content_hash: hash, status: 'new'
          });
        }
      } else if (src.fetcher === 'html') {
        const { text, url } = await fetchConsultationPage(src.fetch_config);
        const hash = hashOf(text);
        const { data: exists } = await db.from('horizon_items')
          .select('id').eq('horizon_source_id', src.id).eq('content_hash', hash).maybeSingle();
        if (exists) continue;
        stats.new_items++;
        const cls = await classifyHorizonItem({ title: src.name, summary: text.slice(0, 4000) });
        if (cls.relevant) stats.relevant++;
        await db.from('horizon_items').insert({
          horizon_source_id: src.id, title: `${src.name} — mise à jour détectée`, item_url: url,
          stage: cls.stage_guess || 'unknown', summary: cls.summary || src.name,
          jurisdiction_guess: cls.jurisdiction_guess || src.jurisdiction || null,
          section_guess: cls.section_guess || null, content_hash: hash, status: 'new'
        });
      }
    } catch (e) {
      stats.errors.push({ source: src.name, error: String(e.message || e) });
    }
  }
  return stats;
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  const action = req.query.action;

  try {
    if (action === 'run') {
      return res.json(await runHorizonWatch());
    }

    if (action === 'list') {
      let q = db.from('horizon_items').select('*, horizon_sources(name, url_human)')
        .order('target_date', { ascending: true, nullsFirst: false })
        .order('fetched_at', { ascending: false }).limit(200);
      for (const f of ['status', 'jurisdiction_guess', 'section_guess', 'stage']) {
        if (req.query[f]) q = q.eq(f, req.query[f]);
      }
      const { data, error } = await q;
      if (error) throw error;
      return res.json(data);
    }

    if (action === 'review' && req.method === 'POST') {
      const { id, status, reviewed_by, target_date } = req.body; // tracked | escalated | dismissed
      const patch = { status, reviewed_by, reviewed_at: new Date().toISOString() };
      if (target_date) patch.target_date = target_date;
      const { error } = await db.from('horizon_items').update(patch).eq('id', id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    res.status(400).json({ error: 'action inconnue' });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
