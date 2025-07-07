document.addEventListener('DOMContentLoaded', async () => {
  const burger = document.querySelector('.burger');
  const overlay = document.querySelector('.menu-overlay');
  const overlayLinks = overlay.querySelectorAll('a');
  burger.addEventListener('click', () => {
    const open = overlay.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
    overlay.setAttribute('aria-hidden', !open);
  });
  overlayLinks.forEach(link => link.addEventListener('click', () => {
    overlay.classList.remove('open');
    burger.setAttribute('aria-expanded', false);
    overlay.setAttribute('aria-hidden', true);
  }));
  const wrapper = document.querySelector('.svg-wrapper');
  let selectedBuildingName = null;
  try {
    const svgText = await (await fetch('city.svg')).text();
    wrapper.insertAdjacentHTML('afterbegin', svgText);
  } catch (err) {
    console.error(err);
    return;
  }
  const svg = wrapper.querySelector('svg');
  const tooltip = document.getElementById('tooltip');
  const detailsPanel = document.querySelector('.details-content');
  const modal = document.getElementById('mobile-details-modal');
  const modalBody = modal.querySelector('.modal-body');
  const modalClose = document.getElementById('modal-close');
  modalClose.addEventListener('click', () => {
    modal.setAttribute('aria-hidden', 'true');
  });
  function getViewBox() {
    return svg.getAttribute('viewBox').split(' ').map(Number);
  }
  function setViewBox(x, y, w, h) {
    svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  }
  const [origX, origY, origW, origH] = getViewBox();
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  let isPanning = false;
  let startPt = {};
  let startVB = {};
  wrapper.addEventListener('mousedown', e => {
    isPanning = true;
    wrapper.classList.add('grabbing');
    startPt = { x: e.clientX, y: e.clientY };
    const [x, y] = getViewBox();
    startVB = { x, y };
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!isPanning) return;
    const dx = e.clientX - startPt.x;
    const dy = e.clientY - startPt.y;
    const [, , w, h] = getViewBox();
    const { width: sw, height: sh } = svg.getBoundingClientRect();
    let nx = startVB.x - dx * (w / sw);
    let ny = startVB.y - dy * (h / sh);
    nx = clamp(nx, origX, origX + origW - w);
    ny = clamp(ny, origY, origY + origH - h);
    setViewBox(nx, ny, w, h);
  });
  document.addEventListener('mouseup', () => {
    isPanning = false;
    wrapper.classList.remove('grabbing');
  });
  const ZF = 1.2;
  function zoomAtCursor(factor) {
    const [x, y, w, h] = getViewBox();
    const cx = x + w / 2;
    const cy = y + h / 2;
    const newW = clamp(w / factor, 0, origW);
    const newH = clamp(h / factor, 0, origH);
    const nx = clamp(cx - newW / 2, origX, origX + origW - newW);
    const ny = clamp(cy - newH / 2, origY, origY + origH - newH);
    setViewBox(nx, ny, newW, newH);
  }
  document.getElementById('zoom-in').addEventListener('click', () => zoomAtCursor(ZF));
  document.getElementById('zoom-out').addEventListener('click', () => zoomAtCursor(1 / ZF));
  if (window.innerWidth <= 768) {
    for (let i = 0; i < 10; i++) zoomAtCursor(ZF);
    const [, , maxW, maxH] = getViewBox();
    const originalZoomAtCursor = zoomAtCursor;
    zoomAtCursor = function(factor) {
      if (factor < 1) {
        const [, , w, h] = getViewBox();
        const newW = w / factor;
        const newH = h / factor;
        if (newW > maxW || newH > maxH) return;
      }
      originalZoomAtCursor(factor);
    };
  }
  function getTouchDist(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  }
  let pinchStartDist = null;
  let pinchStartVB = null;
  wrapper.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      pinchStartDist = getTouchDist(e.touches[0], e.touches[1]);
      pinchStartVB = getViewBox();
    }
  });
  wrapper.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && pinchStartDist) {
      e.preventDefault();
      const newDist = getTouchDist(e.touches[0], e.touches[1]);
      const scale = pinchStartDist / newDist;
      const [x0, y0, w0, h0] = pinchStartVB;
      const newW = clamp(w0 * scale, 0, origW);
      const newH = clamp(h0 * scale, 0, origH);
      const rect = svg.getBoundingClientRect();
      const cxClient = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cyClient = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const cx = x0 + (cxClient - rect.left) / rect.width * w0;
      const cy = y0 + (cyClient - rect.top) / rect.height * h0;
      const nx = clamp(cx - newW / 2, origX, origX + origW - newW);
      const ny = clamp(cy - newH / 2, origY, origY + origH - newH);
      setViewBox(nx, ny, newW, newH);
    }
  });
  wrapper.addEventListener('touchend', e => {
    if (e.touches.length < 2) pinchStartDist = null;
  });
  const buildingMap = new Map();
  function applyBuildingColours() {
    svg.querySelectorAll('path[id^="house"]').forEach(path => {
      const rawId = path.id.replace(/^house\s*/, '');
      const name = rawId.normalize('NFC');
      const b = buildingMap.get(name);
      path.classList.remove('house', 'house--repair', 'house--empty');
      if (!b || b.peopleCount === 0) path.classList.add('house--empty');
      else if (b.needRepair) path.classList.add('house--repair');
      else path.classList.add('house');
    });
  }
  fetch('http://localhost:4000/api/buildings')
    .then(r => r.json())
    .then(data => {
      data.forEach(b => buildingMap.set(b.name, b));
      applyBuildingColours();
    })
    .catch(err => console.error(err));
  async function populateLists() {
  const res = await fetch('http://localhost:4000/api/buildings');
  const data = await res.json();
  data.sort((a, b) => a.name.localeCompare(b.name));
  const statsSection = document.getElementById('statistics');
  statsSection.innerHTML = `
    <h2 class="section-title">Statistics</h2>
    <ul class="stats-list">
      ${data.map(b => `<li>${b.name}</li>`).join('')}
    </ul>`;
  const buildingsSection = document.getElementById('buildings');
  buildingsSection.innerHTML = `
    <h2 class="section-title">Buildings</h2>
    ${data.map(b => `
      <details>
        <summary>${b.name}</summary>
        <ul>
          <li><strong>Address:</strong> ${b.address}</li>
          <li><strong>Residents:</strong> ${b.peopleCount} people</li>
          <li><strong>Status:</strong> ${b.occupied ? 'Occupied' : 'Vacant'}</li>
          <li><strong>Floors:</strong> ${b.floors}</li>
          <li><strong>Built in:</strong> ${b.yearBuilt}</li>
          <li><strong>Last renovated:</strong> ${b.lastRenovationYear}</li>
        </ul>
      </details>
    `).join('')}`;
}
  populateLists();
  svg.querySelectorAll('path[id^="house"]').forEach(path => {
    const rawId = path.id.replace(/^house\s*/, '');
    const name = rawId.normalize('NFC');
    path.addEventListener('mousemove', e => {
      const rect = wrapper.getBoundingClientRect();
      tooltip.style.left = `${e.clientX - rect.left + 12}px`;
      tooltip.style.top = `${e.clientY - rect.top + 12}px`;
    });
    path.addEventListener('mouseenter', () => {
      const b = buildingMap.get(name);
      const count = b ? b.peopleCount : 0;
      tooltip.innerHTML = `<strong>${name}</strong><br>🏠 ${count} residents`;
      tooltip.classList.add('show');
    });
    path.addEventListener('mouseleave', () => tooltip.classList.remove('show'));
    path.addEventListener('click', () => {
      const b = buildingMap.get(name);
      if (!b) return;
      selectedBuildingName = name;
      let html = `<div class="building-card"><h3 class="building-title">${b.name}</h3><ul class="building-features">`;
      [
        { label: 'Address', value: b.address },
        { label: 'Residents', value: `${b.peopleCount} people`, id: 'residents-value' },
        { label: 'Status', value: b.occupied ? 'Occupied' : 'Vacant', id: 'status-value' },
        { label: 'Floors', value: `${b.floors} floors` },
        { label: 'Built in', value: b.yearBuilt },
        { label: 'Last renovated', value: b.lastRenovationYear },
        { label: 'Needs repair', value: b.needRepair ? 'Yes' : 'No' },
        { label: 'Garage', value: b.hasGarage ? '✔️ Available' : '❌ None' },
        { label: 'Balcony', value: b.hasBalcony ? '✔️ Yes' : '❌ No' },
        { label: 'Elevator', value: b.hasLift ? '✔️ Yes' : '❌ No' },
        { label: 'Solar panels', value: b.solarEnergy ? '✔️ Installed' : '❌ None' },
        { label: 'Owner', value: b.owner }
      ].forEach(f => {
        const extra = f.id ? ` id="${f.id}"` : '';
        html += `<li><span class="feat-label">${f.label}:</span><span class="feat-value"${extra}>${f.value}</span></li>`;
      });
      html += '</ul></div>';
      if (window.innerWidth <= 768) {
        modalBody.innerHTML = html;
        modal.setAttribute('aria-hidden', 'false');
        modalBody.querySelector('.building-title').focus();
      } else {
        detailsPanel.innerHTML = html;
        detailsPanel.closest('#details').focus();
      }
    });
  });
  function simulatePopulation() {
    const names = Array.from(buildingMap.keys());
    const deltas = {};
    names.forEach(name => {
      const b = buildingMap.get(name);
      let change = Math.floor(Math.random() * 31) - 15;
      if (b.peopleCount + change < 0) change = -b.peopleCount;
      deltas[name] = change;
    });
    let sum = names.reduce((s, n) => s + deltas[n], 0);
    while (sum > 0) {
      const positives = names.filter(n => deltas[n] > 0);
      const pick = positives[Math.random() * positives.length | 0];
      deltas[pick]--;
      sum--;
    }
    while (sum < 0) {
      const negatives = names.filter(n => deltas[n] < 0);
      const pick = negatives[Math.random() * negatives.length | 0];
      deltas[pick]++;
      sum++;
    }
    names.forEach(n => buildingMap.get(n).peopleCount += deltas[n]);
    let empties = names.filter(n => buildingMap.get(n).peopleCount === 0);
    const over = empties.length - 10;
    if (over > 0) {
      for (let i = 0; i < over; i++) {
        empties = names.filter(n => buildingMap.get(n).peopleCount === 0);
        const idx = Math.random() * empties.length | 0;
        const toFill = buildingMap.get(empties[idx]);
        toFill.peopleCount = 1;
        names.filter(n => buildingMap.get(n).peopleCount > 1).sort(() => Math.random() - 0.5).slice(0, 1).forEach(donor => {
          buildingMap.get(donor).peopleCount--;
        });
      }
    }
    names.forEach(n => {
      const b = buildingMap.get(n);
      b.occupied = b.peopleCount > 0;
    });
    applyBuildingColours();
    if (selectedBuildingName) {
      const b = buildingMap.get(selectedBuildingName);
      const resSpan = document.getElementById('residents-value');
      const statSpan = document.getElementById('status-value');
      if (resSpan) resSpan.textContent = `${b.peopleCount} people`;
      if (statSpan) statSpan.textContent = b.occupied ? 'Occupied' : 'Vacant';
    }
  }
  setInterval(simulatePopulation, 5000);
  const sections = ['map-container', 'statistics', 'buildings', 'about'];
  function showSection(id) {
    sections.forEach(secId => {
      const sec = document.getElementById(secId);
      if (secId === id) sec.removeAttribute('hidden');
      else sec.setAttribute('hidden', '');
    });
  }
  const navLinks = document.querySelectorAll('.menu a, .mobile-menu a, .logo a, #map-title');
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = link.getAttribute('href').slice(1);
      showSection(target);
      overlay.classList.remove('open');
      burger.setAttribute('aria-expanded', false);
      overlay.setAttribute('aria-hidden', true);
    });
  });
});

