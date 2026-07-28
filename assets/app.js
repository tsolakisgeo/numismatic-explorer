'use strict';

(async () => {
  const NX = window.NumismaticExplorer;
  const state = {
    records: [],
    facets: {},
    selected: new Map(),
    search: '',
    page: 1,
    perPage: 24,
    sort: 'identifier-asc',
    ranges: { dateMin: '', dateMax: '', weightMin: '', weightMax: '', diameterMin: '', diameterMax: '' }
  };

  const els = {
    search: document.querySelector('#search-input'), results: document.querySelector('#results'), count: document.querySelector('#result-count'),
    facetSections: document.querySelector('#facet-sections'), active: document.querySelector('#active-filters'), pagination: document.querySelector('#pagination'),
    sort: document.querySelector('#sort-select'), clear: document.querySelector('#clear-filters'), panel: document.querySelector('#filter-panel'),
    mobileButton: document.querySelector('#mobile-filter-button'), mobileCount: document.querySelector('#mobile-filter-count'),
    closeFilters: document.querySelector('#close-filters'), backdrop: document.querySelector('#filter-backdrop')
  };

  const rangeInputs = {
    dateMin: document.querySelector('#date-min'), dateMax: document.querySelector('#date-max'),
    weightMin: document.querySelector('#weight-min'), weightMax: document.querySelector('#weight-max'),
    diameterMin: document.querySelector('#diameter-min'), diameterMax: document.querySelector('#diameter-max')
  };

  function recordText(record) {
    const parts = [record.identifier, record.title, record.date?.label, ...(record.bibliography || []), ...(record.descriptions || [])];
    Object.values(record.facets || {}).forEach(values => values.forEach(item => parts.push(item.label)));
    ['obverse', 'reverse'].forEach(side => {
      const face = record[side];
      if (face) parts.push(...(face.legend || []), ...(face.description || []), ...NX.labels(face.controlmarks), ...NX.labels(face.mintmarks));
    });
    record.cards?.forEach(card => card.raw_fields?.forEach(field => parts.push(field.value)));
    return parts.join(' ').toLocaleLowerCase();
  }

  function selectedCount() {
    let total = 0;
    state.selected.forEach(values => { total += values.size; });
    total += Object.values(state.ranges).filter(Boolean).length;
    return total;
  }

  function matchesRange(value, min, max) {
    if (min !== '' && (value === null || value === undefined || Number(value) < Number(min))) return false;
    if (max !== '' && (value === null || value === undefined || Number(value) > Number(max))) return false;
    return true;
  }

  function filteredRecords() {
    const query = state.search.trim().toLocaleLowerCase();
    return state.records.filter(record => {
      if (query && !recordText(record).includes(query)) return false;
      for (const [facet, selectedValues] of state.selected.entries()) {
        if (!selectedValues.size) continue;
        const recordValues = new Set((record.facets[facet] || []).map(item => item.uri || item.value || item.label));
        if (![...selectedValues].some(value => recordValues.has(value))) return false;
      }
      const { start, end } = record.date || {};
      if (state.ranges.dateMin !== '' && (end === null || end === undefined || end < Number(state.ranges.dateMin))) return false;
      if (state.ranges.dateMax !== '' && (start === null || start === undefined || start > Number(state.ranges.dateMax))) return false;
      if (!matchesRange(record.measurements?.weight, state.ranges.weightMin, state.ranges.weightMax)) return false;
      if (!matchesRange(record.measurements?.diameter, state.ranges.diameterMin, state.ranges.diameterMax)) return false;
      return true;
    });
  }

  function sortedRecords(records) {
    const copy = [...records];
    const numberOr = (value, fallback) => Number.isFinite(value) ? value : fallback;
    switch (state.sort) {
      case 'date-asc': return copy.sort((a, b) => numberOr(a.date?.start, 999999) - numberOr(b.date?.start, 999999));
      case 'date-desc': return copy.sort((a, b) => numberOr(b.date?.end, -999999) - numberOr(a.date?.end, -999999));
      case 'weight-desc': return copy.sort((a, b) => numberOr(b.measurements?.weight, -1) - numberOr(a.measurements?.weight, -1));
      case 'diameter-desc': return copy.sort((a, b) => numberOr(b.measurements?.diameter, -1) - numberOr(a.measurements?.diameter, -1));
      default: return copy.sort((a, b) => a.identifier.localeCompare(b.identifier, undefined, { numeric: true }));
    }
  }

  function faceSummary(face, side) {
    if (!face) return `<div class="face-summary empty"><span>${side}</span><p>No ${side.toLowerCase()} description</p></div>`;
    const description = face.description?.[0] || '';
    const legend = face.legend?.join(' · ') || '';
    return `<div class="face-summary"><span>${side}</span>${description ? `<p>${NX.escapeHTML(description)}</p>` : ''}${legend ? `<small>${NX.escapeHTML(legend)}</small>` : ''}</div>`;
  }

  function photoStrip(record) {
    if (!record.photos?.length) return '';
    return `<div class="photo-resource-strip">${record.photos.slice(0, 2).map(photo => photo.image_url
      ? `<a href="${NX.escapeHTML(photo.resource_url)}" target="_blank" rel="noreferrer"><img src="${NX.escapeHTML(photo.image_url)}" alt="${NX.escapeHTML(photo.label)}"><span>${NX.escapeHTML(photo.label)}</span></a>`
      : `<a class="photo-resource" href="${NX.escapeHTML(photo.resource_url)}" target="_blank" rel="noreferrer"><span class="photo-icon">◉</span><span>${NX.escapeHTML(photo.label)}</span><small>Open in METIS ↗</small></a>`).join('')}</div>`;
  }

  function recordCard(record) {
    const material = NX.firstLabel(record.facets.material);
    const denomination = NX.firstLabel(record.facets.denomination);
    const authority = NX.firstLabel(record.facets.authority);
    const mint = NX.firstLabel(record.facets.mint);
    const measurements = [NX.formatMeasurement(record.measurements?.weight, 'g'), NX.formatMeasurement(record.measurements?.diameter, 'mm'), Number.isFinite(record.measurements?.axis) ? `${record.measurements.axis}h` : ''].filter(Boolean);
    return `<article class="record-card">
      <div class="record-card-header">
        <div><p class="record-id">${NX.escapeHTML(record.identifier)}</p><h3>${NX.escapeHTML(authority || mint || record.title)}</h3></div>
        ${record.requires_review ? '<span class="review-badge" title="Human review required">Review</span>' : ''}
      </div>
      <div class="record-meta">
        ${record.date?.label ? `<span>${NX.escapeHTML(record.date.label)}</span>` : ''}
        ${material ? `<span>${NX.escapeHTML(material)}</span>` : ''}
        ${denomination ? `<span>${NX.escapeHTML(denomination)}</span>` : ''}
        ${measurements.map(v => `<span>${NX.escapeHTML(v)}</span>`).join('')}
      </div>
      ${photoStrip(record)}
      <div class="faces-grid">${faceSummary(record.obverse, 'Obverse')}${faceSummary(record.reverse, 'Reverse')}</div>
      <div class="record-card-footer">
        <div>${mint ? `<span class="muted-label">Mint</span> ${NX.escapeHTML(mint)}` : ''}</div>
        <a class="record-link" href="record.html?id=${encodeURIComponent(record.id)}">View record <span aria-hidden="true">→</span></a>
      </div>
    </article>`;
  }

  function renderFacets() {
    const preferred = ['authority', 'issuer', 'mint', 'material', 'denomination', 'type_series', 'findspot', 'collection', 'manufacture', 'object_type', 'shape', 'authenticity', 'reference_work'];
    els.facetSections.innerHTML = preferred.filter(name => state.facets[name]?.values?.length).map((name, index) => {
      const facet = state.facets[name];
      const values = facet.values.map(item => `<label class="facet-option"><input type="checkbox" data-facet="${name}" value="${NX.escapeHTML(item.value)}"><span>${NX.escapeHTML(item.label)}</span><small>${item.count}</small></label>`).join('');
      return `<details class="filter-section" ${index < 5 ? 'open' : ''}><summary>${NX.escapeHTML(facet.label)}</summary><div class="facet-options">${values}</div></details>`;
    }).join('');

    els.facetSections.addEventListener('change', event => {
      const input = event.target.closest('input[data-facet]');
      if (!input) return;
      const facet = input.dataset.facet;
      if (!state.selected.has(facet)) state.selected.set(facet, new Set());
      input.checked ? state.selected.get(facet).add(input.value) : state.selected.get(facet).delete(input.value);
      state.page = 1;
      render();
    });
  }

  function renderActiveFilters() {
    const chips = [];
    state.selected.forEach((values, facet) => values.forEach(value => {
      const label = state.facets[facet]?.values?.find(item => item.value === value)?.label || value;
      chips.push(`<button type="button" data-remove-facet="${facet}" data-remove-value="${NX.escapeHTML(value)}">${NX.escapeHTML(label)} ×</button>`);
    }));
    const rangeLabels = { dateMin: 'Date from', dateMax: 'Date to', weightMin: 'Weight from', weightMax: 'Weight to', diameterMin: 'Diameter from', diameterMax: 'Diameter to' };
    Object.entries(state.ranges).forEach(([key, value]) => { if (value !== '') chips.push(`<button type="button" data-remove-range="${key}">${rangeLabels[key]}: ${NX.escapeHTML(value)} ×</button>`); });
    els.active.innerHTML = chips.join('');
    els.mobileCount.textContent = selectedCount() ? `(${selectedCount()})` : '';
  }

  function renderPagination(total) {
    const pages = Math.max(1, Math.ceil(total / state.perPage));
    if (pages <= 1) { els.pagination.innerHTML = ''; return; }
    const buttons = [];
    buttons.push(`<button type="button" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}>Previous</button>`);
    for (let p = 1; p <= pages; p += 1) {
      if (p === 1 || p === pages || Math.abs(p - state.page) <= 2) buttons.push(`<button type="button" data-page="${p}" ${p === state.page ? 'aria-current="page"' : ''}>${p}</button>`);
      else if (buttons.at(-1) !== '<span>…</span>') buttons.push('<span>…</span>');
    }
    buttons.push(`<button type="button" data-page="${state.page + 1}" ${state.page === pages ? 'disabled' : ''}>Next</button>`);
    els.pagination.innerHTML = buttons.join('');
  }

  function render() {
    const filtered = sortedRecords(filteredRecords());
    const pages = Math.max(1, Math.ceil(filtered.length / state.perPage));
    if (state.page > pages) state.page = pages;
    const start = (state.page - 1) * state.perPage;
    const pageRecords = filtered.slice(start, start + state.perPage);
    els.count.textContent = `${filtered.length.toLocaleString()} ${filtered.length === 1 ? 'record' : 'records'}`;
    els.results.innerHTML = pageRecords.length ? pageRecords.map(recordCard).join('') : '<div class="empty-state"><h3>No records found</h3><p>Remove a filter or try a broader search.</p></div>';
    renderPagination(filtered.length);
    renderActiveFilters();
    const params = new URLSearchParams();
    if (state.search) params.set('q', state.search);
    history.replaceState(null, '', params.toString() ? `?${params}` : location.pathname);
  }

  function clearAll() {
    state.selected.clear(); state.search = ''; state.page = 1;
    Object.keys(state.ranges).forEach(key => { state.ranges[key] = ''; rangeInputs[key].value = ''; });
    els.search.value = '';
    document.querySelectorAll('input[data-facet]').forEach(input => { input.checked = false; });
    render();
  }

  function openFilters() { document.body.classList.add('filters-open'); }
  function closeFilters() { document.body.classList.remove('filters-open'); }

  try {
    const [config, records, facets] = await Promise.all([NX.loadSite(), NX.fetchJSON(`${NX.DATA_ROOT}coins.json`), NX.fetchJSON(`${NX.DATA_ROOT}facets.json`)]);
    state.records = records; state.facets = facets; state.perPage = config.records_per_page || 24;
    const q = new URLSearchParams(location.search).get('q') || '';
    state.search = q; els.search.value = q;
    renderFacets(); render();

    let searchTimer;
    els.search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.search = els.search.value; state.page = 1; render(); }, 150); });
    els.sort.addEventListener('change', () => { state.sort = els.sort.value; state.page = 1; render(); });
    els.clear.addEventListener('click', clearAll);
    Object.entries(rangeInputs).forEach(([key, input]) => input.addEventListener('input', () => { state.ranges[key] = input.value; state.page = 1; render(); }));
    els.active.addEventListener('click', event => {
      const button = event.target.closest('button'); if (!button) return;
      if (button.dataset.removeFacet) {
        state.selected.get(button.dataset.removeFacet)?.delete(button.dataset.removeValue);
        const checkbox = [...document.querySelectorAll(`input[data-facet="${button.dataset.removeFacet}"]`)].find(input => input.value === button.dataset.removeValue);
        if (checkbox) checkbox.checked = false;
      }
      if (button.dataset.removeRange) { state.ranges[button.dataset.removeRange] = ''; rangeInputs[button.dataset.removeRange].value = ''; }
      render();
    });
    els.pagination.addEventListener('click', event => { const button = event.target.closest('button[data-page]'); if (!button || button.disabled) return; state.page = Number(button.dataset.page); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    els.mobileButton.addEventListener('click', openFilters); els.closeFilters.addEventListener('click', closeFilters); els.backdrop.addEventListener('click', closeFilters);
  } catch (error) {
    console.error(error);
    els.count.textContent = 'Could not load the dataset';
    els.results.innerHTML = `<div class="empty-state error"><h3>Build data first</h3><p>${NX.escapeHTML(error.message)}</p><code>python scripts/build_data.py</code></div>`;
  }
})();
