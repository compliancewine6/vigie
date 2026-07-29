// Gestion des clients (veille client) : création, mise à jour, liste.
// Table `clients` volontairement vide au déploiement (données commerciales
// propres à AdVini, jamais présumées/seedées) — c'est cet endpoint qui
// permet de la peupler depuis l'interface plutôt qu'à la main en SQL.
import { db, requireAdmin } from '../lib/db.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  const action = req.query.action;

  try {
    if (action === 'list') {
      const { data, error } = await db.from('clients')
        .select('*, parent:parent_id(name)').order('name');
      if (error) throw error;
      return res.json(data);
    }

    if (action === 'create' && req.method === 'POST') {
      const { name, parent_id, country } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: 'nom requis' });
      const { data, error } = await db.from('clients')
        .insert({ name: name.trim(), parent_id: parent_id || null, country: country || null })
        .select().single();
      if (error) throw error;
      return res.json(data);
    }

    if (action === 'update' && req.method === 'POST') {
      const { id, name, parent_id, country, active } = req.body;
      if (!id) return res.status(400).json({ error: 'id requis' });
      const patch = {};
      if (name !== undefined) patch.name = name.trim();
      if (parent_id !== undefined) patch.parent_id = parent_id || null;
      if (country !== undefined) patch.country = country || null;
      if (active !== undefined) patch.active = active;
      const { data, error } = await db.from('clients').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return res.json(data);
    }

    res.status(400).json({ error: 'action inconnue' });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
