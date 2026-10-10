/**
 * RouteMate AI - Core Front-End Application Logic
 * Implements client-side state, API integration, interactive Leaflet routing maps,
 * MAUT Decision Engine comparisons, dynamic replanning, group trip calculations, and AI assistant.
 */

const CURRENCY_RATES = {
  USD: { symbol: '$', rate: 1.0 },
  EUR: { symbol: '€', rate: 0.93 },
  INR: { symbol: '₹', rate: 83.2 },
  GBP: { symbol: '£', rate: 0.79 },
  JPY: { symbol: '¥', rate: 154.5 }
};

class RouteMateApp {
  constructor() {
    this.currentPage = 'home';
    this.destinations = [];
    this.selectedCompareIds = ['jaipur-rajasthan', 'kochi-kerala', 'goa-india'];
    this.activeTrip = null;
    this.savedTrips = [];
    this.currency = 'USD';
    this.leafletMap = null;
    this.markersGroup = null;
    this.routeLine = null;
    this.chatMessages = [];
    this.groupMembers = [
      { name: 'Alex', interests: ['Culture', 'Food'], budget_limit_usd: 1500, travel_style: 'Balanced' },
      { name: 'Taylor', interests: ['Nature', 'Relaxation'], budget_limit_usd: 1200, travel_style: 'Relaxed' },
      { name: 'Jordan', interests: ['Adventure', 'Food'], budget_limit_usd: 900, travel_style: 'Active' }
    ];

    this.compareWeights = {
      budget: 0.30,
      interest: 0.30,
      duration: 0.20,
      weather: 0.20
    };

    this.token = localStorage.getItem('routemate_token') || null;
    this.currentUser = null;
    this.isLoggedIn = false;
  }

  async init() {
    this.initTheme();
    this.setupDatePickers();
    this.initHeroWordRotator();
    this.setupInteractiveRoutePreview();
    this.initScrollReveal();
    this.initStatCounters();
    this.initCursorParallax();
    await this.initAuth();
    await this.fetchDestinations();
    await this.fetchSavedTrips();
    this.renderHomeFeatured();
    this.renderHomeDecisionCards();
    this.renderExplore();
    this.renderCompare();
    this.renderGroupMembers();
  }

  // ==================== THEME MANAGEMENT ====================
  initTheme() {
    const savedTheme = localStorage.getItem('routemate_theme') || 
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    this.setTheme(savedTheme);

    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const nextTheme = current === 'dark' ? 'light' : 'dark';
        this.setTheme(nextTheme);
      });
    }
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('routemate_theme', theme);
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    if (sunIcon && moonIcon) {
      if (theme === 'dark') {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
      } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
      }
    }
  }

  // ==================== HERO WORD ROTATOR ====================
  initHeroWordRotator() {
    const el = document.getElementById('hero-rotating-word');
    if (!el) return;
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const phrases = [
      'One Intelligent Companion.',
      'Your Personal Travel Decision Engine.',
      'Zero Guesswork. 100% Tailored.',
      'Multi-Attribute Utility Optimization.',
      'Instant Budget & Route Intelligence.'
    ];
    let idx = 0;
    setInterval(() => {
      idx = (idx + 1) % phrases.length;
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(() => {
        el.textContent = phrases[idx];
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 250);
    }, 3800);
  }

  // ==================== INTERACTIVE ROUTE PREVIEW ====================
  setupInteractiveRoutePreview() {
    const startInput = document.getElementById('quick-start-loc');
    const destSelect = document.getElementById('quick-dest-select');
    const startLabel = document.getElementById('route-start-label');
    const destLabel = document.getElementById('route-dest-label');
    const linePath = document.getElementById('route-line-animated');

    const updatePreview = () => {
      if (startLabel && startInput) {
        startLabel.textContent = startInput.value.trim() || 'Starting City';
      }
      if (destLabel && destSelect) {
        const selectedOpt = destSelect.options[destSelect.selectedIndex];
        destLabel.textContent = selectedOpt ? selectedOpt.text.split(' - ')[0] : 'Destination';
      }
      if (linePath) {
        linePath.style.animation = 'none';
        void linePath.offsetWidth; // Trigger reflow
        linePath.style.animation = 'routeFlow 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite';
      }
    };

    if (startInput) startInput.addEventListener('input', updatePreview);
    if (destSelect) destSelect.addEventListener('change', updatePreview);
  }

  // ==================== SCROLL REVEAL OBSERVER ====================
  initScrollReveal() {
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const elements = document.querySelectorAll('.scroll-reveal');
    if (!elements.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          obs.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.1
    });

    elements.forEach(el => observer.observe(el));
  }

  // ==================== ANIMATED NUMBER COUNTERS ====================
  initStatCounters() {
    const statElements = document.querySelectorAll('.stat-number[data-target]');
    if (!statElements.length) return;

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animateCounter = (el) => {
      const target = parseFloat(el.getAttribute('data-target')) || 0;
      const isDecimal = target % 1 !== 0;
      const duration = 1600;
      const startTime = performance.now();

      if (prefersReducedMotion) {
        el.textContent = isDecimal ? target.toFixed(1) : Math.round(target).toLocaleString();
        return;
      }

      const updateCount = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = target * easeOut;

        el.textContent = isDecimal 
          ? current.toFixed(1) 
          : Math.round(current).toLocaleString();

        if (progress < 1) {
          requestAnimationFrame(updateCount);
        } else {
          el.textContent = isDecimal ? target.toFixed(1) : Math.round(target).toLocaleString();
        }
      };

      requestAnimationFrame(updateCount);
    };

    if (!('IntersectionObserver' in window)) {
      statElements.forEach(animateCounter);
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    statElements.forEach(el => observer.observe(el));
  }

  // ==================== DESKTOP CURSOR PARALLAX ====================
  initCursorParallax() {
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
    if (window.innerWidth < 1024 || 'ontouchstart' in window) return;

    const aurora = document.querySelector('.hero-aurora');
    if (!aurora) return;

    let ticking = false;
    window.addEventListener('pointermove', (e) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const x = (e.clientX / window.innerWidth - 0.5) * 24;
          const y = (e.clientY / window.innerHeight - 0.5) * 24;
          aurora.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  setupDatePickers() {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + 14);
    const end = new Date(start);
    end.setDate(start.getDate() + 5);

    const sStr = start.toISOString().split('T')[0];
    const eStr = end.toISOString().split('T')[0];

    const qStart = document.getElementById('quick-start-date');
    if (qStart) qStart.value = sStr;

    const pStart = document.getElementById('plan-start-date');
    if (pStart) pStart.value = sStr;

    const pEnd = document.getElementById('plan-end-date');
    if (pEnd) pEnd.value = eStr;
  }

  formatMoney(amountUSD) {
    const cur = CURRENCY_RATES[this.currency] || CURRENCY_RATES.USD;
    const converted = amountUSD * cur.rate;
    return `${cur.symbol}${Math.round(converted).toLocaleString()}`;
  }

  setCurrency(cur) {
    this.currency = cur;
    document.querySelectorAll('.currency-label').forEach(el => el.textContent = cur);
    // Re-render views with new currency formatting
    this.renderHomeFeatured();
    this.renderHomeDecisionCards();
    this.renderExplore();
    if (this.activeTrip) {
      this.renderTripResult();
    }
    this.renderCompare();
    this.renderSavedTrips();
  }

  navigate(pageId) {
    this.currentPage = pageId;
    document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

    // Close mobile menu if opened
    const menu = document.getElementById('nav-menu');
    if (menu && menu.classList.contains('open')) {
      menu.classList.remove('open');
      const hamburger = document.getElementById('nav-hamburger');
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    }

    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) targetPage.classList.add('active');

    const targetNavLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
    if (targetNavLink) targetNavLink.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (pageId === 'analytics') {
      this.loadAnalytics();
    } else if (pageId === 'my-trips') {
      this.renderSavedTrips();
    } else if (pageId === 'compare') {
      this.renderCompare();
    } else if (pageId === 'profile') {
      this.renderProfile();
    }
  }

  toggleMobileMenu() {
    const menu = document.getElementById('nav-menu');
    const hamburger = document.getElementById('nav-hamburger');
    if (menu) {
      menu.classList.toggle('open');
      const isOpen = menu.classList.contains('open');
      if (hamburger) {
        hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      }
    }
  }

  // ==================== API DATA FETCHING ====================
  async fetchDestinations() {
    try {
      const res = await fetch('/api/destinations');
      this.destinations = await res.json();
    } catch (err) {
      console.error('Failed to fetch destinations:', err);
    }
  }

  async fetchSavedTrips() {
    if (!this.token) {
      this.savedTrips = [];
      return;
    }
    try {
      const res = await this.authFetch('/api/trips');
      if (!res.ok) throw new Error('Failed to load saved trips.');
      this.savedTrips = await res.json();
    } catch (err) {
      console.error('Failed to fetch saved trips:', err);
    }

    authFetch(url, options = {}) {
      const headers = new Headers(options.headers || {});
      if (this.token) headers.set('Authorization', `Bearer ${this.token}`);
      return fetch(url, { ...options, headers });
    }
  }

  // ==================== HOME VIEW RENDERING ====================
  renderHomeFeatured() {
    const grid = document.getElementById('home-featured-grid');
    if (!grid) return;
    const featured = this.destinations.slice(0, 3);
    grid.innerHTML = featured.map(d => this.createDestinationCardHTML(d, false)).join('');
  }

  async renderHomeDecisionCards() {
    const container = document.getElementById('home-decision-cards');
    if (!container) return;

    try {
      const res = await fetch('/api/decision-engine/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_interests: ['Culture', 'Nature', 'Food'],
          total_budget: 2500,
          duration_days: 5,
          travellers_count: 2
        })
      });
      const data = await res.json();
      const top3 = (data.evaluations || []).slice(0, 3);

      container.innerHTML = top3.map(item => `
        <div style="background-color: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: var(--radius-lg); padding: 1.5rem; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
            <div>
              ${top3.indexOf(item) === 0 ? '<span class="badge badge-gold" style="font-size: 0.7rem;">★ Top AI Match</span>' : `<span class="badge badge-coral" style="font-size: 0.7rem;">Rank #${top3.indexOf(item) + 1}</span>`}
              <h4 style="font-size: 1.25rem; color: var(--color-text-on-dark, #FFFFFF); margin-top: 0.35rem;">${item.destination.name}</h4>
              <span style="font-size: 0.8rem; color: var(--color-text-muted-dark, #CBD5E1);">${item.destination.country}</span>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 1.75rem; font-weight: 800; color: ${top3.indexOf(item) === 0 ? 'var(--color-highlight)' : 'var(--color-accent)'}; line-height: 1;">${item.match_score}</div>
              <span style="font-size: 0.7rem; color: var(--color-text-muted-dark, #CBD5E1); text-transform: uppercase;">Match Score</span>
            </div>
          </div>

          <div style="margin-bottom: 1.25rem; font-size: 0.825rem; color: var(--color-text-muted-dark, #CBD5E1); line-height: 1.4;">
            ${item.why_recommended}
          </div>

          <div style="margin-top: auto;">
            ${item.factor_scores.slice(0, 3).map(f => `
              <div class="score-bar-wrap">
                <div class="score-bar-header">
                  <span style="color: var(--color-text-muted-dark, #CBD5E1);">${f.factor_name}</span>
                  <span style="color: var(--color-accent);">${Math.round(f.raw_score)}/100</span>
                </div>
                <div class="score-track">
                  <div class="score-fill" style="width: ${f.raw_score}%;"></div>
                </div>
              </div>
            `).join('')}

            <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 0.75rem;">
              <span style="font-size: 0.85rem; color: var(--color-text-muted-dark, #CBD5E1);">Est. 5-Day: <strong>${this.formatMoney(item.estimated_trip_cost_usd)}</strong></span>
              <button class="btn btn-sm btn-primary" onclick="app.planTripForDestination('${item.destination.id}')">Select Option</button>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Failed to render decision cards:', err);
    }
  }

  launchQuickPlan() {
    const startLoc = document.getElementById('quick-start-loc').value;
    const destId = document.getElementById('quick-dest-select').value;
    const startDate = document.getElementById('quick-start-date').value;
    const budget = parseFloat(document.getElementById('quick-budget').value);

    // Populate planner form
    document.getElementById('plan-start-loc').value = startLoc;
    document.getElementById('plan-dest-id').value = destId;
    document.getElementById('plan-start-date').value = startDate;
    document.getElementById('plan-budget').value = budget;

    // Calculate end date +5 days
    if (startDate) {
      const s = new Date(startDate);
      s.setDate(s.getDate() + 5);
      document.getElementById('plan-end-date').value = s.toISOString().split('T')[0];
    }

    this.navigate('planner');
  }

  // ==================== EXPLORE DESTINATIONS ====================
  renderExplore() {
    const grid = document.getElementById('explore-grid');
    if (!grid) return;
    grid.innerHTML = this.destinations.map(d => this.createDestinationCardHTML(d, true)).join('');
    this.updateCompareBadge();
  }

  filterDestinations() {
    const q = (document.getElementById('explore-search').value || '').toLowerCase().trim();
    const region = document.getElementById('explore-region-filter').value;
    const interest = document.getElementById('explore-interest-filter').value;
    const sort = document.getElementById('explore-sort').value;

    let filtered = this.destinations.filter(d => {
      const matchQ = !q || d.name.toLowerCase().includes(q) || d.country.toLowerCase().includes(q) || d.interests.some(i => i.toLowerCase().includes(q));
      const matchRegion = region === 'all' || d.region.toLowerCase() === region.toLowerCase();
      const matchInterest = interest === 'all' || d.interests.some(i => i.toLowerCase() === interest.toLowerCase());
      return matchQ && matchRegion && matchInterest;
    });

    if (sort === 'cost_low') filtered.sort((a, b) => a.avg_daily_cost_usd - b.avg_daily_cost_usd);
    if (sort === 'cost_high') filtered.sort((a, b) => b.avg_daily_cost_usd - a.avg_daily_cost_usd);
    if (sort === 'safety') filtered.sort((a, b) => b.safety_score - a.safety_score);
    if (sort === 'accessibility') filtered.sort((a, b) => b.accessibility_rating - a.accessibility_rating);

    const grid = document.getElementById('explore-grid');
    if (grid) {
      if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 4rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
          <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem;">No destinations match your filter criteria</h3>
          <p class="text-secondary">Try relaxing search terms or selecting 'All Regions'.</p>
        </div>`;
      } else {
        grid.innerHTML = filtered.map(d => this.createDestinationCardHTML(d, true)).join('');
      }
    }
  }

  createDestinationCardHTML(dest, showCompareCheckbox) {
    const isSelectedForCompare = this.selectedCompareIds.includes(dest.id);
    return `
      <div class="dest-card">
        <div class="dest-thumb">
          <img src="${dest.image_url}" alt="${dest.name}" loading="lazy">
          <span class="dest-region-tag">${dest.region}</span>
          <div class="dest-match-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>${dest.safety_score}% Safety</span>
          </div>
        </div>

        <div class="dest-body">
          <h3 class="dest-title">${dest.name}, ${dest.country}</h3>
          <p class="dest-tagline">${dest.tagline}</p>

          <div class="dest-stats-row">
            <div class="dest-stat-item">
              <span class="dest-stat-label">Daily Avg</span>
              <span class="dest-stat-val">${this.formatMoney(dest.avg_daily_cost_usd)}</span>
            </div>
            <div class="dest-stat-item">
              <span class="dest-stat-label">Ideal Stay</span>
              <span class="dest-stat-val">${dest.recommended_days} Days</span>
            </div>
            <div class="dest-stat-item">
              <span class="dest-stat-label">Weather</span>
              <span class="dest-stat-val">${dest.weather_summary.temp_c}°C</span>
            </div>
          </div>

          <div class="dest-tags">
            ${dest.interests.slice(0, 3).map(i => `<span class="dest-tag">${i}</span>`).join('')}
          </div>

          <div class="dest-actions">
            <button class="btn btn-sm btn-outline" onclick="app.showDestModal('${dest.id}')">View Details</button>
            <button class="btn btn-sm btn-primary" onclick="app.planTripForDestination('${dest.id}')">Plan Trip</button>
          </div>

          ${showCompareCheckbox ? `
            <div style="margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
              <label style="font-size: 0.8rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.4rem;">
                <input type="checkbox" style="accent-color: var(--accent-teal);" ${isSelectedForCompare ? 'checked' : ''} onchange="app.toggleCompareSelect('${dest.id}')">
                <span>Select for Comparison</span>
              </label>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  toggleCompareSelect(destId) {
    if (this.selectedCompareIds.includes(destId)) {
      this.selectedCompareIds = this.selectedCompareIds.filter(id => id !== destId);
    } else {
      if (this.selectedCompareIds.length >= 3) {
        alert('You can compare a maximum of 3 destinations simultaneously.');
        this.renderExplore();
        return;
      }
      this.selectedCompareIds.push(destId);
    }
    this.updateCompareBadge();
  }

  updateCompareBadge() {
    const pill = document.getElementById('compare-selection-pill');
    const badge = document.getElementById('compare-count-badge');
    if (!pill || !badge) return;

    if (this.selectedCompareIds.length > 0) {
      pill.style.display = 'flex';
      badge.textContent = `${this.selectedCompareIds.length} Selected`;
    } else {
      pill.style.display = 'none';
    }
  }

  launchComparisonFromSelection() {
    this.navigate('compare');
  }

  // ==================== DESTINATION MODAL ====================
  showDestModal(destId) {
    const dest = this.destinations.find(d => d.id === destId);
    if (!dest) return;

    document.getElementById('modal-dest-title').textContent = `${dest.name}, ${dest.country}`;
    const modalBtn = document.getElementById('modal-plan-btn');
    if (modalBtn) {
      modalBtn.onclick = () => {
        this.closeDestModal();
        this.planTripForDestination(dest.id);
      };
    }

    const content = document.getElementById('modal-dest-content');
    content.innerHTML = `
      <div style="margin-bottom: 1.5rem; border-radius: var(--radius-md); overflow: hidden; height: 240px;">
        <img src="${dest.image_url}" alt="${dest.name}" style="width: 100%; height: 100%; object-fit: cover;">
      </div>

      <div style="margin-bottom: 1.5rem;">
        <span class="badge badge-teal">${dest.tagline}</span>
        <p style="margin-top: 0.75rem; font-size: 0.95rem; line-height: 1.6; color: var(--text-secondary);">${dest.description}</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; background: var(--bg-alt); padding: 1rem; border-radius: var(--radius-md);">
        <div>
          <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); display: block;">Daily Cost</span>
          <strong style="font-size: 1.15rem; color: var(--text-primary);">${this.formatMoney(dest.avg_daily_cost_usd)}</strong>
        </div>
        <div>
          <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); display: block;">Accessibility</span>
          <strong style="font-size: 1.15rem; color: var(--teal-dark);">${dest.accessibility_rating}/100</strong>
        </div>
        <div>
          <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); display: block;">Safety Rating</span>
          <strong style="font-size: 1.15rem; color: var(--text-primary);">${dest.safety_score}/100</strong>
        </div>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <h4 style="font-size: 1rem; margin-bottom: 0.75rem;">Top Attractions & Activities</h4>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${dest.top_attractions.map(a => `
            <div style="border: 1px solid var(--border-subtle); padding: 0.85rem; border-radius: var(--radius-sm); background: var(--bg-card);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                <strong>${a.title}</strong>
                <span class="badge badge-navy">${this.formatMoney(a.cost_usd)}</span>
              </div>
              <p style="font-size: 0.825rem; color: var(--text-secondary); margin-bottom: 0.4rem;">${a.description}</p>
              <div style="font-size: 0.75rem; color: var(--text-muted);">
                ⏱️ Duration: ${a.duration_hours} hrs | 📍 ${a.location_name} | ♿ ${a.accessibility_notes || 'Standard access'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="background: rgba(6, 214, 160, 0.08); border: 1px solid rgba(6, 214, 160, 0.2); border-radius: var(--radius-md); padding: 1rem; font-size: 0.85rem;">
        <strong>Live Weather Source & Timestamp:</strong>
        <p style="margin-top: 0.25rem; color: var(--text-secondary);">
          ${dest.weather_summary.condition}, ${dest.weather_summary.temp_c}°C. Source: <em>${dest.weather_summary.source}</em> (${dest.weather_summary.updated_at}).
        </p>
      </div>
    `;

    document.getElementById('dest-detail-modal').classList.add('active');
  }

  closeDestModal() {
    document.getElementById('dest-detail-modal').classList.remove('active');
  }

  planTripForDestination(destId) {
    document.getElementById('plan-dest-id').value = destId;
    this.navigate('planner');
  }

  toggleInterestPill(pill) {
    const isTeal = pill.classList.contains('badge-teal');
    if (isTeal) {
      pill.classList.remove('badge-teal');
      pill.classList.add('badge-navy');
      pill.textContent = pill.getAttribute('data-val');
    } else {
      pill.classList.remove('badge-navy');
      pill.classList.add('badge-teal');
      pill.textContent = `${pill.getAttribute('data-val')} ✓`;
    }
  }

  getSelectedInterests() {
    const pills = document.querySelectorAll('#interest-pill-container .badge-teal');
    return Array.from(pills).map(p => p.getAttribute('data-val'));
  }

  // ==================== TRIP PLANNER SUBMISSION ====================
  async submitTripPlan() {
    const btn = document.getElementById('btn-generate-plan');
    const origText = btn.innerHTML;
    btn.innerHTML = `<span>⏳ Optimising Routes & Calculating Budgets...</span>`;
    btn.disabled = true;

    const payload = {
      starting_location: document.getElementById('plan-start-loc').value,
      destination_id: document.getElementById('plan-dest-id').value || null,
      discovery_mode: !document.getElementById('plan-dest-id').value,
      start_date: document.getElementById('plan-start-date').value,
      end_date: document.getElementById('plan-end-date').value,
      travellers_count: parseInt(document.getElementById('plan-travellers').value) || 2,
      total_budget: parseFloat(document.getElementById('plan-budget').value) || 2500,
      currency: this.currency,
      interests: this.getSelectedInterests(),
      travel_style: document.getElementById('plan-style').value,
      transport_preference: 'Public Transit / Walking',
      accessibility_needs: document.getElementById('plan-accessibility').checked,
      pace: document.getElementById('plan-pace').value
    };

    try {
      const res = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(`Planning Error: ${errData.detail || 'Validation failed'}`);
        return;
      }

      const data = await res.json();
      this.activeTrip = data.trip;
      this.renderTripResult();
      this.navigate('trip-result');
    } catch (err) {
      console.error('Trip planning failed:', err);
      alert('Unable to generate trip. Please check connection.');
    } finally {
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  }

  // ==================== TRIP RESULT VIEW ====================
  renderTripResult() {
    if (!this.activeTrip) return;
    const trip = this.activeTrip;
    const dest = trip.destination;
    const bb = trip.budget_breakdown;

    // Header Card
    const headerCard = document.getElementById('trip-header-card');
    headerCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span class="badge badge-teal">${trip.duration_days} Days • ${trip.travel_style} Pace</span>
          <h1 style="font-size: 2rem; margin-top: 0.5rem; margin-bottom: 0.25rem;">${trip.title}</h1>
          <p class="text-secondary" style="font-size: 0.95rem;">
            Starting from <strong>${trip.starting_location}</strong> • Dates: <strong>${trip.start_date}</strong> to <strong>${trip.end_date}</strong> (${trip.travellers_count} Traveler${trip.travellers_count > 1 ? 's' : ''})
          </p>
        </div>

        <div style="text-align: right; background: var(--bg-alt); padding: 1rem 1.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); display: block;">Estimated Trip Total</span>
          <div style="font-size: 1.85rem; font-weight: 800; color: var(--primary-navy);">${this.formatMoney(bb.total_estimated_usd)}</div>
          <span style="font-size: 0.8rem; color: var(--text-secondary);">${this.formatMoney(bb.cost_per_person_usd)} / traveler</span>
        </div>
      </div>
    `;

    // Category Budget Breakdown
    const catList = document.getElementById('budget-category-list');
    catList.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
          <span style="color: var(--text-secondary);">✈️ Transit & Flights</span>
          <strong>${this.formatMoney(bb.transport_usd)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
          <span style="color: var(--text-secondary);">🏨 Accommodation</span>
          <strong>${this.formatMoney(bb.accommodation_usd)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
          <span style="color: var(--text-secondary);">🍽️ Meals & Dining</span>
          <strong>${this.formatMoney(bb.food_usd)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
          <span style="color: var(--text-secondary);">🎟️ Attractions & Passes</span>
          <strong>${this.formatMoney(bb.activities_usd)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
          <span style="color: var(--text-secondary);">🛡️ Miscellaneous & Reserve</span>
          <strong>${this.formatMoney(bb.miscellaneous_usd)}</strong>
        </div>
        <div style="border-top: 1px solid var(--border-subtle); padding-top: 0.75rem; margin-top: 0.25rem; display: flex; justify-content: space-between; font-size: 1rem;">
          <strong>Total Budget</strong>
          <strong style="color: ${bb.is_within_budget ? 'var(--color-success)' : 'var(--color-error)'};">${this.formatMoney(bb.total_estimated_usd)}</strong>
        </div>
      </div>
    `;

    // Day-by-Day Timeline
    const timeline = document.getElementById('itinerary-timeline');
    timeline.innerHTML = trip.itinerary_days.map(day => `
      <div class="timeline-node">
        <div class="timeline-bullet"></div>
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <span class="badge badge-navy" style="font-size: 0.75rem;">Day ${day.day_number} • ${day.date}</span>
            <h3 style="font-size: 1.25rem; margin-top: 0.25rem;">${day.theme}</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Transit: ${day.recommended_transport}</span>
          </div>
          <div style="text-align: right;">
            <span class="badge badge-teal">${this.formatMoney(day.estimated_day_cost_usd)}</span>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
              ⛅ ${day.weather_forecast ? `${day.weather_forecast.temp_c}°C, ${day.weather_forecast.condition}` : 'Clear'}
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.85rem; margin-top: 1rem;">
          ${day.activities.map(act => `
            <div style="background: var(--bg-alt); padding: 0.85rem; border-radius: var(--radius-sm); border-left: 3px solid var(--accent-teal);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                <strong style="font-size: 0.925rem;">${act.title}</strong>
                <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">${this.formatMoney(act.cost_usd)}</span>
              </div>
              <p style="font-size: 0.825rem; color: var(--text-secondary); margin-bottom: 0.35rem;">${act.description}</p>
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted);">
                <span>📍 ${act.location_name} • ⏱️ ${act.time_slot}</span>
                <span>${act.is_indoor ? '🏛️ Indoor Shelter' : '🌳 Outdoor Walk'}</span>
              </div>
            </div>
          `).join('')}
        </div>

        ${day.backup_indoor_plan ? `
          <div style="margin-top: 0.85rem; padding: 0.65rem 0.85rem; background: var(--color-accent-subtle); border: 1px solid rgba(13, 148, 136, 0.25); border-radius: var(--radius-sm); font-size: 0.8rem; color: var(--color-accent-hover);">
            ☔ <strong>Weather Alternative:</strong> ${day.backup_indoor_plan}
          </div>
        ` : ''}
      </div>
    `).join('');

    // Packing Checklist
    const packingList = document.getElementById('packing-checklist-items');
    packingList.innerHTML = trip.packing_checklist.map(item => `
      <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.45rem 0; border-bottom: 1px solid var(--border-subtle); cursor: pointer; font-size: 0.85rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <input type="checkbox" style="accent-color: var(--accent-teal);" ${item.packed ? 'checked' : ''} onchange="app.togglePackingItem('${item.id}', this.checked)">
          <span style="${item.packed ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${item.item_name}</span>
        </div>
        <span class="badge badge-navy" style="font-size: 0.7rem;">${item.category}</span>
      </label>
    `).join('');

    // Render Leaflet Map
    this.renderLeafletMap(trip.route_waypoints);
  }

  renderLeafletMap(waypoints) {
    if (!waypoints || waypoints.length === 0) return;

    const mapElement = document.getElementById('trip-map');
    if (!mapElement) return;

    // Destroy existing map if present
    if (this.leafletMap) {
      this.leafletMap.remove();
      this.leafletMap = null;
    }

    const firstStop = waypoints[0];
    this.leafletMap = L.map('trip-map').setView([firstStop.lat, firstStop.lng], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.leafletMap);

    this.markersGroup = L.featureGroup();
    const latLngs = [];

    const compStyle = getComputedStyle(document.documentElement);
    const primaryCol = compStyle.getPropertyValue('--color-primary').trim() || '#0F0A2A';
    const accentCol = compStyle.getPropertyValue('--color-accent').trim() || '#FF6B4A';
    const bgSurfaceCol = compStyle.getPropertyValue('--bg-surface').trim() || '#FFFFFF';

    waypoints.forEach((wp, index) => {
      const latlng = [wp.lat, wp.lng];
      latLngs.push(latlng);

      const marker = L.circleMarker(latlng, {
        radius: wp.type === 'hub' ? 10 : 7,
        fillColor: wp.type === 'hub' ? primaryCol : accentCol,
        color: bgSurfaceCol,
        weight: 2,
        opacity: 1,
        fillOpacity: 0.95
      }).addTo(this.markersGroup);

      marker.bindPopup(`<strong>${wp.label}</strong><br>${wp.category || 'Base Hub'}${wp.cost_usd !== undefined ? ` • ${this.formatMoney(wp.cost_usd)}` : ''}`);
    });

    this.markersGroup.addTo(this.leafletMap);

    // Connecting route polyline
    if (latLngs.length > 1) {
      this.routeLine = L.polyline(latLngs, {
        color: accentCol,
        weight: 4,
        dashArray: '6, 8',
        opacity: 0.85
      }).addTo(this.leafletMap);
    }

    this.leafletMap.fitBounds(this.markersGroup.getBounds().pad(0.15));
  }

  async triggerReplan(instructionType) {
    if (!this.activeTrip) return;

    const feedback = document.getElementById('replanning-feedback');
    const buttons = document.querySelectorAll('.replanning-control');
    buttons.forEach(button => { button.disabled = true; });
    feedback.classList.remove('is-error');
    feedback.style.display = 'block';
    feedback.textContent = `Adapting itinerary for ${instructionType.replace('_', ' ')}...`;

    try {
      const res = await fetch('/api/planner/replan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_trip: this.activeTrip,
          instruction_type: instructionType,
          budget_reduction_pct: 20.0
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to replan itinerary.');
      }
      this.activeTrip = data.updated_trip;
      this.renderTripResult();

      feedback.textContent = `Replanning applied: ${data.explanation}`;
    } catch (err) {
      console.error('Replanning error:', err);
      feedback.classList.add('is-error');
      feedback.textContent = err instanceof Error ? err.message : 'Failed to replan. Please try again.';
    } finally {
      buttons.forEach(button => { button.disabled = false; });
    }
  }

  async togglePackingItem(itemId, isPacked) {
    if (!this.activeTrip) return;
    const item = this.activeTrip.packing_checklist.find(i => i.id === itemId);
    if (item) item.packed = isPacked;

    if (this.activeTrip.trip_id) {
      this.authFetch(`/api/trips/${this.activeTrip.trip_id}/packing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, packed: isPacked })
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update packing status.');
      }).catch(err => console.error(err));
    }
    this.renderTripResult();
  }

  async saveCurrentTrip() {
    if (!this.activeTrip) return;
    try {
      const res = await this.authFetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.activeTrip)
      });
      if (!res.ok) throw new Error('Sign in to save trips.');
      const data = await res.json();
      this.activeTrip.is_saved = true;
      await this.fetchSavedTrips();
      alert('Trip saved to "My Trips" successfully!');
    } catch (err) {
      console.error('Save trip failed:', err);
      alert('Failed to save trip to disk.');
    }
  }

  // ==================== COMPARE TRIPS (DECISION ENGINE) ====================
  async renderCompare() {
    const container = document.getElementById('compare-results-matrix');
    const banner = document.getElementById('compare-tradeoff-banner');
    if (!container) return;

    try {
      const res = await fetch('/api/decision-engine/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dest_ids: this.selectedCompareIds.slice(0, 3),
          user_interests: ['Culture', 'Nature', 'Food'],
          total_budget: 2500,
          duration_days: 5,
          weights: this.compareWeights
        })
      });

      const data = await res.json();
      const comp = data.comparison;
      const evaluated = comp.compared_destinations || [];

      container.innerHTML = evaluated.map((item, idx) => `
        <div style="background-color: var(--bg-card); border: 2px solid ${idx === 0 ? 'var(--color-accent)' : 'var(--border-subtle)'}; border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow-sm); display: flex; flex-direction: column;">
          ${idx === 0 ? '<div style="margin-bottom: 0.5rem;"><span class="badge badge-champagne">★ Premium Top Match</span></div>' : ''}

          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
            <div>
              <h3 style="font-size: 1.35rem; color: var(--color-primary);">${item.destination.name}</h3>
              <span class="text-secondary" style="font-size: 0.85rem;">${item.destination.country}</span>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 2rem; font-weight: 800; color: ${idx === 0 ? 'var(--color-accent)' : 'var(--color-primary)'};">${item.match_score}</span>
              <span style="display: block; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Match Score</span>
            </div>
          </div>

          <div style="margin-bottom: 1.25rem;">
            ${item.factor_scores.map(f => `
              <div class="score-bar-wrap">
                <div class="score-bar-header">
                  <span style="color: var(--text-secondary);">${f.factor_name}</span>
                  <strong>${Math.round(f.raw_score)}/100</strong>
                </div>
                <div class="score-track" style="background-color: var(--bg-alt);">
                  <div class="score-fill" style="width: ${f.raw_score}%;"></div>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="background: var(--bg-alt); padding: 0.85rem; border-radius: var(--radius-sm); margin-bottom: 1.25rem; font-size: 0.85rem;">
            <strong>Estimated 5-Day Budget:</strong>
            <div style="font-size: 1.15rem; font-weight: 700; color: var(--primary-navy);">${this.formatMoney(item.estimated_trip_cost_usd)}</div>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${item.budget_fit_pct}% of budget ceiling</span>
          </div>

          <div style="margin-bottom: 1.25rem;">
            <strong style="font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Key Advantages:</strong>
            <ul style="padding-left: 1.25rem; font-size: 0.825rem; color: var(--text-secondary);">
              ${item.pros.map(p => `<li>${p}</li>`).join('')}
            </ul>
          </div>

          <button class="btn btn-primary" style="margin-top: auto;" onclick="app.planTripForDestination('${item.destination.id}')">Select ${item.destination.name}</button>
        </div>
      `).join('');

      if (banner) {
        banner.innerHTML = `<strong>Decision Engine Verdict:</strong> ${comp.trade_off_summary}`;
      }
    } catch (err) {
      console.error('Failed to compare:', err);
    }
  }

  updateCompareWeights() {
    const wb = parseInt(document.getElementById('weight-budget').value) / 100;
    const wi = parseInt(document.getElementById('weight-interest').value) / 100;
    const wd = parseInt(document.getElementById('weight-duration').value) / 100;
    const ww = parseInt(document.getElementById('weight-weather').value) / 100;

    document.getElementById('weight-budget-val').textContent = `${Math.round(wb * 100)}%`;
    document.getElementById('weight-interest-val').textContent = `${Math.round(wi * 100)}%`;
    document.getElementById('weight-duration-val').textContent = `${Math.round(wd * 100)}%`;
    document.getElementById('weight-weather-val').textContent = `${Math.round(ww * 100)}%`;

    this.compareWeights = { budget: wb, interest: wi, duration: wd, weather: ww };
    this.renderCompare();
  }

  resetCompareWeights() {
    this.compareWeights = { budget: 0.3, interest: 0.3, duration: 0.2, weather: 0.2 };
    document.getElementById('weight-budget').value = 30;
    document.getElementById('weight-interest').value = 30;
    document.getElementById('weight-duration').value = 20;
    document.getElementById('weight-weather').value = 20;
    this.updateCompareWeights();
  }

  // ==================== MY TRIPS & JOURNAL ====================
  renderSavedTrips() {
    const container = document.getElementById('saved-trips-container');
    if (!container) return;

    if (this.savedTrips.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">✈️</div>
          <h3 style="font-size: 1.35rem; margin-bottom: 0.5rem;">No Saved Trips Yet</h3>
          <p class="text-secondary" style="margin-bottom: 1.5rem;">Generate an itinerary using our AI Trip Planner and click "Save to My Trips" to track schedules and expenses.</p>
          <button class="btn btn-primary" onclick="app.navigate('planner')">Create Your First Trip</button>
        </div>
      `;
      return;
    }

    container.innerHTML = this.savedTrips.map(trip => `
      <div style="background-color: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <span class="badge badge-teal">${trip.duration_days} Days • ${trip.destination.name}</span>
            <h3 style="font-size: 1.35rem; margin-top: 0.35rem;">${trip.title}</h3>
            <span class="text-secondary" style="font-size: 0.85rem;">Travel Dates: ${trip.start_date} to ${trip.end_date}</span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-sm btn-outline" onclick="app.loadSavedTripIntoActive('${trip.trip_id}')">Open Itinerary</button>
            <button class="btn btn-sm btn-outline" style="color: var(--color-danger); border-color: rgba(239, 68, 68, 0.2);" onclick="app.deleteTrip('${trip.trip_id}')">Delete</button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; background: var(--bg-alt); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem;">
          <div>
            <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Estimated Budget</span>
            <strong style="display: block; font-size: 1.1rem;">${this.formatMoney(trip.budget_breakdown.total_estimated_usd)}</strong>
          </div>
          <div>
            <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Recorded Actual</span>
            <strong style="display: block; font-size: 1.1rem; color: var(--teal-dark);">${this.formatMoney(trip.actual_spent_usd || 0)}</strong>
          </div>
          <div>
            <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Per Traveler</span>
            <strong style="display: block; font-size: 1.1rem;">${this.formatMoney(trip.budget_breakdown.cost_per_person_usd)}</strong>
          </div>
          <div>
            <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Activities</span>
            <strong style="display: block; font-size: 1.1rem;">${trip.itinerary_days.reduce((acc, d) => acc + d.activities.length, 0)} Planned</strong>
          </div>
        </div>

        <div style="border-top: 1px solid var(--border-subtle); padding-top: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div style="font-size: 0.85rem; color: var(--text-secondary);">
            Logged Expenses: <strong>${(trip.custom_expenses || []).length} items</strong>
          </div>
          <button class="btn btn-sm btn-navy" onclick="app.promptAddExpense('${trip.trip_id}')">+ Log Expense</button>
        </div>
      </div>
    `).join('');
  }

  loadSavedTripIntoActive(tripId) {
    const trip = this.savedTrips.find(t => t.trip_id === tripId);
    if (!trip) return;
    this.activeTrip = trip;
    this.renderTripResult();
    this.navigate('trip-result');
  }

  async deleteTrip(tripId) {
    if (!confirm('Are you sure you want to delete this trip record?')) return;
    try {
      const res = await this.authFetch(`/api/trips/${tripId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete saved trip.');
      await this.fetchSavedTrips();
      this.renderSavedTrips();
    } catch (err) {
      console.error(err);
    }
  }

  async promptAddExpense(tripId) {
    const desc = prompt('Enter expense description (e.g., Local Train Pass, Dinner at Bistro):');
    if (!desc) return;
    const amountStr = prompt('Enter amount in USD:');
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const res = await this.authFetch(`/api/trips/${tripId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'activities',
          amount: amount,
          description: desc
        })
      });
      if (!res.ok) throw new Error('Failed to save expense.');
      await this.fetchSavedTrips();
      this.renderSavedTrips();
      alert('Expense recorded and total spending updated!');
    } catch (err) {
      console.error(err);
    }
  }

  // ==================== GROUP TRIP PLANNER ====================
  renderGroupMembers() {
    const list = document.getElementById('group-members-list');
    if (!list) return;

    list.innerHTML = this.groupMembers.map((m, idx) => `
      <div style="display: grid; grid-template-columns: 1.5fr 2fr 1fr auto; gap: 0.75rem; align-items: center; background: var(--bg-alt); padding: 0.75rem 1rem; border-radius: var(--radius-sm);">
        <input type="text" value="${m.name}" style="padding: 0.5rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);" onchange="app.groupMembers[${idx}].name=this.value">
        <input type="text" value="${m.interests.join(', ')}" placeholder="Interests comma-separated" style="padding: 0.5rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);" onchange="app.groupMembers[${idx}].interests=this.value.split(',').map(s=>s.trim())">
        <input type="number" value="${m.budget_limit_usd}" placeholder="Max Budget" style="padding: 0.5rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);" onchange="app.groupMembers[${idx}].budget_limit_usd=parseFloat(this.value)">
        <button style="background: none; border: none; color: var(--color-danger); cursor: pointer; font-size: 1rem;" onclick="app.removeGroupMember(${idx})">✕</button>
      </div>
    `).join('');
  }

  addGroupMemberRow() {
    this.groupMembers.push({
      name: `Traveler ${this.groupMembers.length + 1}`,
      interests: ['Culture', 'Relaxation'],
      budget_limit_usd: 1200,
      travel_style: 'Balanced'
    });
    this.renderGroupMembers();
  }

  removeGroupMember(idx) {
    if (this.groupMembers.length <= 2) {
      alert('Group trips require at least 2 members.');
      return;
    }
    this.groupMembers.splice(idx, 1);
    this.renderGroupMembers();
  }

  async analyzeGroupPlan() {
    const destId = document.getElementById('group-dest-select').value;
    const days = parseInt(document.getElementById('group-duration-days').value) || 6;

    try {
      const res = await fetch('/api/group-planner/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination_id: destId,
          duration_days: days,
          members: this.groupMembers,
          split_strategy: 'equal'
        })
      });

      const data = await res.json();
      const analysis = data.group_analysis;
      const resContainer = document.getElementById('group-analysis-results');
      resContainer.style.display = 'block';

      resContainer.innerHTML = `
        <div style="background-color: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 2rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <div>
              <span class="badge badge-teal">Consensus Score: ${analysis.consensus_score}/100</span>
              <h3 style="font-size: 1.5rem; margin-top: 0.35rem;">Group Travel Feasibility Breakdown</h3>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 0.8rem; color: var(--text-muted);">Total Group Cost</span>
              <div style="font-size: 1.75rem; font-weight: 800; color: var(--primary-navy);">${this.formatMoney(analysis.total_group_cost_usd)}</div>
            </div>
          </div>

          <div class="grid-2" style="margin-bottom: 1.5rem;">
            <div style="background: var(--bg-alt); padding: 1rem; border-radius: var(--radius-md);">
              <strong style="display: block; font-size: 0.85rem; margin-bottom: 0.5rem;">Shared Interests (Consensus):</strong>
              <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                ${analysis.consensus_interests.map(i => `<span class="badge badge-teal">${i}</span>`).join('')}
              </div>
            </div>
            <div style="background: var(--bg-alt); padding: 1rem; border-radius: var(--radius-md);">
              <strong style="display: block; font-size: 0.85rem; margin-bottom: 0.5rem;">Divergent / Niche Interests:</strong>
              <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                ${analysis.niche_interests.map(i => `<span class="badge badge-navy">${i}</span>`).join('')}
              </div>
            </div>
          </div>

          <h4 style="font-size: 1.1rem; margin-bottom: 0.75rem;">Individual Contribution Splits</h4>
          <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem;">
            ${analysis.individual_contributions.map(c => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); background: var(--bg-card);">
                <div>
                  <strong>${c.member_name}</strong>
                  <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">${c.strategy}</span>
                </div>
                <div style="text-align: right;">
                  <strong style="font-size: 1.1rem; color: var(--teal-dark);">${this.formatMoney(c.contribution_usd)}</strong>
                  <span class="badge ${c.status === 'Comfortable' ? 'badge-teal' : 'badge-warning'}" style="margin-left: 0.5rem;">${c.status}</span>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="background: rgba(11, 19, 43, 0.05); padding: 1rem; border-radius: var(--radius-md); font-size: 0.85rem; line-height: 1.6;">
            <strong>Group Trade-offs & Recommendations:</strong>
            <ul style="padding-left: 1.25rem; margin-top: 0.5rem; color: var(--text-secondary);">
              ${analysis.trade_offs.map(t => `<li>${t}</li>`).join('')}
            </ul>
          </div>
        </div>
      `;
    } catch (err) {
      console.error(err);
    }
  }

  // ==================== AI ASSISTANT CHAT ====================
  toggleFloatChat() {
    const drawer = document.getElementById('float-chat-drawer');
    if (drawer) drawer.classList.toggle('active');
  }

  async sendChatMessage() {
    const input = document.getElementById('full-chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    input.value = '';
    this.appendChatBubble('user', msg, 'full-chat-history');

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: msg }],
          current_trip_context: this.activeTrip,
          currency: this.currency
        })
      });
      const data = await res.json();
      this.appendChatBubble('assistant', data.response.reply, 'full-chat-history');
    } catch (err) {
      console.error(err);
      this.appendChatBubble('assistant', 'Sorry, I am having trouble connecting to RouteMate services.', 'full-chat-history');
    }
  }

  async sendFloatChatMessage() {
    const input = document.getElementById('float-chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    input.value = '';
    this.appendChatBubble('user', msg, 'float-chat-history');

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: msg }],
          current_trip_context: this.activeTrip,
          currency: this.currency
        })
      });
      const data = await res.json();
      this.appendChatBubble('assistant', data.response.reply, 'float-chat-history');
    } catch (err) {
      console.error(err);
    }
  }

  sendAssistantQuickPrompt(promptText) {
    document.getElementById('full-chat-input').value = promptText;
    this.sendChatMessage();
  }

  appendChatBubble(role, text, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    // Parse markdown-like bold and linebreaks
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
    bubble.innerHTML = formatted;

    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  }

  // ==================== TRAVEL ANALYTICS ====================
  async loadAnalytics() {
    try {
      const res = await this.authFetch('/api/analytics');
      if (!res.ok) throw new Error('Sign in to view your travel analytics.');
      const data = await res.json();

      const statCards = document.getElementById('analytics-stat-cards');
      if (statCards) {
        statCards.innerHTML = `
          <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-sm);">
            <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Total Planned Budget</span>
            <div style="font-size: 1.85rem; font-weight: 800; color: var(--color-primary); margin-top: 0.25rem;">${this.formatMoney(data.total_planned_spend_usd)}</div>
            <span style="font-size: 0.8rem; color: var(--color-accent-hover);">Across all created itineraries</span>
          </div>
          <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-sm);">
            <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Recorded Actual Spend</span>
            <div style="font-size: 1.85rem; font-weight: 800; color: var(--color-accent); margin-top: 0.25rem;">${this.formatMoney(data.total_actual_spend_usd)}</div>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">Logged through expenses</span>
          </div>
          <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-sm);">
            <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Net Budget Surplus</span>
            <div style="font-size: 1.85rem; font-weight: 800; color: var(--color-success); margin-top: 0.25rem;">${this.formatMoney(data.budget_savings_usd)}</div>
            <span style="font-size: 0.8rem; color: var(--color-success);">Preserved via optimizations</span>
          </div>
          <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-sm);">
            <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Avg Decision Score</span>
            <div style="font-size: 1.85rem; font-weight: 800; color: var(--color-secondary); margin-top: 0.25rem;">${data.average_decision_match_score}/100</div>
            <span style="font-size: 0.8rem; color: var(--color-accent-hover);">High constraint fit</span>
          </div>
        `;
      }

      const catBars = document.getElementById('analytics-category-bars');
      if (catBars) {
        const cats = data.spending_by_category;
        const total = Object.values(cats).reduce((a, b) => a + b, 0) || 1;

        catBars.innerHTML = Object.entries(cats).map(([k, v]) => {
          const pct = Math.round((v / total) * 100);
          return `
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.35rem;">
                <span style="text-transform: capitalize;">${k}</span>
                <strong>${this.formatMoney(v)} (${pct}%)</strong>
              </div>
              <div class="score-track" style="background-color: var(--bg-alt);">
                <div class="score-fill" style="width: ${pct}%;"></div>
              </div>
            </div>
          `;
        }).join('');
      }

      const insights = document.getElementById('analytics-insights-content');
      if (insights) {
        insights.innerHTML = `
          <div style="margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <strong>Eco-Friendly Transit Index</strong>
              <span class="badge badge-teal">${data.sustainable_transit_pct}% Sustainable</span>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">
              Your planned trips prioritize electric rail, low-floor city trams, and walking boulevards, reducing estimated transit emissions by ~35% compared to private car hire.
            </p>
          </div>

          <div>
            <strong style="display: block; margin-bottom: 0.5rem;">Top Travel Style Distribution:</strong>
            <ul style="padding-left: 1.25rem;">
              ${data.top_travel_styles.map(s => `<li>${s.style} (${s.pct}%)</li>`).join('')}
            </ul>
          </div>
        `;
      }
    } catch (err) {
      console.error(err);
    }
  }

  // ==================== AUTHENTICATION & PROFILE ====================
  async initAuth() {
    if (this.token) {
      try {
        const res = await this.authFetch('/api/auth/profile');
        if (!res.ok) throw new Error('Session expired. Please sign in again.');
        const data = await res.json();
        if (data.user) {
          this.currentUser = data.user;
          this.isLoggedIn = true;
          localStorage.setItem('routemate_user', JSON.stringify(this.currentUser));
        }
      } catch (err) {
        console.error('Could not restore session:', err);
        this.token = null;
        this.currentUser = null;
        this.isLoggedIn = false;
        localStorage.removeItem('routemate_token');
        localStorage.removeItem('routemate_user');
      }
    } else {
      localStorage.removeItem('routemate_user');
    }
    this.updateAuthUI();
  }

  updateAuthUI() {
    const authNav = document.getElementById('nav-auth-section');
    const userNav = document.getElementById('nav-user-section');
    const avatar = document.getElementById('nav-user-avatar');
    const name = document.getElementById('nav-user-name');

    if (this.isLoggedIn && this.currentUser) {
      if (authNav) authNav.style.display = 'none';
      if (userNav) userNav.style.display = 'flex';
      if (avatar) avatar.src = this.currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
      if (name) name.textContent = this.currentUser.name.split(' ')[0];
    } else {
      if (authNav) authNav.style.display = 'flex';
      if (userNav) userNav.style.display = 'none';
    }
  }

  openAuthModal(tab = 'login') {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('active');
    this.switchAuthTab(tab);
  }

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('active');
  }

  switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('auth-tab-login');
    const tabReg = document.getElementById('auth-tab-register');
    const title = document.getElementById('auth-modal-title');

    if (tab === 'login') {
      if (loginForm) loginForm.style.display = 'block';
      if (regForm) regForm.style.display = 'none';
      if (tabLogin) { tabLogin.classList.add('active'); tabLogin.style.borderBottom = '2px solid var(--accent-teal)'; }
      if (tabReg) { tabReg.classList.remove('active'); tabReg.style.borderBottom = 'none'; }
      if (title) title.textContent = 'Sign In to RouteMate AI';
    } else {
      if (loginForm) loginForm.style.display = 'none';
      if (regForm) regForm.style.display = 'block';
      if (tabLogin) { tabLogin.classList.remove('active'); tabLogin.style.borderBottom = 'none'; }
      if (tabReg) { tabReg.classList.add('active'); tabReg.style.borderBottom = '2px solid var(--accent-teal)'; }
      if (title) title.textContent = 'Create RouteMate AI Account';
    }
  }

  async loginAsDemo() {
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Demo login failed.');
      if (data.password_change_required) {
        alert('Demo account requires a password reset before it can be used.');
        return;
      }
      this.currentUser = data.user;
      this.token = data.token;
      this.isLoggedIn = true;
      localStorage.setItem('routemate_user', JSON.stringify(this.currentUser));
      localStorage.setItem('routemate_token', this.token);
      this.updateAuthUI();
      this.closeAuthModal();
      this.navigate('profile');
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Demo login failed.');
    }
  }

  async submitLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login-submit');
    btn.disabled = true;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Login failed.');
        return;
      }

      const data = await res.json();
      if (data.password_change_required) {
        const newPassword = prompt('Set a new password of at least 12 characters before continuing:');
        if (!newPassword) return;
        const passwordRes = await fetch('/api/auth/password', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.token}`
          },
          body: JSON.stringify({ current_password: password, new_password: newPassword })
        });
        const passwordData = await passwordRes.json();
        if (!passwordRes.ok) throw new Error(passwordData.detail || 'Could not update password.');
        data.user = passwordData.user;
        data.token = passwordData.token;
      }
      this.currentUser = data.user;
      this.token = data.token;
      this.isLoggedIn = true;
      localStorage.setItem('routemate_user', JSON.stringify(this.currentUser));
      localStorage.setItem('routemate_token', this.token);
      this.updateAuthUI();
      this.closeAuthModal();
      this.navigate('profile');
    } catch (err) {
      console.error(err);
      alert('Could not connect to authentication service.');
    } finally {
      btn.disabled = false;
    }
  }

  async submitRegister() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const city = document.getElementById('reg-city').value;
    const btn = document.getElementById('btn-register-submit');
    btn.disabled = true;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, home_city: city })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Registration failed.');
        return;
      }

      const data = await res.json();
      this.currentUser = data.user;
      this.token = data.token;
      this.isLoggedIn = true;
      localStorage.setItem('routemate_user', JSON.stringify(this.currentUser));
      localStorage.setItem('routemate_token', this.token);
      this.updateAuthUI();
      this.closeAuthModal();
      this.navigate('profile');
    } catch (err) {
      console.error(err);
      alert('Could not complete registration.');
    } finally {
      btn.disabled = false;
    }
  }

  logout() {
    this.currentUser = null;
    this.token = null;
    this.isLoggedIn = false;
    localStorage.removeItem('routemate_user');
    localStorage.removeItem('routemate_token');
    this.updateAuthUI();
    this.navigate('home');
  }

  async renderProfile() {
    if (!this.currentUser) {
      try {
        const res = await this.authFetch('/api/auth/profile');
        if (!res.ok) throw new Error('Sign in to view your profile.');
        const data = await res.json();
        if (data.user) {
          this.currentUser = data.user;
          this.isLoggedIn = true;
          localStorage.setItem('routemate_user', JSON.stringify(this.currentUser));
          this.updateAuthUI();
        }
      } catch (err) {
        console.error('Could not load profile from API:', err);
      }
    }

    if (!this.currentUser) {
      this.openAuthModal('login');
      return;
    }
    const u = this.currentUser;

    // 1. Profile Banner
    const heading = document.getElementById('profile-name-heading');
    if (heading) heading.textContent = u.name;

    const emailSub = document.getElementById('profile-email-sub');
    if (emailSub) emailSub.innerHTML = `${u.email} • <span id="profile-location-sub">${u.home_city || 'Jaipur, Rajasthan, India'}</span>`;

    const badge = document.getElementById('profile-membership-badge');
    if (badge) badge.textContent = u.membership || 'RouteMate Pro Explorer';

    const avatar = document.getElementById('profile-avatar-img');
    if (avatar) avatar.src = u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

    // 2. Travel Achievement Stats
    const statTrips = document.getElementById('stat-trips-count');
    if (statTrips) statTrips.textContent = u.trips_completed || this.savedTrips.length || 6;

    const statCountries = document.getElementById('stat-countries-count');
    if (statCountries) statCountries.textContent = u.countries_visited || 14;

    const statSavings = document.getElementById('stat-savings-count');
    if (statSavings) statSavings.textContent = this.formatMoney(u.saved_budget_usd || 1820);

    // 3. GENERAL DETAILS CARD
    const gdName = document.getElementById('profile-gd-name');
    if (gdName) gdName.textContent = u.name;

    const gdEmail = document.getElementById('profile-gd-email');
    if (gdEmail) gdEmail.textContent = u.email;

    const gdCity = document.getElementById('profile-gd-city');
    if (gdCity) gdCity.textContent = u.home_city || 'Jaipur, Rajasthan, India';

    const gdId = document.getElementById('profile-gd-id');
    if (gdId) gdId.textContent = u.id || 'usr-alex-1';

    const gdTier = document.getElementById('profile-gd-tier');
    if (gdTier) gdTier.textContent = u.membership || 'RouteMate Pro Explorer';

    const gdSince = document.getElementById('profile-gd-since');
    if (gdSince) {
      if (u.created_at) {
        try {
          const d = new Date(u.created_at);
          gdSince.textContent = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        } catch (_) {
          gdSince.textContent = 'January 2026';
        }
      } else {
        gdSince.textContent = 'January 2026';
      }
    }

    const gdStyle = document.getElementById('profile-gd-style');
    if (gdStyle) gdStyle.textContent = `${u.travel_style || 'Couple'} Traveler`;

    const gdPace = document.getElementById('profile-gd-pace');
    if (gdPace) gdPace.textContent = `${u.pace || 'Balanced'} (2–3 highlights/day)`;

    const gdUnits = document.getElementById('profile-gd-units');
    if (gdUnits) gdUnits.textContent = `${this.currency} (${CURRENCY_RATES[this.currency]?.symbol || '$'}) • ${u.units || 'km'}`;

    const gdAccess = document.getElementById('profile-gd-access');
    if (gdAccess) {
      gdAccess.textContent = u.accessibility_mode ? '♿ Step-Free Priority' : 'Standard Accessibility';
      gdAccess.style.color = u.accessibility_mode ? 'var(--color-accent)' : 'var(--color-text)';
    }

    const gdInterests = document.getElementById('profile-gd-interests');
    if (gdInterests) {
      const interestsList = (u.interests && u.interests.length > 0) 
        ? u.interests 
        : ['Culture', 'Food', 'Nature', 'Photography'];
      gdInterests.innerHTML = interestsList.map(item => `
        <span class="dest-tag" style="background: var(--color-accent-subtle); color: var(--color-accent); font-weight: 600; padding: 0.3rem 0.75rem; border-radius: var(--radius-full); font-size: 0.8rem;">
          ${item}
        </span>
      `).join('');
    }

    const gdBio = document.getElementById('profile-gd-bio');
    if (gdBio) {
      gdBio.textContent = `"${u.bio || 'Curious wanderer & culinary enthusiast. Focused on sustainable journeys and immersive cultural routes.'}"`;
    }

    // 4. Preferences Edit Form Inputs
    const pName = document.getElementById('prof-name');
    if (pName) pName.value = u.name;

    const pEmail = document.getElementById('prof-email');
    if (pEmail) pEmail.value = u.email;

    const pCity = document.getElementById('prof-home-city');
    if (pCity) pCity.value = u.home_city || '';

    const pStyle = document.getElementById('prof-style');
    if (pStyle) pStyle.value = u.travel_style || 'Couple';

    const pPace = document.getElementById('prof-pace');
    if (pPace) pPace.value = u.pace || 'Balanced';

    const pUnits = document.getElementById('prof-units');
    if (pUnits) pUnits.value = u.units || 'km';

    const pBio = document.getElementById('prof-bio');
    if (pBio) pBio.value = u.bio || '';

    const pAcc = document.getElementById('prof-accessibility');
    if (pAcc) pAcc.checked = !!u.accessibility_mode;

    // 5. Saved Trips List in Profile
    const savedContainer = document.getElementById('profile-saved-trips-container');
    if (savedContainer) {
      if (this.savedTrips && this.savedTrips.length > 0) {
        savedContainer.innerHTML = this.savedTrips.slice(0, 3).map(trip => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1rem; background: var(--bg-surface-muted); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <strong style="color: var(--color-text); font-size: 0.95rem;">${trip.title}</strong>
              <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.2rem;">
                ${trip.duration_days} Days • ${trip.start_date} to ${trip.end_date} • <strong>${this.formatMoney(trip.budget_breakdown ? trip.budget_breakdown.total_estimated_usd : 2400)}</strong>
              </div>
            </div>
            <button class="btn btn-sm btn-primary" onclick="app.loadSavedTripIntoActive('${trip.trip_id}')">Open Itinerary</button>
          </div>
        `).join('');
      } else {
        savedContainer.innerHTML = `
          <div style="padding: 1.5rem; text-align: center; color: var(--color-text-secondary); background: var(--bg-surface-muted); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <p style="margin-bottom: 0.65rem; font-size: 0.9rem;">No saved itineraries yet. Generate your first personalized route!</p>
            <button class="btn btn-sm btn-primary" onclick="app.navigate('planner')">Launch AI Trip Planner</button>
          </div>
        `;
      }
    }
  }

  async saveProfileSettings() {
    const btn = document.getElementById('btn-save-profile');
    btn.disabled = true;
    btn.textContent = 'Saving Preferences...';

    const updates = {
      name: document.getElementById('prof-name').value,
      email: document.getElementById('prof-email').value.trim(),
      home_city: document.getElementById('prof-home-city').value,
      travel_style: document.getElementById('prof-style').value,
      pace: document.getElementById('prof-pace').value,
      units: document.getElementById('prof-units').value,
      bio: document.getElementById('prof-bio').value,
      accessibility_mode: document.getElementById('prof-accessibility').checked
    };

    try {
      const res = await this.authFetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to save profile updates.');
      }
      this.currentUser = data.user;
      localStorage.setItem('routemate_user', JSON.stringify(this.currentUser));
      this.renderProfile();
      this.updateAuthUI();
      alert('Profile and travel preferences updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save profile updates.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Profile Changes';
    }
  }

  exportUserData() {
    const exportData = {
      user_profile: this.currentUser,
      saved_trips: this.savedTrips,
      exported_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RouteMate_Travel_Profile_${this.currentUser.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  clearStoredData() {
    if (!confirm('Are you sure you want to delete all saved itineraries and reset local history?')) return;
    this.savedTrips = [];
    localStorage.removeItem('routemate_user');
    localStorage.removeItem('routemate_token');
    alert('Local travel history and saved trips cleared.');
    window.location.reload();
  }
}

// Global Application Instance
const app = new RouteMateApp();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
