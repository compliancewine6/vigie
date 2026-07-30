// Veille client : dépôt manuel de documents (pdf, xlsx, docx, csv, txt...).
// Flux : upload_url -> le navigateur pousse le fichier dans Storage -> process.
// process = classification IA + renommage cohérent + versionnage (archive V1)
//           + extraction des exigences -> pending_validation.
import { db, requireAdmin } from '../lib/db.js';
import { extractFromText, extractFromPdf, classifyDocument } from '../lib/extract.js';
import { diffAndStage } from '../lib/diff.js';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

async function fileToText(buf, mime, name) {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'docx') return (await mammoth.extractRawText({ buffer: buf })).value;
  if (['xlsx', 'xls', 'csv', 'tsv'].includes(ext)) {
    const wb = XLSX.read(buf, { type: 'buffer' });
    return wb.SheetNames.map(n => `--- Feuille: ${n} ---\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join('\n\n');
  }
  if (['txt', 'md', 'html'].includes(ext)) return buf.toString('utf8');
  return null; // pdf et autres -> traités en binaire par Claude
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  const action = req.query.action;

  // 1) URL signée pour upload direct navigateur -> Storage (pas de limite proxy)
  if (action === 'upload_url') {
    const { filename } = req.body;
    const path = `incoming/${Date.now()}_${filename.replace(/[^\w.\-]/g, '_')}`;
    const { data, error } = await db.storage.from('client-docs').createSignedUploadUrl(path);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ path, token: data.token, signedUrl: data.signedUrl });
  }

  // 2) Traitement après upload
  if (action === 'process') {
    const { client_id, storage_path, original_filename, replaces_id, effective_date_override } = req.body;
    const { data: client } = await db.from('clients').select('*').eq('id', client_id).single();
    if (!client) return res.status(400).json({ error: 'client inconnu' });

    const { data: blob, error: dlErr } = await db.storage.from('client-docs').download(storage_path);
    if (dlErr) return res.status(500).json({ error: dlErr.message });
    const buf = Buffer.from(await blob.arrayBuffer());
    const ext = original_filename.split('.').pop().toLowerCase();
    const text = await fileToText(buf, null, original_filename);

    // Classification (type + date d'application + libellé court)
    const cls = await classifyDocument(text ? text : `(PDF binaire, ${buf.length} octets)`, original_filename);
    const effective = effective_date_override || cls.effective_date || null;

    // Versionnage : nouvelle version = archive de la précédente
    let version = 1;
    if (replaces_id) {
      const { data: prev } = await db.from('client_documents').select('version').eq('id', replaces_id).single();
      version = (prev?.version || 0) + 1;
    }
    const clientSlug = client.name.replace(/[^\w]/g, '-').replace(/-+/g, '-');
    const normalized = `${clientSlug}_${cls.doc_type}_${cls.short_label}_${effective || 'sans-date'}_v${version}.${ext}`;
    const finalPath = `library/${clientSlug}/${normalized}`;
    await db.storage.from('client-docs').move(storage_path, finalPath);

    const { data: doc, error: insErr } = await db.from('client_documents').insert({
      client_id, original_filename, normalized_filename: normalized,
      doc_type: cls.doc_type, version, replaces_id: replaces_id || null,
      status: 'processing', effective_date: effective, storage_path: finalPath, mime: ext
    }).select().single();
    if (insErr) return res.status(500).json({ error: insErr.message });

    // Extraction des exigences
    try {
      const note = `Cahier des charges / document qualité du client "${client.name}" (${normalized})`;
      const { rows, diagnostics } = ext === 'pdf'
        ? await extractFromPdf(buf.toString('base64'), note)
        : await extractFromText(text || '(document vide)', note);
      const staged = await diffAndStage({
        rows, origin: 'client', clientId: client_id, documentId: doc.id,
        replacesDocId: replaces_id || null, runId: null
      });
      await db.from('client_documents').update({
        status: 'pending_validation',
        extraction_meta: { rows: rows.length, ...staged, diagnostics }
      }).eq('id', doc.id);
      if (replaces_id) await db.from('client_documents').update({ status: 'archived' }).eq('id', replaces_id);
      return res.json({ document: doc.id, normalized, extracted: rows.length, staged, diagnostics });
    } catch (e) {
      await db.from('client_documents').update({ status: 'processing', extraction_meta: { error: String(e) } }).eq('id', doc.id);
      return res.status(500).json({ error: String(e.message || e), document: doc.id });
    }
  }

  // 3) Bibliothèque consultable (filtres : client, type, statut, dates)
  if (action === 'library') {
    let q = db.from('client_documents')
      .select('*, clients(name)').order('uploaded_at', { ascending: false });
    for (const f of ['client_id', 'doc_type', 'status']) if (req.query[f]) q = q.eq(f, req.query[f]);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // 4) Lien de téléchargement d'un doc source
  if (action === 'download') {
    const { data: doc } = await db.from('client_documents').select('storage_path').eq('id', req.query.id).single();
    const { data } = await db.storage.from('client-docs').createSignedUrl(doc.storage_path, 3600);
    return res.json({ url: data.signedUrl });
  }

  // 5) Archiver un document (statut seul, ne touche à aucune exigence —
  // réversible en pratique via un nouveau dépôt "remplace ce document")
  if (action === 'archive' && req.method === 'POST') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id requis' });
    const { error } = await db.from('client_documents').update({ status: 'archived' }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ archived: id });
  }

  // 6) Suppression complète d'un document — irréversible, contrairement à
  // l'archivage. Bloquée si des exigences ISSUES de ce document sont déjà
  // 'active' (validées, en vigueur) : on ne perd jamais silencieusement une
  // exigence de conformité en vigueur, cf. principe "jamais d'auto-merge/
  // auto-suppression" appliqué partout ailleurs dans l'outil. Dans ce cas,
  // il faut d'abord rejeter/dévalider ces exigences, ou archiver le document.
  if (action === 'delete' && req.method === 'POST') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id requis' });
    const { data: doc, error: eDoc } = await db.from('client_documents').select('*').eq('id', id).single();
    if (eDoc || !doc) return res.status(404).json({ error: 'document introuvable' });

    const { count: activeCount, error: eCount } = await db.from('requirements')
      .select('id', { count: 'exact', head: true }).eq('document_id', id).eq('status', 'active');
    if (eCount) return res.status(500).json({ error: eCount.message });
    if (activeCount > 0) {
      return res.status(400).json({
        error: `Suppression impossible : ${activeCount} exigence(s) validée(s)/active(s) sont issues de ce document. ` +
          `Rejette-les d'abord dans Validation qualité, ou archive le document au lieu de le supprimer.`
      });
    }

    // Exigences non actives (pending_validation, rejected, superseded) issues
    // de ce doc -> supprimées avec lui (change_log associé part en cascade
    // via la FK requirement_id ON DELETE CASCADE).
    const { error: eReq } = await db.from('requirements').delete().eq('document_id', id);
    if (eReq) return res.status(500).json({ error: eReq.message });
    // Lignes de change_log qui référencent le document mais pas (ou plus)
    // une exigence précise (ex: entrée 'removed' sans requirement_id).
    await db.from('change_log').delete().eq('document_id', id).is('requirement_id', null);
    // Une version plus récente qui "remplace" ce document ne doit pas
    // pointer vers un id supprimé.
    await db.from('client_documents').update({ replaces_id: null }).eq('replaces_id', id);

    await db.storage.from('client-docs').remove([doc.storage_path]);
    const { error: eDel } = await db.from('client_documents').delete().eq('id', id);
    if (eDel) return res.status(500).json({ error: eDel.message });
    return res.json({ deleted: id });
  }

  res.status(400).json({ error: 'action inconnue' });
}
