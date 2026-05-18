const REVIEWS_KEY = 'groomroom_reviews';

function addReview(applicationId, userId, rating, text, photo = null) {
    if (!checkRateLimit(userId, 'review', 3, 86400000)) {
        showToast('Вы можете оставить не более 3 отзывов в день', 'error');
        return false;
    }
    
    const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
    if (reviews.some(r => r.applicationId === applicationId)) {
        showToast('Вы уже оставили отзыв на эту услугу', 'error');
        return false;
    }
    
    const newReview = {
        id: Date.now(),
        applicationId,
        userId,
        rating: Math.min(5, Math.max(1, rating)),
        text: sanitizeInput(text),
        photo: photo || null,
        createdAt: new Date().toISOString(),
        likes: 0,
        adminResponded: false,
        adminResponse: null
    };
    
    reviews.unshift(newReview);
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
    
    auditLog('add_review', userId, { applicationId, rating });
    showToast('Спасибо за отзыв!', 'success');
    return true;
}

function getReviews(limit = 10, minRating = 1) {
    let reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
    reviews = reviews.filter(r => r.rating >= minRating);
    return reviews.slice(0, limit);
}

function getAverageRating() {
    const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
}

function likeReview(reviewId, userId) {
    const likesKey = `review_likes_${userId}`;
    const likedReviews = JSON.parse(localStorage.getItem(likesKey) || '[]');
    
    if (likedReviews.includes(reviewId)) {
        return false;
    }
    
    const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
    const review = reviews.find(r => r.id === reviewId);
    if (review) {
        review.likes++;
        localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
        likedReviews.push(reviewId);
        localStorage.setItem(likesKey, JSON.stringify(likedReviews));
        return true;
    }
    return false;
}

function adminRespondToReview(reviewId, response) {
    const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
    const review = reviews.find(r => r.id === reviewId);
    if (review) {
        review.adminResponded = true;
        review.adminResponse = sanitizeInput(response);
        review.adminResponseDate = new Date().toISOString();
        localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
        return true;
    }
    return false;
}

function renderReviewsBlock() {
    const reviews = getReviews(6);
    const avgRating = getAverageRating();
    
    if (reviews.length === 0) {
        return '<p style="text-align: center;">Пока нет отзывов. Будьте первым!</p>';
    }
    
    return `
        <div class="reviews-header">
            <div class="avg-rating">
                <span class="avg-rating-number">${avgRating}</span>
                <div class="stars">${renderStars(avgRating)}</div>
                <span class="review-count">(${reviews.length} отзывов)</span>
            </div>
        </div>
        <div class="reviews-grid">
            ${reviews.map(review => `
                <div class="review-card">
                    <div class="review-header">
                        <div class="review-stars">${renderStars(review.rating)}</div>
                        <div class="review-date">${formatRelativeDate(review.createdAt)}</div>
                    </div>
                    <p class="review-text">"${escapeHtml(review.text)}"</p>
                    ${review.photo ? `<img src="${review.photo}" class="review-photo" onclick="showPhotoModal('${review.photo}')">` : ''}
                    <div class="review-footer">
                        <button class="like-btn" onclick="likeReviewHandler(${review.id})">❤️ ${review.likes}</button>
                    </div>
                    ${review.adminResponded ? `
                        <div class="admin-response">
                            <strong>👑 Администратор:</strong>
                            <p>${escapeHtml(review.adminResponse)}</p>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let stars = '';
    for (let i = 0; i < full; i++) stars += '★';
    if (half) stars += '½';
    for (let i = stars.length; i < 5; i++) stars += '☆';
    return stars;
}

function formatRelativeDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'сегодня';
    if (days === 1) return 'вчера';
    if (days < 7) return `${days} дня(ей) назад`;
    return date.toLocaleDateString('ru-RU');
}

function likeReviewHandler(reviewId) {
    const user = getCurrentUser();
    if (!user) {
        showToast('Войдите, чтобы поставить лайк', 'info');
        return;
    }
    if (likeReview(reviewId, user.id)) {
        const container = document.getElementById('reviews-container');
        if (container) {
            container.innerHTML = renderReviewsBlock();
        }
        showToast('Спасибо за лайк!', 'success');
    } else {
        showToast('Вы уже лайкали этот отзыв', 'info');
    }
}