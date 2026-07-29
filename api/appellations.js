// 3e niveau de veille : appellations (AOC/IGP). Sync de la liste depuis
// l'INAO, puis lien du cahier des charges confirmé par un humain avant
// toute extraction — jamais de lien deviné/auto-activé.
import { db, requireAdmin } from '../lib/db.js';
import { fetchAppellationsDataset, extractWineAppellations } from '../lib/appellations.js';
import { extractFromPdf, extractFromText } from '../lib/extract.js';
import { diffAndStage } from '../lib/diff.js';
import crypto from 'node:crypto';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  const action = req.query.action;

  try {
    // 1) Synchronise la liste (ne touche jamais aux CDC/extraction)
    if (action === 'sync') {
      const { data: run } = await db.from('appellation_sync_runs').insert({}).select().single();
      const csv = await fetchAppellationsDataset();
      const { appellations, stats, unmapped_columns } = extractWineAppellations(csv);

      let created = 0, already = 0;
      for (const a of appellations) {
        const { data: existing } = await db.from('appellations').select('id').eq('name', a.name).maybeSingle();
        if (existing) { already++; continue; }
        await db.from('appellations').insert({
          name: a.name, region: a.region || null, wine_type: a.wine_type, status: 'pending_link'
        });
        created++;
      }
      const fullStats = { ...stats, created, already_known: already, unmapped_columns };
      await db.from('appellation_sync_runs').update({
        finished_at: new Date().toISOString(), status: 'done', stats: fullStats
      }).eq('id', run.id);
      return res.json(fullStats);
    }

    // 2) Liste des appellations (filtrable par statut)
    if (action === 'list') {
      let q = db.from('appellations').select('*').order('name');
      if (req.query.status) q = q.eq('status', req.query.status);
      const { data, error } = await q;
      if (error) throw error;
      return res.json(data);
    }

    // 3) Confirmation humaine du lien vers le cahier des charges —
    // c'est le SEUL moyen d'activer une appellation, jamais automatique.
    if (action === 'set_cdc' && req.method === 'POST') {
      const { id, cdc_url } = req.body;
      if (!cdc_url) return res.status(400).json({ error: 'cdc_url requis' });
      const { data, error } = await db.from('appellations').update({
        cdc_url, cdc_source_verified: true, status: 'active', updated_at: new Date().toISOString()
      }).eq('id', id).select().single();
      if (error) throw error;
      return res.json(data);
    }

    if (action === 'exclude' && req.method === 'POST') {
      const { id, notes } = req.body;
      const { error } = await db.from('appellations').update({ status: 'excluded', notes }).eq('id', id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    // 4) Extraction du cahier des charges (une fois le lien confirmé)
    if (action === 'extract' && req.method === 'POST') {
      const { id } = req.body;
      const { data: ap, error: e1 } = await db.from('appellations').select('*').eq('id', id).single();
      if (e1 || !ap) return res.status(404).json({ error: 'appellation introuvable' });
      if (!ap.cdc_source_verified || !ap.cdc_url) {
        return res.status(400).json({ error: 'lien du cahier des charges non confirmé' });
      }

      const r = await fetch(ap.cdc_url, { headers: { 'User-Agent': 'VigieWineCompliance/1.0' } });
      if (!r.ok) return res.status(502).json({ error: `HTTP ${r.status} en récupérant le cahier des charges` });
      const ct = r.headers.get('content-type') || '';
      const isPdf = ct.includes('pdf') || ap.cdc_url.toLowerCase().endsWith('.pdf');
      const buf = Buffer.from(await r.arrayBuffer());
      const hash = crypto.createHash('sha256').update(buf).digest('hex');

      const { data: prev } = await db.from('appellation_snapshots')
        .select('content_hash').eq('appellation_id', id).order('fetched_at', { ascending: false }).limit(1);
      const changed = !prev?.length || prev[0].content_hash !== hash;
      await db.from('appellation_snapshots').insert({ appellation_id: id, content_hash: hash, changed });
      if (!changed) return res.json({ changed: false, message: 'Cahier des charges inchangé depuis le dernier passage.' });

      const note = `Cahier des charges de l'appellation "${ap.name}" (${ap.wine_type}) — ${ap.cdc_url}`;
      const rows = isPdf
        ? await extractFromPdf(buf.toString('base64'), note)
        : await extractFromText(buf.toString('utf8'), note);
      const staged = await diffAndStage({
        rows, origin: 'appellation', appellationId: id, sourceUrl: ap.cdc_url, runId: null
      });
      return res.json({ changed: true, extracted: rows.length, staged });
    }

    if (action === 'runs') {
      const { data } = await db.from('appellation_sync_runs').select('*').order('started_at', { ascending: false }).limit(10);
      return res.json(data);
    }

    res.status(400).json({ error: 'action inconnue' });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
