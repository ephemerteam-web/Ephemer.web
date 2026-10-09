// Génère un dossier local, jamais du SQL distant ni des types d'un schéma proposé.
import fs from 'node:fs'
import { createHash } from 'node:crypto'
const base = 'docs/evolution/lot-10B/'
const read = path => fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
const source = read(base + 'schema-propose.sql')
const bodies = new Map([...source.matchAll(/CREATE (?:OR REPLACE )?FUNCTION ([\w.]+)\([^]*?AS \$fn\$([^]*?)\$fn\$;/g)].map(m => [m[1].split('.').at(-1), { statement: m[0], hash: createHash('md5').update(m[2]).digest('hex') }]))
if (bodies.size !== 8) throw new Error('Fonctions 10B inattendues')
const old = read('docs/evolution/lot-10A/verification-lecture-seule.sql')
let catalogue = old.replace("schemaname='ephemer_social')<>7", "schemaname='ephemer_social')<>9")
  .replace("pronamespace='ephemer_social'::regnamespace)<>13", "pronamespace='ephemer_social'::regnamespace)<>17")
  .replace('5af7f37c9c3b92bf192fa4957fc4f0d3', bodies.get('identite').hash)
let fragment = read(base + 'catalogue-univers.sql')
fragment = fragment.replace(/__HASH_(\w+)__/g, (_, name) => { if (!bodies.has(name)) throw new Error(name); return bodies.get(name).hash })
catalogue = catalogue.replace("SELECT 'lot10a_catalogue_conforme' AS resultat;\nCOMMIT;", fragment + "\nSELECT 'lot10b_catalogue_conforme' AS resultat;\nCOMMIT;")
if (catalogue === old || catalogue.includes('__HASH_') || !catalogue.includes('lot10b_catalogue_conforme')) throw new Error('Assemblage incomplet')
const output = base + 'verification-lecture-seule.sql'
if (process.argv.includes('--check')) { if (read(output) !== catalogue) throw new Error('Catalogue à régénérer'); console.log('Catalogue 10A + 10B et 8 empreintes cohérents (contrôle local, SQL non compilé).') }
else { fs.writeFileSync(output, catalogue); console.log('Contrôle combiné préparé localement, aucun SQL exécuté.') }
