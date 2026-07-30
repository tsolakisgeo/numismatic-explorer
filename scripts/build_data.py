#!/usr/bin/env python3
"""Build browser-friendly indexes from Nomisma-oriented Turtle files.

The Turtle files remain authoritative.  This script validates every Turtle file,
merges duplicate descriptions of the same physical coin, preserves URI values,
and creates compact JSON indexes for the static GitHub Pages interface.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable

from rdflib import Graph, Literal, Namespace, RDF, URIRef
from rdflib.namespace import DCTERMS, SKOS

NMO = Namespace("http://nomisma.org/ontology#")
NM = Namespace("http://nomisma.org/id/")
COR = Namespace("https://example.org/corinth/ontology/")

# Direct Nomisma properties exposed as controlled facets.  Empty facets are
# harmless: the interface only renders them when at least one record supplies a
# value.  The list deliberately follows the Nomisma ontology rather than a
# database-specific schema.
FACET_PROPERTIES: dict[str, URIRef] = {
    "authority": NMO.hasAuthority,
    "stated_authority": NMO.hasStatedAuthority,
    "issuer": NMO.hasIssuer,
    "deity": NMO.hasDeity,
    "dynasty": NMO.hasDynasty,
    "state": NMO.hasState,
    "mint": NMO.hasMint,
    "material": NMO.hasMaterial,
    "denomination": NMO.hasDenomination,
    "manufacture": NMO.hasManufacture,
    "object_type": NMO.hasObjectType,
    "collection": NMO.hasCollection,
    "findspot": NMO.hasFindspot,
    "find_context": NMO.hasFindContext,
    "immediate_context": NMO.hasImmediateContext,
    "local_context": NMO.hasLocalContext,
    "landscape_context": NMO.hasLandscapeContext,
    "type_series": NMO.hasTypeSeriesItem,
    "reference_work": NMO.hasReferenceWork,
    "shape": NMO.hasShape,
    "authenticity": NMO.hasAuthenticity,
    "weight_standard": NMO.hasWeightStandard,
    "peculiarity": NMO.hasPeculiarity,
    "secondary_treatment": NMO.hasSecondaryTreatment,
    "wear": NMO.hasWear,
    "corrosion": NMO.hasCorrosion,
    "production_object": NMO.hasProductionObject,
    "die": NMO.hasDie,
}

FACET_LABELS: dict[str, str] = {
    "authority": "Authority",
    "stated_authority": "Stated authority",
    "issuer": "Issuer",
    "dynasty": "Dynasty",
    "reign": "Reign / issue",
    "person": "Person",
    "magistrate": "Magistrate",
    "deity": "Deity",
    "portrait": "Portrait",
    "state": "State",
    "mint": "Mint",
    "region": "Region",
    "city": "City",
    "province": "Province",
    "conventus": "Conventus",
    "alliance": "Alliance",
    "site": "Site",
    "country": "Country",
    "area": "Area",
    "material": "Material",
    "denomination": "Denomination",
    "manufacture": "Manufacture",
    "object_type": "Object type",
    "subtype": "Subtype",
    "period": "Period",
    "shape": "Shape",
    "authenticity": "Authenticity",
    "weight_standard": "Weight standard",
    "collection": "Collection",
    "findspot": "Findspot",
    "find_context": "Find context",
    "immediate_context": "Immediate context",
    "local_context": "Local context",
    "landscape_context": "Landscape context",
    "type_series": "Type series",
    "reference_work": "Reference work",
    "iconography": "Iconography",
    "symbol": "Symbol / monogram",
    "controlmark": "Control mark",
    "mintmark": "Mint mark",
    "countermark": "Countermark",
    "obverse_symbol": "Obverse symbol — any position",
    "reverse_symbol": "Reverse symbol — any position",
    "reverse_letter": "Reverse letter",
    "officina_mark": "Officina mark",
    "exergue": "Exergue",
    "notebook": "Notebook",
    "peculiarity": "Peculiarity",
    "secondary_treatment": "Secondary treatment",
    "wear": "Wear",
    "corrosion": "Corrosion",
    "production_object": "Production object",
    "die": "Die",
}

# Raw/local fields are fallback evidence only.  Controlled Nomisma values take
# priority when both are present.  This lets legacy and card-derived TTL files
# participate in filters without pretending that a literal is a Nomisma URI.
RAW_FACET_NAMES: dict[str, tuple[str, ...]] = {
    "authority": ("authority", "emperor", "ruler"),
    "stated_authority": ("statedauthority",),
    "issuer": ("issuer",),
    "dynasty": ("dynasty",),
    "reign": ("reign", "issue"),
    "person": ("person",),
    "magistrate": ("magistrate",),
    "deity": ("deity", "god", "goddess"),
    "portrait": ("portrait",),
    "state": ("state", "politicalentity"),
    "mint": ("mint",),
    "region": ("region",),
    "city": ("city",),
    "province": ("province",),
    "conventus": ("conventus", "subprovince"),
    "alliance": ("alliance",),
    "site": ("site",),
    "country": ("country",),
    "area": ("area",),
    "material": ("material", "metal"),
    "denomination": ("denomination",),
    "manufacture": ("manufacture",),
    "object_type": ("objecttype", "type"),
    "subtype": ("subtype", "classificationnormalized"),
    "period": ("period", "dateeranormalized"),
    "shape": ("shape",),
    "authenticity": ("authenticity",),
    "weight_standard": ("weightstandard",),
    "collection": ("collection", "studycollection"),
    "findspot": ("findspot",),
    "find_context": ("findcontext",),
    "immediate_context": ("immediatecontext",),
    "local_context": ("localcontext",),
    "landscape_context": ("landscapecontext",),
}

TEXT_FIELD_LABELS: dict[str, str] = {
    "identifier": "Identifier / coin number",
    "catalogue": "Catalogue volume or number",
    "title": "Title / name",
    "description": "General description",
    "obverse_legend": "Obverse legend",
    "reverse_legend": "Reverse legend",
    "obverse_type": "Obverse type / design",
    "reverse_type": "Reverse type / design",
    "date_on_object": "Date on object",
    "place": "Place search",
    "iconography": "Iconography",
    "symbol": "Symbol / monogram / mark",
    "symbol_position": "Symbol position",
    "bibliography": "Reference / bibliography",
    "notebook_reference": "Notebook reference",
    "notes": "Notes / archival transcription",
}

COMMON_LABELS = {
    str(NM.ae): "AE",
    str(NM.ar): "AR",
    str(NM.av): "AV",
    str(NM.orichalcum): "Orichalcum",
}

MATERIAL_ALIASES = {
    "ae": ("AE", str(NM.ae)),
    "æ": ("AE", str(NM.ae)),
    "bronze": ("AE", str(NM.ae)),
    "copper/bronze": ("AE", str(NM.ae)),
    "ar": ("AR", str(NM.ar)),
    "silver": ("AR", str(NM.ar)),
    "av": ("AV", str(NM.av)),
    "gold": ("AV", str(NM.av)),
}


def compact_id(value: str) -> str:
    value = value.strip()
    value = re.sub(r"^https?://[^#]+[#/]", "", value)
    value = re.sub(r"^corid:", "", value, flags=re.I)
    value = re.sub(r"^coin[-_\s]*", "", value, flags=re.I)
    match = re.search(r"(?:COIN(?:[_\s-]+X)?[_\s-]+)?(\d{4})[_\s-]+0*(\d+)", value, re.I)
    if match:
        return f"{match.group(1)}-{int(match.group(2))}"
    return re.sub(r"\s+", "-", value)


def slug_label(uri: str) -> str:
    if uri in COMMON_LABELS:
        return COMMON_LABELS[uri]
    tail = re.split(r"[#/]", uri.rstrip("/"))[-1]
    tail = re.sub(
        r"^(coin|card|authority|mint|place|material|denomination|controlmark|photo)-",
        "",
        tail,
        flags=re.I,
    )
    tail = tail.replace("_", " ").replace("-", " ")
    tail = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", tail)
    return tail.upper() if len(tail) <= 3 else tail.title()


def local_name(uri: str) -> str:
    return re.split(r"[#/]", uri.rstrip("/"))[-1]


def normalize_field_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower().removesuffix("raw"))


def node_label(graph: Graph, node: Any) -> str:
    if isinstance(node, Literal):
        return str(node)
    uri = str(node)
    if uri in COMMON_LABELS:
        return COMMON_LABELS[uri]
    for predicate in (SKOS.prefLabel, DCTERMS.title, DCTERMS.identifier):
        node_values = list(graph.objects(node, predicate))
        if node_values:
            english = [v for v in node_values if getattr(v, "language", None) == "en"]
            return str(english[0] if english else node_values[0])
    return slug_label(uri)


def ref(graph: Graph, node: Any, source: str = "rdf") -> dict[str, str]:
    if isinstance(node, Literal):
        return {"label": str(node), "value": str(node), "kind": "literal", "source": source}
    return {"label": node_label(graph, node), "uri": str(node), "kind": "uri", "source": source}


def refs(graph: Graph, subject: Any, predicate: Any, source: str = "rdf") -> list[dict[str, str]]:
    return unique_refs(ref(graph, obj, source=source) for obj in graph.objects(subject, predicate))


def unique_refs(items: Iterable[dict[str, str]]) -> list[dict[str, str]]:
    """Deduplicate by URI first and then by normalized label, preferring URIs."""
    by_label: dict[str, dict[str, str]] = {}
    order: list[str] = []
    for item in items:
        label = (item.get("label") or item.get("value") or item.get("uri") or "").strip()
        if not label:
            continue
        normalized = re.sub(r"\W+", "", label.casefold())
        if not normalized:
            normalized = item.get("uri", label).casefold()
        existing = by_label.get(normalized)
        if existing is None:
            by_label[normalized] = item
            order.append(normalized)
        elif item.get("uri") and not existing.get("uri"):
            by_label[normalized] = item
    return [by_label[key] for key in order]


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
        match = re.search(r"-?\d+(?:\.\d+)?", raw.replace(",", "."))
        return float(match.group()) if match else None


def first_numeric(graph: Graph, subject: Any, predicates: Iterable[URIRef]) -> float | None:
    for predicate in predicates:
        result = numeric_value(graph, subject, predicate)
        if result is not None:
            return result
    return None


def year_value(graph: Graph, subject: Any, predicate: Any) -> int | None:
    raw = first_value(graph, subject, predicate)
    if not raw:
        return None
    match = re.search(r"-?\d{1,4}", raw)
    return int(match.group()) if match else None


def format_year(year: int | None) -> str:
    if year is None:
        return ""
    return f"{abs(year)} BCE" if year < 0 else f"{year} CE"


def objects_from_subjects(graph: Graph, subjects: Iterable[Any], predicate: URIRef) -> list[dict[str, str]]:
    output: list[dict[str, str]] = []
    for subject in subjects:
        output.extend(refs(graph, subject, predicate))
    return unique_refs(output)


def face_nodes(graph: Graph, coin: URIRef) -> list[Any]:
    return list(graph.objects(coin, NMO.hasObverse)) + list(graph.objects(coin, NMO.hasReverse))


def face_data(graph: Graph, coin: URIRef, predicate: URIRef) -> dict[str, Any] | None:
    face = next(graph.objects(coin, predicate), None)
    if face is None:
        return None
    position_values: list[str] = []
    for pred, obj in graph.predicate_objects(face):
        if "position" in local_name(str(pred)).lower():
            position_values.append(node_label(graph, obj))
    return {
        "uri": str(face),
        "legend": values(graph, face, NMO.hasLegend),
        "description": values(graph, face, DCTERMS.description),
        "iconography": refs(graph, face, NMO.hasIconography),
        "portrait": refs(graph, face, NMO.hasPortrait),
        "controlmarks": refs(graph, face, NMO.hasControlmark),
        "mintmarks": refs(graph, face, NMO.hasMintmark),
        "countermarks": refs(graph, face, NMO.hasCountermark),
        "marks": refs(graph, face, NMO.hasMark),
        "date_on_object": values(graph, face, NMO.hasBearsDate),
        "positions": list(dict.fromkeys(position_values)),
    }


def generic_ontology(graph: Graph, coin: URIRef) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    predicates = {predicate for predicate in graph.predicates(coin) if str(predicate).startswith(str(NMO))}
    for predicate in predicates:
        if predicate in {NMO.hasObverse, NMO.hasReverse}:
            continue
        result.append({
            "property": str(predicate),
            "property_label": slug_label(str(predicate)),
            "values": [ref(graph, obj) for obj in graph.objects(coin, predicate)],
        })
    result.sort(key=lambda row: row["property_label"])
    return result


def card_resources(graph: Graph, coin: URIRef) -> list[URIRef]:
    cards = set(graph.objects(coin, DCTERMS.source))
    cards.update(graph.subjects(COR.documentsNumismaticObject, coin))
    return sorted((card for card in cards if isinstance(card, URIRef)), key=str)


def humanized_property(local: str) -> str:
    text = re.sub(r"(?<!^)(?=[A-Z])", " ", local)
    text = text.replace("Raw", " (raw)")
    return text[:1].upper() + text[1:]


def parse_integer(value: Any) -> int | None:
    if value is None:
        return None
    match = re.search(r"-?\d+", str(value))
    return int(match.group()) if match else None


def parse_notebook_reference(raw: str) -> dict[str, Any] | None:
    """Parse fallback notebook strings without treating notebook numbers as pages.

    A page is accepted only when it follows p., p, page, or an equivalent
    explicit page marker. Structured RDF values always take precedence.
    """
    text = re.sub(r"\s+", " ", raw).strip()
    if not text:
        return None
    page_match = re.search(r"\b(?:p|pp|page)\.?\s*[-–—]?\s*\(?\s*(\d+)", text, re.I)
    page = int(page_match.group(1)) if page_match else None
    name = ""
    if page_match:
        prefix = text[:page_match.start()].strip(" ;,:-–—()")
        # In strings such as "NB 139; O. Broneer p. 103", the final
        # semicolon-delimited segment is the notebook name.
        name = prefix.split(";")[-1].strip(" ;,:-–—()")
    elif re.search(r"\bnotebook\b|\bNB\b", text, re.I):
        name = text.strip(" ;,:-–—()")
    if not name and page is None:
        return None
    return {
        "name": name or "Notebook not named",
        "page": page,
        "raw": text,
        "method": "parsed_from_raw_reference",
    }


def notebook_nodes(graph: Graph, card: URIRef) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    seen: set[tuple[str, int | None, str]] = set()
    for node in graph.objects(card, COR.notebookReference):
        raw = first_value(graph, node, COR.notebookReferenceRaw) or ""
        name = first_value(graph, node, COR.notebookName) or ""
        number = first_value(graph, node, COR.notebookNumber) or ""
        page_values = [parse_integer(value) for value in graph.objects(node, COR.notebookPage)]
        page_values = [value for value in page_values if value is not None]
        if not page_values:
            page_raw = first_value(graph, node, COR.notebookPageRaw)
            page = parse_integer(page_raw)
            if page is not None:
                page_values = [page]
        if not name and number:
            name = f"Notebook {number}"
        parsed = parse_notebook_reference(raw) if raw else None
        if not name and parsed:
            name = parsed["name"]
        if not page_values and parsed and parsed.get("page") is not None:
            page_values = [parsed["page"]]
        if not page_values:
            page_values = [None]
        method = first_value(graph, node, COR.notebookIdentificationMethod) or "structured_rdf"
        entries = values(graph, node, COR.notebookEntryOrRange)
        for page in page_values:
            key = (name or "Notebook not named", page, raw)
            if key in seen:
                continue
            seen.add(key)
            output.append({
                "name": name or "Notebook not named",
                "number": number,
                "page": page,
                "raw": raw,
                "entries": entries,
                "method": method,
            })
    return output


def card_data(graph: Graph, coin: URIRef) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for card in card_resources(graph, coin):
        raw_fields: list[dict[str, Any]] = []
        for predicate, obj in graph.predicate_objects(card):
            p_uri = str(predicate)
            if not p_uri.startswith(str(COR)):
                continue
            local = p_uri.removeprefix(str(COR))
            if local in {
                "documentsNumismaticObject", "sourceImageFilename", "transcriptionMethod",
                "requiresHumanReview", "humanConfirmationNote", "databaseContext",
            }:
                continue
            if isinstance(obj, Literal):
                raw_fields.append({
                    "property": p_uri,
                    "local": local,
                    "label": humanized_property(local),
                    "value": str(obj),
                })
        output.append({
            "uri": str(card),
            "identifier": first_value(graph, card, DCTERMS.identifier) or slug_label(str(card)),
            "source_filename": first_value(graph, card, COR.sourceImageFilename),
            "transcription_method": first_value(graph, card, COR.transcriptionMethod),
            "requires_review": (first_value(graph, card, COR.requiresHumanReview) or "").lower() == "true",
            "review_notes": values(graph, card, COR.humanConfirmationNote),
            "raw_fields": raw_fields,
            "notebooks": notebook_nodes(graph, card),
        })
    return output


def collect_notebooks(cards: list[dict[str, Any]]) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    seen: set[tuple[str, int | None, str]] = set()
    for card in cards:
        for notebook in card.get("notebooks", []):
            key = (notebook.get("name", ""), notebook.get("page"), notebook.get("raw", ""))
            if key not in seen:
                seen.add(key)
                output.append(notebook)
        # Older TTL files sometimes preserve the reference only as a direct raw
        # literal rather than a structured cor:notebookReference node.
        for field in card.get("raw_fields", []):
            normalized = normalize_field_name(field.get("local", ""))
            if "notebook" not in normalized:
                continue
            parsed = parse_notebook_reference(field.get("value", ""))
            if not parsed:
                continue
            key = (parsed.get("name", ""), parsed.get("page"), parsed.get("raw", ""))
            if key not in seen:
                seen.add(key)
                output.append(parsed)
    return output


def raw_values_for_names(cards: list[dict[str, Any]], names: tuple[str, ...]) -> list[str]:
    wanted = set(names)
    output: list[str] = []
    for card in cards:
        for field in card.get("raw_fields", []):
            normalized = normalize_field_name(field.get("local", ""))
            if normalized in wanted:
                value = field.get("value", "").strip()
                if value and value.lower() not in {"true", "false", "none", "null", "unknown", "?"}:
                    output.append(value)
    return list(dict.fromkeys(output))


def raw_values_containing(cards: list[dict[str, Any]], tokens: tuple[str, ...]) -> list[str]:
    output: list[str] = []
    for card in cards:
        for field in card.get("raw_fields", []):
            normalized = normalize_field_name(field.get("local", ""))
            if any(token in normalized for token in tokens):
                value = field.get("value", "").strip()
                if value:
                    output.append(value)
    return list(dict.fromkeys(output))


def fallback_ref(value: str, facet: str) -> dict[str, str]:
    cleaned = value.strip()
    if facet == "material":
        alias = MATERIAL_ALIASES.get(cleaned.casefold())
        if alias:
            return {"label": alias[0], "uri": alias[1], "kind": "uri", "source": "archival-normalized"}
    return {"label": cleaned, "value": cleaned, "kind": "literal", "source": "archival"}


def add_raw_fallbacks(facets: dict[str, list[dict[str, str]]], cards: list[dict[str, Any]]) -> None:
    for facet, names in RAW_FACET_NAMES.items():
        raw_values = raw_values_for_names(cards, names)
        if not raw_values:
            continue
        # Keep controlled values where present and use card values as fallback or
        # additional searchable evidence when they do not duplicate a label.
        facets.setdefault(facet, [])
        facets[facet] = unique_refs([
            *facets[facet],
            *(fallback_ref(value, facet) for value in raw_values),
        ])


def broader_places(graph: Graph, mint_values: list[dict[str, str]]) -> list[dict[str, str]]:
    output: list[dict[str, str]] = []
    visited: set[str] = set()
    queue = [URIRef(item["uri"]) for item in mint_values if item.get("uri")]
    for _depth in range(4):
        next_queue: list[URIRef] = []
        for node in queue:
            for broader in list(graph.objects(node, SKOS.broader)) + list(graph.objects(node, DCTERMS.isPartOf)):
                if not isinstance(broader, URIRef) or str(broader) in visited:
                    continue
                visited.add(str(broader))
                output.append(ref(graph, broader, source="derived-place-hierarchy"))
                next_queue.append(broader)
        queue = next_queue
        if not queue:
            break
    return unique_refs(output)


def collect_text_fields(
    graph: Graph,
    coin: URIRef,
    identifier: str,
    title: str,
    obverse: dict[str, Any] | None,
    reverse: dict[str, Any] | None,
    cards: list[dict[str, Any]],
    bibliography: list[str],
    descriptions: list[str],
    facets: dict[str, list[dict[str, str]]],
    notebooks: list[dict[str, Any]],
) -> dict[str, list[str]]:
    all_raw = [field["value"] for card in cards for field in card.get("raw_fields", []) if field.get("value")]
    catalogue = raw_values_containing(cards, ("volume", "catalog", "referencenumber", "coinnumber", "coinno", "typenumber"))
    date_on_object = values(graph, coin, NMO.hasBearsDate)
    if obverse:
        date_on_object.extend(obverse.get("date_on_object", []))
    if reverse:
        date_on_object.extend(reverse.get("date_on_object", []))
    iconography_refs = objects_from_subjects(graph, [coin, *face_nodes(graph, coin)], NMO.hasIconography)
    mark_refs: list[dict[str, str]] = []
    for predicate in (NMO.hasMark, NMO.hasControlmark, NMO.hasMintmark, NMO.hasCountermark):
        mark_refs.extend(objects_from_subjects(graph, [coin, *face_nodes(graph, coin)], predicate))
    symbol_raw = raw_values_containing(cards, ("symbol", "controlmark", "mintmark", "monogram", "countermark"))
    position_raw = raw_values_containing(cards, ("symbolposition", "controlmarkposition", "mintmarkposition", "positiononcoin"))
    notes = raw_values_containing(cards, ("note", "annotation", "comment", "physicaldescription"))
    place_values: list[str] = []
    for facet_name in ("mint", "region", "city", "province", "conventus", "alliance", "area", "site", "country", "findspot"):
        place_values.extend(item.get("label", "") for item in facets.get(facet_name, []))
    notebook_values = [
        notebook.get("raw") or " ".join(
            part for part in (
                notebook.get("name", ""),
                f"p. {notebook['page']}" if notebook.get("page") is not None else "",
            ) if part
        )
        for notebook in notebooks
    ]
    return {
        "identifier": [identifier],
        "catalogue": catalogue,
        "title": [title],
        "description": list(dict.fromkeys(descriptions)),
        "obverse_legend": list(dict.fromkeys((obverse or {}).get("legend", []))),
        "reverse_legend": list(dict.fromkeys((reverse or {}).get("legend", []))),
        "obverse_type": list(dict.fromkeys((obverse or {}).get("description", []))),
        "reverse_type": list(dict.fromkeys((reverse or {}).get("description", []))),
        "date_on_object": list(dict.fromkeys(date_on_object)),
        "place": list(dict.fromkeys(value for value in place_values if value)),
        "iconography": list(dict.fromkeys([item["label"] for item in iconography_refs])),
        "symbol": list(dict.fromkeys([item["label"] for item in mark_refs] + symbol_raw)),
        "symbol_position": list(dict.fromkeys((obverse or {}).get("positions", []) + (reverse or {}).get("positions", []) + position_raw)),
        "bibliography": list(dict.fromkeys(bibliography)),
        "notebook_reference": list(dict.fromkeys(value for value in notebook_values if value)),
        "notes": list(dict.fromkeys(notes + all_raw)),
    }


def raw_boolean(cards: list[dict[str, Any]], tokens: tuple[str, ...]) -> bool:
    for card in cards:
        for field in card.get("raw_fields", []):
            normalized = normalize_field_name(field.get("local", ""))
            if any(token in normalized for token in tokens):
                value = field.get("value", "").strip().casefold()
                if value in {"true", "yes", "1", "y"} or (value and value not in {"false", "no", "0", "n"}):
                    return True
    return False


def read_photo_mapping(path: Path) -> list[dict[str, str]]:
    """Read the user's two-column TSV/CSV, with optional future columns."""
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
        except Exception as exc:  # rdflib exception classes vary
            errors.append({"file": str(path.relative_to(root)), "error": str(exc)})

    photo_rows = read_photo_mapping(root / "data" / "coin_photos.csv")
    photos_by_key: dict[str, list[dict[str, str]]] = defaultdict(list)
    for item in photo_rows:
        photos_by_key[item["coin_key"]].append(item)

    records: list[dict[str, Any]] = []
    warnings: list[dict[str, str]] = []
    matched_photo_keys: set[str] = set()

    all_facet_names = set(FACET_LABELS)

    for coin in sorted(set(graph.subjects(RDF.type, NMO.NumismaticObject)), key=str):
        identifier = first_value(graph, coin, DCTERMS.identifier) or slug_label(str(coin))
        key = compact_id(identifier)
        title = first_value(graph, coin, DCTERMS.title) or f"COIN {identifier.replace('-', ' ')}"
        cards = card_data(graph, coin)
        notebooks = collect_notebooks(cards)

        facets: dict[str, list[dict[str, str]]] = {
            name: refs(graph, coin, predicate) for name, predicate in FACET_PROPERTIES.items()
        }

        obverse_nodes = list(graph.objects(coin, NMO.hasObverse))
        reverse_nodes = list(graph.objects(coin, NMO.hasReverse))
        faces = [*obverse_nodes, *reverse_nodes]
        facets["portrait"] = objects_from_subjects(graph, [coin, *faces], NMO.hasPortrait)
        facets["iconography"] = objects_from_subjects(graph, [coin, *faces], NMO.hasIconography)
        facets["controlmark"] = objects_from_subjects(graph, [coin, *faces], NMO.hasControlmark)
        facets["mintmark"] = objects_from_subjects(graph, [coin, *faces], NMO.hasMintmark)
        facets["countermark"] = objects_from_subjects(graph, [coin, *faces], NMO.hasCountermark)
        facets["symbol"] = unique_refs([
            *objects_from_subjects(graph, [coin, *faces], NMO.hasMark),
            *facets["controlmark"], *facets["mintmark"], *facets["countermark"],
        ])
        facets["obverse_symbol"] = unique_refs([
            *objects_from_subjects(graph, obverse_nodes, NMO.hasMark),
            *objects_from_subjects(graph, obverse_nodes, NMO.hasControlmark),
            *objects_from_subjects(graph, obverse_nodes, NMO.hasMintmark),
            *objects_from_subjects(graph, obverse_nodes, NMO.hasCountermark),
        ])
        facets["reverse_symbol"] = unique_refs([
            *objects_from_subjects(graph, reverse_nodes, NMO.hasMark),
            *objects_from_subjects(graph, reverse_nodes, NMO.hasControlmark),
            *objects_from_subjects(graph, reverse_nodes, NMO.hasMintmark),
            *objects_from_subjects(graph, reverse_nodes, NMO.hasCountermark),
        ])
        facets["reverse_letter"] = unique_refs(
            fallback_ref(value, "reverse_letter")
            for value in raw_values_containing(cards, ("reverseletter", "symbolrevletter", "lettermark"))
        )
        facets["officina_mark"] = unique_refs([
            *objects_from_subjects(graph, reverse_nodes, NMO.hasMintmark),
            *(fallback_ref(value, "officina_mark") for value in raw_values_containing(cards, ("officina", "officinamark"))),
        ])
        facets["exergue"] = unique_refs(
            fallback_ref(value, "exergue")
            for value in raw_values_containing(cards, ("exergue", "exergual"))
        )
        facets["notebook"] = unique_refs(
            fallback_ref(notebook["name"], "notebook")
            for notebook in notebooks if notebook.get("name")
        )

        # Raw card fields extend filters only where the controlled model does not
        # already express the concept.
        add_raw_fallbacks(facets, cards)
        facets["region"] = unique_refs([*facets.get("region", []), *broader_places(graph, facets.get("mint", []))])

        for facet_name in all_facet_names:
            facets.setdefault(facet_name, [])

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
            explicit_side = item["side"].strip().lower()
            display_side = explicit_side or ("obverse" if i == 1 else "reverse" if i == 2 else "")
            photo_items.append({
                "sequence": i,
                "label": item["label"] or (item["side"].title() if item["side"] else f"Photograph {i}"),
                "side": explicit_side,
                "display_side": display_side,
                "side_inferred": not bool(explicit_side) and bool(display_side),
                "resource_url": item["resource_url"],
                "image_url": item["image_url"],
            })

        bibliography = values(graph, coin, DCTERMS.bibliographicCitation)
        descriptions = values(graph, coin, DCTERMS.description)
        obverse = face_data(graph, coin, NMO.hasObverse)
        reverse = face_data(graph, coin, NMO.hasReverse)
        text_fields = collect_text_fields(
            graph, coin, identifier, title, obverse, reverse, cards, bibliography, descriptions, facets, notebooks
        )

        modified = first_value(graph, coin, DCTERMS.modified)
        record = {
            "id": key,
            "uri": str(coin),
            "identifier": identifier,
            "title": title,
            "modified": modified,
            "date": {"start": start_year, "end": end_year, "label": date_label},
            "measurements": {
                "weight": numeric_value(graph, coin, NMO.hasWeight),
                "diameter": first_numeric(graph, coin, (NMO.hasDiameter, NMO.hasMaxDiameter, NMO.hasMinDiameter)),
                "axis": numeric_value(graph, coin, NMO.hasAxis),
                "height": first_numeric(graph, coin, (NMO.hasHeight, NMO.hasMaxHeight, NMO.hasMinHeight)),
                "width": first_numeric(graph, coin, (NMO.hasWidth, NMO.hasMaxWidth, NMO.hasMinWidth)),
            },
            "facets": facets,
            "text_fields": text_fields,
            "bibliography": bibliography,
            "descriptions": descriptions,
            "obverse": obverse,
            "reverse": reverse,
            "ontology": generic_ontology(graph, coin),
            "cards": cards,
            "notebooks": notebooks,
            "notebook_pages": sorted({notebook["page"] for notebook in notebooks if notebook.get("page") is not None}),
            "photos": photo_items,
            "source_files": sorted(coin_sources.get(str(coin), [])),
        }
        record["requires_review"] = any(card["requires_review"] for card in cards)
        record["flags"] = {
            "has_photos": bool(photo_items),
            "requires_review": record["requires_review"],
            "has_type_series": bool(facets.get("type_series")),
            "has_measurements": any(value is not None for value in record["measurements"].values()),
            "has_obverse": obverse is not None,
            "has_reverse": reverse is not None,
            "added_type": raw_boolean(cards, ("addition", "addedtype", "additionalcointype")),
            "corrected_type": raw_boolean(cards, ("correction", "correctedtype")),
            "additional_specimens": raw_boolean(cards, ("additionalspecimen", "specimens")),
        }
        records.append(record)

    for key, rows in photos_by_key.items():
        if key not in matched_photo_keys:
            warnings.append({
                "type": "unmatched_photo_mapping",
                "coin": rows[0]["source_identifier"],
                "message": "No nmo:NumismaticObject with this identifier was found in data/ttl.",
            })

    facet_index: dict[str, Any] = {}
    for name in sorted(all_facet_names, key=lambda value: FACET_LABELS[value]):
        counts: Counter[tuple[str, str, str]] = Counter()
        for record in records:
            for item in record["facets"].get(name, []):
                value = item.get("uri") or item.get("value") or item["label"]
                counts[(value, item["label"], item.get("source", "rdf"))] += 1
        facet_index[name] = {
            "label": FACET_LABELS[name],
            "values": [
                {"value": value, "label": label, "source": source, "count": count}
                for (value, label, source), count in sorted(
                    counts.items(), key=lambda row: (-row[1], row[0][1].casefold())
                )
            ],
        }

    numeric_extents: dict[str, dict[str, float | int | None]] = {}
    for name in ("weight", "diameter", "axis", "height", "width"):
        nums = [record["measurements"][name] for record in records if record["measurements"][name] is not None]
        numeric_extents[name] = {"min": min(nums) if nums else None, "max": max(nums) if nums else None}
    date_starts = [record["date"]["start"] for record in records if record["date"]["start"] is not None]
    date_ends = [record["date"]["end"] for record in records if record["date"]["end"] is not None]
    numeric_extents["date"] = {
        "min": min(date_starts + date_ends) if date_starts or date_ends else None,
        "max": max(date_starts + date_ends) if date_starts or date_ends else None,
    }
    notebook_pages = [page for record in records for page in record.get("notebook_pages", [])]
    numeric_extents["notebook_page"] = {
        "min": min(notebook_pages) if notebook_pages else None,
        "max": max(notebook_pages) if notebook_pages else None,
    }

    validation = {
        "ttl_files": len(ttl_files),
        "records": len(records),
        "photo_mappings": len(photo_rows),
        "parse_errors": errors,
        "warnings": warnings,
        "ontology_version": "http://nomisma.org/ontology/250402",
    }

    schema = {
        "facet_labels": FACET_LABELS,
        "text_field_labels": TEXT_FIELD_LABELS,
        "numeric_extents": numeric_extents,
        "flag_labels": {
            "has_photos": "Has photograph links",
            "requires_review": "Requires human review",
            "has_type_series": "Has type-series attribution",
            "has_measurements": "Has measurements",
            "has_obverse": "Has obverse description",
            "has_reverse": "Has reverse description",
            "added_type": "Additional coin type",
            "corrected_type": "Corrected coin type",
            "additional_specimens": "Additional specimens",
        },
    }

    (output_dir / "coins.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    (output_dir / "facets.json").write_text(json.dumps(facet_index, ensure_ascii=False, indent=2), encoding="utf-8")
    (output_dir / "schema.json").write_text(json.dumps(schema, ensure_ascii=False, indent=2), encoding="utf-8")
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
