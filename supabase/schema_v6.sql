-- ============================================================
-- VIGIE — Schéma additif v6 : dimension "stade opérationnel".
-- Permet de trier/filtrer les exigences selon le moment où elles
-- s'appliquent dans le process (vrac, matières sèches, mise en
-- bouteille, analyses, logistique, administratif) — orthogonal aux
-- sections (analytique, étiquetage...) qui décrivent LE TYPE
-- d'exigence, pas QUAND elle s'applique opérationnellement.
-- Idempotent, à exécuter après schema_v5.sql.
-- ============================================================

ALTER TABLE requirements ADD COLUMN IF NOT EXISTS process_stage TEXT
  CHECK (process_stage IN ('vrac','matieres_seches','mise_en_bouteille','analyses','logistique','administratif'));

COMMENT ON COLUMN requirements.process_stage IS
  'Stade opérationnel où l''exigence s''applique concrètement : vrac (vinification/élevage/assemblage), matieres_seches (achat/contrôle bouteilles/bouchons/capsules/étiquettes/cartons), mise_en_bouteille (ligne d''embouteillage), analyses (labo/autocontrôles), logistique (stockage/transport/douane), administratif (fiscalité/certifications/RSE transverses). NULL = non déterminé par l''IA, à préciser en validation qualité si besoin.';

-- Vue de sortie : process_stage ajouté EN FIN de liste de colonnes.
-- Ne JAMAIS réordonner cette liste avec CREATE OR REPLACE VIEW (Postgres
-- refuse, erreur 42P16 déjà rencontrée sur schema_v4.sql) — seul un ajout
-- strictement en dernière position est toléré sans DROP + recréation de
-- get_country_client_matrix (qui dépend du type de retour de cette vue).
CREATE OR REPLACE VIEW v_requirements_table AS
SELECT r.id, r.origin, r.jurisdiction, r.client_id, c.name AS client_name,
       s.label AS section, s.sort_order,
       r.parameter, r.requirement, r.operator, r.limit_value, r.unit,
       r.applies_to, r.source_ref, r.source_url,
       COALESCE(src.name, d.normalized_filename, ap.name) AS source_name,
       r.effective_date, r.status, r.confidence, r.mandatory_test,
       r.appellation_id, ap.name AS appellation_name,
       r.process_stage
FROM requirements r
JOIN sections s ON s.id = r.section_id
LEFT JOIN clients c ON c.id = r.client_id
LEFT JOIN sources src ON src.id = r.source_id
LEFT JOIN client_documents d ON d.id = r.document_id
LEFT JOIN appellations ap ON ap.id = r.appellation_id
WHERE r.status = 'active';

CREATE INDEX IF NOT EXISTS idx_req_stage ON requirements (process_stage) WHERE process_stage IS NOT NULL;
