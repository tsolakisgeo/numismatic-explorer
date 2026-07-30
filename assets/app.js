'use strict';

(async () => {
  const NX = window.NumismaticExplorer;

  const RANGE_DEFS = {
    dateMin: { label: 'Date from', field: 'date', side: 'min', unit: '' },
    dateMax: { label: 'Date to', field: 'date', side: 'max', unit: '' },
    weightMin: { label: 'Weight from', field: 'weight', side: 'min', unit: 'g' },
    weightMax: { label: 'Weight to', field: 'weight', side: 'max', unit: 'g' },
    diameterMin: { label: 'Diameter from', field: 'diameter', side: 'min', unit: 'mm' },
    diameterMax: { label: 'Diameter to', field: 'diameter', side: 'max', unit: 'mm' },
    axisMin: { label: 'Axis from', field: 'axis', side: 'min', unit: 'h' },
    axisMax: { label: 'Axis to', field: 'axis', side: 'max', unit: 'h' },
    heightMin: { label: 'Height from', field: 'height', side: 'min', unit: 'mm' },
    heightMax: { label: 'Height to', field: 'height', side: 'max', unit: 'mm' },
    widthMin: { label: 'Width from', field: 'width', side: 'min', unit: 'mm' },
    widthMax: { label: 'Width to', field: 'width', side: 'max', unit: 'mm' },
    notebookPageMin: { label: 'Notebook page from', field: 'notebook_page', side: 'min', unit: '' },
    notebookPageMax: { label: 'Notebook page to', field: 'notebook_page', side: 'max', unit: '' }
  };

  const TEXT_DEFS = {
    identifier: { label: 'Identifier / coin no.', placeholder: 'e.g. 1934-228' },
    catalogue: { label: 'Catalogue volume or no.', placeholder: 'e.g. RPC, OCRE, Edwards 129' },
    title: { label: 'Title / name', placeholder: 'Search title or name' },
    description: { label: 'General description', placeholder: 'Search description' },
    obverse_legend: { label: 'Obverse legend', placeholder: 'Search transcribed legend' },
    reverse_legend: { label: 'Reverse legend', placeholder: 'Search transcribed legend' },
    obverse_type: { label: 'Obverse type / design', placeholder: 'Search obverse description' },
    reverse_type: { label: 'Reverse type / design', placeholder: 'Search reverse description' },
    date_on_object: { label: 'Date on object', placeholder: 'Search written date' },
    place: { label: 'Place search', placeholder: 'Search mint, region, city, or findspot' },
    iconography: { label: 'All iconography', placeholder: 'Search iconography' },
    symbol: { label: 'Symbol / monogram / mark', placeholder: 'Search symbol or monogram' },
    symbol_position: { label: 'Symbol position', placeholder: 'e.g. left field, below' },
    bibliography: { label: 'Reference / bibliography', placeholder: 'Search reference' },
    notebook_reference: { label: 'Notebook reference', placeholder: 'Search the complete notebook citation' },
    notes: { label: 'Notes / transcription', placeholder: 'Search archival notes' }
  };

  const FILTER_GROUPS = [
    {
      id: 'identification', title: 'Identification', open: true,
      controls: [
        ['text', 'identifier'], ['text', 'catalogue'], ['text', 'title'],
        ['facet', 'type_series'], ['facet', 'reference_work'], ['facet', 'subtype']
      ]
    },
    {
      id: 'people', title: 'People and organizations', open: true,
      controls: [
        ['facet', 'authority'], ['facet', 'stated_authority'], ['facet', 'deity'], ['facet', 'dynasty'],
        ['facet', 'issuer'], ['facet', 'portrait'], ['facet', 'state'], ['facet', 'reign'],
        ['facet', 'person'], ['facet', 'magistrate']
      ]
    },
    {
      id: 'places', title: 'Places', open: true,
      controls: [
        ['text', 'place'], ['facet', 'mint'], ['facet', 'region'], ['facet', 'city'],
        ['facet', 'province'], ['facet', 'conventus'], ['facet', 'alliance'],
        ['facet', 'area'], ['facet', 'site'], ['facet', 'country']
      ]
    },
    {
      id: 'typology', title: 'Typology and chronology', open: true,
      controls: [
        ['facet', 'denomination'], ['facet', 'manufacture'], ['facet', 'material'], ['facet', 'object_type'],
        ['rangePair', ['dateMin', 'dateMax']], ['text', 'date_on_object'], ['facet', 'period'],
        ['facet', 'shape'], ['facet', 'authenticity'], ['facet', 'weight_standard']
      ]
    },
    {
      id: 'obverse-reverse', title: 'Obverse and reverse', open: true,
      controls: [
        ['text', 'obverse_legend'], ['text', 'reverse_legend'],
        ['text', 'obverse_type'], ['text', 'reverse_type'], ['text', 'iconography']
      ]
    },
    {
      id: 'symbols', title: 'Symbols', open: false,
      controls: [
        ['facet', 'obverse_symbol'], ['facet', 'reverse_symbol'], ['facet', 'reverse_letter'],
        ['facet', 'officina_mark'], ['facet', 'exergue'], ['text', 'symbol'], ['text', 'symbol_position'],
        ['facet', 'symbol'], ['facet', 'controlmark'], ['facet', 'mintmark'], ['facet', 'countermark']
      ]
    },
    {
      id: 'measurements', title: 'Measurements', open: true,
      controls: [
        ['rangePair', ['weightMin', 'weightMax']], ['rangePair', ['diameterMin', 'diameterMax']],
        ['rangePair', ['axisMin', 'axisMax']], ['rangePair', ['heightMin', 'heightMax']], ['rangePair', ['widthMin', 'widthMax']]
      ]
    },
    {
      id: 'notebooks', title: 'Excavation notebooks', open: true,
      controls: [
        ['facet', 'notebook'], ['rangePair', ['notebookPageMin', 'notebookPageMax']], ['text', 'notebook_reference']
      ]
    },
    {
      id: 'context', title: 'Find and collection context', open: false,
      controls: [
        ['facet', 'findspot'], ['facet', 'find_context'], ['facet', 'immediate_context'],
        ['facet', 'local_context'], ['facet', 'landscape_context'], ['facet', 'collection']
      ]
    },
    {
      id: 'condition', title: 'Condition and treatment', open: false,
      controls: [
        ['facet', 'peculiarity'], ['facet', 'secondary_treatment'], ['facet', 'wear'], ['facet', 'corrosion'],
        ['facet', 'production_object'], ['facet', 'die']
      ]
    },
    {
      id: 'text', title: 'Description and references', open: false,
      controls: [
        ['text', 'description'], ['text', 'bibliography'], ['text', 'notes']
      ]
    },
    {
      id: 'status', title: 'Record status', open: false,
      controls: [['flags']]
    }
  ];

  const state = {
    records: [], facets: {}, schema: {}, selected: new Map(), texts: {}, flags: {}, ranges: {},
    search: '', page: 1, perPage: 24, sort: 'identifier-asc', view: 'grid'
  };
  Object.keys(TEXT_DEFS).forEach(key => { state.texts[key] = ''; });
  Object.keys(RANGE_DEFS).forEach(key => { state.ranges[key] = ''; });

  const els = {
    search: document.querySelector('#search-input'), results: document.querySelector('#results'),
    count: document.querySelector('#result-count'), filterGroups: document.querySelector('#filter-groups'),
    active: document.querySelector('#active-filters'), pagination: document.querySelector('#pagination'),
    sort: document.querySelector('#sort-select'), perPage: document.querySelector('#per-page-select'),
    clear: document.querySelector('#clear-filters'), panel: document.querySelector('#filter-panel'),
    mobileButton: document.querySelector('#mobile-filter-button'), mobileCount: document.querySelector('#mobile-filter-count'),
    closeFilters: document.querySelector('#close-filters'), applyMobile: document.querySelector('#apply-mobile-filters'),
    backdrop: document.querySelector('#filter-backdrop'), export: document.querySelector('#export-results'),
    viewButtons: [...document.querySelectorAll('[data-view]')]
  };

  function normalizeText(value) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
  }

  function valueKey(item) {
    return item?.uri || item?.value || item?.label || '';
  }

  function itemLabels(items) {
    return (items || []).map(item => item.label).filter(Boolean);
  }

  function recordSearchText(record) {
    const parts = [record.identifier, record.title, record.date?.label, ...(record.bibliography || []), ...(record.descriptions || [])];
    Object.values(record.facets || {}).forEach(values => values.forEach(item => parts.push(item.label)));
    Object.values(record.text_fields || {}).forEach(values => parts.push(...values));
    return normalizeText(parts.join(' '));
  }

  function selectedCount() {
    let total = 0;
    state.selected.forEach(values => { total += values.size; });
    total += Object.values(state.ranges).filter(value => value !== '').length;
    total += Object.values(state.texts).filter(Boolean).length;
    total += Object.values(state.flags).filter(Boolean).length;
    return total;
  }

  function matchesRange(value, min, max) {
    if (min !== '' && (value === null || value === undefined || Number(value) < Number(min))) return false;
    if (max !== '' && (value === null || value === undefined || Number(value) > Number(max))) return false;
    return true;
  }

  function recordMatches(record) {
    const query = normalizeText(state.search);
    if (query && !record._searchText.includes(query)) return false;

    for (const [facet, selectedValues] of state.selected.entries()) {
      if (!selectedValues.size) continue;
      const recordValues = new Set((record.facets?.[facet] || []).map(valueKey));
      if (![...selectedValues].some(value => recordValues.has(value))) return false;
    }

    for (const [key, rawQuery] of Object.entries(state.texts)) {
      const fieldQuery = normalizeText(rawQuery);
      if (!fieldQuery) continue;
      const values = record.text_fields?.[key] || [];
      if (!normalizeText(values.join(' ')).includes(fieldQuery)) return false;
    }

    const { start, end } = record.date || {};
    if (state.ranges.dateMin !== '' && (end === null || end === undefined || end < Number(state.ranges.dateMin))) return false;
    if (state.ranges.dateMax !== '' && (start === null || start === undefined || start > Number(state.ranges.dateMax))) return false;

    for (const field of ['weight', 'diameter', 'axis', 'height', 'width']) {
      if (!matchesRange(record.measurements?.[field], state.ranges[`${field}Min`], state.ranges[`${field}Max`])) return false;
    }

    if (state.ranges.notebookPageMin !== '' || state.ranges.notebookPageMax !== '') {
      const pages = record.notebook_pages || [];
      if (!pages.some(page => matchesRange(page, state.ranges.notebookPageMin, state.ranges.notebookPageMax))) return false;
    }

    for (const [flag, selected] of Object.entries(state.flags)) {
      if (selected && !record.flags?.[flag]) return false;
    }
    return true;
  }

  function filteredRecords() {
    return state.records.filter(recordMatches);
  }

  function sortedRecords(records) {
    const copy = [...records];
    const numeric = (value, fallback) => Number.isFinite(value) ? value : fallback;
    const textSort = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    switch (state.sort) {
      case 'date-asc': return copy.sort((a, b) => numeric(a.date?.start, 999999) - numeric(b.date?.start, 999999));
      case 'date-desc': return copy.sort((a, b) => numeric(b.date?.end, -999999) - numeric(a.date?.end, -999999));
      case 'weight-asc': return copy.sort((a, b) => numeric(a.measurements?.weight, 999999) - numeric(b.measurements?.weight, 999999));
      case 'weight-desc': return copy.sort((a, b) => numeric(b.measurements?.weight, -1) - numeric(a.measurements?.weight, -1));
      case 'diameter-asc': return copy.sort((a, b) => numeric(a.measurements?.diameter, 999999) - numeric(b.measurements?.diameter, 999999));
      case 'diameter-desc': return copy.sort((a, b) => numeric(b.measurements?.diameter, -1) - numeric(a.measurements?.diameter, -1));
      case 'modified-desc': return copy.sort((a, b) => String(b.modified || '').localeCompare(String(a.modified || '')));
      default: return copy.sort((a, b) => textSort(a.identifier, b.identifier));
    }
  }

  function rangeControl(keys) {
    const [minKey, maxKey] = keys;
    const min = RANGE_DEFS[minKey];
    const max = RANGE_DEFS[maxKey];
    const fieldLabel = min.label.replace(/ from$/, '');
    const extents = state.schema.numeric_extents?.[min.field] || {};
    const step = ['weight', 'diameter', 'height', 'width'].includes(min.field) ? '0.01' : '1';
    const minPlaceholder = extents.min ?? '';
    const maxPlaceholder = extents.max ?? '';
    return `<fieldset class="range-control"><legend>${NX.escapeHTML(fieldLabel)}${min.unit ? ` <span>${NX.escapeHTML(min.unit)}</span>` : ''}</legend>
      <div class="range-grid">
        <label><span>From</span><input type="number" step="${step}" data-range-filter="${minKey}" value="${NX.escapeHTML(state.ranges[minKey])}" placeholder="${NX.escapeHTML(minPlaceholder)}"></label>
        <label><span>To</span><input type="number" step="${step}" data-range-filter="${maxKey}" value="${NX.escapeHTML(state.ranges[maxKey])}" placeholder="${NX.escapeHTML(maxPlaceholder)}"></label>
      </div>${min.field === 'date' ? '<p class="field-help">Use negative years for BCE.</p>' : ''}</fieldset>`;
  }

  function textControl(key) {
    const def = TEXT_DEFS[key];
    return `<label class="field-control"><span>${NX.escapeHTML(def.label)}</span><input type="search" data-text-filter="${key}" value="${NX.escapeHTML(state.texts[key])}" placeholder="${NX.escapeHTML(def.placeholder)}" autocomplete="off"></label>`;
  }

  function facetControl(name) {
    const facet = state.facets[name] || { label: state.schema.facet_labels?.[name] || name, values: [] };
    const selected = state.selected.get(name) || new Set();
    if (!facet.values?.length) {
      return `<section class="facet-block facet-empty-block"><div class="facet-heading"><h4>${NX.escapeHTML(facet.label)}</h4></div><p class="facet-empty">No indexed values</p></section>`;
    }
    const searchable = facet.values.length > 8;
    const options = facet.values.map((item, index) => {
      const isSelected = selected.has(item.value);
      const sourceClass = item.source?.startsWith('rdf') || item.source === 'derived-place-hierarchy' ? ' controlled' : '';
      return `<label class="facet-option${index >= 10 ? ' facet-extra' : ''}" data-facet-label="${NX.escapeHTML(normalizeText(item.label))}">
        <input type="checkbox" data-facet="${name}" value="${NX.escapeHTML(item.value)}" ${isSelected ? 'checked' : ''}>
        <span class="facet-option-label${sourceClass}" title="${sourceClass ? 'URI-backed or ontology-derived value' : 'Recorded literal value'}">${NX.escapeHTML(item.label)}</span>
        <small class="facet-count" data-facet-count="${name}" data-value="${NX.escapeHTML(item.value)}">${item.count}</small>
      </label>`;
    }).join('');
    return `<section class="facet-block" data-facet-block="${name}">
      <div class="facet-heading"><h4>${NX.escapeHTML(facet.label)}</h4>${selected.size ? `<button type="button" class="facet-clear" data-clear-facet="${name}">Clear</button>` : ''}</div>
      ${searchable ? `<label class="facet-search"><span class="sr-only">Search ${NX.escapeHTML(facet.label)}</span><input type="search" data-facet-search="${name}" placeholder="Find ${NX.escapeHTML(facet.label.toLowerCase())}…"></label>` : ''}
      <div class="facet-options">${options}</div>
      ${facet.values.length > 10 ? `<button type="button" class="show-more" data-show-more="${name}" data-expanded="false">Show all ${facet.values.length}</button>` : ''}
    </section>`;
  }

  function flagsControl() {
    const labels = state.schema.flag_labels || {};
    return `<div class="flag-options">${Object.entries(labels).map(([key, label]) => {
      const count = state.records.filter(record => record.flags?.[key]).length;
      return `<label class="facet-option flag-option${count === 0 ? ' unavailable' : ''}"><input type="checkbox" data-flag-filter="${key}" ${state.flags[key] ? 'checked' : ''} ${count === 0 ? 'disabled' : ''}><span>${NX.escapeHTML(label)}</span><small>${count}</small></label>`;
    }).join('')}</div>`;
  }

  function controlHTML(control) {
    const [type, payload] = control;
    if (type === 'text') return textControl(payload);
    if (type === 'rangePair') return rangeControl(payload);
    if (type === 'facet') return facetControl(payload);
    if (type === 'flags') return flagsControl();
    return '';
  }

  function renderFilterGroups() {
    els.filterGroups.innerHTML = FILTER_GROUPS.map(group => {
      const content = group.controls.map(controlHTML).filter(Boolean).join('');
      if (!content) return '';
      return `<details class="filter-group" data-filter-group="${group.id}" ${group.open ? 'open' : ''}>
        <summary><span>${NX.escapeHTML(group.title)}</span><span class="group-status" data-group-status="${group.id}"></span></summary>
        <div class="filter-group-content">${content}</div>
      </details>`;
    }).join('');
    updateGroupStatus();
  }

  function groupSelectionCount(group) {
    let count = 0;
    group.controls.forEach(([type, payload]) => {
      if (type === 'facet') count += state.selected.get(payload)?.size || 0;
      if (type === 'text' && state.texts[payload]) count += 1;
      if (type === 'rangePair') payload.forEach(key => { if (state.ranges[key] !== '') count += 1; });
      if (type === 'flags') count += Object.values(state.flags).filter(Boolean).length;
    });
    return count;
  }

  function updateGroupStatus() {
    FILTER_GROUPS.forEach(group => {
      const status = document.querySelector(`[data-group-status="${group.id}"]`);
      if (!status) return;
      const count = groupSelectionCount(group);
      status.textContent = count ? String(count) : '';
      status.classList.toggle('has-value', Boolean(count));
    });
  }

  function photoPlaceholderIcon() {
    return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7.5h3l1.4-2h7.2l1.4 2h3v11H4z"/><circle cx="12" cy="13" r="3.2"/></svg>`;
  }

  function photographsBySide(record) {
    const photos = [...(record.photos || [])];
    const used = new Set();
    const matchSide = side => {
      const index = photos.findIndex((photo, photoIndex) => {
        if (used.has(photoIndex)) return false;
        const value = normalizeText(photo.display_side || photo.side || '');
        return side === 'obverse' ? value.startsWith('obv') : value.startsWith('rev');
      });
      if (index >= 0) {
        used.add(index);
        return photos[index];
      }
      const fallback = photos.findIndex((_photo, photoIndex) => !used.has(photoIndex));
      if (fallback >= 0) {
        used.add(fallback);
        return photos[fallback];
      }
      return null;
    };
    return { obverse: matchSide('obverse'), reverse: matchSide('reverse') };
  }

  function faceMedia(photo, side) {
    const sideLabel = side === 'obverse' ? 'Obverse' : 'Reverse';
    if (!photo) {
      return `<div class="face-media empty-photo" aria-label="${sideLabel}: no photograph available">
        <span class="photo-placeholder-icon">${photoPlaceholderIcon()}</span>
        <small>No photograph available</small>
      </div>`;
    }

    const label = photo.label || `${sideLabel} photograph`;
    const href = photo.resource_url || photo.image_url || '';
    if (photo.image_url) {
      const image = `<img src="${NX.escapeHTML(photo.image_url)}" alt="${NX.escapeHTML(label)}" loading="lazy">`;
      return href
        ? `<a class="face-media has-image" href="${NX.escapeHTML(href)}" target="_blank" rel="noreferrer" title="Open ${NX.escapeHTML(label)}">${image}</a>`
        : `<div class="face-media has-image">${image}</div>`;
    }

    return `<a class="face-media metis-photo" href="${NX.escapeHTML(href)}" target="_blank" rel="noreferrer" aria-label="Open ${NX.escapeHTML(label)} in METIS">
      <span class="photo-placeholder-icon">${photoPlaceholderIcon()}</span>
      <small>Open in METIS <span aria-hidden="true">↗</span></small>
    </a>`;
  }

  function facePanel(face, side, photo) {
    const title = side === 'obverse' ? 'Obverse' : 'Reverse';
    const description = face?.description?.[0] || '';
    const legend = face?.legend?.join(' · ') || '';
    return `<section class="coin-side-panel">
      <header><span>${title}</span></header>
      <div class="coin-side-content">
        ${faceMedia(photo, side)}
        <div class="coin-side-copy">
          ${description ? `<p>${NX.escapeHTML(description)}</p>` : '<p class="not-recorded">Description not recorded</p>'}
          ${legend ? `<div class="side-legend"><small>Legend</small><strong>${NX.escapeHTML(legend)}</strong></div>` : '<div class="side-legend empty"><small>Legend</small><span>Not recorded</span></div>'}
        </div>
      </div>
    </section>`;
  }

  function recordDisplayTitle(record) {
    const authority = NX.firstLabel(record.facets.authority);
    const issuer = NX.firstLabel(record.facets.issuer);
    const mint = NX.firstLabel(record.facets.mint);
    const denomination = NX.firstLabel(record.facets.denomination);
    const title = !/^COIN\s/i.test(record.title || '') ? record.title : '';
    return authority || issuer || title || [denomination, mint].filter(Boolean).join(' · ') || mint || 'Unidentified coin';
  }

  function recordDisplayIdentifier(record) {
    const identifier = String(record.identifier || '').trim();
    if (!identifier) return 'COIN';
    return /^COIN(?:\s|$)/i.test(identifier)
      ? identifier.replace(/^COIN/i, 'COIN')
      : `COIN ${identifier}`;
  }

  function metadataLine(record) {
    const values = [
      record.date?.label,
      NX.firstLabel(record.facets.material),
      NX.firstLabel(record.facets.denomination),
      NX.formatMeasurement(record.measurements?.weight, 'g'),
      NX.formatMeasurement(record.measurements?.diameter, 'mm'),
      Number.isFinite(record.measurements?.axis) ? `${record.measurements.axis}h` : ''
    ].filter(Boolean);
    return values.map(value => `<span>${NX.escapeHTML(value)}</span>`).join('');
  }

  function recordCard(record) {
    const title = recordDisplayTitle(record);
    const recordURL = `record.html?id=${encodeURIComponent(record.id)}`;
    const mint = NX.firstLabel(record.facets.mint);
    const region = NX.firstLabel(record.facets.region);
    const findspot = NX.firstLabel(record.facets.findspot);
    const typeSeries = NX.firstLabel(record.facets.type_series);
    const sidePhotos = photographsBySide(record);
    const displayIdentifier = recordDisplayIdentifier(record);
    const mintAndRegion = [mint, region && region !== mint ? region : ''].filter(Boolean).join(' · ');
    return `<article class="record-card">
      <a class="record-card-target" href="${recordURL}" aria-label="Open full record for ${NX.escapeHTML(displayIdentifier)}: ${NX.escapeHTML(title)}"></a>
      <div class="record-card-body">
        <header class="record-card-header">
          <div class="record-heading">
            <h3>${NX.escapeHTML(displayIdentifier)}: ${NX.escapeHTML(title)}</h3>
          </div>
          <div class="record-meta" aria-label="Summary">${metadataLine(record)}</div>
        </header>
        <div class="coin-sides-grid">
          ${facePanel(record.obverse, 'obverse', sidePhotos.obverse)}
          ${facePanel(record.reverse, 'reverse', sidePhotos.reverse)}
        </div>
        <div class="record-context">
          <span><small>Mint</small><b>${mintAndRegion ? NX.escapeHTML(mintAndRegion) : '–'}</b></span>
          <span><small>Findspot</small><b>${findspot ? NX.escapeHTML(findspot) : '–'}</b></span>
          <span><small>Type</small><b>${typeSeries ? NX.escapeHTML(typeSeries) : '–'}</b></span>
          <a class="record-link" href="${recordURL}">View full record <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </article>`;
  }

  function renderActiveFilters() {
    const chips = [];
    if (state.search) chips.push(`<button type="button" data-remove-search>Search: ${NX.escapeHTML(state.search)} <span>×</span></button>`);
    state.selected.forEach((values, facet) => values.forEach(value => {
      const label = state.facets[facet]?.values?.find(item => item.value === value)?.label || value;
      chips.push(`<button type="button" data-remove-facet="${facet}" data-remove-value="${NX.escapeHTML(value)}">${NX.escapeHTML(label)} <span>×</span></button>`);
    }));
    Object.entries(state.texts).forEach(([key, value]) => {
      if (value) chips.push(`<button type="button" data-remove-text="${key}">${NX.escapeHTML(TEXT_DEFS[key].label)}: ${NX.escapeHTML(value)} <span>×</span></button>`);
    });
    Object.entries(state.ranges).forEach(([key, value]) => {
      if (value !== '') {
        const def = RANGE_DEFS[key];
        chips.push(`<button type="button" data-remove-range="${key}">${NX.escapeHTML(def.label)}: ${NX.escapeHTML(value)}${def.unit ? ` ${def.unit}` : ''} <span>×</span></button>`);
      }
    });
    Object.entries(state.flags).forEach(([key, value]) => {
      if (value) chips.push(`<button type="button" data-remove-flag="${key}">${NX.escapeHTML(state.schema.flag_labels?.[key] || key)} <span>×</span></button>`);
    });
    els.active.innerHTML = chips.length ? `<span class="active-label">Applied filters</span>${chips.join('')}<button type="button" class="clear-chip" data-clear-all>Clear all</button>` : '';
    const count = selectedCount();
    els.mobileCount.textContent = count ? String(count) : '';
    els.mobileCount.hidden = !count;
    updateGroupStatus();
  }

  function renderPagination(total) {
    const pages = Math.max(1, Math.ceil(total / state.perPage));
    if (state.page > pages) state.page = pages;
    if (pages <= 1) { els.pagination.innerHTML = ''; return; }
    const buttons = [`<button type="button" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}>Previous</button>`];
    let insertedEllipsis = false;
    for (let page = 1; page <= pages; page += 1) {
      const visible = page === 1 || page === pages || Math.abs(page - state.page) <= 2;
      if (visible) {
        buttons.push(`<button type="button" data-page="${page}" ${page === state.page ? 'aria-current="page"' : ''}>${page}</button>`);
        insertedEllipsis = false;
      } else if (!insertedEllipsis) {
        buttons.push('<span>…</span>');
        insertedEllipsis = true;
      }
    }
    buttons.push(`<button type="button" data-page="${state.page + 1}" ${state.page === pages ? 'disabled' : ''}>Next</button>`);
    els.pagination.innerHTML = buttons.join('');
  }

  function currentFacetCounts(records) {
    const counts = new Map();
    records.forEach(record => {
      Object.entries(record.facets || {}).forEach(([facet, values]) => {
        if (!counts.has(facet)) counts.set(facet, new Map());
        values.forEach(item => {
          const key = valueKey(item);
          counts.get(facet).set(key, (counts.get(facet).get(key) || 0) + 1);
        });
      });
    });
    return counts;
  }

  function updateFacetCounts(records) {
    const counts = currentFacetCounts(records);
    document.querySelectorAll('[data-facet-count]').forEach(element => {
      const facet = element.dataset.facetCount;
      const value = element.dataset.value;
      element.textContent = counts.get(facet)?.get(value) || 0;
    });
  }

  function syncInputs() {
    els.search.value = state.search;
    els.sort.value = state.sort;
    els.perPage.value = String(state.perPage);
    document.querySelectorAll('[data-text-filter]').forEach(input => { input.value = state.texts[input.dataset.textFilter] || ''; });
    document.querySelectorAll('[data-range-filter]').forEach(input => { input.value = state.ranges[input.dataset.rangeFilter] || ''; });
    document.querySelectorAll('[data-flag-filter]').forEach(input => { input.checked = Boolean(state.flags[input.dataset.flagFilter]); });
    document.querySelectorAll('[data-facet]').forEach(input => { input.checked = state.selected.get(input.dataset.facet)?.has(input.value) || false; });
    els.viewButtons.forEach(button => button.classList.toggle('active', button.dataset.view === state.view));
  }

  function syncURL() {
    const params = new URLSearchParams();
    if (state.search) params.set('q', state.search);
    if (state.sort !== 'identifier-asc') params.set('sort', state.sort);
    if (state.view !== 'grid') params.set('view', state.view);
    if (state.perPage !== 24) params.set('per_page', String(state.perPage));
    if (state.page > 1) params.set('page', String(state.page));
    state.selected.forEach((values, facet) => values.forEach(value => params.append(`f_${facet}`, value)));
    Object.entries(state.texts).forEach(([key, value]) => { if (value) params.set(`t_${key}`, value); });
    Object.entries(state.ranges).forEach(([key, value]) => { if (value !== '') params.set(`r_${key}`, value); });
    Object.entries(state.flags).forEach(([key, value]) => { if (value) params.append('flag', key); });
    const query = params.toString();
    try {
      history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}`);
    } catch (error) {
      // about:blank/file previews may have an opaque origin; GitHub Pages does not.
    }
  }

  function restoreURLState() {
    const params = new URLSearchParams(location.search);
    state.search = params.get('q') || '';
    state.sort = params.get('sort') || 'identifier-asc';
    state.view = params.get('view') === 'list' ? 'list' : 'grid';
    const requestedPerPage = Number(params.get('per_page'));
    if ([24, 48, 96].includes(requestedPerPage)) state.perPage = requestedPerPage;
    state.page = Math.max(1, Number(params.get('page')) || 1);
    Object.keys(TEXT_DEFS).forEach(key => { state.texts[key] = params.get(`t_${key}`) || ''; });
    Object.keys(RANGE_DEFS).forEach(key => { state.ranges[key] = params.get(`r_${key}`) || ''; });
    Object.keys(state.schema.flag_labels || {}).forEach(key => { state.flags[key] = params.getAll('flag').includes(key); });
    Object.keys(state.facets).forEach(facet => {
      const values = params.getAll(`f_${facet}`);
      if (values.length) state.selected.set(facet, new Set(values));
    });
  }

  function render() {
    const filtered = filteredRecords();
    const sorted = sortedRecords(filtered);
    const pages = Math.max(1, Math.ceil(sorted.length / state.perPage));
    if (state.page > pages) state.page = pages;
    const start = (state.page - 1) * state.perPage;
    const visible = sorted.slice(start, start + state.perPage);

    els.count.innerHTML = `<strong>${filtered.length.toLocaleString()}</strong> ${filtered.length === 1 ? 'record' : 'records'}${filtered.length !== state.records.length ? ` <span>of ${state.records.length.toLocaleString()}</span>` : ''}`;
    els.results.className = `record-grid ${state.view === 'list' ? 'list-view' : ''}`;
    els.results.innerHTML = visible.length ? visible.map(recordCard).join('') : `<div class="empty-state"><h3>No records match these filters</h3><p>Remove one or more filters or broaden the search terms.</p><button type="button" class="primary-button inline-button" data-clear-all>Clear filters</button></div>`;
    renderPagination(filtered.length);
    renderActiveFilters();
    updateFacetCounts(filtered);
    syncInputs();
    syncURL();
  }

  function clearAll() {
    state.search = '';
    state.selected.clear();
    Object.keys(state.texts).forEach(key => { state.texts[key] = ''; });
    Object.keys(state.ranges).forEach(key => { state.ranges[key] = ''; });
    Object.keys(state.flags).forEach(key => { state.flags[key] = false; });
    state.page = 1;
    renderFilterGroups();
    render();
  }

  function closeFilters() {
    document.body.classList.remove('filters-open');
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function exportResults() {
    const records = sortedRecords(filteredRecords());
    const headers = ['Identifier', 'Title', 'Date', 'Authority', 'Issuer', 'Mint', 'Region', 'Material', 'Denomination', 'Weight (g)', 'Diameter (mm)', 'Axis', 'Obverse legend', 'Obverse type', 'Reverse legend', 'Reverse type', 'Findspot', 'Notebook', 'Notebook page', 'Type series', 'Bibliography', 'METIS resources', 'RDF URI'];
    const rows = records.map(record => [
      record.identifier, recordDisplayTitle(record), record.date?.label,
      itemLabels(record.facets.authority).join('; '), itemLabels(record.facets.issuer).join('; '),
      itemLabels(record.facets.mint).join('; '), itemLabels(record.facets.region).join('; '),
      itemLabels(record.facets.material).join('; '), itemLabels(record.facets.denomination).join('; '),
      record.measurements?.weight ?? '', record.measurements?.diameter ?? '', record.measurements?.axis ?? '',
      record.obverse?.legend?.join('; ') || '', record.obverse?.description?.join('; ') || '',
      record.reverse?.legend?.join('; ') || '', record.reverse?.description?.join('; ') || '',
      itemLabels(record.facets.findspot).join('; '), itemLabels(record.facets.notebook).join('; '),
      record.notebook_pages?.join('; ') || '', itemLabels(record.facets.type_series).join('; '),
      record.bibliography?.join('; ') || '', record.photos?.map(photo => photo.resource_url).join('; ') || '', record.uri
    ]);
    const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'numismatic-explorer-results.csv';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  }

  let searchTimer;
  let filterTimer;
  els.search.addEventListener('input', event => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.search = event.target.value; state.page = 1; render(); }, 140);
  });
  els.search.addEventListener('search', event => { state.search = event.target.value; state.page = 1; render(); });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault(); els.search.focus(); els.search.select();
    }
  });

  els.filterGroups.addEventListener('change', event => {
    const facet = event.target.closest('[data-facet]');
    if (facet) {
      if (!state.selected.has(facet.dataset.facet)) state.selected.set(facet.dataset.facet, new Set());
      facet.checked ? state.selected.get(facet.dataset.facet).add(facet.value) : state.selected.get(facet.dataset.facet).delete(facet.value);
      if (!state.selected.get(facet.dataset.facet).size) state.selected.delete(facet.dataset.facet);
      state.page = 1; renderActiveFilters(); render(); return;
    }
    const flag = event.target.closest('[data-flag-filter]');
    if (flag) { state.flags[flag.dataset.flagFilter] = flag.checked; state.page = 1; render(); }
  });

  els.filterGroups.addEventListener('input', event => {
    const text = event.target.closest('[data-text-filter]');
    if (text) {
      state.texts[text.dataset.textFilter] = text.value;
      state.page = 1;
      clearTimeout(filterTimer);
      filterTimer = setTimeout(render, 160);
      return;
    }
    const range = event.target.closest('[data-range-filter]');
    if (range) {
      state.ranges[range.dataset.rangeFilter] = range.value;
      state.page = 1;
      clearTimeout(filterTimer);
      filterTimer = setTimeout(render, 160);
      return;
    }
    const facetSearch = event.target.closest('[data-facet-search]');
    if (facetSearch) {
      const block = facetSearch.closest('[data-facet-block]');
      const query = normalizeText(facetSearch.value);
      block.classList.toggle('facet-searching', Boolean(query));
      block.querySelectorAll('.facet-option').forEach(option => {
        option.hidden = Boolean(query) && !option.dataset.facetLabel.includes(query);
      });
    }
  });

  els.filterGroups.addEventListener('click', event => {
    const showMore = event.target.closest('[data-show-more]');
    if (showMore) {
      const block = showMore.closest('[data-facet-block]');
      const expanded = showMore.dataset.expanded === 'true';
      block.classList.toggle('show-all-options', !expanded);
      showMore.dataset.expanded = String(!expanded);
      showMore.textContent = expanded ? `Show all ${block.querySelectorAll('.facet-option').length}` : 'Show fewer';
      return;
    }
    const clearFacet = event.target.closest('[data-clear-facet]');
    if (clearFacet) {
      state.selected.delete(clearFacet.dataset.clearFacet); state.page = 1; renderFilterGroups(); render();
    }
  });

  els.active.addEventListener('click', event => {
    if (event.target.closest('[data-clear-all]')) { clearAll(); return; }
    if (event.target.closest('[data-remove-search]')) { state.search = ''; state.page = 1; render(); return; }
    const facet = event.target.closest('[data-remove-facet]');
    if (facet) {
      state.selected.get(facet.dataset.removeFacet)?.delete(facet.dataset.removeValue);
      if (!state.selected.get(facet.dataset.removeFacet)?.size) state.selected.delete(facet.dataset.removeFacet);
      state.page = 1; renderFilterGroups(); render(); return;
    }
    const text = event.target.closest('[data-remove-text]');
    if (text) { state.texts[text.dataset.removeText] = ''; state.page = 1; render(); return; }
    const range = event.target.closest('[data-remove-range]');
    if (range) { state.ranges[range.dataset.removeRange] = ''; state.page = 1; render(); return; }
    const flag = event.target.closest('[data-remove-flag]');
    if (flag) { state.flags[flag.dataset.removeFlag] = false; state.page = 1; render(); }
  });

  els.results.addEventListener('click', event => { if (event.target.closest('[data-clear-all]')) clearAll(); });
  els.pagination.addEventListener('click', event => {
    const button = event.target.closest('[data-page]');
    if (!button || button.disabled) return;
    state.page = Number(button.dataset.page); render(); window.scrollTo({ top: document.querySelector('.results-area').offsetTop - 90, behavior: 'smooth' });
  });
  els.sort.addEventListener('change', () => { state.sort = els.sort.value; state.page = 1; render(); });
  els.perPage.addEventListener('change', () => { state.perPage = Number(els.perPage.value); state.page = 1; render(); });
  els.viewButtons.forEach(button => button.addEventListener('click', () => { state.view = button.dataset.view; render(); }));
  els.clear.addEventListener('click', clearAll);
  els.export.addEventListener('click', exportResults);
  els.mobileButton.addEventListener('click', () => document.body.classList.add('filters-open'));
  els.closeFilters.addEventListener('click', closeFilters);
  els.applyMobile.addEventListener('click', closeFilters);
  els.backdrop.addEventListener('click', closeFilters);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeFilters(); });

  try {
    const [config, records, facets, schema] = await Promise.all([
      NX.loadSite(), NX.fetchJSON(`${NX.DATA_ROOT}coins.json`), NX.fetchJSON(`${NX.DATA_ROOT}facets.json`), NX.fetchJSON(`${NX.DATA_ROOT}schema.json`)
    ]);
    state.records = records.map(record => ({ ...record, _searchText: recordSearchText(record) }));
    state.facets = facets;
    state.schema = schema;
    state.perPage = Number(config.records_per_page) || 24;
    Object.keys(schema.flag_labels || {}).forEach(key => { state.flags[key] = false; });
    restoreURLState();
    renderFilterGroups();
    render();
  } catch (error) {
    console.error(error);
    els.results.innerHTML = `<div class="empty-state error"><h3>The data index could not be loaded</h3><p>${NX.escapeHTML(error.message)}</p><code>python scripts/build_data.py</code></div>`;
    els.count.textContent = 'Data unavailable';
  }
})();
