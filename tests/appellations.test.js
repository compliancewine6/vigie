// Tests du parsing CSV appellations. Structure du CSV réel INAO non
// vérifiable depuis cet environnement (réseau restreint) : ces tests
// couvrent la logique de parsing/filtrage sur un CSV synthétique
// plausible (colonnes probables), pas une garantie sur les vraies
// colonnes — à revalider sur le premier run réel en production.
import { test } from 'node:test';
import assert from 'node:assert';
import { parseCsv, extractWineAppellations } from '../lib/appellations.js';

test('parseCsv gère le séparateur point-virgule et les guillemets', () => {
  const csv = 'Produit;Région;Type\n"Côtes du Rhône";Rhône;AOC\n"Pays d\'Oc";Languedoc;IGP';
  const { headers, rows } = parseCsv(csv);
  assert.deepStrictEqual(headers, ['produit', 'région', 'type']);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].produit, 'Côtes du Rhône');
  assert.strictEqual(rows[1].produit, "Pays d'Oc");
});

test('extractWineAppellations avec colonne secteur : exclut Loire/Alsace/non-vin, dédoublonne', () => {
  const csv = [
    'Produit;Région;Type;Secteur',
    'Côtes du Rhône;Vallée du Rhône;AOC;Vins',
    'Côtes du Rhône;Vallée du Rhône;AOC;Vins',        // doublon (plusieurs communes)
    'Sancerre;Val de Loire;AOC;Vins',                  // exclu (Loire)
    'Alsace Grand Cru;Alsace;AOC;Vins',                // exclu (Alsace)
    'Comté;Franche-Comté;AOP;Produits laitiers',       // exclu (secteur non-vin)
    "Pays d'Oc;Languedoc;IGP;Vins",
  ].join('\n');
  const { appellations, stats } = extractWineAppellations(csv);
  const names = appellations.map(a => a.name);
  assert.strictEqual(stats.filter_method, 'sector_column');
  assert.ok(names.includes('Côtes du Rhône'));
  assert.ok(names.includes("Pays d'Oc"));
  assert.ok(!names.includes('Sancerre'));
  assert.ok(!names.includes('Alsace Grand Cru'));
  assert.ok(!names.includes('Comté'));
  assert.strictEqual(appellations.filter(a => a.name === 'Côtes du Rhône').length, 1);
  assert.strictEqual(stats.excluded_region, 2);
  const rhone = appellations.find(a => a.name === 'Côtes du Rhône');
  assert.strictEqual(rhone.wine_type, 'AOC');
  const oc = appellations.find(a => a.name === "Pays d'Oc");
  assert.strictEqual(oc.wine_type, 'IGP');
});

test('extractWineAppellations sans colonne secteur : repli mots-clés, signalé non-fiable', () => {
  const csv = [
    'Produit;Région;Type',
    'Vin de Corse;Corse;AOC',
    'Comté;Franche-Comté;AOP',   // pas de colonne secteur -> ne peut PAS être filtré de façon fiable
  ].join('\n');
  const { appellations, stats } = extractWineAppellations(csv);
  assert.strictEqual(stats.filter_method, 'name_keyword_fallback_unreliable');
  assert.ok(appellations.map(a => a.name).includes('Vin de Corse'));
});
