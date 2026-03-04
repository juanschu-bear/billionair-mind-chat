(function () {
  'use strict';

  const API = '/api';

  // ===== CEO DATA =====
  const CEOS = [
    { id: 'elon-musk', name: 'Elon Musk', title: 'CEO of Tesla & SpaceX', avatar: './assets/elon-musk.jpg', lastMsg: 'The future is electric ⚡', time: '' },
    { id: 'tim-cook', name: 'Tim Cook', title: 'CEO of Apple', avatar: './assets/tim-cook.jpg', lastMsg: 'Good morning.', time: '' },
    { id: 'sam-altman', name: 'Sam Altman', title: 'CEO of OpenAI', avatar: './assets/sam-altman.jpg', lastMsg: 'AGI is closer than you think', time: '' },
    { id: 'satya-nadella', name: 'Satya Nadella', title: 'CEO of Microsoft', avatar: './assets/satya-nadella.jpg', lastMsg: 'Growth mindset is everything', time: '' },
    { id: 'jensen-huang', name: 'Jensen Huang', title: 'CEO of NVIDIA', avatar: './assets/jensen-huang.jpg', lastMsg: 'Accelerated computing!', time: '' },
    { id: 'mark-zuckerberg', name: 'Mark Zuckerberg', title: 'CEO of Meta', avatar: './assets/mark-zuckerberg.jpg', lastMsg: 'Move fast and build things', time: '' },
    { id: 'sundar-pichai', name: 'Sundar Pichai', title: 'CEO of Google & Alphabet', avatar: './assets/sundar-pichai.jpg', lastMsg: 'Organizing the world\'s information', time: '' },
    { id: 'jeff-bezos', name: 'Jeff Bezos', title: 'Founder of Amazon', avatar: './assets/jeff-bezos.jpg', lastMsg: 'It\'s always Day 1', time: '' }
  ];

  // ===== STATE =====
  let userId = null;
  let currentCeo = null;
  let conversations = {};
  let isLoading = false;
  let apiKey = localStorage.getItem('bmc_api_key') || '';
  let apiProvider = localStorage.getItem('bmc_api_provider') || 'anthropic';
  let elevenLabsKey = localStorage.getItem('bmc_elevenlabs_key') || '';
  let isRecording = false;
  let voiceMode = localStorage.getItem('bmc_voice_mode') === 'true';

  // ===== DOM REFS =====
  const $ = (sel) => document.querySelector(sel);
  const onboarding = $('#onboarding');
  const contactsView = $('#contactsView');
  const chatView = $('#chatView');
  const contactsList = $('#contactsList');
  const messagesContainer = $('#messagesContainer');
  const messageInput = $('#messageInput');
  const sendBtn = $('#sendBtn');
  const backBtn = $('#backBtn');
  const chatAvatar = $('#chatAvatar');
  const chatName = $('#chatName');
  const typingIndicator = $('#typingIndicator');
  const searchInput = $('#searchInput');
  const themeToggle = $('#themeToggle');
  const clearChatBtn = $('#clearChatBtn');
  const emptyChat = $('#emptyChat');
  const emptyChatAvatar = $('#emptyChatAvatar');
  const emptyChatName = $('#emptyChatName');
  const startBtn = $('#startBtn');
  const userIdDisplay = $('#userIdDisplay');
  const apiKeyInput = $('#apiKeyInput');
  const providerSelect = $('#providerSelect');
  const settingsBtn = $('#settingsBtn');
  const settingsModal = $('#settingsModal');
  const settingsClose = $('#settingsClose');
  const settingsSave = $('#settingsSave');
  const settingsApiKey = $('#settingsApiKey');
  const settingsProvider = $('#settingsProvider');
  const settingsElevenLabsKey = $('#settingsElevenLabsKey');
  const micBtn = $('#micBtn');
  const voiceToggle = $('#voiceToggle');

  // ===== USER ID =====
  function generateUserId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 16; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }

  function initUser() {
    const params = new URLSearchParams(window.location.search);
    const urlUserId = params.get('uid');
    const savedUserId = localStorage.getItem('bmc_user_id');
    if (urlUserId) {
      userId = urlUserId;
    } else if (savedUserId) {
      userId = savedUserId;
    } else {
      userId = generateUserId();
    }
    localStorage.setItem('bmc_user_id', userId);
    userIdDisplay.textContent = 'Your session: ' + userId;
  }

  // ===== THEME =====
  let currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);

  function updateThemeIcon() {
    themeToggle.innerHTML = currentTheme === 'dark'
      ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }
  updateThemeIcon();

  themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
  });

  // ===== VOICE MODE TOGGLE =====
  function updateVoiceToggle() {
    if (voiceToggle) {
      voiceToggle.classList.toggle('active', voiceMode);
    }
  }
  updateVoiceToggle();

  if (voiceToggle) {
    voiceToggle.addEventListener('click', () => {
      if (!elevenLabsKey) {
        showSettings();
        return;
      }
      voiceMode = !voiceMode;
      localStorage.setItem('bmc_voice_mode', voiceMode);
      updateVoiceToggle();
    });
  }

  // ===== CONTACTS LIST =====
  function renderContacts(filter = '') {
    const filtered = filter
      ? CEOS.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))
      : CEOS;

    contactsList.innerHTML = filtered.map(ceo => {
      const conv = conversations[ceo.id];
      let lastMsg = ceo.lastMsg;
      let lastTime = '';
      if (conv && conv.length > 0) {
        const last = conv[conv.length - 1];
        lastMsg = last.content.substring(0, 50) + (last.content.length > 50 ? '...' : '');
        lastTime = last.time || '';
      }

      return `
        <div class="contact-item" data-ceo="${ceo.id}">
          <img class="contact-avatar" src="${ceo.avatar}" alt="${ceo.name}" loading="lazy">
          <div class="contact-info">
            <div class="contact-name">${ceo.name}</div>
            <div class="contact-subtitle">${lastMsg}</div>
          </div>
          <div class="contact-meta">
            <span class="contact-time">${lastTime}</span>
            <svg class="contact-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
      `;
    }).join('');

    contactsList.querySelectorAll('.contact-item').forEach(item => {
      item.addEventListener('click', () => openChat(item.dataset.ceo));
    });
  }

  searchInput.addEventListener('input', (e) => renderContacts(e.target.value));

  // ===== CHAT NAVIGATION =====
  function openChat(ceoId) {
    if (!apiKey) {
      showSettings();
      return;
    }

    currentCeo = CEOS.find(c => c.id === ceoId);
    if (!currentCeo) return;

    chatAvatar.src = currentCeo.avatar;
    chatAvatar.alt = currentCeo.name;
    chatName.textContent = currentCeo.name;
    emptyChatAvatar.src = currentCeo.avatar;
    emptyChatName.textContent = currentCeo.name;

    contactsView.classList.remove('active');
    contactsView.classList.add('hidden-left');
    chatView.classList.remove('hidden-right');
    chatView.classList.add('active');

    renderMessages();
    loadHistory(ceoId);
    setTimeout(() => messageInput.focus(), 400);
  }

  function closeChat() {
    chatView.classList.remove('active');
    chatView.classList.add('hidden-right');
    contactsView.classList.remove('hidden-left');
    contactsView.classList.add('active');
    currentCeo = null;
    renderContacts();
  }

  backBtn.addEventListener('click', closeChat);

  // ===== MESSAGES =====
  function formatTime(date) {
    if (!date) date = new Date();
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function renderMessages() {
    if (!currentCeo) return;
    const conv = conversations[currentCeo.id] || [];

    if (conv.length === 0) {
      emptyChat.style.display = 'flex';
      messagesContainer.innerHTML = '';
      messagesContainer.appendChild(emptyChat);
      messagesContainer.appendChild(typingIndicator);
      return;
    }

    emptyChat.style.display = 'none';
    let html = '';
    let lastTimeGroup = '';

    conv.forEach((msg, i) => {
      if (msg.time && msg.time !== lastTimeGroup) {
        html += `<div class="message-time">${msg.time}</div>`;
        lastTimeGroup = msg.time;
      }
      const dir = msg.role === 'user' ? 'outgoing' : 'incoming';
      const playBtn = (msg.role === 'assistant' && elevenLabsKey && !msg.content.startsWith('\u26a0\ufe0f'))
        ? `<button class="voice-play-btn" data-msg-index="${i}" aria-label="Play voice"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>`
        : '';
      html += `
        <div class="message-row ${dir}" style="animation-delay:${Math.min(i * 30, 200)}ms">
          <div class="message-bubble">${escapeHtml(msg.content)}${playBtn}</div>
        </div>
      `;
    });

    messagesContainer.innerHTML = html;
    messagesContainer.appendChild(typingIndicator);

    // Attach play button listeners
    messagesContainer.querySelectorAll('.voice-play-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.msgIndex);
        const msg = (conversations[currentCeo.id] || [])[idx];
        if (msg) playTTS(msg.content, btn);
      });
    });

    scrollToBottom();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function addMessage(role, content) {
    if (!currentCeo) return;
    if (!conversations[currentCeo.id]) conversations[currentCeo.id] = [];
    const time = formatTime(new Date());
    conversations[currentCeo.id].push({ role, content, time });
    renderMessages();
    renderContacts();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  }

  // ===== TTS PLAYBACK =====
  let currentAudio = null;
  const PLAY_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  const PAUSE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

  function resetPlayBtn(btn) {
    if (btn) {
      btn.classList.remove('playing');
      btn.innerHTML = PLAY_ICON;
    }
  }

  async function playTTS(text, btn) {
    if (!elevenLabsKey || !currentCeo) return;

    // If already playing, stop
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
      document.querySelectorAll('.voice-play-btn.playing').forEach(b => resetPlayBtn(b));
      return;
    }

    if (btn) {
      btn.classList.add('playing');
      btn.innerHTML = PAUSE_ICON;
    }

    try {
      const res = await fetch(`${API}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          ceo_id: currentCeo.id,
          elevenlabs_key: elevenLabsKey
        })
      });

      const data = await res.json();
      if (data.audio) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        currentAudio = new Audio(audioUrl);
        currentAudio.onended = () => {
          currentAudio = null;
          resetPlayBtn(btn);
          URL.revokeObjectURL(audioUrl);
        };
        currentAudio.play();
      } else {
        resetPlayBtn(btn);
      }
    } catch (err) {
      resetPlayBtn(btn);
    }
  }

  // Auto-play TTS for voice mode (no button needed)
  async function autoPlayTTS(text) {
    if (!elevenLabsKey || !currentCeo) return;
    try {
      const res = await fetch(`${API}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          ceo_id: currentCeo.id,
          elevenlabs_key: elevenLabsKey
        })
      });
      const data = await res.json();
      if (data.audio) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        currentAudio = new Audio(audioUrl);
        currentAudio.onended = () => {
          currentAudio = null;
          URL.revokeObjectURL(audioUrl);
        };
        currentAudio.play();
      }
    } catch (err) { /* silent */ }
  }

  // ===== SPEECH RECOGNITION (Voice Input) =====
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition && micBtn) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      messageInput.value = transcript;
      autoResize();
      sendBtn.classList.toggle('visible', transcript.trim().length > 0);
    };

    recognition.onend = () => {
      isRecording = false;
      micBtn.classList.remove('recording');
      // Auto-send if we have text
      if (messageInput.value.trim()) {
        sendMessage();
      }
    };

    recognition.onerror = () => {
      isRecording = false;
      micBtn.classList.remove('recording');
    };

    micBtn.addEventListener('click', () => {
      if (!currentCeo) return;
      if (isRecording) {
        recognition.stop();
      } else {
        isRecording = true;
        micBtn.classList.add('recording');
        recognition.start();
      }
    });
  } else if (micBtn) {
    micBtn.style.display = 'none';
  }

  // ===== SEND MESSAGE =====
  async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentCeo || isLoading) return;

    if (!apiKey) {
      showSettings();
      return;
    }

    messageInput.value = '';
    autoResize();
    sendBtn.classList.remove('visible');
    addMessage('user', text);
    isLoading = true;

    typingIndicator.classList.add('active');
    scrollToBottom();

    try {
      const res = await fetch(`${API}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          ceo_id: currentCeo.id,
          message: text,
          api_key: apiKey,
          provider: apiProvider
        })
      });

      const data = await res.json();
      typingIndicator.classList.remove('active');

      if (data.response) {
        addMessage('assistant', data.response);
        if (voiceMode && elevenLabsKey) {
          autoPlayTTS(data.response);
        }
      } else if (data.error) {
        addMessage('assistant', '⚠️ ' + data.error);
      } else {
        addMessage('assistant', '⚠️ Unexpected response (HTTP ' + res.status + ')');
      }
    } catch (err) {
      typingIndicator.classList.remove('active');
      addMessage('assistant', '⚠️ Connection error: ' + err.message);
    }

    isLoading = false;
  }

  // ===== LOAD HISTORY =====
  async function loadHistory(ceoId) {
    if (conversations[ceoId] && conversations[ceoId].length > 0) return;
    try {
      const res = await fetch(`${API}/history?user_id=${userId}&ceo_id=${ceoId}`);
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        conversations[ceoId] = data.messages.map(m => ({
          ...m, time: formatTime(new Date())
        }));
        renderMessages();
      }
    } catch (err) { /* silent */ }
  }

  // ===== CLEAR CHAT =====
  clearChatBtn.addEventListener('click', async () => {
    if (!currentCeo) return;
    if (!confirm('Clear this conversation?')) return;
    conversations[currentCeo.id] = [];
    renderMessages();
    try {
      await fetch(`${API}/clear`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, ceo_id: currentCeo.id })
      });
    } catch (err) { /* silent */ }
  });

  // ===== INPUT =====
  function autoResize() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
  }

  messageInput.addEventListener('input', () => {
    autoResize();
    sendBtn.classList.toggle('visible', messageInput.value.trim().length > 0);
  });

  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);

  // ===== SETTINGS MODAL =====
  function showSettings() {
    settingsApiKey.value = apiKey;
    settingsProvider.value = apiProvider;
    settingsElevenLabsKey.value = elevenLabsKey;
    settingsModal.classList.add('active');
  }

  function hideSettings() {
    settingsModal.classList.remove('active');
  }

  settingsBtn.addEventListener('click', showSettings);
  settingsClose.addEventListener('click', hideSettings);

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) hideSettings();
  });

  settingsSave.addEventListener('click', () => {
    apiKey = settingsApiKey.value.trim();
    apiProvider = settingsProvider.value;
    elevenLabsKey = settingsElevenLabsKey.value.trim();
    localStorage.setItem('bmc_api_key', apiKey);
    localStorage.setItem('bmc_api_provider', apiProvider);
    localStorage.setItem('bmc_elevenlabs_key', elevenLabsKey);
    hideSettings();
    if (currentCeo) renderMessages();
  });

  // ===== ONBOARDING =====
  startBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    const provider = providerSelect.value;

    if (!key) {
      apiKeyInput.style.borderColor = '#ff3b30';
      apiKeyInput.setAttribute('placeholder', 'Please enter your API key');
      setTimeout(() => {
        apiKeyInput.style.borderColor = '';
        apiKeyInput.setAttribute('placeholder', 'sk-ant-... or sk-...');
      }, 2000);
      return;
    }

    apiKey = key;
    apiProvider = provider;
    localStorage.setItem('bmc_api_key', apiKey);
    localStorage.setItem('bmc_api_provider', apiProvider);

    onboarding.classList.add('hidden');
    const url = new URL(window.location);
    url.searchParams.set('uid', userId);
    window.history.replaceState({}, '', url);
  });

  // Auto-detect provider from key prefix
  if (apiKeyInput) {
    apiKeyInput.addEventListener('input', () => {
      const val = apiKeyInput.value.trim();
      if (val.startsWith('sk-ant-')) {
        providerSelect.value = 'anthropic';
      } else if (val.startsWith('sk-') && !val.startsWith('sk-ant-')) {
        providerSelect.value = 'openai';
      }
    });
  }

  // ===== INIT =====
  initUser();
  renderContacts();

  // Skip onboarding if API key is already saved
  if (apiKey) {
    onboarding.classList.add('hidden');
    const url = new URL(window.location);
    url.searchParams.set('uid', userId);
    window.history.replaceState({}, '', url);
  }

})();
