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
- Uses a restrained blue research-catalogue palette and places the obverse/reverse photograph beside the corresponding description and legend within each result card.

Inventory-card images and card transcriptions are **not displayed publicly in this version**. They remain in the Turtle source and can still contribute searchable evidence or fallback facets.

## Available filters

The interface includes every search field present in the supplied Numismatics.org/OCRE advanced-search page, while retaining the additional archaeological and collection filters required by this project.

- **Keyword:** one global search across all indexed fields.
- **People and organizations:** authority, deity, dynasty, issuer, portrait, and state; plus stated authority, reign/issue, person, and magistrate.
- **Places:** place search and mint; plus region, city, province, conventus, alliance, area, site, and country.
- **Typology and chronology:** denomination, manufacture, material, object type, date from/to, date on object, period, shape, authenticity, and weight standard.
- **Obverse and reverse:** separate obverse legend, reverse legend, obverse type, reverse type, and all-iconography searches.
- **Symbols:** obverse symbol at any position; reverse symbol at any position; reverse letter; officina mark; exergue; symbol text and position; control mark, mint mark, and countermark.
- **Measurements:** from/to ranges for weight, diameter, axis, height, and width.
- **Excavation notebooks:** notebook as a multiple-choice facet, notebook page from/to, and complete-reference text search.
- **Context:** findspot, find context, immediate/local/landscape context, and collection.
- **Condition and production:** peculiarity, secondary treatment, wear, corrosion, production object, and die.
- **Record status:** photographs, review status, type-series attribution, measurements, face descriptions, corrected/added types, and additional specimens.

Facet headings remain visible even when the demonstration dataset has no indexed values, making the full search model clear before the complete corpus is added.

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

Repeated identifiers create multiple photograph links. The parser accepts forms such as `COIN 2025 109`, `2025-109`, and `coin-2025-109`. In the simple two-column format, the first two rows are placed in the obverse and reverse display slots respectively. This is a presentation convention only and is not written back into the RDF as a semantic face assignment.

The URL is treated as a METIS **resource page**, not as a direct image file. The interface therefore reports the number of linked METIS images and opens the resource page. Optional direct-image data is already supported later:

```csv
coin_id,metis_url,side,image_url,label
COIN 2025 109,https://metis.ascsa.edu.gr/resource/...,obverse,https://.../image.jpg,Obverse
```

When a `side` column is supplied, it overrides the display-order convention and should contain `obverse` or `reverse`.

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
