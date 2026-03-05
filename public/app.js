(function () {
  'use strict';

  const API = '/api';

  // ===== CEO DATA =====
  const CEOS = [
    { id: 'elon-musk', name: 'Elon Musk', title: 'CEO of Tesla & SpaceX', avatar: './assets/elon-musk.jpg', lastMsg: 'The future is electric \u26a1', time: '', category: 'Tech Billionaires' },
    { id: 'tim-cook', name: 'Tim Cook', title: 'CEO of Apple', avatar: './assets/tim-cook.jpg', lastMsg: 'Good morning.', time: '', category: 'Tech Billionaires' },
    { id: 'sam-altman', name: 'Sam Altman', title: 'CEO of OpenAI', avatar: './assets/sam-altman.jpg', lastMsg: 'AGI is closer than you think', time: '', category: 'Tech Billionaires' },
    { id: 'satya-nadella', name: 'Satya Nadella', title: 'CEO of Microsoft', avatar: './assets/satya-nadella.jpg', lastMsg: 'Growth mindset is everything', time: '', category: 'Tech Billionaires' },
    { id: 'jensen-huang', name: 'Jensen Huang', title: 'CEO of NVIDIA', avatar: './assets/jensen-huang.jpg', lastMsg: 'Accelerated computing!', time: '', category: 'Tech Billionaires' },
    { id: 'mark-zuckerberg', name: 'Mark Zuckerberg', title: 'CEO of Meta', avatar: './assets/mark-zuckerberg.jpg', lastMsg: 'Move fast and build things', time: '', category: 'Tech Billionaires' },
    { id: 'sundar-pichai', name: 'Sundar Pichai', title: 'CEO of Google & Alphabet', avatar: './assets/sundar-pichai.jpg', lastMsg: 'Organizing the world\'s information', time: '', category: 'Tech Billionaires' },
    { id: 'jeff-bezos', name: 'Jeff Bezos', title: 'Founder of Amazon', avatar: './assets/jeff-bezos.jpg', lastMsg: 'It\'s always Day 1', time: '', category: 'Tech Billionaires' },
    { id: 'mark-cuban', name: 'Mark Cuban', title: 'Entrepreneur & Investor', avatar: './assets/mark-cuban.jpg', lastMsg: 'Every no gets you closer to yes', time: '', category: 'Tech Billionaires' },
    { id: 'alex-hormozi', name: 'Alex Hormozi', title: 'Founder of Acquisition.com', avatar: './assets/alex-hormozi.jpg', lastMsg: 'Make offers so good people feel stupid saying no', time: '', category: 'Business Icons' },
    { id: 'gary-vee', name: 'Gary Vee', title: 'CEO of VaynerMedia', avatar: './assets/gary-vee.jpg', lastMsg: 'Clouds and dirt baby \u2601\ufe0f', time: '', category: 'Business Icons' }
  ];

  function isValidApiKey(key) {
    return key.startsWith('sk-ant-') || (key.startsWith('sk-') && key.length >= 20);
  }

  window.avatarFallback = function avatarFallback(name) {
    const initials = name.split(' ').map(n => n[0]).join('');
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#128C7E"/><text x="50" y="55" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="36" font-family="sans-serif">${initials}</text></svg>`)}`;
  }

  // ===== STATE =====
  let userId = null;
  let currentCeo = null;
  let conversations = {};
  let isLoading = false;
  let pendingRequests = {}; // ceoId -> true (background requests in flight)
  let unreadChats = {};     // ceoId -> count
  let apiKey = localStorage.getItem('bmc_api_key') || '';
  let apiProvider = localStorage.getItem('bmc_api_provider') || 'anthropic';
  let elevenLabsKey = localStorage.getItem('bmc_elevenlabs_key') || '';
  let isRecording = false;
  // Voice map: ceo_id -> voice_id (user-selected from ElevenLabs library)
  let voiceMap = {};
  try { voiceMap = JSON.parse(localStorage.getItem('bmc_voice_map')) || {}; } catch(e) { voiceMap = {}; }
  // Cached voice library
  let voiceLibrary = [];

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
  const typingLabel = $('#typingLabel');
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
  const ceoVoiceList = $('#ceoVoiceList');
  const loadVoicesBtn = $('#loadVoicesBtn');

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

  const themeToggleLabel = $('#themeToggleLabel');
  const themeToggleIcon = $('#themeToggleIcon');

  function updateThemeIcon() {
    if (themeToggleLabel) themeToggleLabel.textContent = currentTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    if (themeToggleIcon) themeToggleIcon.innerHTML = currentTheme === 'dark'
      ? '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>'
      : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
  updateThemeIcon();

  themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
  });

  // ===== VOICE LIBRARY (fetch from ElevenLabs) =====
  async function fetchVoiceLibrary() {
    if (!elevenLabsKey) return [];
    try {
      const res = await fetch(`${API}/voices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elevenlabs_key: elevenLabsKey })
      });
      const data = await res.json();
      return data.voices || [];
    } catch (err) {
      return [];
    }
  }

  // ===== CEO VOICE LIST (in settings) =====
  function renderCeoVoiceList() {
    if (!ceoVoiceList) return;

    if (voiceLibrary.length === 0) {
      ceoVoiceList.innerHTML = '<p class="settings-hint" style="margin:0;text-align:center;">Enter your ElevenLabs key and click "Load My Voices" to assign voices to CEOs.</p>';
      return;
    }

    ceoVoiceList.innerHTML = CEOS.map(ceo => {
      const selectedVoiceId = voiceMap[ceo.id] || '';
      const options = voiceLibrary.map(v =>
        `<option value="${v.voice_id}" ${v.voice_id === selectedVoiceId ? 'selected' : ''}>${v.name} (${v.category})</option>`
      ).join('');
      return `<div class="ceo-voice-item">
        <img src="${ceo.avatar}" alt="${ceo.name}" class="ceo-voice-avatar">
        <span class="ceo-voice-name">${ceo.name}</span>
        <select class="ceo-voice-select" data-ceo-id="${ceo.id}">
          <option value="">Default</option>
          ${options}
        </select>
      </div>`;
    }).join('');

    // Attach change listeners
    ceoVoiceList.querySelectorAll('.ceo-voice-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const ceoId = sel.dataset.ceoId;
        if (sel.value) {
          voiceMap[ceoId] = sel.value;
        } else {
          delete voiceMap[ceoId];
        }
      });
    });
  }

  // ===== CONTACTS LIST =====
  function renderContacts(filter = '') {
    let filtered = filter
      ? CEOS.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))
      : [...CEOS];

    // Sort by most recent conversation (WhatsApp-style)
    filtered.sort((a, b) => {
      const convA = conversations[a.id];
      const convB = conversations[b.id];
      const lastA = convA && convA.length > 0 ? convA[convA.length - 1].timestamp || 0 : 0;
      const lastB = convB && convB.length > 0 ? convB[convB.length - 1].timestamp || 0 : 0;
      return lastB - lastA;
    });

    // Group by category
    const groups = {};
    filtered.forEach(ceo => {
      const cat = ceo.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(ceo);
    });

    // Maintain category order
    const categoryOrder = ['Tech Billionaires', 'Business Icons'];
    const sortedCategories = Object.keys(groups).sort((a, b) => {
      const ia = categoryOrder.indexOf(a);
      const ib = categoryOrder.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    const hasMultipleCategories = sortedCategories.length > 1 || (sortedCategories.length === 1 && sortedCategories[0] !== categoryOrder[0]);

    contactsList.innerHTML = sortedCategories.map(cat => {
      const ceoCards = groups[cat].map(ceo => {
        const conv = conversations[ceo.id];
        let lastMsg = ceo.lastMsg;
        let lastTime = '';
        if (conv && conv.length > 0) {
          const last = conv[conv.length - 1];
          if (last.isVoice && !last.transcribed) {
            lastMsg = '\ud83c\udfa4 Voice message';
          } else {
            lastMsg = last.content.substring(0, 50) + (last.content.length > 50 ? '...' : '');
          }
          lastTime = last.time || '';
        }

        const unreadCount = unreadChats[ceo.id] || 0;
        const unreadBadge = unreadCount > 0
          ? `<span class="contact-unread">${unreadCount}</span>`
          : '';

        return `
          <div class="contact-item" data-ceo="${ceo.id}">
            <img class="contact-avatar" src="${ceo.avatar}" alt="${ceo.name}" loading="lazy" onerror="this.onerror=null;this.src=avatarFallback('${ceo.name}')">
            <div class="contact-info">
              <div class="contact-name">${ceo.name}</div>
              <div class="contact-subtitle">${lastMsg}</div>
            </div>
            <div class="contact-meta">
              <span class="contact-time">${lastTime}</span>
              ${unreadBadge || `<svg class="contact-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>`}
            </div>
          </div>
        `;
      }).join('');

      const header = hasMultipleCategories ? `<div class="category-header">${cat}</div>` : '';
      return header + ceoCards;
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
    chatAvatar.onerror = function() { this.onerror = null; this.src = avatarFallback(currentCeo.name); };
    chatName.textContent = currentCeo.name;
    emptyChatAvatar.src = currentCeo.avatar;
    emptyChatAvatar.onerror = function() { this.onerror = null; this.src = avatarFallback(currentCeo.name); };
    emptyChatName.textContent = currentCeo.name;

    // Clear unread for this chat
    delete unreadChats[ceoId];

    contactsView.classList.remove('active');
    contactsView.classList.add('hidden-left');
    chatView.classList.remove('hidden-right');
    chatView.classList.add('active');

    renderMessages();
    loadHistory(ceoId);
    setTimeout(() => messageInput.focus(), 400);
  }

  function closeChat() {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    hideTyping();
    chatView.classList.remove('active');
    chatView.classList.add('hidden-right');
    contactsView.classList.remove('hidden-left');
    contactsView.classList.add('active');
    isLoading = false;
    currentCeo = null;
    renderContacts();
  }

  backBtn.addEventListener('click', closeChat);

  // ===== MESSAGES =====
  function formatTime(date) {
    if (!date) date = new Date();
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  // Crown checkmark for message status
  function buildStatusHtml(msg, index, conv) {
    // Check if there's an assistant reply after this user message
    const hasReply = conv.slice(index + 1).some(m => m.role === 'assistant');
    if (hasReply) {
      return '<div class="msg-status read"><span class="msg-status-icon">\ud83d\udc51\u2713</span><span class="msg-status-label">Read</span></div>';
    }
    // Sent but not yet read
    return '<div class="msg-status sent"><span class="msg-status-icon">\u2713</span><span class="msg-status-label">Sent</span></div>';
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

      // Build status indicator for outgoing messages
      const statusHtml = msg.role === 'user' ? buildStatusHtml(msg, i, conv) : '';

      // Voice message (both user and assistant): show audio bubble
      if (msg.isVoice && msg.audioBase64) {
        const transcribeBtn = (msg.role === 'assistant' && !msg.transcribed)
          ? `<button class="transcribe-btn" data-msg-index="${i}">Transcribe</button>`
          : '';
        const transcriptHtml = (msg.role === 'assistant' && msg.transcribed)
          ? `<div class="voice-transcript">${escapeHtml(msg.content)}</div>`
          : '';
        html += `
          <div class="message-row ${dir}" style="animation-delay:${Math.min(i * 30, 200)}ms">
            <div class="message-bubble voice-bubble">
              <div class="voice-player" data-msg-index="${i}">
                <button class="voice-play-btn" data-msg-index="${i}" aria-label="Play voice">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </button>
                <div class="voice-waveform">
                  <span></span><span></span><span></span><span></span><span></span>
                  <span></span><span></span><span></span><span></span><span></span>
                  <span></span><span></span><span></span><span></span><span></span>
                </div>
                <span class="voice-duration" data-msg-index="${i}">0:00</span>
              </div>
              ${transcribeBtn}
              ${transcriptHtml}
              ${statusHtml}
            </div>
          </div>
        `;
      } else {
        // Normal text message — no whitespace between elements to avoid pre-wrap gaps
        html += `<div class="message-row ${dir}" style="animation-delay:${Math.min(i * 30, 200)}ms"><div class="message-bubble">${statusHtml}<span class="msg-text">${escapeHtml(msg.content)}</span></div></div>`;
      }
    });

    messagesContainer.innerHTML = html;
    messagesContainer.appendChild(typingIndicator);

    // Attach voice play button listeners
    messagesContainer.querySelectorAll('.voice-play-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.msgIndex);
        const msg = (conversations[currentCeo.id] || [])[idx];
        if (msg && msg.audioBase64) playStoredAudio(msg.audioBase64, btn, idx);
      });
    });

    // Attach transcribe button listeners
    messagesContainer.querySelectorAll('.transcribe-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.msgIndex);
        const conv2 = conversations[currentCeo.id] || [];
        if (conv2[idx]) {
          conv2[idx].transcribed = true;
          renderMessages();
        }
      });
    });

    scrollToBottom();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function addMessage(role, content, opts = {}) {
    if (!currentCeo) return;
    return addMessageTo(currentCeo.id, role, content, opts);
  }

  function addMessageTo(ceoId, role, content, opts = {}) {
    if (!conversations[ceoId]) conversations[ceoId] = [];
    const now = new Date();
    const time = formatTime(now);
    const msg = { role, content, time, timestamp: now.getTime(), ...opts };
    conversations[ceoId].push(msg);
    // Only re-render chat if we're viewing this conversation
    if (currentCeo && currentCeo.id === ceoId) {
      renderMessages();
    }
    renderContacts();
    return msg;
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  }

  // ===== NOTIFICATION SOUND (Web Audio API) =====
  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Two-tone chime like iMessage
      const now = ctx.currentTime;
      [880, 1174.66].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.3);
      });
      setTimeout(() => ctx.close(), 600);
    } catch (e) { /* AudioContext not available */ }
  }

  // ===== TYPING LABEL =====
  function showTyping() {
    if (currentCeo) {
      const firstName = currentCeo.name.split(' ')[0];
      typingLabel.textContent = firstName + ' is writing...';
    }
    typingIndicator.classList.add('active');
    scrollToBottom();
  }

  function hideTyping() {
    typingIndicator.classList.remove('active');
  }

  // ===== AUDIO PLAYBACK =====
  let currentAudio = null;
  let currentPlayBtn = null;
  const PLAY_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  const PAUSE_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

  function resetPlayBtn(btn) {
    if (btn) {
      btn.innerHTML = PLAY_SVG;
      btn.classList.remove('playing');
    }
  }

  function playStoredAudio(audioBase64, btn, msgIndex) {
    if (currentAudio && currentPlayBtn === btn) {
      currentAudio.pause();
      currentAudio = null;
      resetPlayBtn(btn);
      currentPlayBtn = null;
      return;
    }

    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
      if (currentPlayBtn) resetPlayBtn(currentPlayBtn);
    }

    btn.innerHTML = PAUSE_SVG;
    btn.classList.add('playing');
    currentPlayBtn = btn;

    const audioBlob = new Blob(
      [Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))],
      { type: 'audio/mpeg' }
    );
    const audioUrl = URL.createObjectURL(audioBlob);
    currentAudio = new Audio(audioUrl);

    const durationEl = messagesContainer.querySelector(`.voice-duration[data-msg-index="${msgIndex}"]`);
    currentAudio.onloadedmetadata = () => {
      if (durationEl && isFinite(currentAudio.duration)) {
        const dur = Math.round(currentAudio.duration);
        durationEl.textContent = `0:${dur < 10 ? '0' : ''}${dur}`;
      }
    };

    const waveform = btn.closest('.voice-player').querySelector('.voice-waveform');
    if (waveform) waveform.classList.add('playing');

    currentAudio.onended = () => {
      currentAudio = null;
      currentPlayBtn = null;
      resetPlayBtn(btn);
      if (waveform) waveform.classList.remove('playing');
      URL.revokeObjectURL(audioUrl);
    };

    currentAudio.play();
  }

  // ===== TTS (fetch audio from ElevenLabs via API) =====
  async function fetchTTS(text) {
    if (!elevenLabsKey || !currentCeo) return null;
    try {
      const body = {
        text,
        ceo_id: currentCeo.id,
        elevenlabs_key: elevenLabsKey
      };
      // Use custom voice if assigned
      if (voiceMap[currentCeo.id]) {
        body.voice_id = voiceMap[currentCeo.id];
      }
      const res = await fetch(`${API}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      return data.audio || null;
    } catch (err) {
      return null;
    }
  }

  // ===== VOICE RECORDING (MediaRecorder + SpeechRecognition) =====
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recognition = null;
  let finalTranscript = '';

  // Setup speech recognition for transcription
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      finalTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      // Show interim in input as visual feedback
      messageInput.value = finalTranscript || interim;
      messageInput.setAttribute('placeholder', 'Listening...');
    };

    recognition.onend = () => {
      // Recognition ended - transcript is ready
    };

    recognition.onerror = () => {
      finalTranscript = '';
    };
  }

  async function startRecording() {
    if (!currentCeo || isRecording) return;
    if (!elevenLabsKey) {
      showSettings();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      isRecording = true;
      micBtn.classList.add('recording');
      messageInput.value = '';
      messageInput.setAttribute('placeholder', 'Listening...');
      finalTranscript = '';
      recordedChunks = [];

      // Start MediaRecorder for actual audio capture
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());

        const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });

        // Convert blob to base64 for storage
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result.split(',')[1];
          const transcript = finalTranscript || messageInput.value.trim();

          messageInput.value = '';
          messageInput.setAttribute('placeholder', 'iMessage');

          if (transcript) {
            // Send voice message with recorded audio + transcription
            sendVoiceMessage(transcript, base64Audio);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();

      // Start speech recognition simultaneously
      if (recognition) {
        try { recognition.start(); } catch(e) { /* may already be started */ }
      }
    } catch (err) {
      isRecording = false;
      micBtn.classList.remove('recording');
      messageInput.setAttribute('placeholder', 'iMessage');
    }
  }

  function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    micBtn.classList.remove('recording');

    if (recognition) {
      try { recognition.stop(); } catch(e) {}
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  }

  if (micBtn) {
    micBtn.addEventListener('click', () => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    });
  }

  // ===== SEND VOICE MESSAGE =====
  async function sendVoiceMessage(transcript, userAudioBase64) {
    if (!transcript || !currentCeo || isLoading) return;

    if (!apiKey) {
      showSettings();
      return;
    }

    const ceoId = currentCeo.id;

    // Show user's voice message as audio bubble
    addMessage('user', transcript, {
      isVoice: true,
      audioBase64: userAudioBase64
    });

    isLoading = true;
    pendingRequests[ceoId] = true;
    showTyping();

    try {
      // Send transcription to AI
      const res = await fetch(`${API}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          ceo_id: ceoId,
          message: transcript,
          api_key: apiKey,
          provider: apiProvider
        })
      });

      const data = await res.json();
      const responseText = handleResponse(ceoId, data, res.status);

      // Convert CEO response to voice if still viewing this chat
      if (responseText && currentCeo && currentCeo.id === ceoId) {
        const audioBase64 = await fetchTTS(responseText);
        if (audioBase64) {
          // Replace the last text message with voice version
          const conv = conversations[ceoId] || [];
          const lastMsg = conv[conv.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.isVoice = true;
            lastMsg.audioBase64 = audioBase64;
            lastMsg.transcribed = false;
            renderMessages();
          }
          // Auto-play the response
          setTimeout(() => {
            const allBtns = messagesContainer.querySelectorAll('.voice-play-btn');
            const lastBtn = allBtns[allBtns.length - 1];
            const idx = conv.length - 1;
            if (lastBtn && idx >= 0) {
              playStoredAudio(audioBase64, lastBtn, idx);
            }
          }, 100);
        }
      }
    } catch (err) {
      const isViewing = currentCeo && currentCeo.id === ceoId;
      if (isViewing) hideTyping();
      addMessageTo(ceoId, 'assistant', '\u26a0\ufe0f Connection error: ' + err.message);
      if (isViewing) isLoading = false;
      delete pendingRequests[ceoId];
    }
  }

  // ===== HANDLE RESPONSE (works even if user left the chat) =====
  function handleResponse(ceoId, data, status) {
    const isViewing = currentCeo && currentCeo.id === ceoId;
    if (isViewing) hideTyping();

    let responseText = null;
    if (data && data.response) {
      responseText = data.response;
      addMessageTo(ceoId, 'assistant', responseText);
    } else if (data && data.error) {
      addMessageTo(ceoId, 'assistant', '\u26a0\ufe0f ' + data.error);
    } else {
      addMessageTo(ceoId, 'assistant', '\u26a0\ufe0f Unexpected response (HTTP ' + status + ')');
    }

    // Notification: sound + unread badge if not viewing this chat
    if (data && data.response) {
      playNotificationSound();
      if (!isViewing) {
        unreadChats[ceoId] = (unreadChats[ceoId] || 0) + 1;
        renderContacts();
      }
    }

    if (isViewing) isLoading = false;
    delete pendingRequests[ceoId];

    return responseText;
  }

  // ===== SEND TEXT MESSAGE =====
  async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentCeo || isLoading) return;

    if (!apiKey) {
      showSettings();
      return;
    }

    // Capture ceo info before any async work
    const ceoId = currentCeo.id;

    messageInput.value = '';
    autoResize();
    sendBtn.classList.remove('visible');
    addMessage('user', text);
    isLoading = true;
    pendingRequests[ceoId] = true;
    showTyping();

    try {
      const res = await fetch(`${API}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          ceo_id: ceoId,
          message: text,
          api_key: apiKey,
          provider: apiProvider
        })
      });

      const data = await res.json();
      handleResponse(ceoId, data, res.status);
    } catch (err) {
      const isViewing = currentCeo && currentCeo.id === ceoId;
      if (isViewing) hideTyping();
      addMessageTo(ceoId, 'assistant', '\u26a0\ufe0f Connection error: ' + err.message);
      if (isViewing) isLoading = false;
      delete pendingRequests[ceoId];
    }
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
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
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
    if (settingsElevenLabsKey) settingsElevenLabsKey.value = elevenLabsKey;
    renderCeoVoiceList();
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

  // Load voices button
  if (loadVoicesBtn) {
    loadVoicesBtn.addEventListener('click', async () => {
      const key = settingsElevenLabsKey ? settingsElevenLabsKey.value.trim() : '';
      if (!key) return;
      loadVoicesBtn.textContent = 'Loading...';
      loadVoicesBtn.disabled = true;
      // Temporarily set key for fetch
      const prevKey = elevenLabsKey;
      elevenLabsKey = key;
      voiceLibrary = await fetchVoiceLibrary();
      elevenLabsKey = prevKey;
      loadVoicesBtn.textContent = voiceLibrary.length > 0
        ? `Loaded ${voiceLibrary.length} voices`
        : 'No voices found';
      loadVoicesBtn.disabled = false;
      renderCeoVoiceList();
      setTimeout(() => { loadVoicesBtn.textContent = 'Load My Voices'; }, 3000);
    });
  }

  settingsSave.addEventListener('click', () => {
    apiKey = settingsApiKey.value.trim();
    apiProvider = settingsProvider.value;
    if (settingsElevenLabsKey) elevenLabsKey = settingsElevenLabsKey.value.trim();
    localStorage.setItem('bmc_api_key', apiKey);
    localStorage.setItem('bmc_api_provider', apiProvider);
    localStorage.setItem('bmc_elevenlabs_key', elevenLabsKey);
    localStorage.setItem('bmc_voice_map', JSON.stringify(voiceMap));
    hideSettings();
    if (currentCeo) renderMessages();
  });

  // ===== ONBOARDING =====
  startBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    const provider = providerSelect.value;

    if (!key || !isValidApiKey(key)) {
      apiKeyInput.style.borderColor = '#ff3b30';
      apiKeyInput.value = '';
      apiKeyInput.setAttribute('placeholder', key ? 'Invalid key format — use sk-ant-... or sk-...' : 'Please enter your API key');
      setTimeout(() => {
        apiKeyInput.style.borderColor = '';
        apiKeyInput.setAttribute('placeholder', 'sk-ant-... or sk-...');
      }, 3000);
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

  // ===== TOAST =====
  const toast = $('#toast');
  let toastTimeout = null;
  function showToast(message, duration = 2500) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.add('visible');
    toastTimeout = setTimeout(() => toast.classList.remove('visible'), duration);
  }

  // ===== NEW GROUP =====
  const newGroupBtn = $('#newGroupBtn');
  if (newGroupBtn) {
    newGroupBtn.addEventListener('click', () => {
      showToast('Group Chats coming in V2 \ud83d\udc51');
    });
  }

  // ===== INIT =====
  initUser();
  renderContacts();

  if (apiKey) {
    onboarding.classList.add('hidden');
    const url = new URL(window.location);
    url.searchParams.set('uid', userId);
    window.history.replaceState({}, '', url);
  }

})();
