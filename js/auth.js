document.addEventListener('DOMContentLoaded', () => {
    generateCSRFToken();
    resetInactivityTimer();
    maskSensitiveInputs();
});

function maskSensitiveInputs() {
    const phoneInputs = document.querySelectorAll('input[type="tel"], .phone-input');
    phoneInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^\d\+]/g, '');
        });
    });
}
const STORAGE_KEYS = {
    USERS: 'groomroom_users',
    APPLICATIONS: 'groomroom_applications',
    CURRENT_USER: 'groomroom_current_user'
};

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function initData() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        const adminPasswordHash = await hashPassword('grooming');
        const users = [
            { 
                id: 1, 
                fio: 'Администратор', 
                login: 'admin', 
                password: adminPasswordHash,
                email: 'admin@groomroom.ru', 
                role: 'admin' 
            }
        ];
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) {
        const testApplications = [
            {
                id: 1001,
                petName: 'Мопс - гигиена',
                petPhoto: null,
                status: 'Новая',
                userId: 1,
                createdAt: new Date().toISOString(),
                resultPhoto: null
            },
            {
                id: 1002,
                petName: 'Кошка - стрижка',
                petPhoto: null,
                status: 'Обработка данных',
                userId: 1,
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                resultPhoto: null
            },
            {
                id: 1003,
                petName: 'Йорк - экспресс-линька',
                petPhoto: null,
                status: 'Обработка данных',
                userId: 1,
                createdAt: new Date(Date.now() - 172800000).toISOString(),
                resultPhoto: null
            },
            {
                id: 1004,
                petName: 'Шпиц - тримминг',
                petPhoto: null,
                status: 'Услуга оказана',
                userId: 1,
                createdAt: new Date(Date.now() - 259200000).toISOString(),
                resultPhoto: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect width=\'200\' height=\'200\' fill=\'%2389c1ed\'/%3E%3Ctext x=\'50\' y=\'110\' fill=\'white\'%3EFoto%3C/text%3E%3C/svg%3E'
            },
            {
                id: 1005,
                petName: 'Такса - стрижка',
                petPhoto: null,
                status: 'Услуга оказана',
                userId: 1,
                createdAt: new Date(Date.now() - 345600000).toISOString(),
                resultPhoto: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect width=\'200\' height=\'200\' fill=\'%2389c1ed\'/%3E%3Ctext x=\'50\' y=\'110\' fill=\'white\'%3EFoto%3C/text%3E%3C/svg%3E'
            },
            {
                id: 1006,
                petName: 'Хаски - купание',
                petPhoto: null,
                status: 'Услуга оказана',
                userId: 1,
                createdAt: new Date(Date.now() - 432000000).toISOString(),
                resultPhoto: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect width=\'200\' height=\'200\' fill=\'%2389c1ed\'/%3E%3Ctext x=\'50\' y=\'110\' fill=\'white\'%3EFoto%3C/text%3E%3C/svg%3E'
            }
        ];
        localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(testApplications));
    }
}

async function register(fio, login, email, phone, password, password2, agree) {
    const errors = {};
    
    if (!fio || fio.trim() === '') {
        errors.fio = 'Введите ФИО';
    } else if (!/^[А-Яа-яЁё\s]+$/.test(fio)) {
        errors.fio = 'ФИО должно содержать только кириллицу и пробелы';
    }
    
    if (!login || login.trim() === '') {
        errors.login = 'Введите логин';
    } else if (!/^[a-zA-Z\-]+$/.test(login)) {
        errors.login = 'Логин должен содержать только латиницу и дефис';
    } else {
        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS));
        if (users.find(u => u.login === login)) {
            errors.login = 'Логин уже существует';
        }
    }
    
    if (!email || email.trim() === '') {
        errors.email = 'Введите email';
    } else if (!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email)) {
        errors.email = 'Введите корректный email';
    }
    
    if (!password) {
        errors.password = 'Введите пароль';
    } else if (password.length < 4) {
        errors.password = 'Пароль должен быть не менее 4 символов';
    }
    
    if (!password2) {
        errors.password2 = 'Подтвердите пароль';
    } else if (password !== password2) {
        errors.password2 = 'Пароли не совпадают';
    }

    if (phone && phone.trim() && !validatePhone(phone)) {
        errors.phone = 'Введите корректный номер телефона';
    }
    
    if (!agree) {
        errors.agree = 'Необходимо согласие на обработку персональных данных';
    }
    
    if (Object.keys(errors).length > 0) {
        return { success: false, errors };
    }

    let phoneValue = '';
    if (phone && phone.trim()) {
        phoneValue = phone.trim();
    }
    
    const hashedPassword = await hashPassword(password);
    
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS));
    const newUser = {
        id: Date.now(),
        fio: fio.trim(),
        login: login.trim(),
        email: email.trim(),
        phone: phoneValue,
        password: hashedPassword,
        role: 'user'
    };
    
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    return { success: true };
}

async function login(login, password) {
    if (!login || !password) {
        return { success: false, error: 'Заполните все поля' };
    }
    
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS));
    
    const hashedPassword = await hashPassword(password);
    const user = users.find(u => u.login === login && u.password === hashedPassword);
    
    if (!user) {
        return { success: false, error: 'Неверный логин или пароль' };
    }
    
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return { success: true, user };
}

function logout() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    window.location.href = 'index.html';
}

function getCurrentUser() {
    const user = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return user ? JSON.parse(user) : null;
}

function requireAuth(redirectTo = 'index.html') {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = redirectTo;
        return null;
    }
    return user;
}

function requireAdmin(redirectTo = 'index.html') {
    const user = requireAuth(redirectTo);
    if (user && user.role !== 'admin') {
        window.location.href = redirectTo;
        return null;
    }
    return user;
}