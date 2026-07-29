-- ============================================================
-- VIGIE — Schéma additif v4 : dimension APPELLATION (3e niveau
-- de veille, en plus de pays et client) — cahiers des charges
-- AOC/AOP/IGP. Idempotent, à exécuter après schema_v3.sql.
--
-- Principe : ~300+ appellations en France (hors Loire/Alsace,
-- AOC+IGP vin), impossible à pré-charger en dur de façon fiable.
-- Mécanisme : sync automatique de la liste (source INAO/data.gouv.fr,
-- licence ouverte) -> statut 'pending_link' -> la qualité confirme/
-- colle le lien exact du cahier des charges (assistance, pas de lien
-- deviné) -> extraction -> validation qualité comme les autres
-- origines. Jamais de source auto-activée sans ce passage.
-- ============================================================

CREATE TABLE IF NOT EXISTS appellations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  region        TEXT,                       -- tel que trouvé dans le CSV source
  wine_type     TEXT CHECK (wine_type IN ('AOC','IGP')),
  cdc_url       TEXT,                       -- lien vers le cahier des charges (rempli manuellement ou par lookup)
  cdc_source_verified BOOLEAN NOT NULL DEFAULT false,  -- true seulement après confirmation humaine du lien
  status        TEXT NOT NULL DEFAULT 'pending_link'
                CHECK (status IN ('pending_link','active','excluded')),
  notes         TEXT,
  synced_from   TEXT DEFAULT 'inao_datagouv',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appellation_sync_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','done','failed')),
  stats         JSONB
);

-- Suivi de changement du cahier des charges (même logique que
-- source_snapshots, une fois le lien confirmé)
CREATE TABLE IF NOT EXISTS appellation_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appellation_id   UUID NOT NULL REFERENCES appellations(id),
  fetched_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  content_hash     TEXT NOT NULL,
  changed          BOOLEAN NOT NULL
);

-- Extension de requirements : 3e origine possible. Les contraintes CHECK
-- d'origine (schema.sql) sont anonymes -> nom auto-généré par Postgres,
-- donc on les retrouve dynamiquement plutôt que de deviner un nom.
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS appellation_id UUID REFERENCES appellations(id);

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'requirements'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%origin%'
  LOOP
    EXECUTE format('ALTER TABLE requirements DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE requirements ADD CONSTRAINT requirements_origin_check
  CHECK (origin IN ('country','client','appellation'));

ALTER TABLE requirements ADD CONSTRAINT requirements_scope_check
  CHECK ( (origin='country'     AND jurisdiction   IS NOT NULL)
       OR (origin='client'      AND client_id      IS NOT NULL)
       OR (origin='appellation' AND appellation_id IS NOT NULL) );

CREATE INDEX IF NOT EXISTS idx_req_appellation ON requirements (appellation_id) WHERE appellation_id IS NOT NULL;

-- Vue de sortie : ajoute le nom d'appellation. IMPORTANT : avec CREATE OR
-- REPLACE VIEW, Postgres interdit de réordonner/insérer des colonnes au
-- milieu d'une vue existante (erreur 42P16) — seul un ajout strictement
-- en fin de liste est toléré. On garde donc l'ORDRE EXACT de schema_v3.sql
-- pour toutes les colonnes existantes, et on ajoute appellation_id /
-- appellation_name tout à la fin. Ne pas réordonner cette liste plus tard
-- sans passer par DROP VIEW ... CASCADE + recréation de
-- get_country_client_matrix (qui dépend du type de retour de cette vue).
CREATE OR REPLACE VIEW v_requirements_table AS
SELECT r.id, r.origin, r.jurisdiction, r.client_id, c.name AS client_name,
       s.label AS section, s.sort_order,
       r.parameter, r.requirement, r.operator, r.limit_value, r.unit,
       r.applies_to, r.source_ref, r.source_url,
       COALESCE(src.name, d.normalized_filename, ap.name) AS source_name,
       r.effective_date, r.status, r.confidence, r.mandatory_test,
       r.appellation_id, ap.name AS appellation_name
FROM requirements r
JOIN sections s ON s.id = r.section_id
LEFT JOIN clients c ON c.id = r.client_id
LEFT JOIN sources src ON src.id = r.source_id
LEFT JOIN client_documents d ON d.id = r.document_id
LEFT JOIN appellations ap ON ap.id = r.appellation_id
WHERE r.status = 'active';
