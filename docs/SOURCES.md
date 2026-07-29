# Catalogue des sources — Veille réglementaire pays

Principe : pour chaque juridiction, 1 source primaire officielle (texte de loi, avec API), des sources secondaires de recoupement, et un mécanisme officiel de détection de changement. Toutes les sources ci-dessous autorisent explicitement l'accès programmatique.

---

## Union Européenne

**Source primaire : EUR-Lex / CELLAR** — API REST + endpoint SPARQL.
Licence : réutilisation libre avec attribution (Décision 2011/833/UE). Accès machine officiel documenté.
- API REST CELLAR : récupération des textes (XML/HTML) par identifiant CELEX
- SPARQL : requêtes sur les métadonnées, dont les dates de modification → **détection de changement**

Textes suivis (par section) :

| CELEX | Texte | Sections couvertes |
|---|---|---|
| 32013R1308 | Règl. (UE) 1308/2013 — OCM unique | Définitions produits, pratiques (annexes VII-VIII) |
| 32019R0934 | Règl. délégué (UE) 2019/934 | Composés/additifs autorisés, limites analytiques (annexe I) |
| 32019R0033 | Règl. délégué (UE) 2019/33 | Étiquetage, mentions, AOP/IGP |
| 32019R0034 | Règl. d'exécution (UE) 2019/34 | Procédures étiquetage/AOP |
| 32011R1169 | Règl. (UE) 1169/2011 — INCO | Étiquetage, allergènes |
| 32021R2117 | Règl. (UE) 2021/2117 | Ingrédients + nutrition (e-label, oblig. depuis 12/2023) |
| 32005R0396 | Règl. (CE) 396/2005 | LMR pesticides (analytique) |
| 32023R0915 | Règl. (UE) 2023/915 — contaminants | Analytique (plomb, OTA...) |
| 32004R1935 | Règl. (CE) 1935/2004 | Packaging / contact alimentaire |
| 32005R2073 | Règl. (CE) 2073/2005 | Microbiologie |
| 32018R0848 | Règl. (UE) 2018/848 | Certifications bio |
| 32025R0040 | Règl. (UE) 2025/40 — PPWR | Packaging/emballages, REP |

**Secondaires** : pages vin DG AGRI, base LMR pesticides UE (interface dédiée), rapport FAIRS UE (USDA).

---

## Royaume-Uni

**Source primaire : legislation.gov.uk** — API REST (suffixe `/data.xml` sur toute page), formats XML/Akoma Ntoso/RDF.
Licence : Open Government Licence v3 — réutilisation libre.
**Détection de changement** : flux Atom officiels (nouvelle législation + "changes to legislation").

Textes suivis : droit UE assimilé (2019/33, 2019/934, 1308/2013 tels qu'amendés par les réformes vin 2023-2024), The Wine Regulations 2011 (SI 2011/2936), règl. 1169/2011 assimilé (FIC), Food Safety Act 1990, Materials and Articles in Contact with Food Regulations.

**Secondaires** : guidance gov.uk "wine trade regulations" et importation, Food Standards Agency, rapport FAIRS UK (USDA). Attention post-Brexit : divergences croissantes UE/UK (ex. réformes d'étiquetage 2023+), d'où l'importance du recoupement FAIRS.

---

## USA

**Source primaire : eCFR** — API officielle (`ecfr.gov/api/versioner/v1/`), XML/JSON par titre, avec **dates d'amendement par section** → détection de changement native (point-in-time).
Licence : domaine public (US federal works).

Parties suivies : 27 CFR Part 4 (étiquetage vin), Part 24 (pratiques cave, §24.246 matériaux autorisés), Part 13, Part 16 (health warning), Part 27 (imports) ; 21 CFR 101 (FDA étiquetage), 175-178 (contact alimentaire).

**Source complémentaire : Federal Register API** (`federalregister.gov/api/v1`) — règles proposées/finales TTB & FDA, domaine public, idéal pour capter les changements *avant* codification dans le CFR.

**Secondaires** : TTB.gov (rulings, industry circulars, COLA), FDA, Californie Prop 65 (liste OEHHA), FSVP/FSMA pour importateurs.

---

## France (juridiction propre, en complément de l'UE)

**Source : Légifrance / JORF** — pages HTML directement accessibles (pas de mur d'inscription pour la lecture, contrairement à l'API PISTE qui nécessite un compte). Licence Ouverte Etalab (réutilisation libre, décret DILA du 24/06/2014).

Texte suivi : Décret n° 2012-655 du 4 mai 2012 — étiquetage et traçabilité des produits vitivinicoles, dénominations réglementées ("château", "clos", "cru"...), spécifique au droit français en complément du droit UE. Vérifié accessible et à jour (dernière modification listée : 13/12/2014, version en vigueur consultée le jour de l'intégration).

Extension future possible : Code rural et de la pêche maritime, Livre VI (production/marchés), plus large mais moins ciblé — à ajouter si besoin d'une couverture plus complète du droit vitivinicole français.

**Écarté après vérification** : govinfo.gov / GPO (bulk data CFR + Federal Register) — API confirmée fonctionnelle mais redondante avec eCFR + Federal Register déjà intégrés, qui offrent un accès plus direct (JSON/versioning). Pas d'intérêt à dupliquer.

## Fiscalité & documents d'accompagnement (comblent deux angles morts identifiés)

Sections dédiées `taxes` et distinction explicite des documents de transport dans `documents` :

- **UE** — Directive 92/83/EEC (structures des droits d'accise sur l'alcool, EUR-Lex, consolidée), Règl. délégué 2018/273 + Règl. d'exécution 2018/274 (documents d'accompagnement e-AD/DAA, registres viti-vinicoles obligatoires, EUR-Lex).
- **UK** — HMRC, collection "Alcohol Duty: detailed information" (taux et structure post-réforme du 1er août 2023, OGL v3).
- **USA** — TTB, "Quick Reference Guide to Wine Excise Tax" (base légale 26 U.S.C. § 5041, domaine public).
- **France** — DGDDI, "Droits des alcools et boissons alcooliques" et "Tenue des registres viti-vinicoles" (application nationale des documents d'accompagnement UE, informations publiques).

## Appellations (AOC/IGP) — 3e niveau de veille

**Source de la liste :** jeu de données officiel INAO "Aires et produits AOC/AOP et IGP" sur data.gouv.fr (licence ouverte, mis à jour octobre 2025, URL stable). Périmètre V1 : vin uniquement, toutes régions françaises **hors Loire et Alsace**, AOC et IGP.

**Limite honnête :** je n'ai pas pu inspecter les colonnes exactes du CSV depuis cet environnement (accès réseau restreint côté sandbox, pas d'exécution JS pour l'explorateur data.gouv.fr). Le code de filtrage (`lib/appellations.js`) détecte dynamiquement une colonne "secteur/filière" si présente (filtrage fiable) et se rabat sinon sur des mots-clés positifs dans le nom du produit (moins fiable, signalé explicitement dans l'interface — `filter_method: name_keyword_fallback_unreliable`). À vérifier sur le premier run réel en production.

**Source du cahier des charges par appellation :** hébergé en PDF sur `extranet.inao.gouv.fr` (motif d'URL non standardisé d'une appellation à l'autre — vérifié sur l'exemple Côtes du Rhône). Le registre européen eAmbrosia (`ec.europa.eu/geographical-indications-register`) est la source faisant autorité au niveau UE mais son API publique n'a pas pu être documentée depuis cet environnement (page technique sans contrat exposé). **Aucun lien n'est deviné automatiquement** : chaque appellation synchronisée reste en statut `pending_link` jusqu'à confirmation humaine du lien exact (onglet Appellations), avant toute extraction.

## Sources transverses (toutes juridictions)

- **USDA FAS — rapports FAIRS/GAIN** : rapport annuel par pays sur les règles d'import alimentaire (étiquetage, packaging, additifs). PDF publics, téléchargement direct (`apps.fas.usda.gov/newgainapi`). Excellent recoupement, et source principale pour les futurs pays difficiles (Japon, Chine).
- **OIV** : Recueil des pratiques œnologiques + limites analytiques internationales, mis à jour annuellement. Référence de recoupement pour la section analytique.

## Réplicabilité pays suivants

Le modèle par juridiction = `{sources: [{type, config}], change_detection}` en config DB, pas en dur. Ajouter un pays = ajouter des lignes sources + éventuellement un fetcher si le format est nouveau. Canada : Justice Laws + CFIA (accès ouvert). Japon/Chine : FAIRS d'abord, sources primaires ensuite.

## Conformité d'accès

| Source | Base légale d'accès |
|---|---|
| EUR-Lex/CELLAR | Décision 2011/833/UE, réutilisation libre avec attribution |
| legislation.gov.uk | Open Government Licence v3 |
| eCFR / Federal Register | Domaine public US |
| USDA FAS GAIN | Publications publiques US |
| OIV | Documents publics, citation requise |

Cadence mensuelle + à la demande : volumes très faibles (quelques dizaines de requêtes/mois), aucun enjeu de rate-limiting.

## Sources de veille presse / pro (flux d'alertes, séparé de la conformité)

Vérifiées et actives : **Vitisphere** (RSS confirmé, `vitisphere.com/index.php?mode=rss`), **Libation Law Blog** (RSS confirmé, `libationlawblog.com/feed/`).

Candidats identifiés mais URL de flux RSS non confirmée depuis cet environnement (page trouvée mais lien du flux non exposé dans le contenu récupéré, ou site sans flux dédié détecté) — à vérifier manuellement avant ajout dans `press_sources` : Decanter (page RSS existe : `decanter.com/wine-news/rss-feeds-53839/`, mais URL exacte du flux non extraite), The Drinks Business, Stoel Rives Alcohol Beverage Blog (`alcoholicbeverageslawblog.com`), Meininger's Wine Business International, Réussir Vigne. Principe : mieux vaut ne pas seeder une URL devinée qui pourrait pointer vers rien.

## Sources de contexte / interprétation (à la demande uniquement)

TTB — Circulaires vin (`ttb.gov/wine/industry-circulars`), INAO (`inao.gouv.fr`), OIV — Code international des pratiques œnologiques (`oiv.int/standards/international-code-of-oenological-practices`), DEFRA — moteur de consultations en cours (`consult.defra.gov.uk/consultation_finder/`, utile pour repérer les réformes vin en préparation avant leur entrée en vigueur). Jamais consultées automatiquement, uniquement au clic sur une exigence déjà validée.

## V4 — élargissement juillet 2026 (intégré)

Suite au rapport de sources proposées, intégration complète sauf ISO 22000.

**Nouvelles sources `sources` (compliance-driving), toutes vérifiées accessibles :**

- **UE** : Règl. 396/2005 (LMR pesticides), 1935/2004 (contact alimentaire), 2025/40 PPWR (emballages, applicable 12/08/2026), 2073/2005 (microbiologie), 2021/2117 (e-label), Règl. d'exéc. 2021/1165 (produits/substances autorisés en bio — complète le Règl. 2018/848 déjà suivi).
- **USA** : 21 CFR Part 101 (FDA étiquetage), Parts 175-178 (contact alimentaire : adhésifs, papier/carton, polymères, adjuvants), Part 1 subpart L (FSVP importateurs), OEHHA Proposition 65 (Californie, page officielle de l'État).
- **UK** : Materials and Articles in Contact with Food (England) Regulations 2012, Weights and Measures (Packaged Goods) Regulations 2006, FSA guidance (contact alimentaire + étiquetage vin), GOV.UK — Extended Producer Responsibility for packaging.
- **France** : Code de l'environnement art. L541-9-3 (obligation Triman/info-tri), FAQ ministérielle Triman (seuils de dérogation par surface d'emballage), Arrêté du 20 juin 2011 modifié (seuils de performance environnementale HVE — texte réglementaire d'État, JORF).

**Nouvelles sources `context_sources` (informatif, jamais dans la matrice de conformité) :** IFS Food v8 (norme complète, PDF public), BRCGS Food Safety (aide et guidance), FSSC 22000 v6 (documents du référentiel, accès libre), Terra Vitis (FAQ/référentiel fédération), Citeo Pro (interprétation pratique de l'obligation REP emballages pro).

**Principe appliqué** : IFS/BRCGS/FSSC 22000/Terra Vitis sont des référentiels de certification **privés et volontaires**, pas des obligations légales — les intégrer dans `sources` laisserait croire à tort qu'un client donné doit obligatoirement les respecter. Si un client impose l'une de ces certifications, c'est une exigence contractuelle qui doit remonter via la veille CLIENT (dépôt de son cahier des charges), pas via la veille pays. HVE fait exception : c'est un texte réglementaire d'État (arrêté ministériel publié au JORF), donc bien une source `sources`.

**Écarté** : ISO 22000 — norme payante, aucun texte en accès libre identifiable depuis cet environnement. Non intégrable sans achat de la norme par l'utilisateur.

## V5 — cartographie SMQ (IFS/BRCGS/FSSC22000/ISO) fournie par l'utilisateur (intégré)

Recoupement avec la cartographie exhaustive fournie (cadre international, UE, UK, USA) : la grande majorité était déjà couverte par V1-V4. Manques réels comblés :

**Nouvelles sources `sources` (compliance-driving) :**
- **UE** : Règl. (UE) 2024/1143 — réforme des indications géographiques vin/spiritueux/agroalimentaire (applicable depuis le 13/05/2024, remplace 1151/2012, modifie 1308/2013).
- **UK** : The Wine (Amendment) (England) Regulations 2024 (SI 2024/115 — interdiction du terme "ice wine" hors définition stricte, mise à jour pratiques œno pour conformité CPTPP), GOV.UK guidance officielle import/export vin (VI-1, certification export), GOV.UK Border Target Operating Model (contrôles sanitaires import post-Brexit), HSE UK REACH (substances chimiques/biocides de cave).
- **USA** : pas de nouvelle source — la FSMA Rule 204 (traçabilité renforcée, 21 CFR Part 1 subpart S) est déjà couverte par le fetch existant de la source FSVP (même Part 1 récupéré en entier) ; la source a été renommée pour le rendre explicite dans l'interface.

**Nouvelles sources `context_sources` (informatif, à la demande) :**
- **Agences techniques/risque UE** : EFSA (contaminants/pesticides/additifs), RASFF/Safety Gate (alertes rapides), ECHA (REACH, substances chimiques).
- **Intergouvernemental** : Codex Alimentarius FAO/OMS (GSFA, LMR).
- **Organismes professionnels** : CEEV, COPA-COGECA, EFOW (UE) ; WSTA, WineGB (UK) ; Wine Institute, WineAmerica, US Wine Trade Alliance (USA).

**Principe appliqué (identique à V4)** : les organismes professionnels/syndicaux publient des positions et guides d'interprétation, pas des textes opposables — ils vont en `context_sources`, jamais dans la matrice de conformité automatique.

**Non intégré, explicitement écarté ou hors périmètre V1 :**
- **FIVS — base Abridge** : payante/réservée aux membres, pas de source ouverte.
- **Presse spécialisée additionnelle** (Harpers Wine & Spirit, WineBusiness.com, Just Drinks, Shanken News Daily, Beverage Daily, Revue des Œnologues, Agra Facts/Europe) : existence confirmée mais **aucune URL de flux RSS trouvée et vérifiée** depuis cet environnement — même principe que Decanter/The Drinks Business (cf. section presse V1) : mieux vaut ne rien seeder qu'une URL devinée. À vérifier manuellement avant ajout à `press_sources`.
- **NABCA / State ABC Boards (réglementation État par État aux USA)** : chaque État a son propre organe de contrôle (Control States vs License States) — periemètre potentiellement énorme (50 juridictions). Hors périmètre V1 (fédéral TTB/FDA uniquement) ; extension possible État par État sur le même modèle que l'ajout d'un pays.
- **TTB base COLA (Certificate of Label Approval)** : outil de soumission/recherche d'étiquettes approuvées, pas un texte de loi — utile comme outil opérationnel pour le client mais ne produit pas d'exigences à extraire.
- **FDF (Food and Drink Federation, UK)** : périmètre généraliste (tout l'agroalimentaire, pas spécifique vin) — écarté au profit de WSTA/WineGB plus ciblés.

## V6 — comble les 6 trous identifiés lors de l'audit de couverture (intégré)

### 1. Suivi horizon (textes pas encore en vigueur)

Nouveau sous-système (`horizon_sources`/`horizon_items`, `lib/horizon.js`, `api/horizon.js`, onglet "Horizon"). Même principe que la veille presse : n'écrit jamais dans `requirements`, la qualité triage (à surveiller / à intégrer comme vraie source / ignoré).

Portée V1 volontairement restreinte au **Federal Register US** (TTB + FDA, filtre `PROPOSED_RULE`, cf. `seed_horizon_sources.sql`) : c'est la seule source qui offre une API structurée et fiable pour isoler "concerne le vin + pas encore en vigueur" depuis cet environnement. DEFRA "consultation finder" (797 procédures tous secteurs) et EU "Have your say" ont été testés en fetch direct : les pages sont bien accessibles, mais sans filtre fiable interrogeable pour isoler le vin — les suivre en hash-diff produirait un bruit constant (toute modification parmi ~800 procédures déclenche une alerte) plutôt qu'un signal utile. Ils restent en `context_sources` (vérification manuelle au clic). Le mécanisme supporte un fetcher `html` pour une URL ciblée qu'un humain identifierait plus tard (ex: une procédure EUR-Lex précise une fois repérée).

### 2. Irlande — étiquetage sanitaire dérogatoire

Nouvelle juridiction `IE`. Source : S.I. No. 249/2023 — Public Health (Alcohol) (Labelling) Regulations 2023 (irishstatutebook.ie, licence eISB). Mise en application reportée à septembre 2028 mais texte déjà en vigueur légalement — l'extraction doit faire remonter la date d'application telle qu'annoncée par la source, pas présumer une obligation immédiate.

### 3. Dévolution UK

Ajout des équivalents Écosse/Galles/Irlande du Nord du texte anglais déjà suivi (Materials and Articles in Contact with Food) : `wsi/2012/2705` (Galles), `ssi/2012/318` (Écosse), `nisr/2012/384` (Irlande du Nord) — tous sous la juridiction `UK` existante (pas de sous-juridictions par nation, choix de simplicité — un client vendant au UK reçoit les 4 textes).

### 4. Prix plancher (Minimum Unit Pricing)

Nouvelle section `pricing`. Écosse : Alcohol (Minimum Price per Unit) (Scotland) Amendment Order 2024, 65p/unité (`ssi/2024/128`). Galles : Public Health (Minimum Price for Alcohol) (Wales) Act 2018 (`anaw/2018/5`) + Continuation Regulations 2026 (`wsi/2026/30`, 65p/unité dès le 01/10/2026). Ces textes conditionnent la vente dans ces deux nations — jamais suivis jusqu'ici.

### 5. USA niveau État — pilote Californie

Nouvelle juridiction `US-CA`. Source : California Alcoholic Beverage Control Act (texte officiel, PDF `abc.ca.gov`). **Limite honnête** : le California Code of Regulations Title 4 (les règlements d'application, pas juste la loi-cadre) n'a pas de portail officiel gratuit unique identifié depuis cet environnement (accès habituel via Westlaw, payant) — seul le texte de loi (Act) est intégré. Pattern réplicable à d'autres États sur le même modèle qu'un nouveau pays ; les 49 autres États (dont la distinction Control States/License States gérée par la NABCA) restent hors périmètre V1, chantier potentiellement lourd (50 juridictions).

### 6. Transverse

- **France — consigne verre** : Loi AGEC (2020-105), art. 66 (légifrance). Cadre habilitant, pas une obligation généralisée à ce stade (dispositifs de consigne déployés sur base volontaire/régionale) — l'extraction doit refléter cette nuance plutôt que présumer une obligation.
- **UE — CSRD** : Directive (UE) 2022/2464, reporting durabilité (section `rse`), pertinent pour un groupe de la taille d'AdVini.

### Hors périmètre, confirmé non un oubli

Nouveaux pays hors UE/UK/USA/France (Canada, Japon, Chine...) : c'était le périmètre V1 validé dès le lancement du projet, pas un trou de couverture.
