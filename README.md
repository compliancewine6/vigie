# Vigie — Veille réglementaire vin (standalone)

Outil autonome (hors écosystème Clos) à deux onglets :

1. **Veille pays** — récupération automatique des textes officiels (UE, UK, USA en V1), extraction IA en table d'exigences triée par section, sources citées ligne par ligne. Mise à jour le 1er de chaque mois (cron Vercel) + bouton "lancer maintenant".
2. **Veille client** — dépôt manuel de documents (PDF, Excel, Word, CSV…) : classification IA, renommage cohérent `{CLIENT}_{type}_{libellé}_{date}_v{N}`, versionnage (V2 archive V1, jamais de suppression), date de mise en application, extraction en table au même format.

Outils croisés : **couple pays × client** (tout ce qu'il faut respecter) et **comparateur** 2-3 cibles (2 pays, 1 client dans 2 pays, 2 clients dans 1 pays…), différences surlignées.

**Appellations** — 3e niveau de veille, en plus de pays et client : cahiers des charges AOC/IGP (France, hors Loire/Alsace en V1). Liste synchronisée depuis le jeu de données officiel INAO (data.gouv.fr, licence ouverte), mais le lien exact vers chaque cahier des charges doit être **confirmé manuellement** avant toute extraction — jamais deviné ni auto-activé. Une fois confirmé, fonctionne comme les autres sources (hash de changement, extraction, validation qualité, consultable via la table par appellation).

Deux onglets complémentaires :
- **Alertes presse** — flux RSS de presse pro/juridique (Vitisphere, Libation Law Blog...), classées légèrement par IA (pertinent ou non, pays/section probables). N'écrit jamais dans la matrice de conformité : la qualité triage (traité / à vérifier officiellement / ignoré). Vérification hebdomadaire automatique + bouton manuel.
- **Contexte à la demande** (icône 🔍 sur une exigence validée) — va chercher dans des sources secondaires fixes par juridiction (TTB circulaires, INAO, OIV) des précisions pratiques sur une exigence déjà validée. Toujours cité, jamais utilisé pour juger de la conformité, déclenché uniquement au clic (coût token nul sinon).
- **Horizon** (textes pas encore en vigueur) — suit les propositions/consultations en préparation (Federal Register US, filtre `PROPOSED_RULE` — seule source avec une API fiable pour isoler "vin + pas encore en vigueur" depuis cet environnement ; DEFRA/EU Have Your Say restent en contexte à la demande, portails trop génériques pour un suivi automatique fiable). N'écrit jamais dans la matrice de conformité : la qualité triage (à surveiller / à intégrer comme vraie source dès l'entrée en vigueur / ignoré). Vérification hebdomadaire automatique + bouton manuel.

Principe économique : le LLM n'intervient **qu'à l'ingestion** (et seulement si la source a changé — hash). La consultation est du SQL pur, coût zéro.

Workflow qualité : scan IA → proposition → **validation humaine** → consultable. Rien ne devient actif tout seul.

## Déploiement (une fois)

1. **Supabase** : créer un nouveau projet (séparé de Clos) →
   - SQL Editor : exécuter dans l'ordre `supabase/schema.sql`, `supabase/seed_sources.sql`, `supabase/seed_pilot.sql`, `supabase/schema_v2.sql`, `supabase/seed_press_sources.sql`, `supabase/seed_context_sources.sql`, `supabase/seed_sources_fr.sql`, `supabase/schema_v3.sql`, `supabase/seed_sources_v3.sql`, `supabase/schema_v4.sql`, `supabase/seed_sources_v4.sql`, `supabase/seed_context_sources_v2.sql`, `supabase/seed_sources_v5.sql`, `supabase/seed_context_sources_v3.sql`, `supabase/schema_v5.sql`, `supabase/seed_horizon_sources.sql`, `supabase/seed_sources_v6.sql`, `supabase/schema_v6.sql`
   - Storage : créer 2 buckets privés `snapshots` et `client-docs`
2. **GitHub** : nouveau repo, pousser ce dossier.
3. **Vercel** : importer le repo, variables d'environnement :
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (service role)
   - `ANTHROPIC_API_KEY`
   - `ADMIN_KEY` (clé d'accès à l'interface, à choisir)
   - optionnel `EXTRACT_MODEL` (défaut `claude-sonnet-4-5`)
4. Premier run : ouvrir l'app, saisir la clé admin, onglet Veille pays → "Lancer la veille maintenant" pour chaque juridiction, puis valider dans l'onglet Validation qualité.

## Ajouter un pays

Aucun code si le format de source est déjà géré : `INSERT INTO jurisdictions...` + lignes dans `sources` avec le bon `fetcher` (`eurlex`, `uklegislation`, `ecfr`, `federalregister`, `pdf_url` — ce dernier couvre les rapports FAIRS/GAIN de l'USDA, voie d'entrée pour Canada/Japon/Chine). Voir `docs/SOURCES.md`.

## Coûts de run estimés

- Consultation : 0 (SQL).
- Veille mensuelle : extraction uniquement sur sources modifiées ; mois calme ≈ 0-2 $, refresh complet des 15 sources ≈ 5-15 $ de tokens.
- Dépôt d'un CDC client de 80 pages ≈ 1-3 $.
- Supabase + Vercel : paliers gratuits suffisants au départ.

Le "refresh à la demande payant" (V2 monétisation) est trivial à brancher : l'endpoint `POST /api/watch?trigger=manual` est déjà séparé du cron.

## Filtre qualité d'extraction + stade opérationnel (`schema_v6.sql`)

Le prompt d'extraction (`lib/extract.js`) applique désormais un filtre obligatoire à 2 questions avant de créer une ligne d'exigence : (1) ça s'applique au vin et ce n'est pas automatiquement respecté (ex: un ingrédient jamais utilisé en vinification ne compte pas), et (2) ça implique une action concrète des équipes (document à produire, analyse à faire, ingrédient/matière sèche à utiliser ou proscrire, mention d'étiquette, seuil chiffré) — un principe générique sans traduction opérationnelle est ignoré. Objectif : moins de lignes, mais toutes actionnables et vérifiables.

Chaque exigence porte aussi un `process_stage` (vrac / matieres_seches / mise_en_bouteille / analyses / logistique / administratif), orthogonal à la section (qui décrit le TYPE d'exigence) — il décrit QUAND/OÙ elle s'applique dans le process. Filtrable dans les onglets Veille pays, Veille client et Couple pays × client, et affiché en badge coloré partout (y compris Validation qualité).

## Structure

- `supabase/schema.sql` — schéma complet commenté (socle commun : table `requirements` unique pour les 2 origines)
- `supabase/seed_sources.sql` — sources officielles V1 (licences vérifiées, cf. `docs/SOURCES.md`)
- `supabase/schema_v2.sql` — alertes presse + contexte à la demande (tables additives, jamais liées à la conformité)
- `supabase/seed_press_sources.sql` / `seed_context_sources.sql` — flux RSS et sources secondaires vérifiés
- `lib/fetchers.js` — un fetcher par format de source (inclut `html` générique pour les sources de contexte)
- `lib/extract.js` — extraction structurée Claude (chunking, PDF natif, classification docs)
- `lib/diff.js` — diff vs existant, staging en validation (pas d'auto-merge)
- `lib/press.js` — parsing RSS/Atom, dédoublonnage, classification légère
- `lib/appellations.js` — sync CSV INAO (data.gouv.fr), filtrage vin + exclusion régions, parsing défensif
- `api/appellations.js` — sync liste, confirmation manuelle du lien cahier des charges, extraction
- `api/watch.js` — pipeline veille pays (cron mensuel + manuel)
- `api/documents.js` — pipeline veille client (upload, tri, renommage, versions, bibliothèque)
- `api/alerts.js` — veille presse pro (cron hebdomadaire + manuel), flux de triage qualité
- `api/context.js` — recherche de contexte à la demande sur une exigence validée
- `lib/horizon.js` / `api/horizon.js` — suivi horizon (textes pas encore en vigueur), même principe que la presse
- `api/cron-weekly.js` — combine presse + horizon sous un seul cron Vercel (plan Hobby limité à 2 crons)
- `api/query.js` — consultation, couple, comparateur
- `api/validate.js` — workflow de validation qualité
- `public/index.html` — interface complète (8 onglets)

## Limite de crons (plan Vercel Hobby)

Le plan Hobby limite à 2 cron jobs. `vercel.json` n'en déclare que 2 : la veille pays mensuelle (`/api/watch`) et un job hebdomadaire combiné (`/api/cron-weekly`) qui lance presse + horizon. Si tu passes sur un plan Pro et veux les séparer, `api/alerts.js` et `api/horizon.js` exposent chacun `action=run` indépendamment.
