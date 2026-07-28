#!/usr/bin/env python3
"""Build browser-friendly JSON indexes from Nomisma-oriented Turtle files.

The Turtle files remain the authoritative data. This script only creates static
indexes for GitHub Pages. It deliberately preserves URI values alongside labels
so that the interface remains ontology-aware.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from rdflib import Graph, Literal, Namespace, RDF, URIRef
from rdflib.namespace import DCTERMS, SKOS

NMO = Namespace("http://nomisma.org/ontology#")
COR = Namespace("https://example.org/corinth/ontology/")

FACET_PROPERTIES: dict[str, URIRef] = {
    "authority": NMO.hasAuthority,
    "issuer": NMO.hasIssuer,
    "mint": NMO.hasMint,
    "material": NMO.hasMaterial,
    "denomination": NMO.hasDenomination,
    "manufacture": NMO.hasManufacture,
    "object_type": NMO.hasObjectType,
    "collection": NMO.hasCollection,
    "findspot": NMO.hasFindspot,
    "type_series": NMO.hasTypeSeriesItem,
    "reference_work": NMO.hasReferenceWork,
    "shape": NMO.hasShape,
    "authenticity": NMO.hasAuthenticity,
}

FACET_LABELS = {
    "authority": "Authority",
    "issuer": "Issuer",
    "mint": "Mint",
    "material": "Material",
    "denomination": "Denomination",
    "manufacture": "Manufacture",
    "object_type": "Object type",
    "collection": "Collection",
    "findspot": "Findspot",
    "type_series": "Type series",
    "reference_work": "Reference work",
    "shape": "Shape",
    "authenticity": "Authenticity",
}

COMMON_LABELS = {
    "http://nomisma.org/id/ae": "AE",
    "http://nomisma.org/id/ar": "AR",
    "http://nomisma.org/id/av": "AV",
    "http://nomisma.org/id/orichalcum": "Orichalcum",
}


def compact_id(value: str) -> str:
    value = value.strip()
    value = re.sub(r"^https?://[^#]+[#/]", "", value)
    value = re.sub(r"^corid:", "", value, flags=re.I)
    value = re.sub(r"^coin[-_\s]*", "", value, flags=re.I)
    match = re.search(r"(?:COIN(?:[_\s-]+X)?[_\s-]+)?(\d{4})[_\s-]+0*(\d+)", value, re.I)
    if match:
        return f"{match.group(1)}-{int(match.group(2))}"
    return value.replace(" ", "-")


def slug_label(uri: str) -> str:
    if uri in COMMON_LABELS:
        return COMMON_LABELS[uri]
    tail = re.split(r"[#/]", uri.rstrip("/"))[-1]
    tail = re.sub(r"^(coin|card|authority|mint|place|material|denomination)-", "", tail, flags=re.I)
    tail = tail.replace("_", " ").replace("-", " ")
    tail = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", tail)
    return tail.upper() if len(tail) <= 3 else tail.title()


def literal_text(value: Any) -> str:
    return str(value) if value is not None else ""


def node_label(graph: Graph, node: Any) -> str:
    if isinstance(node, Literal):
        return str(node)
    uri = str(node)
    if uri in COMMON_LABELS:
        return COMMON_LABELS[uri]
    for predicate in (SKOS.prefLabel, DCTERMS.title, DCTERMS.identifier):
        labels = [str(v) for v in graph.objects(node, predicate)]
        if labels:
            english = [v for v in graph.objects(node, predicate) if getattr(v, "language", None) == "en"]
            return str(english[0]) if english else labels[0]
    return slug_label(uri)


def ref(graph: Graph, node: Any) -> dict[str, str]:
    if isinstance(node, Literal):
        return {"label": str(node), "value": str(node), "kind": "literal"}
    return {"label": node_label(graph, node), "uri": str(node), "kind": "uri"}


def refs(graph: Graph, subject: Any, predicate: Any) -> list[dict[str, str]]:
    seen: set[str] = set()
    output: list[dict[str, str]] = []
    for obj in graph.objects(subject, predicate):
        item = ref(graph, obj)
        key = item.get("uri", item.get("value", ""))
        if key and key not in seen:
            seen.add(key)
            output.append(item)
    return output


def values(graph: Graph, subject: Any, predicate: Any) -> list[str]:
    return list(dict.fromkeys(str(v) for v in graph.objects(subject, predicate)))


def first_value(graph: Graph, subject: Any, predicate: Any) -> str | None:
    return next((str(v) for v in graph.objects(subject, predicate)), None)


def numeric_value(graph: Graph, subject: Any, predicate: Any) -> float | None:
    raw = first_value(graph, subject, predicate)
    if raw is None:
        return None
    try:
        return float(raw)
    except ValueError:
        match = re.search(r"-?\d+(?:\.\d+)?", raw)
        return float(match.group()) if match else None


def year_value(graph: Graph, subject: Any, predicate: Any) -> int | None:
    raw = first_value(graph, subject, predicate)
    if not raw:
        return None
    match = re.search(r"-?\d{1,4}", raw)
    return int(match.group()) if match else None


def format_year(year: int | None) -> str:
    if year is None:
        return ""
    if year < 0:
        return f"{abs(year)} BCE"
    return f"{year} CE"


def face_data(graph: Graph, coin: URIRef, predicate: URIRef) -> dict[str, Any] | None:
    face = next(graph.objects(coin, predicate), None)
    if face is None:
        return None
    data: dict[str, Any] = {
        "uri": str(face),
        "legend": values(graph, face, NMO.hasLegend),
        "description": values(graph, face, DCTERMS.description),
        "iconography": refs(graph, face, NMO.hasIconography),
        "controlmarks": refs(graph, face, NMO.hasControlmark),
        "mintmarks": refs(graph, face, NMO.hasMintmark),
    }
    return data


def generic_ontology(graph: Graph, coin: URIRef) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    predicates = {predicate for predicate in graph.predicates(coin) if str(predicate).startswith(str(NMO))}
    for predicate in predicates:
        predicate_uri = str(predicate)
        if predicate in {NMO.hasObverse, NMO.hasReverse}:
            continue
        result.append({
            "property": predicate_uri,
            "property_label": slug_label(predicate_uri),
            "values": [ref(graph, obj) for obj in graph.objects(coin, predicate)],
        })
    result.sort(key=lambda row: row["property_label"])
    return result


def card_data(graph: Graph, coin: URIRef) -> list[dict[str, Any]]:
    cards = set(graph.objects(coin, DCTERMS.source))
    cards.update(graph.subjects(COR.documentsNumismaticObject, coin))
    output: list[dict[str, Any]] = []
    for card in sorted(cards, key=str):
        if not isinstance(card, URIRef):
            continue
        raw_fields: list[dict[str, Any]] = []
        for predicate, obj in graph.predicate_objects(card):
            p_uri = str(predicate)
            if not p_uri.startswith(str(COR)):
                continue
            local = p_uri.removeprefix(str(COR))
            if local in {
                "documentsNumismaticObject", "sourceImageFilename", "transcriptionMethod",
                "requiresHumanReview", "humanConfirmationNote", "databaseContext"
            }:
                continue
            if local.endswith("Raw") or local in {
                "inventoryNumber", "cardSide", "excavationDate", "negativeReference",
                "relatedInventoryNumber", "potteryDepositReference"
            }:
                raw_fields.append({
                    "property": p_uri,
                    "label": re.sub(r"(?<!^)(?=[A-Z])", " ", local).replace("Raw", " (raw)"),
                    "value": node_label(graph, obj),
                })
        output.append({
            "uri": str(card),
            "identifier": first_value(graph, card, DCTERMS.identifier) or slug_label(str(card)),
            "source_filename": first_value(graph, card, COR.sourceImageFilename),
            "transcription_method": first_value(graph, card, COR.transcriptionMethod),
            "requires_review": (first_value(graph, card, COR.requiresHumanReview) or "").lower() == "true",
            "review_notes": values(graph, card, COR.humanConfirmationNote),
            "raw_fields": raw_fields,
        })
    return output


def read_photo_mapping(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8-sig")
    if not text.strip():
        return []
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters="\t,;")
    except csv.Error:
        dialect = csv.excel_tab
    rows = list(csv.reader(text.splitlines(), dialect))
    rows = [[cell.strip() for cell in row] for row in rows if row and any(cell.strip() for cell in row)]
    if not rows:
        return []
    header_names = [cell.lower().replace(" ", "_") for cell in rows[0]]
    has_header = bool(header_names and header_names[0] in {"coin", "coin_id", "identifier", "local_id"})
    start = 1 if has_header else 0
    index = {name: i for i, name in enumerate(header_names)} if has_header else {}
    mappings: list[dict[str, str]] = []
    for row in rows[start:]:
        if len(row) < 2:
            continue
        def col(name: str, fallback: int | None = None) -> str:
            idx = index.get(name, fallback)
            return row[idx].strip() if idx is not None and idx < len(row) else ""
        coin_id = col("coin_id", 0) or col("coin", 0) or col("identifier", 0) or col("local_id", 0)
        resource_url = col("metis_url", 1) or col("resource_url", 1) or col("url", 1)
        if not coin_id or not resource_url:
            continue
        mappings.append({
            "coin_key": compact_id(coin_id),
            "source_identifier": coin_id,
            "resource_url": resource_url,
            "side": col("side", 2),
            "image_url": col("image_url", 3) or col("direct_image_url", 3),
            "label": col("label", 4),
        })
    return mappings


def build(root: Path) -> int:
    ttl_dir = root / "data" / "ttl"
    output_dir = root / "data" / "generated"
    output_dir.mkdir(parents=True, exist_ok=True)

    graph = Graph()
    coin_sources: dict[str, set[str]] = defaultdict(set)
    errors: list[dict[str, str]] = []

    ttl_files = sorted(ttl_dir.rglob("*.ttl"))
    for path in ttl_files:
        try:
            file_graph = Graph()
            file_graph.parse(path, format="turtle")
            graph += file_graph
            rel = path.relative_to(root).as_posix()
            for coin in file_graph.subjects(RDF.type, NMO.NumismaticObject):
                coin_sources[str(coin)].add(rel)
        except Exception as exc:  # rdflib exceptions vary
            errors.append({"file": str(path.relative_to(root)), "error": str(exc)})

    photo_rows = read_photo_mapping(root / "data" / "coin_photos.csv")
    photos_by_key: dict[str, list[dict[str, str]]] = defaultdict(list)
    for item in photo_rows:
        photos_by_key[item["coin_key"]].append(item)

    records: list[dict[str, Any]] = []
    warnings: list[dict[str, str]] = []
    matched_photo_keys: set[str] = set()

    for coin in sorted(set(graph.subjects(RDF.type, NMO.NumismaticObject)), key=str):
        identifier = first_value(graph, coin, DCTERMS.identifier) or slug_label(str(coin))
        key = compact_id(identifier)
        title = first_value(graph, coin, DCTERMS.title) or f"COIN {identifier.replace('-', ' ')}"
        facets = {name: refs(graph, coin, predicate) for name, predicate in FACET_PROPERTIES.items()}
        start_year = year_value(graph, coin, NMO.hasStartDate)
        end_year = year_value(graph, coin, NMO.hasEndDate)
        date_label = ""
        if start_year is not None and end_year is not None:
            date_label = format_year(start_year) if start_year == end_year else f"{format_year(start_year)}–{format_year(end_year)}"
        elif start_year is not None:
            date_label = f"from {format_year(start_year)}"
        elif end_year is not None:
            date_label = f"to {format_year(end_year)}"

        photo_items: list[dict[str, Any]] = []
        for i, item in enumerate(photos_by_key.get(key, []), start=1):
            matched_photo_keys.add(key)
            photo_items.append({
                "sequence": i,
                "label": item["label"] or (item["side"].title() if item["side"] else f"Photograph {i}"),
                "side": item["side"],
                "resource_url": item["resource_url"],
                "image_url": item["image_url"],
            })

        record = {
            "id": key,
            "uri": str(coin),
            "identifier": identifier,
            "title": title,
            "date": {"start": start_year, "end": end_year, "label": date_label},
            "measurements": {
                "weight": numeric_value(graph, coin, NMO.hasWeight),
                "diameter": numeric_value(graph, coin, NMO.hasDiameter),
                "axis": numeric_value(graph, coin, NMO.hasAxis),
            },
            "facets": facets,
            "bibliography": values(graph, coin, DCTERMS.bibliographicCitation),
            "descriptions": values(graph, coin, DCTERMS.description),
            "obverse": face_data(graph, coin, NMO.hasObverse),
            "reverse": face_data(graph, coin, NMO.hasReverse),
            "ontology": generic_ontology(graph, coin),
            "cards": card_data(graph, coin),
            "photos": photo_items,
            "source_files": sorted(coin_sources.get(str(coin), [])),
        }
        record["requires_review"] = any(card["requires_review"] for card in record["cards"])
        records.append(record)

    for key, rows in photos_by_key.items():
        if key not in matched_photo_keys:
            warnings.append({
                "type": "unmatched_photo_mapping",
                "coin": rows[0]["source_identifier"],
                "message": "No nmo:NumismaticObject with this identifier was found in data/ttl.",
            })

    facet_index: dict[str, Any] = {}
    for name in FACET_PROPERTIES:
        counts: Counter[tuple[str, str]] = Counter()
        for record in records:
            for item in record["facets"][name]:
                value = item.get("uri") or item.get("value") or item["label"]
                counts[(value, item["label"])] += 1
        facet_index[name] = {
            "label": FACET_LABELS[name],
            "values": [
                {"value": value, "label": label, "count": count}
                for (value, label), count in sorted(counts.items(), key=lambda x: (-x[1], x[0][1].lower()))
            ],
        }

    validation = {
        "ttl_files": len(ttl_files),
        "records": len(records),
        "photo_mappings": len(photo_rows),
        "parse_errors": errors,
        "warnings": warnings,
    }

    (output_dir / "coins.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    (output_dir / "facets.json").write_text(json.dumps(facet_index, ensure_ascii=False, indent=2), encoding="utf-8")
    (output_dir / "validation-report.json").write_text(json.dumps(validation, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Parsed {len(ttl_files)} Turtle files; generated {len(records)} coin records.")
    if errors:
        for error in errors:
            print(f"ERROR {error['file']}: {error['error']}", file=sys.stderr)
        return 1
    for warning in warnings:
        print(f"WARNING {warning['coin']}: {warning['message']}", file=sys.stderr)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    return build(args.root.resolve())


if __name__ == "__main__":
    raise SystemExit(main())
