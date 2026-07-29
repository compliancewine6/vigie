-- Certifications privées/volontaires (IFS, BRCGS, FSSC 22000, Terra Vitis)
-- + Citeo Pro (interprétation pratique de l'obligation Triman).
--
-- Volontairement en context_sources, PAS en sources : ce ne sont pas des
-- obligations légales mais des référentiels de certification privés que
-- certains clients peuvent exiger contractuellement (auquel cas ça relève
-- de la veille CLIENT, pas de la veille pays). Les faire remonter
-- automatiquement dans la table de conformité pays laisserait croire à
-- une obligation légale généralisée qui n'existe pas. Consultées
-- uniquement à la demande (icône 🔍 sur une exigence déjà validée).
--
-- ISO 22000 volontairement écarté : norme payante, pas de texte en accès
-- libre depuis cet environnement (cf. docs/SOURCES.md).

INSERT INTO context_sources (jurisdiction, name, fetcher, fetch_config, url_human, category) VALUES
(NULL, 'IFS Food v8 — norme complète (PDF public)', 'pdf_url',
 '{"url":"https://www.ifs-certification.com/images/ifs_documents/IFS_Food_v8_standard_EN.pdf"}',
 'https://www.ifs-certification.com/images/ifs_documents/IFS_Food_v8_standard_EN.pdf', 'industry_guidance'),
(NULL, 'BRCGS Food Safety — aide et guidance', 'html',
 '{"url":"https://www.brcgs.com/our-standards/food-safety/help-and-guidance"}',
 'https://www.brcgs.com/our-standards/food-safety/help-and-guidance', 'industry_guidance'),
(NULL, 'FSSC 22000 v6 — documents du référentiel (accès libre)', 'html',
 '{"url":"https://www.fssc.com/fssc-22000/documents/fssc-22000-version-6/"}',
 'https://www.fssc.com/fssc-22000/documents/fssc-22000-version-6/', 'industry_guidance'),
('FR', 'Terra Vitis — FAQ & référentiel (fédération nationale)', 'html',
 '{"url":"https://terravitis.com/faq_foire_aux_questions/"}',
 'https://terravitis.com/faq_foire_aux_questions/', 'industry_guidance'),
('FR', 'Citeo Pro — obligations REP emballages professionnels', 'html',
 '{"url":"https://www.citeopro.com/metteurs-en-marche-demballages-professionnels/"}',
 'https://www.citeopro.com/metteurs-en-marche-demballages-professionnels/', 'industry_guidance')
ON CONFLICT (name) DO NOTHING;
