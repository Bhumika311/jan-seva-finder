const icons = {
  landmark:'<path d="m3 9 9-5 9 5H3Zm1 11h16M6 10v7m4-7v7m4-7v7m4-7v7M3 17h18"/>',
  phone:'<path d="M21 16v3a2 2 0 0 1-2 2C10 21 3 14 3 5a2 2 0 0 1 2-2h3l2 5-2 2a14 14 0 0 0 6 6l2-2 5 2Z"/>',
  shield:'<path d="M12 22s7-3 7-10V5l-7-3-7 3v7c0 7 7 10 7 10Z"/><path d="m9 12 2 2 4-4"/>',
  heart:'<path d="M20.7 5.5a5 5 0 0 0-7 0L12 7.2l-1.7-1.7a5 5 0 0 0-7 7L12 21l8.7-8.5a5 5 0 0 0 0-7Z"/>',
  education:'<path d="m2 10 10-5 10 5-10 5-10-5Zm4 2.2V17c3 2 9 2 12 0v-4.8M22 10v6"/>',
  wallet:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M21 10h-6a2.5 2.5 0 0 0 0 5h6m-6-2.5h.1M5 5l11-3"/>',
  person:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/>',
  search:'<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  medical:'<path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5V4Z"/>',
  briefcase:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 13a26 26 0 0 0 18 0m-9 1v2"/>',
  computer:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4m-2-11 2 2 3-3"/>',
  grid:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
};

const icon = name => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[name] + '</svg>';
document.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = icon(node.dataset.icon); });
const form = document.querySelector('#profile-form');
const search = document.querySelector('#search');
const filters = document.querySelector('#filters');
const cards = document.querySelector('#cards');
const matches = document.querySelector('#matches');
const resetProfile = document.querySelector('#reset-profile');
const description = document.querySelector('#browse-description');
const dialog = document.querySelector('#detail');
const district = form.elements.district;
let category = 'All';
let profile = null;

states.forEach(state => form.elements.state.add(new Option(state)));
filters.innerHTML = Object.entries(categories).map(([name, style]) =>
  '<button type="button" class="filter" aria-pressed="' + (name === 'All') + '">' + icon(style[0]) + '<span>' + name + '</span></button>'
).join('');

function normalize(value) {
  return value.toLocaleLowerCase('en-IN').normalize('NFKD').replace(/[’']/g, '').replace(/[^a-z0-9\p{L}]+/gu, ' ').trim();
}

function relevance(item) {
  if (item.service) return { label:'Open assistance', type:'neutral', score:1 };
  if (!profile) return { label:'Check eligibility', type:'neutral', score:0 };
  const restrictedGender = profile.gender === 'Man' && item.gender === 'Woman';
  const age = Number(profile.age);
  if ((item.state && item.state !== profile.state) || restrictedGender ||
      (item.min != null && age < item.min) || (item.max != null && age > item.max)) {
    return { label:'Outside profile criteria', type:'neutral', score:-1 };
  }
  if ((item.gender && item.gender !== profile.gender) ||
      (item.occupations && !item.occupations.includes(profile.occupation))) {
    return { label:'Review criteria', type:'neutral', score:0 };
  }
  const districtMatch = item.featuredDistrict && normalize(item.featuredDistrict) === normalize(profile.district);
  return { label:'Estimated match', type:'estimate', score:2 + Number(Boolean(item.state)) + Number(Boolean(districtMatch)) };
}

function badge(item) {
  const {type, label} = relevance(item);
  return '<span class="' + type + '">' + label + '</span>';
}

function render() {
  const terms = normalize(search.value).split(' ').filter(Boolean);
  const results = catalog.filter(item => {
    if (category !== 'All' && item.category !== category) return false;
    if (profile && matches.checked && relevance(item).score < 1) return false;
    const haystack = normalize([item.name,item.category,item.summary,item.eligibility,item.benefits,item.state,item.featuredDistrict].join(' '));
    return terms.every(term => haystack.includes(term));
  });
  if (profile) results.sort((a,b) => relevance(b).score - relevance(a).score);
  document.querySelector('#result-status').textContent = results.length + (results.length === 1 ? ' result' : ' results');
  cards.innerHTML = results.map(item => {
    const [symbol,tint,ink] = categories[item.category];
    return '<article class="card"><div class="card-top"><span class="category-icon" style="--tint:' + tint + ';--ink:' + ink + '">' + icon(symbol) + '</span><span class="verified">' + icon('shield') + ' Official source</span></div><p class="meta">' + item.category + ' · ' + (item.state || 'National') + '</p><h3>' + item.name + '</h3><p class="description">' + item.summary + '</p><div class="card-bottom">' + badge(item) + '<button type="button" class="details" data-id="' + item.id + '" aria-label="View details for ' + item.name.replaceAll('&','&amp;') + '">View details</button></div></article>';
  }).join('') || '<div class="empty"><p>No results match these filters.</p><button type="button" class="details" id="clear-filters">Clear filters</button></div>';
}

function chooseCategory(button) {
  category = button.textContent;
  [...filters.children].forEach(node => node.setAttribute('aria-pressed', String(node === button)));
  render();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!district.value.trim()) {
    district.setCustomValidity('Enter the name of your district.');
    district.reportValidity();
    return;
  }
  profile = Object.fromEntries(new FormData(form));
  profile.district = profile.district.trim();
  search.value = '';
  matches.checked = true;
  document.querySelector('#match-control').hidden = false;
  resetProfile.hidden = false;
  description.textContent = 'Showing estimates and open services for ' + profile.district + ', ' + profile.state + '. Check the official criteria before applying.';
  chooseCategory(filters.firstElementChild);
  document.querySelector('#browse').scrollIntoView({block:'start'});
});

district.addEventListener('input', () => district.setCustomValidity(''));
resetProfile.addEventListener('click', () => {
  form.reset();
  district.setCustomValidity('');
  profile = null;
  matches.checked = false;
  document.querySelector('#match-control').hidden = true;
  resetProfile.hidden = true;
  description.textContent = 'Browse programmes by category or search for what you need.';
  form.elements.state.focus();
  render();
});

filters.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button) chooseCategory(button);
});
search.addEventListener('input', render);
matches.addEventListener('change', render);

function openDetails(item) {
  const content = document.querySelector('#detail-content');
  const source = item.source || item.url;
  const sections = [
    ['Eligibility', item.eligibility],
    ['Benefits', item.benefits],
    ['Required documents or information', item.documents],
    [item.service ? 'How to get help' : 'How to apply', item.apply],
  ];
  content.innerHTML = '<span class="verified">' + icon('shield') + ' Official source</span><h2 id="detail-title">' + item.name + '</h2>' + badge(item) +
    '<dl>' + sections.map(([heading, body]) => '<dt>' + heading + '</dt><dd>' + body + '</dd>').join('') + '</dl>' +
    '<p class="location" hidden></p><div class="dialog-links"><a class="primary" href="' + item.url + '" target="_blank" rel="noopener">Open official portal</a>' +
    (source !== item.url ? '<a href="' + source + '" target="_blank" rel="noopener">Read official guidance</a>' : '') +
    (item.locationUrl ? '<a href="' + item.locationUrl + '" target="_blank" rel="noopener">State / UT contacts</a>' : '') + '</div>';
  if (profile && (!(item.state) || item.state === profile.state) && (item.local || item.featuredDistrict)) {
    const location = content.querySelector('.location');
    const area = profile.district + ', ' + profile.state + '. ';
    const note = item.local || (normalize(profile.district) === normalize(item.featuredDistrict)
      ? 'The linked district page lists local scheme guidance.' : 'Check the Maharashtra scheme portal for guidance in your district.');
    location.textContent = area + note;
    location.hidden = false;
  }
  dialog.showModal();
}

cards.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.id === 'clear-filters') {
    search.value = '';
    matches.checked = false;
    chooseCategory(filters.firstElementChild);
    search.focus();
    return;
  }
  const item = catalog.find(entry => entry.id === button.dataset.id);
  if (item) openDetails(item);
});
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
render();
