-- Extension : France comme juridiction propre (en plus de l'UE), pour les
-- textes nationaux qui complètent le droit UE (mentions étiquetage
-- spécifiques France, dénominations réglementées type "château"/"clos"...).
-- Source vérifiée accessible sans clé API (contenu HTML direct, licence
-- ouverte DILA/Etalab, décret du 24/06/2014 sur la réutilisation libre).

INSERT INTO jurisdictions (code, name) VALUES ('FR', 'France')
ON CONFLICT (code) DO NOTHING;

INSERT INTO sources (jurisdiction, name, fetcher, fetch_config, url_human, license_note) VALUES
('FR', 'Décret 2012-655 — étiquetage & traçabilité vitivinicole (France)', 'html',
 '{"url":"https://www.legifrance.gouv.fr/loda/id/JORFTEXT000025804057"}',
 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000025804057',
 'Licence Ouverte Etalab (DILA, décret du 24/06/2014 sur la réutilisation des bases juridiques)')
ON CONFLICT (jurisdiction, name) DO NOTHING;
