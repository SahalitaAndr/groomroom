const STORAGE_KEYS = {
    USERS: 'groomroom_users',
    APPLICATIONS: 'groomroom_applications',
    CURRENT_USER: 'groomroom_current_user'
};

function createApplication(petName, petPhoto, userId) {
    const errors = {};
    
    if (!petName || petName.trim() === '') {
        errors.name = 'Введите кличку питомца';
    }
    
    if (!petPhoto) {
        errors.photo = 'Загрузите фото питомца';
    } else if (petPhoto.length > 2 * 1024 * 1024) {
        errors.photo = 'Фото не должно превышать 2 МБ';
    } else if (!petPhoto.startsWith('data:image/jpeg') && !petPhoto.startsWith('data:image/bmp')) {
        errors.photo = 'Фото должно быть в формате JPEG или BMP';
    }
    
    if (Object.keys(errors).length > 0) {
        return { success: false, errors };
    }
    
    const applications = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) || [];
    
    const newApp = {
        id: Date.now(),
        petName: petName.trim(),
        petPhoto: petPhoto,
        status: 'Новая',
        userId: userId,
        createdAt: new Date().toISOString(),
        resultPhoto: null
    };
    
    applications.unshift(newApp);
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(applications));
    
    return { success: true, application: newApp };
}

function getUserApplications(userId) {
    const applications = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) || [];
    return applications.filter(app => app.userId === userId).map(app => ({
        ...app,
        service: app.service || 'Услуга не указана',
        appointmentDate: app.appointmentDate || app.createdAt,
        additionalMessage: app.additionalMessage || ''
    }));
}

function getAllApplications() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) || [];
}

function deleteApplication(appId, userId) {
    const applications = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) || [];
    const appIndex = applications.findIndex(app => app.id === appId);
    
    if (appIndex === -1) return { success: false, error: 'Заявка не найдена' };
    
    const app = applications[appIndex];
    
    if (app.userId !== userId) {
        return { success: false, error: 'Нет прав на удаление' };
    }
    
    if (app.status !== 'Новая') {
        return { success: false, error: 'Нельзя удалить заявку в статусе "' + app.status + '"' };
    }
    
    applications.splice(appIndex, 1);
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(applications));
    
    return { success: true };
}

function updateApplicationStatus(appId, newStatus, resultPhoto = null) {
    const applications = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) || [];
    const appIndex = applications.findIndex(app => app.id === appId);
    
    if (appIndex === -1) return { success: false, error: 'Заявка не найдена' };
    
    const app = applications[appIndex];
    
    if (app.status === 'Новая' && newStatus !== 'Обработка данных') {
        return { success: false, error: 'Из "Новой" можно изменить только на "Обработка данных"' };
    }
    
    if (app.status === 'Обработка данных' && newStatus !== 'Услуга оказана') {
        return { success: false, error: 'Из "Обработка данных" можно изменить только на "Услуга оказана"' };
    }
    
    if (app.status === 'Услуга оказана') {
        return { success: false, error: 'Нельзя изменить статус завершенной заявки' };
    }
    
    if (newStatus === 'Услуга оказана' && !resultPhoto) {
        return { success: false, error: 'Необходимо загрузить фото результата' };
    }
    
    app.status = newStatus;
    if (resultPhoto) {
        app.resultPhoto = resultPhoto;
    }
    
    applications[appIndex] = app;
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(applications));
    
    return { success: true, application: app };
}

function getLastCompletedApplications() {
    const applications = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) || [];
    const completed = applications.filter(app => app.status === 'Услуга оказана' && app.resultPhoto);
    return completed.slice(0, 4);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getStatusClass(status) {
    switch(status) {
        case 'Новая': return 'status-new';
        case 'Обработка данных': return 'status-processing';
        case 'Услуга оказана': return 'status-completed';
        default: return '';
    }
}

function createApplicationFull(petName, petPhoto, userId, service, appointmentDate, additionalMessage) {
    const errors = {};
    
    if (!petName || petName.trim() === '') {
        errors.name = 'Введите кличку питомца';
    }
    
    if (!petPhoto) {
        errors.photo = 'Загрузите фото питомца';
    } else if (petPhoto.length > 2 * 1024 * 1024) {
        errors.photo = 'Фото не более 2 МБ';
    }
    
    if (Object.keys(errors).length > 0) {
        return { success: false, errors };
    }
    
    const applications = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) || [];
    
    const newApp = {
        id: Date.now(),
        petName: petName.trim(),
        petPhoto: petPhoto,
        service: service,
        appointmentDate: appointmentDate,
        additionalMessage: additionalMessage || '',
        status: 'Новая',
        userId: userId,
        createdAt: new Date().toISOString(),
        resultPhoto: null
    };
    
    applications.unshift(newApp);
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(applications));
    
    return { success: true, application: newApp };
}