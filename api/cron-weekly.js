// Cron hebdomadaire combiné : presse pro + horizon watch. Un seul job
// Vercel Cron plutôt que deux (le plan Hobby limite à 2 crons — avec
// la veille pays mensuelle déjà en place, un 3e cron dédié dépasserait
// ce plafond). Les boutons manuels /api/alerts?action=run et
// /api/horizon?action=run restent disponibles séparément dans l'UI :
// ce n'est qu'un déclenchement HTTP, pas soumis à la limite de crons.
import { requireAdmin } from '../lib/db.js';
import { runPressAlerts } from './alerts.js';
import { runHorizonWatch } from './horizon.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  try {
    const [press, horizon] = await Promise.all([runPressAlerts(), runHorizonWatch()]);
    return res.json({ press, horizon });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
