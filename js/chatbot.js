/* =====================================================
   chatbot.js – "Ask about Getnet" AI assistant widget
   Talks to a Cloudflare Worker (worker/src/index.js) which proxies
   Google Gemini. The browser never sees an API key.
   ===================================================== */

(function initChatbot() {
  var CHAT_API_URL = 'https://ask-about-getnet.getnetd24.workers.dev';

  var fab = document.getElementById('chatbotFab');
  var panel = document.getElementById('chatbotPanel');
  var closeBtn = document.getElementById('chatbotClose');
  var messagesEl = document.getElementById('chatbotMessages');
  var suggestionsEl = document.getElementById('chatbotSuggestions');
  var form = document.getElementById('chatbotForm');
  var input = document.getElementById('chatbotInput');
  if (!fab || !panel || !form || !input) return;

  var SUGGESTIONS = [
    "What's Getnet's PhD research about?",
    'What has he published?',
    'What projects has he built?',
    'How can I contact him?'
  ];

  // Instant, pre-written answers for the fixed suggestion chips above, so
  // the most common questions don't wait on a round-trip to Gemini. Each
  // entry leads with a short answer and offers a "More detail" follow-up.
  // Must be kept in sync with worker/src/index.js's SYSTEM_PROMPT if the
  // underlying facts change. Free-form questions still go through the live
  // API.
  var CANNED_ANSWERS = {
    "What's Getnet's PhD research about?": {
      short:
        "Getnet's PhD is in Geospatial AI, remote sensing, and computer vision at the University of Oulu, Finland. He builds deep learning models that fuse satellite data (SAR, optical, multispectral) to monitor snow and water resources.",
      detail:
        "His flagship project, **CrossFuse**, is a CNN-Transformer architecture fusing Sentinel-1 SAR and Sentinel-2 optical imagery for high-resolution snow cover and snow water equivalent estimation. It's published as **XFuse** in the ISPRS Journal of Photogrammetry and Remote Sensing (2026). He also built **mDeepLabV3+**, a snow-cloud segmentation model published in Earth Science Informatics, and is co-organising the HydroImaging Workshop at IEEE ICIP 2026 in Tampere, Finland."
    },
    'What has he published?': {
      short:
        "Getnet has 9 peer-reviewed publications with 50+ citations in AI, remote sensing, and hydrology, including journal papers in ISPRS and the Journal of Hydrology.",
      detail:
        "• **XFuse**: multi-sensor CNN-Transformer fusion for snow cover mapping. ISPRS Journal of Photogrammetry and Remote Sensing, 2026\n• **FiLM-GPNet**: geometry-aware InSAR phase restoration. IGARSS 2026\n• **HYDRO-DATASET**: open-source multi-modal hydrology benchmark with a companion Zenodo dataset. ICIP 2026\n• **AquaNord-SE**: large-scale longitudinal benchmark for Swedish inland water quality, with a companion dataset. CIKM 2026\n• A systematic review on image-based snow estimation. Journal of Hydrology, 2025\n• The original **mDeepLabV3+** paper. Earth Science Informatics, 2025\n• A book chapter on AI-based early warning systems, 2025\n• A Nordic AI Climate Workshop paper, 2025\n• A SIGIR 2024 workshop paper on social media climate monitoring\n\nFull details with DOIs are in the Publications section on this page."
    },
    'What projects has he built?': {
      short:
        "Getnet has built 7 major projects spanning satellite-based snow and soil moisture monitoring, climate NLP, assistive robotics, and medical diagnostics.",
      detail:
        "• **CrossFuse**: CNN-Transformer fusion of Sentinel-1 SAR and Sentinel-2 for snow cover and SWE estimation\n• **Soil Moisture Scale-Transfer Study**: satellite-based root-zone soil moisture retrieval, from his UF/IFAS TREC research visit\n• **mDeepLabV3+**: snow-cloud segmentation in Sentinel-2 imagery\n• **Climate Social Media Monitor**: real-time NLP pipeline detecting floods and droughts from social media\n• **HydroImaging Workshop @ ICIP 2026**: a workshop he's co-organising in Tampere, Finland\n• **Smart Microscope**: an award-winning computer-vision system for automated disease diagnosis\n• **Vision-Aided Assistive Robotics**: 6D pose estimation for robotic arms assisting people with upper-limb disabilities\n\nSee the Projects section on this page for the full picture."
    },
    'How can I contact him?': {
      short: "You can reach Getnet directly by email at **getnet.demil@oulu.fi**.",
      detail:
        "He's also active on GitHub (github.com/getnetdemil), Google Scholar, ResearchGate, LinkedIn, and his University of Oulu profile, all linked at the top of this site."
    }
  };

  var history = []; // [{ role: 'user'|'model', text: '...' }]
  var open = false;
  var sending = false;
  var greeted = false;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Minimal, safe markdown: escapes everything first, then re-introduces
  // **bold**, line breaks, and bare URLs as links.
  function formatReply(str) {
    var escaped = escapeHtml(str);
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/(https?:\/\/[^\s<]+)/g, function (url) {
      return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
    });
    return escaped.replace(/\n/g, '<br>');
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(role, text, isHtml) {
    var row = document.createElement('div');
    row.className = 'chatbot-msg chatbot-msg--' + (role === 'user' ? 'user' : 'bot');
    var bubble = document.createElement('div');
    bubble.className = 'chatbot-bubble';
    if (isHtml) {
      bubble.innerHTML = text;
    } else {
      bubble.textContent = text;
    }
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollToBottom();
    return row;
  }

  function addMoreDetailButton(detailText) {
    var row = document.createElement('div');
    row.className = 'chatbot-msg chatbot-msg--bot';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chatbot-more-btn';
    btn.textContent = 'More detail';
    btn.addEventListener('click', function () {
      row.remove();
      addMessage('bot', formatReply(detailText), true);
      history.push({ role: 'model', text: detailText });
    });
    row.appendChild(btn);
    messagesEl.appendChild(row);
    scrollToBottom();
    return row;
  }

  function addTyping() {
    var row = document.createElement('div');
    row.className = 'chatbot-msg chatbot-msg--bot';
    row.id = 'chatbotTyping';
    row.innerHTML =
      '<div class="chatbot-bubble chatbot-typing"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(row);
    scrollToBottom();
  }

  function removeTyping() {
    var row = document.getElementById('chatbotTyping');
    if (row) row.remove();
  }

  function renderSuggestions() {
    suggestionsEl.innerHTML = '';
    SUGGESTIONS.forEach(function (q) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chatbot-chip';
      chip.textContent = q;
      chip.addEventListener('click', function () {
        if (sending) return;
        sendMessage(q);
      });
      suggestionsEl.appendChild(chip);
    });
  }

  function greet() {
    if (greeted) return;
    greeted = true;
    addMessage(
      'bot',
      "Hi, I'm an AI assistant trained on Getnet's research, CV, and publications. Ask me anything about his work!"
    );
    renderSuggestions();
  }

  function setPanelOpen(next) {
    open = next;
    panel.hidden = !open;
    fab.setAttribute('aria-expanded', String(open));
    fab.classList.toggle('chatbot-fab--open', open);
    if (open) {
      greet();
      setTimeout(function () { input.focus(); }, 50);
    }
  }

  fab.addEventListener('click', function () { setPanelOpen(!open); });
  closeBtn.addEventListener('click', function () { setPanelOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) setPanelOpen(false);
  });

  function sendMessage(text) {
    text = text.trim();
    if (!text || sending) return;

    if (Object.prototype.hasOwnProperty.call(CANNED_ANSWERS, text)) {
      var canned = CANNED_ANSWERS[text];
      addMessage('user', text);
      addMessage('bot', formatReply(canned.short), true);
      history.push({ role: 'user', text: text });
      history.push({ role: 'model', text: canned.short });
      addMoreDetailButton(canned.detail);
      input.value = '';
      return;
    }

    if (!CHAT_API_URL) {
      addMessage('user', text);
      addMessage(
        'bot',
        "The chat backend isn't connected yet. This widget is waiting on its Cloudflare Worker URL. In the meantime, feel free to reach Getnet directly by email."
      );
      input.value = '';
      return;
    }

    addMessage('user', text);
    history.push({ role: 'user', text: text });
    input.value = '';
    sending = true;
    addTyping();

    fetch(CHAT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: history.slice(0, -1) })
    })
      .then(function (r) {
        if (!r.ok || !r.body) throw new Error('HTTP ' + r.status);

        var reader = r.body.getReader();
        var decoder = new TextDecoder();
        var fullText = '';
        var bubble = null;

        function pump() {
          return reader.read().then(function (result) {
            if (result.done) {
              if (!fullText.trim()) {
                history.pop(); // drop the unanswered user turn so it isn't replayed as stale context
                removeTyping();
                addMessage('bot', "Sorry, I couldn't come up with an answer to that.");
              } else {
                history.push({ role: 'model', text: fullText });
              }
              return;
            }
            var chunk = decoder.decode(result.value, { stream: true });
            if (chunk) {
              fullText += chunk;
              if (!bubble) {
                removeTyping();
                bubble = addMessage('bot', formatReply(fullText), true);
              } else {
                bubble.querySelector('.chatbot-bubble').innerHTML = formatReply(fullText);
                scrollToBottom();
              }
            }
            return pump();
          });
        }

        return pump();
      })
      .catch(function () {
        var last = history[history.length - 1];
        if (last && last.role === 'user') history.pop(); // drop the unanswered user turn
        removeTyping();
        addMessage(
          'bot',
          "I'm having trouble connecting right now. Please try again in a moment, or email Getnet directly."
        );
      })
      .finally(function () {
        sending = false;
      });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    sendMessage(input.value);
  });
})();
