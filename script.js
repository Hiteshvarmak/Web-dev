(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const chatArea = $("#chatArea");
  const welcome = $("#welcome");
  const messagesEl = $("#messages");
  const composerForm = $("#composerForm");
  const promptInput = $("#promptInput");
  const sendBtn = $("#sendBtn");
  const newChatBtn = $("#newChatBtn");
  const chatListEl = $("#chatList");
  const sidebar = $("#sidebar");
  const sidebarToggle = $("#sidebarToggle");
  const mobileSidebarBtn = $("#mobileSidebarBtn");
  const themeToggle = $("#themeToggle");
  const suggestions = $("#suggestions");

  const STORAGE_KEY = "chatclone.conversations";
  const THEME_KEY = "chatclone.theme";

  /** @type {{id:string, title:string, messages:{role:string, content:string}[]}[]} */
  let conversations = [];
  let activeId = null;

  // ---------- Persistence ----------
  function loadConversations() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      conversations = raw ? JSON.parse(raw) : [];
    } catch {
      conversations = [];
    }
  }

  function saveConversations() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      /* storage unavailable, ignore */
    }
  }

  // ---------- Theme ----------
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved || (prefersDark ? "dark" : "light"));
  }

  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });

  // ---------- Sidebar ----------
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });

  mobileSidebarBtn.addEventListener("click", () => {
    sidebar.classList.toggle("mobile-open");
  });

  document.addEventListener("click", (e) => {
    if (window.innerWidth > 820) return;
    if (!sidebar.classList.contains("mobile-open")) return;
    if (sidebar.contains(e.target) || mobileSidebarBtn.contains(e.target)) return;
    sidebar.classList.remove("mobile-open");
  });

  // ---------- Conversation management ----------
  function createConversation() {
    const convo = { id: crypto.randomUUID(), title: "New chat", messages: [] };
    conversations.unshift(convo);
    activeId = convo.id;
    saveConversations();
    renderChatList();
    renderActiveConversation();
  }

  function getActive() {
    return conversations.find((c) => c.id === activeId) || null;
  }

  function selectConversation(id) {
    activeId = id;
    sidebar.classList.remove("mobile-open");
    renderChatList();
    renderActiveConversation();
  }

  function deleteConversation(id, evt) {
    evt.stopPropagation();
    conversations = conversations.filter((c) => c.id !== id);
    if (activeId === id) {
      activeId = conversations.length ? conversations[0].id : null;
    }
    saveConversations();
    if (!conversations.length) createConversation();
    renderChatList();
    renderActiveConversation();
  }

  function renderChatList() {
    chatListEl.innerHTML = "";
    conversations.forEach((c) => {
      const item = document.createElement("div");
      item.className = "chat-item" + (c.id === activeId ? " active" : "");
      item.addEventListener("click", () => selectConversation(c.id));

      const title = document.createElement("span");
      title.className = "chat-item-title";
      title.textContent = c.title;

      const del = document.createElement("button");
      del.className = "chat-item-delete";
      del.textContent = "✕";
      del.title = "Delete chat";
      del.addEventListener("click", (e) => deleteConversation(c.id, e));

      item.appendChild(title);
      item.appendChild(del);
      chatListEl.appendChild(item);
    });
  }

  // ---------- Rendering messages ----------
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatContent(text) {
    let escaped = escapeHtml(text);
    escaped = escaped.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
    escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    return escaped;
  }

  function renderActiveConversation() {
    const convo = getActive();
    messagesEl.innerHTML = "";

    if (!convo || convo.messages.length === 0) {
      welcome.style.display = "flex";
      messagesEl.style.display = "none";
      return;
    }

    welcome.style.display = "none";
    messagesEl.style.display = "flex";

    convo.messages.forEach((m) => appendMessageEl(m.role, m.content));
    scrollToBottom();
  }

  function appendMessageEl(role, content) {
    const wrap = document.createElement("div");
    wrap.className = "message " + role;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = role === "user" ? "U" : "C";

    const body = document.createElement("div");
    body.className = "message-body";

    const roleLabel = document.createElement("div");
    roleLabel.className = "message-role";
    roleLabel.textContent = role === "user" ? "You" : "ChatClone";

    const contentEl = document.createElement("div");
    contentEl.className = "message-content";
    contentEl.innerHTML = formatContent(content);

    body.appendChild(roleLabel);
    body.appendChild(contentEl);
    wrap.appendChild(avatar);
    wrap.appendChild(body);
    messagesEl.appendChild(wrap);
    return contentEl;
  }

  function scrollToBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  // ---------- Simulated assistant ----------
  const CANNED_TOPICS = [
    {
      keys: ["hello", "hi", "hey"],
      reply: "Hey there! I'm a front-end demo of a ChatGPT-style interface. Ask me anything and I'll simulate a helpful reply.",
    },
    {
      keys: ["javascript", "promise", "async"],
      reply:
        "A JavaScript Promise represents a value that may not be available yet. It has three states: **pending**, **fulfilled**, and **rejected**.\n\n```\nfetch('/api/data')\n  .then(res => res.json())\n  .then(data => console.log(data))\n  .catch(err => console.error(err));\n```\n\n`async`/`await` is syntactic sugar on top of promises that lets asynchronous code read like synchronous code.",
    },
    {
      keys: ["poem", "poetry"],
      reply:
        "Here's a short one:\n\nThe ocean hums beneath the moon,\nsilver waves in soft platoon,\nwhispers hush the restless shore,\nnight and tide forevermore.",
    },
    {
      keys: ["workout", "exercise", "fitness"],
      reply:
        "Here's a simple weekly split:\n\n- **Mon** — Full body strength (squats, push-ups, rows)\n- **Tue** — 30 min cardio (walk/run/cycle)\n- **Wed** — Rest or light stretching\n- **Thu** — Upper body strength\n- **Fri** — Lower body strength\n- **Sat** — Active recovery (yoga or a long walk)\n- **Sun** — Rest\n\nAdjust volume based on how you recover.",
    },
    {
      keys: ["idea", "side project", "brainstorm"],
      reply:
        "A few weekend project ideas:\n\n1. A habit tracker with a simple streak counter\n2. A markdown notes app that saves to local storage\n3. A recipe randomizer using an ingredients list\n4. A pomodoro timer with custom work/break intervals\n5. A tiny URL shortener using a serverless function",
    },
  ];

  function pickCannedReply(prompt) {
    const lower = prompt.toLowerCase();
    for (const topic of CANNED_TOPICS) {
      if (topic.keys.some((k) => lower.includes(k))) return topic.reply;
    }
    return null;
  }

  function genericReply(prompt) {
    const trimmed = prompt.trim();
    const preview = trimmed.length > 140 ? trimmed.slice(0, 140) + "..." : trimmed;
    const templates = [
      `That's an interesting question about "${preview}". Here's a general take: break the problem into smaller pieces, tackle the highest-impact part first, and iterate from there.`,
      `Thinking about "${preview}" — a good starting point is to clarify the goal, list your constraints, and sketch a couple of possible approaches before committing to one.`,
      `On "${preview}": there are usually multiple valid angles here. Consider what outcome matters most to you, then work backwards to the steps that get you there.`,
      `Regarding "${preview}" — I'd suggest starting simple, testing your assumption quickly, and refining based on what you learn.`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  function generateReply(prompt) {
    return pickCannedReply(prompt) || genericReply(prompt);
  }

  function showTypingIndicator() {
    const wrap = document.createElement("div");
    wrap.className = "message assistant";
    wrap.id = "typingIndicator";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = "C";

    const body = document.createElement("div");
    body.className = "message-body";

    const roleLabel = document.createElement("div");
    roleLabel.className = "message-role";
    roleLabel.textContent = "ChatClone";

    const dots = document.createElement("div");
    dots.className = "typing-dots";
    dots.innerHTML = "<span></span><span></span><span></span>";

    body.appendChild(roleLabel);
    body.appendChild(dots);
    wrap.appendChild(avatar);
    wrap.appendChild(body);
    messagesEl.appendChild(wrap);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const el = document.getElementById("typingIndicator");
    if (el) el.remove();
  }

  // ---------- Sending messages ----------
  function sendMessage(text) {
    const prompt = text.trim();
    if (!prompt) return;

    let convo = getActive();
    if (!convo) {
      createConversation();
      convo = getActive();
    }

    if (convo.messages.length === 0) {
      convo.title = prompt.length > 40 ? prompt.slice(0, 40) + "..." : prompt;
    }

    convo.messages.push({ role: "user", content: prompt });
    saveConversations();
    renderChatList();
    renderActiveConversation();

    promptInput.value = "";
    autoResize();
    updateSendState();

    showTypingIndicator();

    const delay = 500 + Math.random() * 700;
    setTimeout(() => {
      removeTypingIndicator();
      const reply = generateReply(prompt);
      convo.messages.push({ role: "assistant", content: reply });
      saveConversations();
      appendMessageEl("assistant", reply);
      scrollToBottom();
    }, delay);
  }

  composerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage(promptInput.value);
  });

  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(promptInput.value);
    }
  });

  function autoResize() {
    promptInput.style.height = "auto";
    promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + "px";
  }

  function updateSendState() {
    sendBtn.disabled = promptInput.value.trim().length === 0;
  }

  promptInput.addEventListener("input", () => {
    autoResize();
    updateSendState();
  });

  suggestions.addEventListener("click", (e) => {
    const card = e.target.closest(".suggestion-card");
    if (!card) return;
    sendMessage(card.dataset.prompt);
  });

  newChatBtn.addEventListener("click", () => {
    createConversation();
    sidebar.classList.remove("mobile-open");
  });

  // ---------- Init ----------
  function init() {
    initTheme();
    loadConversations();
    if (!conversations.length) {
      createConversation();
    } else {
      activeId = conversations[0].id;
      renderChatList();
      renderActiveConversation();
    }
    updateSendState();
  }

  init();
})();
