-- Sources de contexte/interprétation (consultées uniquement à la
-- demande, jamais en tâche de fond). Réplicable comme `sources`.

INSERT INTO context_sources (jurisdiction, name, fetcher, fetch_config, url_human, category) VALUES
('US', 'TTB — Circulaires vin (guidance pratique)', 'html', '{"url":"https://www.ttb.gov/wine/industry-circulars"}', 'https://www.ttb.gov/wine/industry-circulars', 'industry_guidance'),
('EU', 'INAO — Fiches produits & notes AOP/IGP', 'html', '{"url":"https://www.inao.gouv.fr/"}', 'https://www.inao.gouv.fr/', 'technical_note'),
(NULL, 'OIV — Code international des pratiques œnologiques', 'html', '{"url":"https://www.oiv.int/standards/international-code-of-oenological-practices"}', 'https://www.oiv.int/standards/international-code-of-oenological-practices', 'intergov_recommendation'),
-- Suivi des réformes/consultations en préparation (utile pour repérer les
-- changements à venir avant leur entrée en vigueur — cf. horizon watch)
('UK', 'DEFRA — Consultations en cours (dont réformes vin)', 'html', '{"url":"https://consult.defra.gov.uk/consultation_finder/"}', 'https://consult.defra.gov.uk/consultation_finder/', 'government_consultation')
ON CONFLICT (name) DO NOTHING;
