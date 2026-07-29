-- ============================================================
-- VIGIE — Schéma additif v5 :
--   1) Nouvelle section 'pricing' (prix plancher / MUP)
--   2) Nouvelles juridictions IE (Irlande), US-CA (Californie —
--      pilote niveau État, pattern réplicable à d'autres États)
--   3) Suivi HORIZON : textes réglementaires PAS ENCORE en vigueur
--      (propositions, consultations). Même principe que watch_alerts
--      (presse) : n'écrit JAMAIS dans `requirements`. Alimente un
--      flux séparé que la qualité triage (nouveau / à suivre /
--      à intégrer comme vraie source / écarté).
-- Idempotent, à exécuter après schema_v4.sql.
-- ============================================================

INSERT INTO sections (id, label, sort_order) VALUES
  ('pricing', 'Prix plancher & commercialisation', 12)
ON CONFLICT (id) DO NOTHING;

INSERT INTO jurisdictions (code, name) VALUES
  ('IE', 'Irlande'),
  ('US-CA', 'États-Unis — Californie (pilote niveau État)')
ON CONFLICT (code) DO NOTHING;

-- ---------- HORIZON WATCH ----------

CREATE TABLE IF NOT EXISTS horizon_sources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction  TEXT REFERENCES jurisdictions(code),  -- NULL = transverse
  name          TEXT NOT NULL UNIQUE,
  fetcher       TEXT NOT NULL,              -- 'federalregister_proposed' | 'html' (usage manuel ciblé)
  fetch_config  JSONB NOT NULL,
  url_human     TEXT NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS horizon_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horizon_source_id UUID NOT NULL REFERENCES horizon_sources(id),
  title             TEXT NOT NULL,
  item_url          TEXT NOT NULL,
  stage             TEXT NOT NULL DEFAULT 'unknown'
                    CHECK (stage IN ('consultation','proposed_rule','adopted_not_in_force','unknown')),
  summary           TEXT,
  jurisdiction_guess TEXT,
  section_guess     TEXT REFERENCES sections(id),
  target_date       DATE,                   -- date d'entrée en vigueur annoncée, si connue (souvent renseignée manuellement à la revue)
  content_hash      TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','tracked','escalated','dismissed')),
  -- escalated = la qualité juge qu'une vraie source `sources` doit être
  -- créée/mise à jour en conséquence (jamais automatique)
  reviewed_by       TEXT,
  reviewed_at       TIMESTAMPTZ,
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (horizon_source_id, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_horizon_status ON horizon_items (status, target_date);
