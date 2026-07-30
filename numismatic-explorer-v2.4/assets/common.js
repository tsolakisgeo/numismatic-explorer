'use strict';

window.NumismaticExplorer = (() => {
  const DATA_ROOT = 'data/generated/';

  async function fetchJSON(path) {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
    return response.json();
  }

  function escapeHTML(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function firstLabel(items) {
    return items?.[0]?.label || '';
  }

  function labels(items) {
    return (items || []).map(item => item.label).filter(Boolean);
  }

  function externalLink(item, className = 'semantic-link') {
    if (!item) return '';
    const label = escapeHTML(item.label || item.value || item.uri || 'Resource');
    if (item.uri) {
      return `<a class="${className}" href="${escapeHTML(item.uri)}" target="_blank" rel="noreferrer">${label}<span aria-hidden="true">↗</span></a>`;
    }
    return `<span class="semantic-value">${label}</span>`;
  }

  function formatMeasurement(value, unit) {
    return Number.isFinite(value) ? `${value} ${unit}` : '';
  }

  function configureSite(config) {
    document.title = document.title.replace('Numismatic Explorer', config.title || 'Numismatic Explorer');
    document.querySelectorAll('#site-title, #footer-title').forEach(el => { el.textContent = config.title; });
    document.querySelectorAll('#site-subtitle').forEach(el => { el.textContent = config.subtitle; });
    const description = document.querySelector('#site-description');
    if (description) description.textContent = config.description;
    document.querySelectorAll('#ontology-link').forEach(link => {
      link.href = config.ontology_uri || 'https://www.nomisma.org/ontology';
      if (link.classList.contains('ontology-pill')) link.textContent = `${config.ontology_label || 'Nomisma ontology'} ↗`;
    });
  }

  async function loadSite() {
    const config = await fetchJSON('data/site.json');
    configureSite(config);
    return config;
  }

  return { DATA_ROOT, fetchJSON, escapeHTML, firstLabel, labels, externalLink, formatMeasurement, configureSite, loadSite };
})();
