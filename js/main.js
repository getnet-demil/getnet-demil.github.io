/* =====================================================
   main.js – Portfolio interactivity
   Arctic Aurora Academic Portfolio — Getnet Demil Jenberia
   ===================================================== */

// ---------- Live Citation Count (Semantic Scholar API) ----------
(function fetchLiveCitations() {
  var url = 'https://api.semanticscholar.org/graph/v1/author/search' +
    '?query=Getnet+Demil+Jenberia&fields=name,citationCount,paperCount,hIndex&limit=5';

  fetch(url)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.data || !data.data.length) return;
      var best = null;
      data.data.forEach(function (author) {
        var name = (author.name || '').toLowerCase();
        if (name.indexOf('getnet') === -1) return;
        if (!best || (author.citationCount || 0) > (best.citationCount || 0)) {
          best = author;
        }
      });
      if (!best || !best.citationCount) return;
      var citEl = document.querySelector('.metric-number[data-count]');
      if (citEl) {
        citEl.setAttribute('data-count', best.citationCount);
        var subtitleEl = document.querySelector('#publications .section-subtitle');
        if (subtitleEl) {
          subtitleEl.innerHTML = subtitleEl.innerHTML.replace(
            /\d+\+?\s*citations/i,
            best.citationCount + '+ citations'
          );
        }
      }
    })
    .catch(function () { /* keep static fallback */ });
})();

// ---------- Medium RSS Feed (via rss2json.com) ----------
(function initMediumFeed() {
  var container = document.getElementById('mediumFeed');
  if (!container) return;

  var RSS = 'https://medium.com/feed/@getnetdemil';
  var API = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(RSS) + '&count=10';

  function stripTags(str) { return (str || '').replace(/<[^>]+>/g, ''); }

  function truncate(str, max) {
    var plain = stripTags(str);
    return plain.length > max ? plain.slice(0, max).trimEnd() + '\u2026' : plain;
  }

  function formatDate(dateStr) {
    var d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }

  function readTime(content) {
    var words = stripTags(content || '').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200)) + ' min read';
  }

  function render(posts) {
    var badge = document.getElementById('mediumBadge');
    if (badge) badge.textContent = posts.length;

    var html = posts.map(function (p) {
      return '<article class="medium-card fade-in">' +
        '<div class="medium-card-meta">' +
          '<time class="medium-date">' + formatDate(p.pubDate) + '</time>' +
          '<span class="medium-read">' + readTime(p.content || p.description) + '</span>' +
        '</div>' +
        '<h3 class="medium-title">' +
          '<a href="' + p.link + '" target="_blank" rel="noopener noreferrer">' +
          (p.title || 'Untitled') + '</a>' +
        '</h3>' +
        '<p class="medium-excerpt">' + truncate(p.description, 140) + '</p>' +
        '<a class="medium-read-link" href="' + p.link + '" target="_blank" rel="noopener noreferrer">' +
          'Read on Medium \u2192' +
        '</a>' +
      '</article>';
    }).join('');

    // LinkedIn CTA card
    html += '<div class="medium-card medium-card--linkedin fade-in">' +
      '<div class="medium-card-meta"><span class="medium-read">Professional updates</span></div>' +
      '<h3 class="medium-title">Follow on LinkedIn</h3>' +
      '<p class="medium-excerpt">Research updates, conference posts, and collaboration opportunities.</p>' +
      '<a class="medium-read-link" href="https://www.linkedin.com/in/getnetdemil/" target="_blank" rel="noopener noreferrer">' +
        'View LinkedIn Profile \u2192' +
      '</a>' +
    '</div>';

    container.innerHTML = html;

    // Trigger fade-in for newly rendered cards
    container.querySelectorAll('.fade-in').forEach(function (el) {
      fadeObserverInstance && fadeObserverInstance.observe(el);
    });
  }

  fetch(API)
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (data) {
      if (data.status === 'ok' && data.items && data.items.length) {
        render(data.items);
      } else {
        throw new Error('No items');
      }
    })
    .catch(function () {
      container.innerHTML =
        '<p class="medium-empty">Could not load posts. ' +
        '<a href="https://medium.com/@getnetdemil" target="_blank" rel="noopener noreferrer">' +
        'Read on Medium \u2192</a></p>';
    });
})();

// ---------- News / Blog Tabs ----------
(function initNewsTabs() {
  var tabs   = document.querySelectorAll('.news-tab');
  var panels = document.querySelectorAll('[role="tabpanel"]');
  if (!tabs.length) return;

  function activateTab(targetId) {
    tabs.forEach(function (t) {
      var isTarget = t.getAttribute('data-tab') === targetId;
      t.classList.toggle('active', isTarget);
      t.setAttribute('aria-selected', String(isTarget));
    });
    panels.forEach(function (panel) {
      panel.hidden = (panel.id !== 'tab-' + targetId && panel.id !== targetId);
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      activateTab(tab.getAttribute('data-tab'));
    });
  });

  // Navbar "Blog" link — activate tab and scroll to section
  var navBlogLink = document.querySelector('.nav-links a[href="#blog"]');
  if (navBlogLink) {
    navBlogLink.addEventListener('click', function (e) {
      e.preventDefault();
      activateTab('blog');
      document.getElementById('news').scrollIntoView({ behavior: 'smooth' });
      history.replaceState(null, '', '#blog');
    });
  }

  // Auto-activate Blog tab on direct page load with #blog hash
  if (window.location.hash === '#blog') {
    activateTab('blog');
  }
})();

// ---------- See More / Collapse (universal) ----------
(function initSeeMore() {
  document.querySelectorAll('[data-see-more]').forEach(function (container) {
    var max    = parseInt(container.getAttribute('data-see-more'), 10);
    var items  = Array.from(container.children);
    var wrap   = container.nextElementSibling;
    var btn    = wrap && wrap.classList.contains('see-more-wrap')
                   ? wrap.querySelector('.see-more-btn') : null;
    var icon   = btn && btn.querySelector('.see-more-icon');
    var hidden = items.slice(max);

    if (!btn || !hidden.length) {
      if (wrap && wrap.classList.contains('see-more-wrap')) wrap.hidden = true;
      return;
    }

    hidden.forEach(function (el) { el.hidden = true; });

    btn.addEventListener('click', function () {
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      hidden.forEach(function (el) { el.hidden = isOpen; });
      btn.setAttribute('aria-expanded', String(!isOpen));

      // Swap label text
      var labelMore = btn.getAttribute('data-label-more') || 'Show more';
      var labelLess = btn.getAttribute('data-label-less') || 'Show less';
      // Update only the text node (first child)
      var textNode = Array.from(btn.childNodes).find(function (n) { return n.nodeType === 3; });
      if (textNode) textNode.textContent = isOpen ? labelMore + ' ' : labelLess + ' ';

      if (icon) icon.style.transform = isOpen ? '' : 'rotate(180deg)';
      if (!isOpen && hidden[0]) {
        hidden[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });
})();

// ---------- Theme Toggle ----------
(function initTheme() {
  var saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();

var themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  themeToggle.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
}

// ---------- Scroll Progress Bar ----------
var progressBar = document.getElementById('scroll-progress');
function updateScrollProgress() {
  if (!progressBar) return;
  var scrollTop  = window.scrollY || document.documentElement.scrollTop;
  var docHeight  = document.documentElement.scrollHeight - window.innerHeight;
  var pct        = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressBar.style.width = pct + '%';
}
window.addEventListener('scroll', updateScrollProgress, { passive: true });

// ---------- Navbar scroll effect ----------
var navbar = document.getElementById('navbar');
function handleNavbarScroll() {
  if (!navbar) return;
  if (window.scrollY > 20) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}
window.addEventListener('scroll', handleNavbarScroll, { passive: true });

// ---------- Mobile nav toggle ----------
var navToggle = document.getElementById('navToggle');
var navLinks  = document.getElementById('navLinks');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', function () {
    var isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ---------- Active nav link on scroll ----------
var sections = document.querySelectorAll('section[id]');
var navItems = document.querySelectorAll('.nav-links a');

function updateActiveNavLink() {
  var scrollPos = window.scrollY + 120;
  sections.forEach(function (section) {
    if (scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight) {
      navItems.forEach(function (a) {
        a.classList.remove('active');
        if (a.getAttribute('href') === '#' + section.id) a.classList.add('active');
      });
    }
  });
}
window.addEventListener('scroll', updateActiveNavLink, { passive: true });

// ---------- Animated Counters ----------
function animateCounter(el) {
  var target   = parseInt(el.getAttribute('data-count'), 10);
  var duration = 1400;
  var start    = null;
  function step(ts) {
    if (!start) start = ts;
    var progress = Math.min((ts - start) / duration, 1);
    var eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

var counterEls   = document.querySelectorAll('.metric-number[data-count]');
var countersSeen = false;
var counterObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting && !countersSeen) {
      countersSeen = true;
      counterEls.forEach(animateCounter);
      counterObserver.disconnect();
    }
  });
}, { threshold: 0.3 });
if (counterEls.length > 0) {
  counterObserver.observe(counterEls[0].closest('.about-metrics') || counterEls[0]);
}

// ---------- Timeline item scroll animations ----------
var tlObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('tl-item--visible');
      tlObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.tl-item').forEach(function (el, i) {
  el.style.setProperty('--delay', (i % 5) * 80 + 'ms');
  tlObserver.observe(el);
});

// ---------- CV alternating entry animations ----------
var cvObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('cv-entry--visible');
      cvObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.cv-entry').forEach(function (el, i) {
  el.style.setProperty('--delay', (i % 6) * 90 + 'ms');
  cvObserver.observe(el);
});

// ---------- Fade-in on scroll ----------
var fadeEls = document.querySelectorAll(
  '.highlight-card, .interest-card, .publication-card, .contact-card, ' +
  '.project-card, .project-card-full, .news-card, .service-block, .skill-item'
);

var fadeObserverInstance = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      fadeObserverInstance.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

fadeEls.forEach(function (el) {
  el.classList.add('fade-in');
  fadeObserverInstance.observe(el);
});

// ---------- Publication search ----------
var pubSearch     = document.getElementById('pubSearch');
var pubCards      = document.querySelectorAll('.publication-card');
var pubYearGroups = document.querySelectorAll('.pub-year-group');
var pubNoResults  = document.getElementById('pubNoResults');
var activeFilter  = 'all';

function filterPublications() {
  var query   = pubSearch ? pubSearch.value.toLowerCase().trim() : '';
  var visible = 0;
  pubCards.forEach(function (card) {
    var type     = (card.getAttribute('data-type') || '').toLowerCase();
    var text     = card.textContent.toLowerCase();
    var matchesQ = !query || text.indexOf(query) !== -1;
    var matchesF = activeFilter === 'all' || type === activeFilter;
    if (matchesQ && matchesF) { card.style.display = ''; visible++; }
    else { card.style.display = 'none'; }
  });
  pubYearGroups.forEach(function (group) {
    var cards = group.querySelectorAll('.publication-card');
    var any   = false;
    cards.forEach(function (c) { if (c.style.display !== 'none') any = true; });
    group.style.display = any ? '' : 'none';
  });
  if (pubNoResults) pubNoResults.classList.toggle('visible', visible === 0);
}

if (pubSearch) pubSearch.addEventListener('input', filterPublications);

var filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(function (btn) {
  btn.addEventListener('click', function () {
    filterBtns.forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    activeFilter = btn.getAttribute('data-filter');
    filterPublications();
  });
});

// ---------- FlowCV iframe error handling ----------
(function () {
  var iframe = document.querySelector('.flowcv-iframe');
  if (!iframe) return;
  iframe.addEventListener('error', function () {
    var wrap = iframe.closest('.flowcv-wrap');
    if (wrap) wrap.classList.add('flowcv-wrap--error');
  });
})();

// ---------- Footer year ----------
var yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ---------- Nav brand: scroll to top, no hash in URL ----------
var navBrand = document.querySelector('.nav-brand');
if (navBrand) {
  navBrand.addEventListener('click', function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', '/');
  });
}

// Run once at init
handleNavbarScroll();
updateActiveNavLink();
