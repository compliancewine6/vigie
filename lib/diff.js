// Diff extraction fraîche vs exigences actives. JAMAIS d'auto-merge :
// tout passe en pending_validation + change_log, la qualité valide.
import { db } from './db.js';

const keyOf = r => [r.section_id, (r.parameter||'').toLowerCase().trim(), (r.applies_to||'').toLowerCase().trim()].join('|');

export async function diffAndStage({ rows, origin, jurisdiction, clientId, appellationId, sourceId, documentId, sourceUrl, runId, replacesDocId }) {
  // Périmètre de comparaison :
  //  - pays : les exigences actives de la MÊME source
  //  - client + nouvelle version d'un doc : les exigences issues du doc remplacé
  //  - client + document inédit : toutes ses exigences actives, mais sans
  //    signaler de "removed" (un doc nouveau ne couvre pas tous les sujets)
  //  - appellation : les exigences actives de la MÊME appellation (un seul
  //    cahier des charges par appellation, donc comparable en entier)
  const q = db.from('requirements').select('*').eq('status', 'active').eq('origin', origin);
  if (origin === 'country') q.eq('jurisdiction', jurisdiction).eq('source_id', sourceId);
  else if (origin === 'appellation') q.eq('appellation_id', appellationId);
  else if (replacesDocId) q.eq('client_id', clientId).eq('document_id', replacesDocId);
  else q.eq('client_id', clientId);
  const detectRemoved = origin === 'country' || origin === 'appellation' || !!replacesDocId;
  const { data: current, error } = await q;
  if (error) throw error;

  const currentByKey = new Map(current.map(r => [keyOf(r), r]));
  const staged = { new: 0, modified: 0, removed: 0 };

  // Écritures groupées plutôt qu'une insertion + un change_log PAR ligne
  // (avant : jusqu'à 2×N allers-retours séquentiels vers Supabase — sur
  // un document de 27 exigences, c'était 54 requêtes l'une après l'autre,
  // cause principale de la lenteur constatée). Ici : 1 à 3 requêtes au total.
  const toInsert = [];   // lignes requirements à insérer
  const meta = [];        // { existing, row } aligné avec toInsert, même ordre

  for (const r of rows) {
    const existing = currentByKey.get(keyOf(r));
    currentByKey.delete(keyOf(r));
    const same = existing &&
      String(existing.limit_value) === String(r.limit_value ?? null) &&
      existing.operator === (r.operator ?? null) &&
      existing.requirement === r.requirement;
    if (same) continue;

    toInsert.push({
      origin, jurisdiction: jurisdiction ?? null, client_id: clientId ?? null,
      appellation_id: appellationId ?? null,
      section_id: r.section_id, parameter: r.parameter, requirement: r.requirement,
      operator: r.operator ?? null, limit_value: r.limit_value ?? null, unit: r.unit ?? null,
      applies_to: r.applies_to ?? null, source_id: sourceId ?? null, document_id: documentId ?? null,
      source_ref: r.source_ref || 'non précisé', source_url: sourceUrl ?? null,
      effective_date: r.effective_date ?? null, mandatory_test: r.mandatory_test ?? null,
      status: 'pending_validation'
    });
    meta.push({ existing, row: r });
  }

  if (toInsert.length) {
    const { data: ins, error: e2 } = await db.from('requirements').insert(toInsert).select('id');
    if (e2) throw e2;
    // Un seul INSERT multi-lignes -> Postgres retourne les id dans l'ordre
    // des VALUES fournies, donc alignable par index avec `meta`.
    const changeLogRows = ins.map((row, i) => ({
      run_id: runId ?? null, document_id: documentId ?? null, requirement_id: row.id,
      change_type: meta[i].existing ? 'modified' : 'new',
      diff: meta[i].existing ? { before: meta[i].existing, after: meta[i].row } : { after: meta[i].row }
    }));
    const { error: e3 } = await db.from('change_log').insert(changeLogRows);
    if (e3) throw e3;
    for (const m of meta) staged[m.existing ? 'modified' : 'new']++;
  }

  // Exigences actives plus présentes dans la nouvelle extraction -> signalées, pas supprimées
  if (!detectRemoved || !currentByKey.size) return staged;
  const removedRows = [...currentByKey.values()].map(orphan => ({
    run_id: runId ?? null, requirement_id: orphan.id,
    change_type: 'removed', diff: { before: orphan }
  }));
  const { error: e4 } = await db.from('change_log').insert(removedRows);
  if (e4) throw e4;
  staged.removed = removedRows.length;
  return staged;
}
