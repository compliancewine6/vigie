-- Comble deux trous identifiés dans la couverture : fiscalité (droits
-- d'accise) et documents d'accompagnement de transport (e-AD/DAA/VI-1),
-- jusqu'ici absents ou noyés dans "documents" génériques.
-- Toutes vérifiées accessibles depuis cet environnement.

INSERT INTO sources (jurisdiction, name, fetcher, fetch_config, url_human, license_note) VALUES
-- === UE : fiscalité + documents d'accompagnement/registres ===
('EU', 'Directive 92/83/EEC — structures des droits d''accise sur l''alcool', 'eurlex',
 '{"celex":"01992L0083-20220101","fallback_celex":"31992L0083","lang":"FR"}',
 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:31992L0083', 'EUR-Lex réutilisation libre'),
('EU', 'Règl. délégué 2018/273 — documents d''accompagnement, registres viti-vinicoles', 'eurlex',
 '{"celex":"32018R0273","lang":"FR"}',
 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32018R0273', 'EUR-Lex réutilisation libre'),
('EU', 'Règl. d''exécution 2018/274 — modalités documents d''accompagnement', 'eurlex',
 '{"celex":"32018R0274","lang":"FR"}',
 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32018R0274', 'EUR-Lex réutilisation libre'),

-- === UK : fiscalité (réforme Alcohol Duty août 2023) ===
('UK', 'HMRC — Alcohol Duty (taux, structure, guidance détaillée)', 'html',
 '{"url":"https://www.gov.uk/government/collections/alcohol-duty-detailed-information"}',
 'https://www.gov.uk/government/collections/alcohol-duty-detailed-information', 'Open Government Licence v3'),

-- === USA : fiscalité (TTB, base légale 26 U.S.C. 5041) ===
('US', 'TTB — Guide des droits d''accise sur le vin', 'html',
 '{"url":"https://www.ttb.gov/taxes/tax-audit/quick-reference-guide-to-wine-excise-tax"}',
 'https://www.ttb.gov/taxes/tax-audit/quick-reference-guide-to-wine-excise-tax', 'Domaine public US'),

-- === France : fiscalité + documents d'accompagnement (application nationale) ===
('FR', 'DGDDI — Droits des alcools et boissons alcooliques', 'html',
 '{"url":"https://www.douane.gouv.fr/fiche/droits-des-alcools-et-boissons-alcooliques"}',
 'https://www.douane.gouv.fr/fiche/droits-des-alcools-et-boissons-alcooliques', 'Informations publiques DGDDI'),
('FR', 'DGDDI — Tenue des registres viti-vinicoles (documents d''accompagnement)', 'html',
 '{"url":"https://www.douane.gouv.fr/demarche/tenue-des-registres-viti-vinicoles"}',
 'https://www.douane.gouv.fr/demarche/tenue-des-registres-viti-vinicoles', 'Informations publiques DGDDI')
ON CONFLICT (jurisdiction, name) DO NOTHING;
