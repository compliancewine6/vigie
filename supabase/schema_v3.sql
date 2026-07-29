-- ============================================================
-- VIGIE — Schéma additif v3 : robustesse de la couverture
-- réglementaire (taxes/accise, documents d'accompagnement) +
-- distinction analyse obligatoire vs simple seuil.
-- Idempotent, à exécuter après schema_v2.sql.
-- ============================================================

-- Nouvelle section : fiscalité (droits d'accise, TVA spécifique...).
-- Absente jusqu'ici — trou identifié dans la couverture.
INSERT INTO sections (id, label, sort_order) VALUES
  ('taxes', 'Fiscalité & droits d''accise', 11)
ON CONFLICT (id) DO NOTHING;

-- Distinction entre "seuil à ne pas dépasser" et "analyse à réaliser
-- obligatoirement et à documenter, quel que soit le résultat" (ex: TAV,
-- SO2 total, acidité volatile sont souvent des mentions obligatoires
-- sur le certificat d'analyse, indépendamment de tout dépassement).
-- NULL = non précisé par la source (ne pas présumer).
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS mandatory_test BOOLEAN;

COMMENT ON COLUMN requirements.mandatory_test IS
  'true = analyse/déclaration obligatoire à produire systématiquement (ex: certificat d''analyse) ; false = simple limite réglementaire ; NULL = non précisé par la source';

-- Vue de sortie : ré-créée pour exposer mandatory_test (identique à
-- schema.sql sinon, ordre des colonnes préservé pour compatibilité).
CREATE OR REPLACE VIEW v_requirements_table AS
SELECT r.id, r.origin, r.jurisdiction, r.client_id, c.name AS client_name,
       s.label AS section, s.sort_order,
       r.parameter, r.requirement, r.operator, r.limit_value, r.unit,
       r.applies_to, r.source_ref, r.source_url,
       COALESCE(src.name, d.normalized_filename) AS source_name,
       r.effective_date, r.status, r.confidence, r.mandatory_test
FROM requirements r
JOIN sections s ON s.id = r.section_id
LEFT JOIN clients c ON c.id = r.client_id
LEFT JOIN sources src ON src.id = r.source_id
LEFT JOIN client_documents d ON d.id = r.document_id
WHERE r.status = 'active';
