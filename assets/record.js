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
    const marks = [...(face.controlmarks || []), ...(face.mintmarks || [])];
    return `<section class="detail-card face-detail">
      <p class="eyebrow">${title}</p>
      ${face.description?.length ? `<h2>${NX.escapeHTML(face.description[0])}</h2>` : '<h2>Description not recorded</h2>'}
      ${face.legend?.length ? `<div class="legend-block"><span>Legend</span><p>${face.legend.map(NX.escapeHTML).join('<br>')}</p></div>` : ''}
      ${marks.length ? `<div class="detail-row"><dt>Marks</dt><dd>${semanticList(marks)}</dd></div>` : ''}
      <a class="uri-line" href="${NX.escapeHTML(face.uri)}" target="_blank" rel="noreferrer">${NX.escapeHTML(face.uri)} ↗</a>
    </section>`;
  }

  function photoPanel(photos) {
    if (!photos?.length) return '';
    return `<section class="detail-section"><div class="section-heading"><div><p class="eyebrow">External media</p><h2>Coin photographs</h2></div><p>METIS resource links supplied by <code>coin_photos.csv</code>.</p></div>
      <div class="detail-photo-grid">${photos.map(photo => photo.image_url
        ? `<a class="detail-photo" href="${NX.escapeHTML(photo.resource_url)}" target="_blank" rel="noreferrer"><img src="${NX.escapeHTML(photo.image_url)}" alt="${NX.escapeHTML(photo.label)}"><strong>${NX.escapeHTML(photo.label)}</strong><span>Open resource ↗</span></a>`
        : `<a class="detail-photo resource-only" href="${NX.escapeHTML(photo.resource_url)}" target="_blank" rel="noreferrer"><span class="large-photo-icon">◉</span><strong>${NX.escapeHTML(photo.label)}</strong><span>Open photograph resource in METIS ↗</span></a>`).join('')}</div>
    </section>`;
  }

  function ontologyRows(record) {
    return record.ontology.map(row => `<tr><th><a href="${NX.escapeHTML(row.property)}" target="_blank" rel="noreferrer">${NX.escapeHTML(row.property_label)} ↗</a><code>${NX.escapeHTML(row.property)}</code></th><td>${semanticList(row.values)}</td></tr>`).join('');
  }

  function archivalSection(cards) {
    if (!cards?.length) return '';
    const reviewNotes = cards.flatMap(card => card.review_notes || []);
    return `<details class="archival-details"><summary>Archival transcription and provenance <span>${cards.length} ${cards.length === 1 ? 'card resource' : 'card resources'}</span></summary>
      <div class="archival-content">
        ${reviewNotes.length ? `<div class="review-callout"><strong>Human confirmation required</strong>${reviewNotes.map(note => `<p>${NX.escapeHTML(note)}</p>`).join('')}</div>` : ''}
        ${cards.map(card => `<article><h3>${NX.escapeHTML(card.identifier)}</h3><p class="uri-text">${NX.escapeHTML(card.uri)}</p>${card.raw_fields?.length ? `<dl class="raw-fields">${card.raw_fields.map(field => `<div><dt>${NX.escapeHTML(field.label)}</dt><dd>${NX.escapeHTML(field.value)}</dd></div>`).join('')}</dl>` : '<p class="not-recorded">No raw fields indexed.</p>'}</article>`).join('')}
      </div>
    </details>`;
  }

  try {
    const [, records] = await Promise.all([NX.loadSite(), NX.fetchJSON(`${NX.DATA_ROOT}coins.json`)]);
    const id = new URLSearchParams(location.search).get('id');
    const record = records.find(item => item.id === id || item.identifier === id);
    if (!record) throw new Error(`No record was found for “${id || ''}”.`);
    document.title = `${record.identifier} · ${document.querySelector('#site-title').textContent}`;

    const keyFacts = [
      ['Authority', record.facets.authority], ['Issuer', record.facets.issuer], ['Mint', record.facets.mint], ['Material', record.facets.material],
      ['Denomination', record.facets.denomination], ['Manufacture', record.facets.manufacture], ['Findspot', record.facets.findspot], ['Collection', record.facets.collection],
      ['Type series', record.facets.type_series], ['Reference work', record.facets.reference_work]
    ].filter(([, values]) => values?.length);

    const measurements = [
      ['Weight', NX.formatMeasurement(record.measurements.weight, 'g')], ['Diameter', NX.formatMeasurement(record.measurements.diameter, 'mm')],
      ['Axis', Number.isFinite(record.measurements.axis) ? `${record.measurements.axis}h` : '']
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
          ${record.date.label ? `<div><dt>Date</dt><dd>${NX.escapeHTML(record.date.label)}</dd></div>` : ''}
          ${keyFacts.map(([label, values]) => `<div><dt>${label}</dt><dd>${semanticList(values)}</dd></div>`).join('')}
          ${measurements.map(([label, value]) => `<div><dt>${label}</dt><dd>${NX.escapeHTML(value)}</dd></div>`).join('')}
          ${record.bibliography?.length ? `<div><dt>Bibliography</dt><dd>${record.bibliography.map(NX.escapeHTML).join('<br>')}</dd></div>` : ''}
        </dl></div>
        <div class="face-column">${facePanel(record.obverse, 'Obverse')}${facePanel(record.reverse, 'Reverse')}</div>
      </section>
      <section class="detail-section"><div class="section-heading"><div><p class="eyebrow">Linked data</p><h2>Nomisma properties</h2></div><p>Labels remain connected to their original URI values.</p></div>
        <div class="table-wrap"><table class="ontology-table"><tbody>${ontologyRows(record)}</tbody></table></div>
      </section>
      ${archivalSection(record.cards)}
    `;
  } catch (error) {
    console.error(error);
    page.innerHTML = `<div class="empty-state error"><h1>Record unavailable</h1><p>${NX.escapeHTML(error.message)}</p><a class="primary-button inline-button" href="index.html">Return to browse</a></div>`;
  }
})();
