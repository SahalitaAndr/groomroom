const CHAT_KEY = 'groomroom_chats';

function initChat(applicationId, petName, userId, isAdmin = false) {
    let chats = JSON.parse(localStorage.getItem(CHAT_KEY) || '{}');
    
    if (!chats[applicationId]) {
        chats[applicationId] = {
            messages: [],
            petName: petName,
            createdAt: new Date().toISOString(),
            lastMessageAt: null
        };
    }
    
    return chats[applicationId];
}

function sendMessage(applicationId, userId, userName, message, isAdmin = false) {
    if (!checkRateLimit(userId, 'chat', 20, 60000)) {
        showToast('Слишком много сообщений. Подождите минуту.', 'error');
        return false;
    }
    
    const messageText = sanitizeInput(message);
    if (!messageText.trim()) return false;
    
    const chats = JSON.parse(localStorage.getItem(CHAT_KEY) || '{}');
    
    if (!chats[applicationId]) {
        chats[applicationId] = {
            messages: [],
            petName: '',
            createdAt: new Date().toISOString(),
            lastMessageAt: null
        };
    }
    
    chats[applicationId].messages.push({
        id: Date.now(),
        userId: userId,
        userName: sanitizeInput(userName),
        message: messageText,
        timestamp: new Date().toISOString(),
        isAdmin: isAdmin,
        isRead: isAdmin // Админ сразу читает
    });
    
    chats[applicationId].lastMessageAt = new Date().toISOString();
    localStorage.setItem(CHAT_KEY, JSON.stringify(chats));
    
    if (isAdmin) {
        showToast(`Новое сообщение от ${userName} по заявке #${applicationId}`, 'info');
    } else {
        showToast(`Сообщение отправлено мастеру`, 'success');
    }
    
    auditLog('send_message', userId, { applicationId, messageLength: messageText.length });
    return true;
}

function getChatMessages(applicationId) {
    const chats = JSON.parse(localStorage.getItem(CHAT_KEY) || '{}');
    return chats[applicationId]?.messages || [];
}

function markMessagesAsRead(applicationId, userId) {
    const chats = JSON.parse(localStorage.getItem(CHAT_KEY) || '{}');
    if (chats[applicationId]) {
        chats[applicationId].messages.forEach(msg => {
            if (msg.userId !== userId && !msg.isRead) {
                msg.isRead = true;
            }
        });
        localStorage.setItem(CHAT_KEY, JSON.stringify(chats));
    }
}

function getUnreadCount(userId) {
    const chats = JSON.parse(localStorage.getItem(CHAT_KEY) || '{}');
    let count = 0;
    Object.values(chats).forEach(chat => {
        count += chat.messages.filter(msg => msg.userId !== userId && !msg.isRead).length;
    });
    return count;
}

function renderChatModal(applicationId, petName, userId, userName, isAdmin = false) {
    const messages = getChatMessages(applicationId);
    
    return `
        <div class="chat-container" id="chat-container-${applicationId}">
            <div class="chat-header">
                <div class="chat-pet-info">
                    <span class="chat-pet-avatar">🐾</span>
                    <div>
                        <strong>${sanitizeInput(petName)}</strong>
                        <small>Чат с мастером</small>
                    </div>
                </div>
                <button class="chat-minimize" onclick="toggleChat('${applicationId}')">−</button>
            </div>
            <div class="chat-messages" id="chat-messages-${applicationId}">
                ${messages.map(msg => `
                    <div class="chat-message ${msg.userId === userId ? 'my-message' : 'their-message'}">
                        <div class="chat-message-text">${escapeHtml(msg.message)}</div>
                        <div class="chat-message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
                        ${msg.isRead ? '<span class="read-status">✓✓</span>' : '<span class="read-status">✓</span>'}
                    </div>
                `).join('')}
            </div>
            <div class="chat-input-area">
                <textarea id="chat-input-${applicationId}" placeholder="Напишите сообщение мастеру..." rows="2"></textarea>
                <button class="chat-send-btn" onclick="sendChatMessage(${applicationId}, '${userId}', '${sanitizeInput(userName)}', ${isAdmin})">📤</button>
            </div>
        </div>
    `;
}

function sendChatMessage(applicationId, userId, userName, isAdmin) {
    const input = document.getElementById(`chat-input-${applicationId}`);
    const message = input.value;
    if (!message.trim()) return;
    
    if (sendMessage(applicationId, userId, userName, message, isAdmin)) {
        input.value = '';
        refreshChatMessages(applicationId, userId, userName, isAdmin);
    }
}

function refreshChatMessages(applicationId, userId, userName, isAdmin) {
    const messagesContainer = document.getElementById(`chat-messages-${applicationId}`);
    if (!messagesContainer) return;
    
    const messages = getChatMessages(applicationId);
    messagesContainer.innerHTML = messages.map(msg => `
        <div class="chat-message ${msg.userId === userId ? 'my-message' : 'their-message'}">
            <div class="chat-message-text">${escapeHtml(msg.message)}</div>
            <div class="chat-message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
            ${msg.isRead ? '<span class="read-status">✓✓</span>' : '<span class="read-status">✓</span>'}
        </div>
    `).join('');
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    markMessagesAsRead(applicationId, userId);
}

function toggleChat(applicationId) {
    const container = document.getElementById(`chat-container-${applicationId}`);
    if (container.classList.contains('chat-minimized')) {
        container.classList.remove('chat-minimized');
    } else {
        container.classList.add('chat-minimized');
    }
}