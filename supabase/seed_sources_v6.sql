-- V6 : comble les trous identifiés lors de l'audit de couverture
-- (juillet 2026) — Irlande (étiquetage sanitaire dérogatoire UE),
-- dévolution UK (Ecosse/Galles/Irlande du Nord), prix plancher (MUP),
-- pilote niveau État USA (Californie), transverse (consigne verre
-- France, reporting durabilité CSRD). Toutes vérifiées accessibles
-- depuis cet environnement avant intégration. À exécuter après
-- schema_v5.sql (sections/juridictions IE, US-CA doivent exister).

INSERT INTO sources (jurisdiction, name, fetcher, fetch_config, url_human, license_note) VALUES

-- === Irlande : étiquetage sanitaire dérogatoire (calories, grammes
-- d'alcool, avertissements grossesse/cancer) — mise en application
-- reportée à septembre 2028 mais texte déjà en vigueur légalement ===
('IE', 'S.I. No. 249/2023 — Public Health (Alcohol) (Labelling) Regulations 2023', 'html',
 '{"url":"https://www.irishstatutebook.ie/eli/2023/si/249/made/en/print"}',
 'https://www.irishstatutebook.ie/eli/2023/si/249/made/en/print', 'Licence eISB (Office of the Attorney General)'),

-- === UK : dévolution — contact alimentaire Ecosse/Galles/Irlande du
-- Nord (équivalents du texte anglais déjà suivi, textes distincts) ===
('UK', 'Materials and Articles in Contact with Food (Wales) Regulations 2012', 'uklegislation',
 '{"path":"wsi/2012/2705"}', 'https://www.legislation.gov.uk/wsi/2012/2705', 'OGL v3'),
('UK', 'Materials and Articles in Contact with Food (Scotland) Regulations 2012', 'uklegislation',
 '{"path":"ssi/2012/318"}', 'https://www.legislation.gov.uk/ssi/2012/318', 'OGL v3'),
('UK', 'Materials and Articles in Contact with Food Regulations (Northern Ireland) 2012', 'uklegislation',
 '{"path":"nisr/2012/384"}', 'https://www.legislation.gov.uk/nisr/2012/384', 'OGL v3'),

-- === UK : prix plancher (Minimum Unit Pricing) Ecosse & Galles —
-- conditionne la vente dans ces deux nations, jamais suivi jusqu'ici ===
('UK', 'Alcohol (Minimum Price per Unit) (Scotland) Amendment Order 2024 — 65p/unité', 'uklegislation',
 '{"path":"ssi/2024/128"}', 'https://www.legislation.gov.uk/ssi/2024/128', 'OGL v3'),
('UK', 'Public Health (Minimum Price for Alcohol) (Wales) Act 2018', 'uklegislation',
 '{"path":"anaw/2018/5"}', 'https://www.legislation.gov.uk/anaw/2018/5', 'OGL v3'),
('UK', 'Public Health (Minimum Price for Alcohol) (Wales) Act 2018 (Continuation) Regulations 2026 — 65p/unité dès 01/10/2026', 'uklegislation',
 '{"path":"wsi/2026/30"}', 'https://www.legislation.gov.uk/wsi/2026/30', 'OGL v3'),

-- === USA : pilote niveau État — Californie (déjà couverte pour Prop65 ;
-- ajout du texte-cadre ABC). Pattern réplicable à d'autres États sur le
-- même modèle qu'un nouveau pays (cf. docs/SOURCES.md). ===
('US-CA', 'California Alcoholic Beverage Control Act (texte officiel ABC)', 'pdf_url',
 '{"url":"https://www.abc.ca.gov/wp-content/uploads/2023-CA-ABC-Act.pdf"}',
 'https://www.abc.ca.gov/wp-content/uploads/2023-CA-ABC-Act.pdf', 'Document officiel California Dept. of Alcoholic Beverage Control'),

-- === France : consigne réemploi/recyclage verre (cadre habilitant,
-- pas encore une obligation généralisée — l'extraction doit refléter
-- cette nuance, pas la présumer obligatoire) ===
('FR', 'Loi AGEC (2020-105), art. 66 — dispositifs de consigne emballages', 'html',
 '{"url":"https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000041553831"}',
 'https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000041553831', 'Licence Ouverte Etalab'),

-- === UE : CSRD — reporting durabilité (section RSE), pertinent pour
-- un groupe de la taille d'AdVini ===
('EU', 'Directive (UE) 2022/2464 — CSRD (reporting durabilité)', 'eurlex',
 '{"celex":"02022L2464-20250417","fallback_celex":"32022L2464","lang":"FR"}',
 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022L2464', 'EUR-Lex réutilisation libre')

ON CONFLICT (jurisdiction, name) DO NOTHING;
