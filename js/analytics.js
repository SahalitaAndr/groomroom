function getAnalyticsData() {
    const applications = getAllApplications();
    const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
    
    const weekdayStats = [0,0,0,0,0,0,0];
    const weekdayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    applications.forEach(app => {
        if (app.appointmentDate) {
            const date = new Date(app.appointmentDate);
            let weekday = date.getDay();
            weekday = weekday === 0 ? 6 : weekday - 1;
            weekdayStats[weekday]++;
        }
    });
    
    const serviceStats = {
        'Гигиена': 0,
        'Тримминг': 0,
        'Стрижка': 0,
        'Экспресс-линька': 0
    };
    
    applications.forEach(app => {
        if (app.service && serviceStats[app.service] !== undefined) {
            serviceStats[app.service]++;
        }
    });
    
    const servicePrices = {
        'Гигиена': 1500,
        'Тримминг': 2000,
        'Стрижка': 1800,
        'Экспресс-линька': 1700
    };
    
    let totalRevenue = 0;
    const monthlyRevenue = {};
    const completedApps = applications.filter(app => app.status === 'Услуга оказана');
    
    completedApps.forEach(app => {
        const price = servicePrices[app.service] || 1500;
        totalRevenue += price;
        
        const month = new Date(app.appointmentDate || app.createdAt).toLocaleString('ru', { month: 'long' });
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + price;
    });
    
    const totalApps = applications.length;
    const completed = applications.filter(a => a.status === 'Услуга оказана').length;
    const processing = applications.filter(a => a.status === 'Обработка данных').length;
    const newApps = applications.filter(a => a.status === 'Новая').length;
    const cancelationRate = totalApps > 0 ? ((totalApps - completed) / totalApps * 100).toFixed(1) : 0;
    
    const avgRating = reviews.length > 0 
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : 0;
    
    const maxWeekday = Math.max(...weekdayStats);
    const mostPopularDay = weekdayNames[weekdayStats.indexOf(maxWeekday)];
    
    let mostPopularService = 'Нет данных';
    let maxService = 0;
    for (const [service, count] of Object.entries(serviceStats)) {
        if (count > maxService) {
            maxService = count;
            mostPopularService = service;
        }
    }
    
    return {
        totalApps,
        completed,
        processing,
        newApps,
        cancelationRate,
        avgRating,
        mostPopularDay,
        mostPopularService,
        weekdayStats,
        serviceStats,
        totalRevenue,
        monthlyRevenue,
        reviewsCount: reviews.length
    };
}

function renderAnalytics() {
    const data = getAnalyticsData();
    
    return `
        <div class="analytics-dashboard">
            <div class="analytics-stats-grid">
                <div class="analytics-stat-card">
                    <div class="analytics-icon">📋</div>
                    <div class="analytics-number">${data.totalApps}</div>
                    <div class="analytics-label">Всего заявок</div>
                </div>
                <div class="analytics-stat-card">
                    <div class="analytics-icon">✅</div>
                    <div class="analytics-number">${data.completed}</div>
                    <div class="analytics-label">Завершено</div>
                </div>
                <div class="analytics-stat-card">
                    <div class="analytics-icon">⭐</div>
                    <div class="analytics-number">${data.avgRating}</div>
                    <div class="analytics-label">Средний рейтинг</div>
                </div>
                <div class="analytics-stat-card">
                    <div class="analytics-icon">💰</div>
                    <div class="analytics-number">${data.totalRevenue.toLocaleString()} ₽</div>
                    <div class="analytics-label">Выручка</div>
                </div>
                <div class="analytics-stat-card">
                    <div class="analytics-icon">📊</div>
                    <div class="analytics-number">${data.cancelationRate}%</div>
                    <div class="analytics-label">Отмена записей</div>
                </div>
                <div class="analytics-stat-card">
                    <div class="analytics-icon">🔥</div>
                    <div class="analytics-number">${data.mostPopularService}</div>
                    <div class="analytics-label">Популярная услуга</div>
                </div>
            </div>
            
            <div class="analytics-charts">
                <div class="chart-card">
                    <h4>Загрузка по дням недели</h4>
                    <div class="bar-chart" id="weekdayChart">
                        ${data.weekdayStats.map((count, i) => `
                            <div class="bar-item">
                                <div class="bar-label">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i]}</div>
                                <div class="bar-container">
                                    <div class="bar" style="height: ${count * 8}px; width: 40px; background: #89c1ed;"></div>
                                </div>
                                <div class="bar-value">${count}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="chart-card">
                    <h4>Популярность услуг</h4>
                    <div class="pie-chart-container">
                        ${Object.entries(data.serviceStats).map(([service, count]) => `
                            <div class="pie-segment-info">
                                <div class="pie-color" style="background: ${getServiceColor(service)}"></div>
                                <span>${service}: ${count} записей</span>
                                <span class="pie-percent">${data.totalApps > 0 ? ((count / data.totalApps) * 100).toFixed(0) : 0}%</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="chart-card">
                <h4>Динамика заявок по месяцам</h4>
                <div class="line-chart" id="monthlyChart">
                    ${Object.entries(data.monthlyRevenue).map(([month, revenue], i) => `
                        <div class="line-point">
                            <div class="line-bar" style="height: ${(revenue / 3000) * 50}px;"></div>
                            <div class="line-label">${month.substring(0, 3)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="top-clients-card">
                <h4>Статистика</h4>
                <ul class="stat-list">
                    <li>Самый загруженный день: <strong>${data.mostPopularDay}</strong></li>
                    <li>Самая популярная услуга: <strong>${data.mostPopularService}</strong></li>
                    <li>Всего отзывов: <strong>${data.reviewsCount}</strong></li>
                    <li>В обработке заявок: <strong>${data.processing}</strong></li>
                </ul>
            </div>
        </div>
    `;
}

function getServiceColor(service) {
    const colors = {
        'Гигиена': '#89c1ed',
        'Тримминг': '#fe99c5',
        'Стрижка': '#51cf66',
        'Экспресс-линька': '#ffa94d'
    };
    return colors[service] || '#adb5bd';
}

function renderFullAnalytics() {
    return renderAnalytics();
}