-- ============================================================
-- VIGIE — Schéma additif v2 : veille presse pro + contexte à la
-- demande. À exécuter APRÈS schema.sql (et après seed_sources.sql
-- si déjà fait). Idempotent (IF NOT EXISTS partout).
--
-- Principe : ces deux ajouts n'écrivent JAMAIS dans `requirements`
-- automatiquement. La presse alimente un flux d'alertes séparé
-- (watch_alerts) que la qualité triage ; le contexte alimente une
-- table annexe (requirement_context) purement informative, jamais
-- utilisée pour juger de la conformité.
-- ============================================================

-- ---------- VEILLE PRESSE / PRO ----------

CREATE TABLE IF NOT EXISTS press_sources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,       -- ex: 'Vitisphere'
  category      TEXT NOT NULL CHECK (category IN ('trade_press','law_firm_blog','intergov','other')),
  feed_url      TEXT NOT NULL,              -- URL du flux RSS/Atom
  url_human     TEXT NOT NULL,              -- lien vers le site pour vérif manuelle
  jurisdiction_hint TEXT,                   -- indication a priori (peut être NULL = multi-zone)
  active        BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS watch_alerts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  press_source_id UUID NOT NULL REFERENCES press_sources(id),
  title          TEXT NOT NULL,
  article_url    TEXT NOT NULL,
  published_at   TIMESTAMPTZ,
  summary        TEXT,                      -- résumé court généré à l'ingestion
  jurisdiction_guess TEXT,                  -- suggestion IA, jamais certaine
  section_guess  TEXT REFERENCES sections(id),
  content_hash   TEXT NOT NULL,             -- dédoublonnage (hash du lien)
  status         TEXT NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new','reviewed','escalated','dismissed')),
  -- escalated = la qualité juge qu'une source officielle doit être
  -- vérifiée/ajoutée en conséquence de cet article
  reviewed_by    TEXT,
  reviewed_at    TIMESTAMPTZ,
  fetched_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (press_source_id, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON watch_alerts (status, published_at DESC);

-- ---------- CONTEXTE À LA DEMANDE ----------

-- Sources secondaires fixes par juridiction, consultées uniquement
-- sur clic (jamais en tâche de fond). Réplicable comme `sources`.
CREATE TABLE IF NOT EXISTS context_sources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction  TEXT REFERENCES jurisdictions(code),  -- NULL = transverse (OIV...)
  name          TEXT NOT NULL UNIQUE,
  fetcher       TEXT NOT NULL DEFAULT 'html',
  fetch_config  JSONB NOT NULL,             -- {"url": "..."}
  url_human     TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('technical_note','industry_guidance','case_law','intergov_recommendation','government_consultation')),
  active        BOOLEAN NOT NULL DEFAULT true
);

-- Notes de contexte rattachées à une exigence validée. Purement
-- informatif : n'affecte jamais le statut de conformité.
CREATE TABLE IF NOT EXISTS requirement_context (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  context_source_id UUID REFERENCES context_sources(id),
  note           TEXT NOT NULL,             -- passage/extrait pertinent, reformulé
  source_ref     TEXT,                      -- section/page dans la source secondaire
  source_url     TEXT NOT NULL,
  requested_by   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_context_req ON requirement_context (requirement_id);
