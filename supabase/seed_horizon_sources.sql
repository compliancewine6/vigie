-- Sources horizon V1 : Federal Register US uniquement (TTB + FDA),
-- filtrées sur les règles PROPOSÉES (pas encore finales). Seule source
-- avec une API fiable pour isoler "vin + pas encore en vigueur" depuis
-- cet environnement — cf. lib/horizon.js pour le raisonnement complet
-- sur pourquoi DEFRA/EU Have Your Say ne sont pas ici.

INSERT INTO horizon_sources (jurisdiction, name, fetcher, fetch_config, url_human) VALUES
('US', 'Federal Register — propositions TTB (pas encore finales)', 'federalregister_proposed',
 '{"agency":"alcohol-tobacco-tax-and-trade-bureau","sinceDays":120}',
 'https://www.federalregister.gov/agencies/alcohol-tobacco-tax-and-trade-bureau'),
('US', 'Federal Register — propositions FDA (pas encore finales)', 'federalregister_proposed',
 '{"agency":"food-and-drug-administration","sinceDays":120}',
 'https://www.federalregister.gov/agencies/food-and-drug-administration')
ON CONFLICT (name) DO NOTHING;
