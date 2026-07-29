-- V5 : complète la cartographie de sources fournie par l'utilisateur
-- (IFS/BRCGS/FSSC22000/ISO22000/ISO9001 orientée SMQ). Textes de loi
-- manquants identifiés : indications géographiques UE 2024, réforme vin
-- UK 2024, guidance officielle import/douanes UK. Toutes vérifiées
-- accessibles depuis cet environnement avant intégration.

INSERT INTO sources (jurisdiction, name, fetcher, fetch_config, url_human, license_note) VALUES

-- === UE : réforme des indications géographiques (mai 2024) ===
('EU', 'Règl. (UE) 2024/1143 — IG vin/spiritueux/agroalimentaire (remplace 1151/2012, modifie 1308/2013)', 'eurlex',
 '{"celex":"32024R1143","lang":"FR"}',
 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1143', 'EUR-Lex réutilisation libre'),

-- === UK : réforme vin 2024 (interdiction "ice wine" hors définition, pratiques œno CPTPP) + guidance import/douanes ===
('UK', 'The Wine (Amendment) (England) Regulations 2024 (SI 2024/115)', 'uklegislation',
 '{"path":"uksi/2024/115"}', 'https://www.legislation.gov.uk/uksi/2024/115', 'OGL v3'),
('UK', 'GOV.UK — Importing and exporting wine (documents, VI-1, certification export)', 'html',
 '{"url":"https://www.gov.uk/government/publications/importing-and-exporting-wine/importing-and-exporting-wine"}',
 'https://www.gov.uk/government/publications/importing-and-exporting-wine/importing-and-exporting-wine', 'Open Government Licence v3'),
('UK', 'GOV.UK — Border Target Operating Model (contrôles sanitaires/phytosanitaires import)', 'html',
 '{"url":"https://www.gov.uk/government/publications/the-border-target-operating-model-august-2023"}',
 'https://www.gov.uk/government/publications/the-border-target-operating-model-august-2023', 'Open Government Licence v3'),
('UK', 'HSE — UK REACH (substances chimiques, produits de cave, biocides)', 'html',
 '{"url":"https://www.hse.gov.uk/reach/about.htm"}',
 'https://www.hse.gov.uk/reach/about.htm', 'Open Government Licence v3')

ON CONFLICT (jurisdiction, name) DO NOTHING;

-- La source USA "21 CFR Part 1 subpart L — FSVP" (seed_sources_v4.sql) couvre
-- déjà tout le Part 1 dans son fetch (fetcher ecfr récupère le titre entier
-- avant filtrage par l'IA) — donc la subpart S (FSMA Rule 204, traçabilité
-- renforcée) est déjà dans le texte analysé à chaque run. On renomme juste
-- pour que ce soit explicite dans l'interface, sans dupliquer le fetch.
UPDATE sources
SET name = '21 CFR Part 1 — FSVP (subpart L) & traçabilité renforcée FSMA Rule 204 (subpart S)'
WHERE jurisdiction = 'US' AND name = '21 CFR Part 1 subpart L — FSVP (importateurs)';
