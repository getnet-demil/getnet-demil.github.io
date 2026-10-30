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

    suggestionsEl.innerHTML = '';

    if (!CHAT_API_URL) {
      addMessage('user', text);
      addMessage(
        'bot',
        "The chat backend isn't connected yet — this widget is waiting on its Cloudflare Worker URL. In the meantime, feel free to reach Getnet directly by email."
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
