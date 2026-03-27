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
    if (
      scrollPos >= section.offsetTop &&
      scrollPos < section.offsetTop + section.offsetHeight
    ) {
      navItems.forEach(function (a) {
        a.classList.remove('active');
        if (a.getAttribute('href') === '#' + section.id) {
          a.classList.add('active');
        }
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

// ---------- Fade-in on scroll ----------
var fadeEls = document.querySelectorAll(
  '.highlight-card, .interest-card, .publication-card, .contact-card, ' +
  '.project-card, .project-card-full, .news-card, .timeline-item, ' +
  '.service-block, .skill-item'
);

var fadeObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

fadeEls.forEach(function (el) {
  el.classList.add('fade-in');
  fadeObserver.observe(el);
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

    if (matchesQ && matchesF) {
      card.style.display = '';
      visible++;
    } else {
      card.style.display = 'none';
    }
  });

  pubYearGroups.forEach(function (group) {
    var cards      = group.querySelectorAll('.publication-card');
    var anyVisible = false;
    cards.forEach(function (c) { if (c.style.display !== 'none') anyVisible = true; });
    group.style.display = anyVisible ? '' : 'none';
  });

  if (pubNoResults) {
    pubNoResults.classList.toggle('visible', visible === 0);
  }
}

if (pubSearch) {
  pubSearch.addEventListener('input', filterPublications);
}

var filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(function (btn) {
  btn.addEventListener('click', function () {
    filterBtns.forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    activeFilter = btn.getAttribute('data-filter');
    filterPublications();
  });
});

// ---------- Footer year ----------
var yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

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
