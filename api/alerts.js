// Veille presse pro : récupère les flux RSS/Atom configurés, classe
// légèrement chaque nouvel article, et l'ajoute à `watch_alerts`.
// N'écrit JAMAIS dans `requirements` — c'est un flux à triager par
// la qualité, séparé de la matrice de conformité.
import { db, requireAdmin } from '../lib/db.js';
import { fetchFeed, hashOf, classifyArticle } from '../lib/press.js';

// Exportée pour être appelée depuis le bouton manuel (action=run) ET
// depuis /api/cron-weekly.js (le cron Vercel combine plusieurs jobs
// hebdo sous une seule entrée — le plan Hobby limite à 2 crons).
export async function runPressAlerts() {
  const { data: sources } = await db.from('press_sources').select('*').eq('active', true);
  const stats = { sources_checked: 0, new_items: 0, relevant: 0, errors: [] };

  for (const src of sources || []) {
    stats.sources_checked++;
    try {
      const items = await fetchFeed(src.feed_url);
      for (const item of items.slice(0, 30)) { // borne raisonnable par run
        const hash = hashOf(item.url);
        const { data: exists } = await db.from('watch_alerts')
          .select('id').eq('press_source_id', src.id).eq('content_hash', hash).maybeSingle();
        if (exists) continue;
        stats.new_items++;

        const cls = await classifyArticle({ title: item.title, summary: item.summary });
        if (!cls.relevant) continue;
        stats.relevant++;

        await db.from('watch_alerts').insert({
          press_source_id: src.id, title: item.title, article_url: item.url,
          published_at: item.publishedAt, summary: cls.summary || item.title,
          jurisdiction_guess: cls.jurisdiction_guess || src.jurisdiction_hint || null,
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
      return res.json(await runPressAlerts());
    }

    if (action === 'list') {
      let q = db.from('watch_alerts').select('*, press_sources(name, url_human)')
        .order('published_at', { ascending: false }).limit(200);
      for (const f of ['status', 'jurisdiction_guess', 'section_guess']) {
        if (req.query[f]) q = q.eq(f, req.query[f]);
      }
      const { data, error } = await q;
      if (error) throw error;
      return res.json(data);
    }

    if (action === 'review' && req.method === 'POST') {
      const { id, status, reviewed_by } = req.body; // status: reviewed | escalated | dismissed
      const { error } = await db.from('watch_alerts')
        .update({ status, reviewed_by, reviewed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    res.status(400).json({ error: 'action inconnue' });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
