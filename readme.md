# Numismatic Explorer

A neutral-titled, ontology-first static website for GitHub Pages. RDF/Turtle files are the authoritative source; the Python build validates them and creates disposable JSON indexes for fast searching and faceted browsing.

## What this version does

- Reads every `.ttl` file below `data/ttl/` and finds each `nmo:NumismaticObject`.
- Merges descriptions of the same coin when they occur in several Turtle files.
- Preserves every URI and links controlled values back to Nomisma or the original linked resource.
- Uses Nomisma properties for authorities, stated authorities, issuers, mints, materials, denominations, manufacture, object type, collection, contexts, type-series items, reference works, shape, authenticity, weight standard, condition, production objects, portraits, iconography, and marks.
- Uses raw card-derived literals only as clearly marked fallback filter values when no controlled URI is present.
- Connects each coin to any number of METIS photograph resources through `data/coin_photos.csv`.
- Generates bookmarkable searches, responsive mobile filters, grid/list views, pagination, sorting, and CSV export.
- Publishes through the included GitHub Pages workflow.

Inventory-card images and card transcriptions are **not displayed publicly in this version**. They remain in the Turtle source and can still contribute searchable evidence or fallback facets.

## Available filters

The interface combines the most useful search patterns from OCRE, Seleucid Coins Online, RPC Online, and METIS:

- **Identification:** identifier/coin number, catalogue volume or number, title/name, object type, subtype, type series, and reference work.
- **Chronology:** date from/to, date appearing on the object, and period.
- **People and authority:** authority, stated authority, issuer, dynasty, reign/issue, person, magistrate, deity, and portrait.
- **Geography:** mint, region, city, province, conventus, alliance, area, site, and country.
- **Typology:** material, denomination, manufacture, shape, authenticity, and weight standard.
- **Faces:** separate obverse/reverse legend and type/design searches.
- **Iconography and marks:** iconography, symbol, monogram, symbol position, control mark, mint mark, and countermark.
- **Measurements:** from/to ranges for weight, diameter, axis, height, and width.
- **Context:** findspot, find context, immediate/local/landscape context, and collection.
- **Condition and production:** peculiarity, secondary treatment, wear, corrosion, production object, and die.
- **Record status:** photographs, review status, type-series attribution, measurements, face descriptions, corrected/added types, and additional specimens.

A filter only shows controlled values when those values actually occur in the current data. Text and range searches remain available even when the small demonstration dataset has no matching values yet.

## Photograph mapping

The active mapping file is:

```text
data/coin_photos.csv
```

The simplest accepted format is exactly two tab-separated columns without a header:

```text
COIN 2025 109    https://metis.ascsa.edu.gr/resource/cdf99ae9186ffbc2af391d37b95abdc7
COIN 2025 109    https://metis.ascsa.edu.gr/resource/3850451b05aae51b70f5097246410f36
```

Repeated identifiers create multiple photograph links. The parser accepts forms such as `COIN 2025 109`, `2025-109`, and `coin-2025-109`.

The URL is treated as a METIS **resource page**, not as a direct image file. The interface therefore reports the number of linked METIS images and opens the resource page. Optional direct-image data is already supported later:

```csv
coin_id,metis_url,side,image_url,label
COIN 2025 109,https://metis.ascsa.edu.gr/resource/...,obverse,https://.../image.jpg,Obverse
```

No side is inferred from row order.

## Add Turtle records

Place files anywhere beneath:

```text
data/ttl/
```

A minimal record is:

```turtle
@prefix nmo: <http://nomisma.org/ontology#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix corid: <https://example.org/corinth/id/> .

corid:coin-2025-109
    a nmo:NumismaticObject ;
    dcterms:identifier "2025-109" .
```

The project is pinned in `data/site.json` to Nomisma ontology version `http://nomisma.org/ontology/250402`.

## Build locally

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python scripts/build_data.py
python -m http.server 8000
```

Open `http://localhost:8000`. Do not open `index.html` directly because browsers block local JSON requests.

## Generated files

The build writes:

- `data/generated/coins.json`
- `data/generated/facets.json`
- `data/generated/schema.json`
- `data/generated/validation-report.json`

Edit Turtle and CSV sources, not generated JSON.

## GitHub Pages deployment

1. Copy the project into the repository.
2. Push to `main`.
3. In **Settings → Pages**, set **Source** to **GitHub Actions**.
4. The workflow validates the Turtle, rebuilds the indexes, and deploys the site.

The public title and subtitle are controlled in `data/site.json`; the title does not identify the collection informally.

## Repository structure

```text
.
├── index.html
├── record.html
├── ontology.html
├── assets/
├── data/
│   ├── ttl/
│   ├── coin_photos.csv
│   ├── site.json
│   └── generated/
├── scripts/build_data.py
└── .github/workflows/deploy.yml
```

## Design principle

The interface does not replace RDF with a private data model. The JSON layer is only a browser index. The record page exposes the underlying Nomisma properties and the controlled values retain their original URIs.
