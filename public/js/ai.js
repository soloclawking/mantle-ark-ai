// ============================================
// Mantle Ark AI — AI Chat Assistant
// ============================================

const chatState = {
  messages: [],
  isLoading: false,
};

function sendQuickChat(text) {
  document.getElementById('chatInput').value = text;
  sendChat();
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();

  if (!text || chatState.isLoading) return;

  input.value = '';
  chatState.isLoading = true;

  // Remove welcome screen
  const welcome = document.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  // Add user message
  chatState.messages.push({ role: 'user', content: text });
  appendChatMessage('user', text);

  // Add loading indicator
  const loadingId = appendChatLoading();

  try {
    // Include portfolio context if available
    let contextNote = '';
    if (appState.scannedChains.length > 0) {
      const prices = getPriceEstimates();
      const summary = appState.scannedChains.map(c => {
        const usd = c.balance * (prices[c.nativeToken?.symbol] || 0);
        return `${c.chainName}: ${c.balance.toFixed(4)} ${c.nativeToken?.symbol} (~$${usd.toFixed(2)})`;
      }).join(', ');
      contextNote = `\n\n[User's portfolio context: ${summary}]`;
    }

    const messagesForAPI = chatState.messages.map((m, i) => {
      if (i === chatState.messages.length - 1 && contextNote) {
        return { role: m.role, content: m.content + contextNote };
      }
      return m;
    });

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messagesForAPI })
    });
    const data = await res.json();

    // Remove loading
    removeChatLoading(loadingId);

    if (!data.success) throw new Error(data.error);

    const reply = data.result;
    chatState.messages.push({ role: 'assistant', content: reply });
    appendChatMessage('ai', reply);
  } catch (err) {
    removeChatLoading(loadingId);
    appendChatMessage('ai', `Sorry, I encountered an error: ${err.message}. Please try again.`);
    console.error('Chat error:', err);
  }

  chatState.isLoading = false;
}

function appendChatMessage(type, content) {
  const container = document.getElementById('chatMessages');
  const msg = document.createElement('div');
  msg.className = `chat-msg ${type}`;

  if (type === 'ai') {
    msg.innerHTML = `<div class="msg-bubble rendered-md">${renderMarkdown(content)}</div>`;
  } else {
    msg.innerHTML = `<div class="msg-bubble">${escapeHtml(content)}</div>`;
  }

  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

let loadingCounter = 0;

function appendChatLoading() {
  const container = document.getElementById('chatMessages');
  const id = `chat-loading-${++loadingCounter}`;
  const msg = document.createElement('div');
  msg.className = 'chat-msg ai';
  msg.id = id;
  msg.innerHTML = `
    <div class="msg-bubble" style="display:flex;align-items:center;gap:8px">
      <div class="typing-dots">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
      <span style="color:var(--text-muted);font-size:13px">Ark AI is thinking...</span>
    </div>
  `;

  // Add typing animation styles if not present
  if (!document.getElementById('typing-styles')) {
    const style = document.createElement('style');
    style.id = 'typing-styles';
    style.textContent = `
      .typing-dots { display: flex; gap: 4px; }
      .typing-dots .dot {
        width: 6px; height: 6px;
        border-radius: 50%;
        background: var(--accent);
        animation: typingBounce 1.4s ease-in-out infinite;
      }
      .typing-dots .dot:nth-child(2) { animation-delay: 0.2s; }
      .typing-dots .dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes typingBounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-6px); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeChatLoading(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
