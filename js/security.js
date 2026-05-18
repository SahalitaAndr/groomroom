function sanitizeInput(input) {
    if (!input) return '';
    return input.replace(/<[^>]*>/g, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+=/gi, '');
}

function validatePhone(phone) {
    const phoneRegex = /^(\+7|8)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
    return phoneRegex.test(phone);
}

function validateFio(fio) {
    return /^[А-Яа-яЁё\s\-]{2,50}$/.test(fio);
}

const requestLimits = new Map();

function checkRateLimit(userId, action, limit = 10, windowMs = 60000) {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const userRequests = requestLimits.get(key) || [];
    const recentRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
    
    if (recentRequests.length >= limit) {
        return false;
    }
    
    recentRequests.push(now);
    requestLimits.set(key, recentRequests);
    return true;
}

function generateCSRFToken() {
    const token = crypto.randomUUID();
    localStorage.setItem('csrf_token', token);
    return token;
}

function verifyCSRFToken(token) {
    const stored = localStorage.getItem('csrf_token');
    return stored && stored === token;
}

let inactivityTimer;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        const user = getCurrentUser();
        if (user) {
            showToast('⚠️ Сеанс завершен из-за бездействия', 'warning');
            logout();
        }
    }, 30 * 60 * 1000);
}

['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetInactivityTimer);
});

function encryptData(data, password = 'groomroom_secret') {
    let result = '';
    for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(data.charCodeAt(i) ^ password.charCodeAt(i % password.length));
    }
    return btoa(result);
}

function decryptData(encrypted, password = 'groomroom_secret') {
    try {
        const data = atob(encrypted);
        let result = '';
        for (let i = 0; i < data.length; i++) {
            result += String.fromCharCode(data.charCodeAt(i) ^ password.charCodeAt(i % password.length));
        }
        return result;
    } catch(e) {
        return null;
    }
}

function auditLog(action, userId, details) {
    const logs = JSON.parse(localStorage.getItem('groomroom_audit') || '[]');
    logs.push({
        timestamp: new Date().toISOString(),
        action,
        userId,
        details,
        ip: 'client-side'
    });
    if (logs.length > 1000) logs.shift();
    localStorage.setItem('groomroom_audit', JSON.stringify(logs));
}