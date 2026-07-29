-- V4 : élargissement demandé par l'utilisateur suite au rapport
-- docs/SOURCES.md "sources à proposer" (juillet 2026) — intégration de
-- TOUTES les sources retenues (UE, USA, UK, REP France/UK, HVE) + la
-- réglementation bio UE (produits/substances autorisés).
--
-- Toutes vérifiées accessibles depuis cet environnement avant intégration.
-- Les certifications privées/volontaires (IFS, BRCGS, FSSC 22000, Terra
-- Vitis) ne sont PAS ici : elles vont dans context_sources (voir
-- seed_context_sources_v2.sql) car ce ne sont pas des obligations légales
-- mais des référentiels privés — les faire remonter automatiquement dans
-- la table de conformité pays laisserait croire à une obligation légale
-- qui n'en est pas une. HVE, en revanche, est un texte réglementaire
-- d'État (arrêté ministériel, JORF) : elle reste ici.

INSERT INTO sources (jurisdiction, name, fetcher, fetch_config, url_human, license_note) VALUES

-- === UE : trous comblés (déjà identifiés dans SOURCES.md, jamais seedés) + bio ===
('EU', 'Règl. 396/2005 — LMR pesticides', 'eurlex',
 '{"celex":"02005R0396","fallback_celex":"32005R0396","lang":"FR"}',
 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02005R0396', 'EUR-Lex réutilisation libre'),
('EU', 'Règl. 1935/2004 — matériaux au contact alimentaire', 'eurlex',
 '{"celex":"02004R1935","fallback_celex":"32004R1935","lang":"FR"}',
 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02004R1935', 'EUR-Lex réutilisation libre'),
('EU', 'Règl. 2025/40 — PPWR (emballages, applicable 12/08/2026)', 'eurlex',
 '{"celex":"32025R0040","lang":"FR"}',
 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32025R0040', 'EUR-Lex réutilisation libre'),
('EU', 'Règl. 2073/2005 — critères microbiologiques', 'eurlex',
 '{"celex":"02005R2073","fallback_celex":"32005R2073","lang":"FR"}',
 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02005R2073', 'EUR-Lex réutilisation libre'),
('EU', 'Règl. 2021/2117 — e-label ingrédients/nutrition', 'eurlex',
 '{"celex":"02021R2117","fallback_celex":"32021R2117","lang":"FR"}',
 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02021R2117', 'EUR-Lex réutilisation libre'),
('EU', 'Règl. d''exécution 2021/1165 — produits/substances autorisés en bio', 'eurlex',
 '{"celex":"02021R1165","fallback_celex":"32021R1165","lang":"FR"}',
 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02021R1165', 'EUR-Lex réutilisation libre'),

-- === USA : FDA (étiquetage + contact alimentaire), FSVP, Prop 65 ===
('US', '21 CFR Part 101 — étiquetage FDA', 'ecfr', '{"title":21,"part":"101"}',
 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101', 'Domaine public US'),
('US', '21 CFR Part 175 — contact alimentaire : adhésifs & revêtements', 'ecfr', '{"title":21,"part":"175"}',
 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-175', 'Domaine public US'),
('US', '21 CFR Part 176 — contact alimentaire : papier & carton', 'ecfr', '{"title":21,"part":"176"}',
 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-176', 'Domaine public US'),
('US', '21 CFR Part 177 — contact alimentaire : polymères', 'ecfr', '{"title":21,"part":"177"}',
 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-177', 'Domaine public US'),
('US', '21 CFR Part 178 — contact alimentaire : adjuvants', 'ecfr', '{"title":21,"part":"178"}',
 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-178', 'Domaine public US'),
('US', '21 CFR Part 1 subpart L — FSVP (importateurs)', 'ecfr', '{"title":21,"part":"1"}',
 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-1/subpart-L', 'Domaine public US'),
('US', 'OEHHA — Liste Proposition 65 (Californie)', 'html',
 '{"url":"https://oehha.ca.gov/proposition-65/proposition-65-list"}',
 'https://oehha.ca.gov/proposition-65/proposition-65-list', 'Page officielle État de Californie'),

-- === UK : contact alimentaire, poids/volumes, guidance FSA, REP ===
('UK', 'Materials and Articles in Contact with Food (England) Regulations 2012', 'uklegislation',
 '{"path":"uksi/2012/2619"}', 'https://www.legislation.gov.uk/uksi/2012/2619', 'OGL v3'),
('UK', 'Weights and Measures (Packaged Goods) Regulations 2006', 'uklegislation',
 '{"path":"uksi/2006/659"}', 'https://www.legislation.gov.uk/uksi/2006/659', 'OGL v3'),
('UK', 'FSA — Food contact materials regulations (guidance)', 'html',
 '{"url":"https://www.food.gov.uk/business-guidance/food-contact-materials-regulations"}',
 'https://www.food.gov.uk/business-guidance/food-contact-materials-regulations', 'Open Government Licence v3'),
('UK', 'FSA — Wine labelling (guidance)', 'html',
 '{"url":"https://www.food.gov.uk/business-guidance/wine-labelling"}',
 'https://www.food.gov.uk/business-guidance/wine-labelling', 'Open Government Licence v3'),
('UK', 'GOV.UK — Extended Producer Responsibility for packaging', 'html',
 '{"url":"https://www.gov.uk/guidance/extended-producer-responsibility-for-packaging-who-is-affected-and-what-to-do"}',
 'https://www.gov.uk/guidance/extended-producer-responsibility-for-packaging-who-is-affected-and-what-to-do', 'Open Government Licence v3'),

-- === France : REP (Triman), Haute Valeur Environnementale ===
('FR', 'Code de l''environnement, art. L541-9-3 — obligation Triman/info-tri', 'html',
 '{"url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041556010"}',
 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041556010', 'Licence Ouverte Etalab'),
('FR', 'Ministère écologie — FAQ Triman & info-tri (seuils de dérogation)', 'pdf_url',
 '{"url":"https://www.ecologie.gouv.fr/sites/default/files/documents/FAQ%20Triman%20et%20frises.pdf"}',
 'https://www.ecologie.gouv.fr/sites/default/files/documents/FAQ%20Triman%20et%20frises.pdf', 'Document public ministériel'),
('FR', 'Arrêté du 20 juin 2011 (modifié) — seuils de performance HVE', 'html',
 '{"url":"https://www.legifrance.gouv.fr/loda/id/JORFTEXT000024215064"}',
 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000024215064', 'Licence Ouverte Etalab')

ON CONFLICT (jurisdiction, name) DO NOTHING;
