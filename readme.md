# Numismatic Explorer

A neutral-titled, ontology-first static website for GitHub Pages. RDF/Turtle files are the authoritative source; a Python build script validates and converts them into compact JSON indexes for faceted browsing.

## What the first version does

- Reads every `.ttl` file in `data/ttl/`.
- Finds resources typed `nmo:NumismaticObject`.
- Preserves Nomisma property URIs and links them from the interface.
- Merges the same coin when it occurs in more than one Turtle file.
- Indexes authorities, issuers, mints, materials, denominations, manufacture, object type, collection, findspot, type-series items, reference works, shape, and authenticity.
- Indexes dates, weights, diameters, axes, obverse and reverse descriptions, legends, control marks, bibliography, and review notes.
- Connects a coin to any number of METIS photograph resources through `data/coin_photos.csv`.
- Publishes as a static GitHub Pages site through GitHub Actions.

Inventory-card images are **not displayed in this release**. Card resources and their transcribed data remain in the Turtle files and are available in a collapsed archival section on each record page.

## Photograph mapping

The active mapping file is:

```text
data/coin_photos.csv
```

The simplest accepted format is exactly two tab-separated columns with no header:

```text
COIN 2025 109    https://metis.ascsa.edu.gr/resource/cdf99ae9186ffbc2af391d37b95abdc7
COIN 2025 109    https://metis.ascsa.edu.gr/resource/3850451b05aae51b70f5097246410f36
```

Repeated identifiers create multiple photograph links. The parser accepts `COIN 2025 109`, `2025-109`, `coin-2025-109`, and similar forms.

The two-column URL is treated as a METIS **resource page**, not as a direct image file. The interface therefore displays a photograph-resource panel linking to METIS. When direct image URLs become available, an optional header-based format is already supported:

```csv
coin_id,metis_url,side,image_url,label
COIN 2025 109,https://metis.ascsa.edu.gr/resource/...,obverse,https://.../image.jpg,Obverse
```

No side is inferred from row order. Add a `side` column later when the assignment is known.

## Add Turtle records

Place files anywhere beneath:

```text
data/ttl/
```

A record should at minimum contain:

```turtle
@prefix nmo: <http://nomisma.org/ontology#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix corid: <https://example.org/corinth/id/> .

corid:coin-2025-109
    a nmo:NumismaticObject ;
    dcterms:identifier "2025-109" .
```

The project currently follows the Nomisma ontology version identified in `data/site.json` (`http://nomisma.org/ontology/250402`). Change that one configuration value when intentionally moving to another version.

## Build locally

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python scripts/build_data.py
python -m http.server 8000
```

Open `http://localhost:8000`.

Do not open `index.html` directly from the file system; browsers block its JSON requests. Use the small local HTTP server.

## Generated files

The build script writes:

- `data/generated/coins.json`
- `data/generated/facets.json`
- `data/generated/validation-report.json`

These are disposable indexes. Edit the Turtle and CSV source files, not the generated JSON.

## GitHub Pages deployment

1. Create a GitHub repository and copy this project into it.
2. Push to the `main` branch.
3. In **Settings → Pages**, set **Source** to **GitHub Actions**.
4. The included workflow validates the Turtle and deploys the static site.

The public title is stored only in `data/site.json`, so it can be replaced without editing the templates.

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

The interface does not replace RDF with a private schema. Every controlled value retains its URI, and the detail page shows the underlying Nomisma properties. The JSON layer exists only to make a static GitHub Pages site fast and searchable.
