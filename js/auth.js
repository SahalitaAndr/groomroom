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
                role: 'admin',
                phone: '+7 999 999-99-99'
            }
        ];
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
    
    const currentUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    if (!currentUsers.find(u => u.login === 'sakhalita')) {
        const userPasswordHash = await hashPassword('123456');
        currentUsers.push({
            id: 100,
            fio: 'Андреева Сахалита Яковлевна',
            login: 'sakhalita',
            password: userPasswordHash,
            email: 'sakhalita@example.com',
            phone: '+7 999 123-45-67',
            role: 'user'
        });
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(currentUsers));
        console.log('Тестовый пользователь sakhalita создан');
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) {
        

        const shpitzPhoto = 'img/shpits.jpg';
        const taksaPhoto = 'img/taksa.jpg';
        const haskiPhoto = 'img/haski.jpg';
        const testApplications = [
            {
                id: 1001,
                petName: 'Мопс',
                petPhoto: createTestPhoto('Мопс 🐶', '#ffa94d'),
                status: 'Новая',
                userId: 1,
                createdAt: new Date().toISOString(),
                resultPhoto: null,
                service: 'Гигиена',
                appointmentDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                additionalMessage: 'Мопсик боится фена, пожалуйста, аккуратнее'
            },
            {
                id: 1002,
                petName: 'Кошка',
                petPhoto: createTestPhoto('Кошка 🐱', '#a29bfe'),
                status: 'Обработка данных',
                userId: 1,
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                resultPhoto: null,
                service: 'Стрижка',
                appointmentDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
                additionalMessage: 'Стрижка под льва'
            },
            {
                id: 1003,
                petName: 'Йорк',
                petPhoto: createTestPhoto('Йорк 🐕', '#74b9ff'),
                status: 'Обработка данных',
                userId: 1,
                createdAt: new Date(Date.now() - 172800000).toISOString(),
                resultPhoto: null,
                service: 'Экспресс-линька',
                appointmentDate: new Date(Date.now() + 259200000).toISOString().split('T')[0],
                additionalMessage: ''
            },
            {
                id: 1004,
                petName: 'Шпиц',
                petPhoto: createTestPhoto('Шпиц 🐕', '#89c1ed'),
                status: 'Услуга оказана',
                userId: 1,
                createdAt: new Date(Date.now() - 259200000).toISOString(),
                resultPhoto: shpitzPhoto,
                service: 'Тримминг',
                appointmentDate: new Date(Date.now() - 432000000).toISOString().split('T')[0],
                additionalMessage: 'Сделайте красивую стрижку'
            },
            {
                id: 1005,
                petName: 'Такса',
                petPhoto: createTestPhoto('Такса 🐕', '#fe99c5'),
                status: 'Услуга оказана',
                userId: 1,
                createdAt: new Date(Date.now() - 345600000).toISOString(),
                resultPhoto: taksaPhoto,
                service: 'Стрижка',
                appointmentDate: new Date(Date.now() - 518400000).toISOString().split('T')[0],
                additionalMessage: ''
            },
            {
                id: 1006,
                petName: 'Хаски',
                petPhoto: createTestPhoto('Хаски 🐕', '#51cf66'),
                status: 'Услуга оказана',
                userId: 1,
                createdAt: new Date(Date.now() - 432000000).toISOString(),
                resultPhoto: haskiPhoto,
                service: 'Экспресс-линька',
                appointmentDate: new Date(Date.now() - 604800000).toISOString().split('T')[0],
                additionalMessage: 'Очень активный пёс'
            }
        ];
        localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(testApplications));
        console.log('Тестовые заявки созданы');
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

window.login = login;
window.logout = logout;
window.getCurrentUser = getCurrentUser;
window.register = register;
window.initData = initData;