-- Complète les sources de contexte avec les organismes intergouvernementaux,
-- agences techniques UE et associations professionnelles identifiées dans
-- la cartographie fournie par l'utilisateur. Toujours à la demande
-- uniquement (icône 🔍), jamais utilisées pour juger de la conformité —
-- ce sont soit des agences d'évaluation de risque (pas des textes de loi
-- opposables), soit des organismes professionnels/syndicaux (position,
-- pas obligation légale).

INSERT INTO context_sources (jurisdiction, name, fetcher, fetch_config, url_human, category) VALUES
(NULL, 'Codex Alimentarius (FAO/OMS) — GSFA, additifs, LMR', 'html',
 '{"url":"https://www.fao.org/fao-who-codexalimentarius"}',
 'https://www.fao.org/fao-who-codexalimentarius', 'intergov_recommendation'),
('EU', 'EFSA — données contaminants, pesticides, additifs', 'html',
 '{"url":"https://www.efsa.europa.eu/en/data/data-reports"}',
 'https://www.efsa.europa.eu/en/data/data-reports', 'technical_note'),
('EU', 'RASFF / Safety Gate — alertes rapides denrées alimentaires', 'html',
 '{"url":"https://food.ec.europa.eu/food-safety/rasff_en"}',
 'https://food.ec.europa.eu/food-safety/rasff_en', 'technical_note'),
('EU', 'ECHA — substances chimiques, biocides (REACH)', 'html',
 '{"url":"https://echa.europa.eu/"}',
 'https://echa.europa.eu/', 'technical_note'),
('EU', 'CEEV — Comité européen des entreprises vins (guides interprétation)', 'html',
 '{"url":"https://www.ceev.eu/"}',
 'https://www.ceev.eu/', 'industry_guidance'),
('EU', 'COPA-COGECA — Agriculteurs européens (politique agricole, impact PAC)', 'html',
 '{"url":"https://www.copa-cogeca.eu/"}',
 'https://www.copa-cogeca.eu/', 'industry_guidance'),
('EU', 'EFOW — European Federation of Origin Wines (AOP/IGP)', 'html',
 '{"url":"https://efow.eu/"}',
 'https://efow.eu/', 'industry_guidance'),
('UK', 'WSTA — Wine and Spirit Trade Association', 'html',
 '{"url":"https://wsta.co.uk/"}',
 'https://wsta.co.uk/', 'industry_guidance'),
('UK', 'WineGB — Wines of Great Britain', 'html',
 '{"url":"https://winegb.co.uk/"}',
 'https://winegb.co.uk/', 'industry_guidance'),
('US', 'Wine Institute (Californie) — répertoire réglementations par État', 'html',
 '{"url":"https://wineinstitute.org/"}',
 'https://wineinstitute.org/', 'industry_guidance'),
('US', 'WineAmerica — association nationale des vignerons US', 'html',
 '{"url":"https://wineamerica.org/"}',
 'https://wineamerica.org/', 'industry_guidance'),
('US', 'US Wine Trade Alliance (USWTA) — politique tarifaire, douanes', 'html',
 '{"url":"https://winetradealliance.org/"}',
 'https://winetradealliance.org/', 'industry_guidance')
ON CONFLICT (name) DO NOTHING;
