
(function() {
  const slugify = str => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const score = item => item.rating * Math.log(1 + item.votes);

  let categories = [], places = [], areas = [];

  async function loadData() {
    const [c, p, a] = await Promise.all([
      fetch('/data/categories.json',{cache:'no-store'}),
      fetch('/data/places.json',{cache:'no-store'}),
      fetch('/data/areas.json',{cache:'no-store'})
    ]);
    categories = await c.json();
    places = await p.json();
    areas = await a.json();
  }

  function createCard(item) {
    const el = document.createElement('article');
    el.className = 'card';
    const a = document.createElement('a');
    a.href = `/${item.category}/${item.subcategory}/${item.slug}/`;
    a.setAttribute('aria-label', item.name);
    a.innerHTML = `
      <img src="${item.hero_image}" alt="${item.name} hero image" loading="lazy">
      <div class="card-content">
        <h3 class="card-title">${item.name}</h3>
        <div class="card-meta">${item.area} • ${item.price_tier}</div>
        <div class="card-rating">${item.rating.toFixed(1)}</div>
      </div>`;
    el.appendChild(a);
    return el;
  }

  function renderHome() {
    const catsSec = document.getElementById('categories-section');
    const popSec = document.getElementById('popular-section');
    if (!catsSec) return;

    categories.forEach(cat => {
      const row = document.createElement('div');
      row.className = 'category-row';
      const h2 = document.createElement('h2');
      const label = document.createElement('span'); label.textContent = cat.label;
      const more = document.createElement('a'); more.href = `/${cat.key}/`; more.textContent = 'See All'; more.className = 'see-all-link';
      h2.appendChild(label); h2.appendChild(more);
      row.appendChild(h2);
      const carousel = document.createElement('div'); carousel.className = 'card-carousel';
      const items = places.filter(p => p.category === cat.key).sort((a,b)=>score(b)-score(a)).slice(0,6);
      items.forEach(it => carousel.appendChild(createCard(it)));
      row.appendChild(carousel);
      catsSec.appendChild(row);
    });

    if (popSec) {
      const row = document.createElement('div'); row.className = 'category-row';
      const h2 = document.createElement('h2'); h2.textContent = 'Popular Right Now'; row.appendChild(h2);
      const carousel = document.createElement('div'); carousel.className = 'card-carousel';
      [...places].sort((a,b)=>score(b)-score(a)).slice(0,6).forEach(it => carousel.appendChild(createCard(it)));
      row.appendChild(carousel); popSec.appendChild(row);
    }
  }

  function renderCategoryIndex(catKey) {
    const container = document.getElementById(`subcategories-grid-${catKey}`);
    if (!container) return;
    const cat = categories.find(c=>c.key===catKey); if (!cat) return;
    cat.children.forEach(sub => {
      const card = document.createElement('div');
      card.className = 'subcat-card';
      card.innerHTML = `<h3>${sub.label}</h3><p>Discover our curated list of ${sub.label.toLowerCase()}.</p><a href="/${cat.key}/${sub.key}/">Browse ${sub.label}</a>`;
      container.appendChild(card);
    });
  }

  function renderListingPage(catKey, subKey) {
    const areaSel = document.getElementById('filter-area');
    if (areaSel) areas.forEach(a=>{const o=document.createElement('option');o.value=a;o.textContent=a;areaSel.appendChild(o)});

    let filtered = places.filter(p=>p.category===catKey && p.subcategory===subKey);
    let page = 1, per = 6;
    const grid = document.getElementById('card-grid');
    const more = document.getElementById('load-more');

    function apply() {
      const area = areaSel ? areaSel.value : 'all';
      const priceSel = document.getElementById('filter-price');
      const price = priceSel ? priceSel.value : 'all';
      const sortSel = document.getElementById('sort-by');
      const sort = sortSel ? sortSel.value : 'score';
      filtered = places.filter(p=>p.category===catKey && p.subcategory===subKey);
      if (area !== 'all') filtered = filtered.filter(p=>p.area===area);
      if (price !== 'all') filtered = filtered.filter(p=>p.price_tier===price);
      filtered.sort((a,b)=>{
        switch (sort) {
          case 'reviews': return b.votes - a.votes;
          case 'price-asc': return a.price_tier.length - b.price_tier.length;
          case 'price-desc': return b.price_tier.length - a.price_tier.length;
          case 'name': return a.name.localeCompare(b.name);
          default: return score(b) - score(a);
        }
      });
      page = 1; render();
    }

    function render() {
      grid.innerHTML='';
      const list = filtered.slice(0, page*per);
      list.forEach(it=>grid.appendChild(createCard(it)));
      if (more) more.style.display = filtered.length > page*per ? 'block':'none';
    }

    if (areaSel) areaSel.addEventListener('change', apply);
    const priceSel = document.getElementById('filter-price'); if (priceSel) priceSel.addEventListener('change', apply);
    const sortSel = document.getElementById('sort-by'); if (sortSel) sortSel.addEventListener('change', apply);
    if (more) more.addEventListener('click', ()=>{page++; render();});
    apply();
  }

  function renderDetailPage(catKey, subKey, slug) {
    const wrap = document.getElementById('detail-wrapper'); if (!wrap) return;
    const item = places.find(p=>p.slug===slug && p.category===catKey && p.subcategory===subKey);
    if (!item) { wrap.innerHTML = '<p>Sorry, the requested item could not be found.</p>'; return; }
    const hero = document.createElement('div'); hero.className='detail-hero'; hero.innerHTML = `<img src="${item.hero_image}" alt="${item.name} hero image">`;
    const info = document.createElement('div'); info.className='detail-main-info';
    info.innerHTML = `<h1>${item.name}</h1>
      <div class="detail-tags"><span class="badge">${item.area}</span><span class="badge">${item.price_tier}</span>${item.badges.map(b=>`<span class="badge">${b}</span>`).join('')}</div>
      <p class="card-meta">${item.short_desc}</p>
      <p class="card-rating">Rating: ${item.rating.toFixed(1)} (${item.votes} reviews)</p>`;
    wrap.appendChild(hero); wrap.appendChild(info);

    const best = document.createElement('div'); best.className='detail-section'; best.innerHTML = `<h2>Best Time to Visit</h2><p>${item.best_time}</p>`; wrap.appendChild(best);

    const hours = document.createElement('div'); hours.className='detail-section opening-hours'; hours.innerHTML = `<h2>Opening Hours</h2>`;
    const table = document.createElement('table');
    Object.entries(item.opening_hours).forEach(([d,h])=>{const tr=document.createElement('tr'); tr.innerHTML=`<th>${d}</th><td>${h}</td>`; table.appendChild(tr);});
    hours.appendChild(table); wrap.appendChild(hours);

    const amenities = document.createElement('div'); amenities.className='detail-section'; amenities.innerHTML = `<h2>Amenities</h2>`;
    const tagBox = document.createElement('div'); tagBox.className='detail-tags'; item.amenities.forEach(a=>{const s=document.createElement('span'); s.className='badge'; s.textContent=a; tagBox.appendChild(s);}); amenities.appendChild(tagBox); wrap.appendChild(amenities);

    const loc = document.createElement('div'); loc.className='detail-section';
    loc.innerHTML = `<h2>Location</h2><p>Coordinates: ${item.lat}, ${item.lng}</p><p><a href="https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}" target="_blank" rel="noopener">Open in Google Maps</a></p>`;
    wrap.appendChild(loc);

    if (item.faq && item.faq.length) {
      const faq = document.createElement('div'); faq.className='detail-section'; faq.innerHTML = `<h2>Frequently Asked Questions</h2>`;
      const list = document.createElement('div'); list.className='faq-list';
      item.faq.forEach(({q,a})=>{const det=document.createElement('details'); det.innerHTML = `<summary>${q}</summary><p>${a}</p>`; list.appendChild(det);});
      faq.appendChild(list); wrap.appendChild(faq);
    }

    const similar = document.createElement('div'); similar.className='detail-section'; similar.innerHTML = `<h2>Similar Places</h2>`;
    const grid = document.createElement('div'); grid.className='similar-grid';
    item.similar_ids.forEach(id => { const it = places.find(p=>p.id===id); if (it) grid.appendChild(createCard(it)); });
    similar.appendChild(grid); wrap.appendChild(similar);
  }

  async function init() {
    await loadData();
    const path = window.location.pathname;

    if (path === '/' || path === '/index.html') {
      renderHome();
    } else if (path.match(/^\/places-to-visit\/?$/)) {
      renderCategoryIndex('places-to-visit');
    } else if (path.match(/^\/places-to-eat\/?$/)) {
      renderCategoryIndex('places-to-eat');
    } else if (path.match(/^\/places-to-visit\/([^/]+)\/?$/)) {
      const sub = path.split('/')[2]; renderListingPage('places-to-visit', sub);
    } else if (path.match(/^\/places-to-eat\/([^/]+)\/?$/) && path.split('/').length === 4) {
      const sub = path.split('/')[2]; renderListingPage('places-to-eat', sub);
    } else {
      const main = document.getElementById('main-content');
      if (main && main.dataset && main.dataset.slug) {
        renderDetailPage(main.dataset.category, main.dataset.subcategory, main.dataset.slug);
      }
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
