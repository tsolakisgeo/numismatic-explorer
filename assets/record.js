'use strict';

(async () => {
  const NX = window.NumismaticExplorer;
  const page = document.querySelector('#record-page');

  function semanticList(items) {
    if (!items?.length) return '<span class="not-recorded">Not recorded</span>';
    return `<div class="semantic-list">${items.map(item => NX.externalLink(item)).join('')}</div>`;
  }

  function facePanel(face, title) {
    if (!face) return `<section class="detail-card face-detail"><p class="eyebrow">${title}</p><p class="not-recorded">No face resource recorded.</p></section>`;
    const marks = [...(face.controlmarks || []), ...(face.mintmarks || []), ...(face.countermarks || [])];
    return `<section class="detail-card face-detail">
      <p class="eyebrow">${title}</p>
      ${face.description?.length ? `<h2>${NX.escapeHTML(face.description[0])}</h2>` : '<h2>Description not recorded</h2>'}
      ${face.legend?.length ? `<div class="legend-block"><span>Legend</span><p>${face.legend.map(NX.escapeHTML).join('<br>')}</p></div>` : ''}
      ${face.iconography?.length ? `<div class="detail-row"><dt>Iconography</dt><dd>${semanticList(face.iconography)}</dd></div>` : ''}
      ${face.portrait?.length ? `<div class="detail-row"><dt>Portrait</dt><dd>${semanticList(face.portrait)}</dd></div>` : ''}
      ${marks.length ? `<div class="detail-row"><dt>Marks</dt><dd>${semanticList(marks)}</dd></div>` : ''}
      ${face.positions?.length ? `<div class="detail-row"><dt>Position</dt><dd>${face.positions.map(NX.escapeHTML).join('<br>')}</dd></div>` : ''}
      <a class="uri-line" href="${NX.escapeHTML(face.uri)}" target="_blank" rel="noreferrer">${NX.escapeHTML(face.uri)} ↗</a>
    </section>`;
  }

  function photoPanel(photos) {
    if (!photos?.length) return '';
    return `<section class="detail-section"><div class="section-heading"><div><p class="eyebrow">External media</p><h2>Coin photographs</h2></div><p>Photograph resources are linked through <code>data/coin_photos.csv</code>. An explicit side column is authoritative; otherwise row order is used only for display placement.</p></div>
      <div class="detail-photo-grid">${photos.map(photo => photo.image_url
        ? `<a class="detail-photo" href="${NX.escapeHTML(photo.resource_url)}" target="_blank" rel="noreferrer"><img src="${NX.escapeHTML(photo.image_url)}" alt="${NX.escapeHTML(photo.label)}"><strong>${NX.escapeHTML(photo.label)}</strong><span>Open resource in METIS ↗</span></a>`
        : `<a class="detail-photo resource-only" href="${NX.escapeHTML(photo.resource_url)}" target="_blank" rel="noreferrer"><strong>${NX.escapeHTML(photo.label)}</strong><span>Open photograph resource in METIS ↗</span></a>`).join('')}</div>
    </section>`;
  }

  function ontologyRows(record) {
    if (!record.ontology?.length) return '<tr><td>No Nomisma properties were indexed.</td></tr>';
    return record.ontology.map(row => `<tr><th><a href="${NX.escapeHTML(row.property)}" target="_blank" rel="noreferrer">${NX.escapeHTML(row.property_label)} ↗</a><code>${NX.escapeHTML(row.property)}</code></th><td>${semanticList(row.values)}</td></tr>`).join('');
  }

  function facetFacts(record, names) {
    return names.map(([key, label]) => [label, record.facets?.[key]]).filter(([, values]) => values?.length);
  }

  try {
    const [, records] = await Promise.all([NX.loadSite(), NX.fetchJSON(`${NX.DATA_ROOT}coins.json`)]);
    const id = new URLSearchParams(location.search).get('id');
    const record = records.find(item => item.id === id || item.identifier === id);
    if (!record) throw new Error(`No record was found for “${id || ''}”.`);
    document.title = `${record.identifier} · ${document.querySelector('#site-title').textContent}`;

    const identification = facetFacts(record, [
      ['object_type', 'Object type'], ['subtype', 'Subtype'], ['period', 'Period'],
      ['authority', 'Authority'], ['stated_authority', 'Stated authority'], ['issuer', 'Issuer'],
      ['dynasty', 'Dynasty'], ['reign', 'Reign / issue'], ['magistrate', 'Magistrate'],
      ['mint', 'Mint'], ['region', 'Region'], ['material', 'Material'], ['denomination', 'Denomination'],
      ['manufacture', 'Manufacture'], ['shape', 'Shape'], ['authenticity', 'Authenticity'],
      ['type_series', 'Type series'], ['reference_work', 'Reference work']
    ]);

    const context = facetFacts(record, [
      ['findspot', 'Findspot'], ['find_context', 'Find context'], ['immediate_context', 'Immediate context'],
      ['local_context', 'Local context'], ['landscape_context', 'Landscape context'],
      ['area', 'Area'], ['site', 'Site'], ['city', 'City'], ['country', 'Country'], ['collection', 'Collection']
    ]);

    const measurements = [
      ['Weight', NX.formatMeasurement(record.measurements?.weight, 'g')],
      ['Diameter', NX.formatMeasurement(record.measurements?.diameter, 'mm')],
      ['Axis', Number.isFinite(record.measurements?.axis) ? `${record.measurements.axis}h` : ''],
      ['Height', NX.formatMeasurement(record.measurements?.height, 'mm')],
      ['Width', NX.formatMeasurement(record.measurements?.width, 'mm')]
    ].filter(([, value]) => value);

    page.innerHTML = `
      <a class="back-link" href="index.html">← Back to browse</a>
      <header class="record-hero">
        <div><p class="eyebrow">Physical numismatic object</p><h1>${NX.escapeHTML(record.identifier)}</h1><p class="record-uri">${NX.escapeHTML(record.uri)}</p></div>
        <div class="hero-actions">${record.requires_review ? '<span class="review-badge large">Human review</span>' : ''}${record.source_files.map(file => `<a class="secondary-button" href="${NX.escapeHTML(file)}" target="_blank">Turtle source ↗</a>`).join('')}</div>
      </header>
      ${photoPanel(record.photos)}
      <section class="record-overview">
        <div class="detail-card"><p class="eyebrow">Identification</p><dl class="fact-list">
          ${record.date?.label ? `<div><dt>Date</dt><dd>${NX.escapeHTML(record.date.label)}</dd></div>` : ''}
          ${identification.map(([label, values]) => `<div><dt>${label}</dt><dd>${semanticList(values)}</dd></div>`).join('')}
          ${measurements.map(([label, value]) => `<div><dt>${label}</dt><dd>${NX.escapeHTML(value)}</dd></div>`).join('')}
          ${record.bibliography?.length ? `<div><dt>Bibliography</dt><dd>${record.bibliography.map(NX.escapeHTML).join('<br>')}</dd></div>` : ''}
        </dl></div>
        <div class="face-column">${facePanel(record.obverse, 'Obverse')}${facePanel(record.reverse, 'Reverse')}</div>
      </section>
      ${context.length ? `<section class="detail-section"><div class="section-heading"><div><p class="eyebrow">Provenance</p><h2>Find and collection context</h2></div></div><div class="detail-card"><dl class="fact-list">${context.map(([label, values]) => `<div><dt>${label}</dt><dd>${semanticList(values)}</dd></div>`).join('')}</dl></div></section>` : ''}
      <section class="detail-section"><div class="section-heading"><div><p class="eyebrow">Linked data</p><h2>Nomisma properties</h2></div><p>Controlled values remain connected to their original URIs. Inventory-card transcriptions remain in the Turtle source but are not displayed publicly in this version.</p></div>
        <div class="table-wrap"><table class="ontology-table"><tbody>${ontologyRows(record)}</tbody></table></div>
      </section>
    `;
  } catch (error) {
    console.error(error);
    page.innerHTML = `<div class="empty-state error"><h1>Record unavailable</h1><p>${NX.escapeHTML(error.message)}</p><a class="primary-button inline-button" href="index.html">Return to browse</a></div>`;
  }
})();
