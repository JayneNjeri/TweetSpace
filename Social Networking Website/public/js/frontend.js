// ===== Configuration =====
const API_BASE = 'http://localhost:3000';
const STUDENT_ID = 'M01046675'; 

//State Management
let currentUser = null;
let authToken = null;
let currentView = 'login';
let allUsers = [];


document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Check if user is already logged in
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
        authToken = savedToken;
        checkLoginStatus();
    } else {
        showView('login');
    }

    // Attach event listeners
    attachEventListeners();
}

function attachEventListeners() {
    // Auth forms
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.dataset.view;
            if (view) showView(view);
        });
    });
    
    // Tweet composer
    document.getElementById('tweetText')?.addEventListener('input', updatePostButtonState);
    document.getElementById('imageInput')?.addEventListener('change', handleImageSelect);
    document.getElementById('imageUploadBtn')?.addEventListener('click', () => {
        document.getElementById('imageInput').click();
    });
    document.getElementById('postTweetBtn')?.addEventListener('click', handlePostTweet);
    
    // Search
    document.getElementById('searchInput')?.addEventListener('input', handleSearch);
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    
    // Auth view switchers
    document.getElementById('showRegister')?.addEventListener('click', (e) => {
        e.preventDefault();
        showView('register');
    });
    document.getElementById('showLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        showView('login');
    });
}

// ===== View Management =====
function showView(view) {
    currentView = view;
    
    // If showing login or register, hide appView and show auth views
    if (view === 'login' || view === 'register') {
        document.getElementById('appView')?.classList.add('hidden');
        document.getElementById('loginView')?.classList.add('hidden');
        document.getElementById('registerView')?.classList.add('hidden');
        document.getElementById(`${view}View`)?.classList.remove('hidden');
    } else {
        // Show appView for home, explore, profile
        document.getElementById('loginView')?.classList.add('hidden');
        document.getElementById('registerView')?.classList.add('hidden');
        document.getElementById('appView')?.classList.remove('hidden');
        
        // Hide all inner views
        document.getElementById('homeView')?.classList.add('hidden');
        document.getElementById('exploreView')?.classList.add('hidden');
        document.getElementById('profileView')?.classList.add('hidden');
        
        // Show requested inner view
        document.getElementById(`${view}View`)?.classList.remove('hidden');
    }
    
    // Update navigation active state
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.view === view) {
            link.classList.add('active');
        }
    });
    
    // Load view-specific data
    switch(view) {
        case 'home':
            loadFeed();
            break;
        case 'explore':
            loadAllUsers();
            break;
        case 'profile':
            loadUserProfile();
            break;
    }
}

// ===== Authentication =====
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_BASE}/${STUDENT_ID}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            updateUserInfo();
            showView('home');
            showAlert('loginAlert', 'Login successful!', 'success');
        } else {
            showAlert('loginAlert', data.error || 'Login failed', 'danger');
        }
    } catch (error) {
        showAlert('loginAlert', 'Network error. Please try again.', 'danger');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const bio = document.getElementById('registerBio').value;
    
    try {
        const response = await fetch(`${API_BASE}/${STUDENT_ID}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, bio })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('registerAlert', 'Registration successful! Please login.', 'success');
            setTimeout(() => showView('login'), 1500);
        } else {
            showAlert('registerAlert', data.error || 'Registration failed', 'danger');
        }
    } catch (error) {
        showAlert('registerAlert', 'Network error. Please try again.', 'danger');
    }
}

async function checkLoginStatus() {
    try {
        const response = await fetch(`${API_BASE}/${STUDENT_ID}/login`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.loggedIn) {
            currentUser = data.user;
            updateUserInfo();
            showView('home');
        } else {
            localStorage.removeItem('authToken');
            authToken = null;
            showView('login');
        }
    } catch (error) {
        localStorage.removeItem('authToken');
        authToken = null;
        showView('login');
    }
}

async function handleLogout() {
    try {
        await fetch(`${API_BASE}/${STUDENT_ID}/login`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    showView('login');
}

function updateUserInfo() {
    if (currentUser) {
        const avatar = document.getElementById('currentUserAvatar');
        const composerAvatar = document.getElementById('composerAvatar');
        const name = document.getElementById('currentUserName');
        const username = document.getElementById('currentUserUsername');
        
        const initials = currentUser.username.substring(0, 2).toUpperCase();
        
        if (avatar) avatar.textContent = initials;
        if (composerAvatar) composerAvatar.textContent = initials;
        if (name) name.textContent = currentUser.username;
        if (username) username.textContent = `@${currentUser.username}`;
    }
}

// ===== Tweet/Post Management =====
let selectedImage = null;

function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
        selectedImage = event.target.result;
        displayImagePreview(selectedImage);
    };
    reader.readAsDataURL(file);
}

function displayImagePreview(imageData) {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = `
        <img src="${imageData}" alt="Preview">
        <button class="remove-image" onclick="removeImage()">
            <i class="fas fa-times"></i>
        </button>
    `;
    preview.classList.remove('hidden');
}

function removeImage() {
    selectedImage = null;
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('imageInput').value = '';
    updatePostButtonState();
}

function updatePostButtonState() {
    const text = document.getElementById('tweetText').value.trim();
    const btn = document.getElementById('postTweetBtn');
    btn.disabled = !text && !selectedImage;
}

async function handlePostTweet() {
    const text = document.getElementById('tweetText').value.trim();
    
    if (!text && !selectedImage) return;
    
    const postData = { text };
    
    if (selectedImage) {
        postData.imageData = selectedImage;
        postData.imageType = 'image/jpeg';
    }
    
    try {
        const response = await fetch(`${API_BASE}/${STUDENT_ID}/contents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(postData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Clear form
            document.getElementById('tweetText').value = '';
            removeImage();
            // Reload feed
            loadFeed();
        } else {
            alert(data.error || 'Failed to post tweet');
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
}

// ===== Feed Management =====
async function loadFeed() {
    const container = document.getElementById('feedContainer');
    container.innerHTML = '<div class="loading">Loading your feed...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/${STUDENT_ID}/feed`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (data.feed && data.feed.length > 0) {
                displayTweets(data.feed, container);
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <h3>Welcome to your feed!</h3>
                        <p>Follow some users to see their posts here.</p>
                        <p>Check out the Explore tab to find users.</p>
                    </div>
                `;
            }
        } else {
            container.innerHTML = '<div class="empty-state">Failed to load feed</div>';
        }
    } catch (error) {
        container.innerHTML = '<div class="empty-state">Network error</div>';
    }
}

function displayTweets(tweets, container) {
    container.innerHTML = tweets.map(tweet => createTweetCard(tweet)).join('');
    
    // Attach like button listeners
    container.querySelectorAll('.action-btn[data-action="like"]').forEach(btn => {
        btn.addEventListener('click', () => handleLikeTweet(btn.dataset.tweetId));
    });
}

function createTweetCard(tweet) {
    const initials = tweet.authorUsername.substring(0, 2).toUpperCase();
    const timeAgo = formatTimeAgo(new Date(tweet.timestamp));
    const isLiked = tweet.isLiked ? 'liked' : '';
    const likeIcon = tweet.isLiked ? 'fas fa-heart' : 'far fa-heart';
    
    return `
        <div class="tweet-card">
            <div class="tweet-content">
                <div class="tweet-avatar">${initials}</div>
                <div class="tweet-body">
                    <div class="tweet-header">
                        <span class="tweet-author">${tweet.authorUsername}</span>
                        <span class="tweet-username">@${tweet.authorUsername}</span>
                        <span class="tweet-time"> · ${timeAgo}</span>
                    </div>
                    <div class="tweet-text">${escapeHtml(tweet.text)}</div>
                    ${tweet.imageData ? `
                        <div class="tweet-image">
                            <img src="${tweet.imageData}" alt="Tweet image">
                        </div>
                    ` : ''}
                    <div class="tweet-actions">
                        <button class="action-btn ${isLiked}" data-action="like" data-tweet-id="${tweet._id}">
                            <i class="${likeIcon}"></i>
                            <span>${tweet.likesCount || 0}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function handleLikeTweet(tweetId) {
    try {
        // Find the button that was clicked
        const button = document.querySelector(`[data-tweet-id="${tweetId}"]`);
        if (!button) return;
        
        // Get current state
        const isLiked = button.classList.contains('liked');
        const countSpan = button.querySelector('span');
        const currentCount = parseInt(countSpan.textContent) || 0;
        
        // Optimistically update UI immediately
        if (isLiked) {
            button.classList.remove('liked');
            button.querySelector('i').className = 'far fa-heart';
            countSpan.textContent = Math.max(0, currentCount - 1);
        } else {
            button.classList.add('liked');
            button.querySelector('i').className = 'fas fa-heart';
            countSpan.textContent = currentCount + 1;
        }
        
        // Send request to server
        const response = await fetch(`${API_BASE}/${STUDENT_ID}/contents/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ contentId: tweetId })
        });
        
        if (!response.ok) {
            // If failed, revert the UI change
            if (isLiked) {
                button.classList.add('liked');
                button.querySelector('i').className = 'fas fa-heart';
                countSpan.textContent = currentCount;
            } else {
                button.classList.remove('liked');
                button.querySelector('i').className = 'far fa-heart';
                countSpan.textContent = currentCount;
            }
            console.error('Failed to like post');
        }
    } catch (error) {
        console.error('Like error:', error);
    }
}

// ===== User Management =====
async function loadAllUsers() {
    const container = document.getElementById('usersContainer');
    container.innerHTML = '<div class="loading">Loading users...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/${STUDENT_ID}/users?userId=${currentUser._id}`);
        const data = await response.json();
        
        if (response.ok) {
            allUsers = data.users.filter(u => u._id !== currentUser._id);
            displayUsers(allUsers, container);
        } else {
            container.innerHTML = '<div class="empty-state">Failed to load users</div>';
        }
    } catch (error) {
        container.innerHTML = '<div class="empty-state">Network error</div>';
    }
}

function displayUsers(users, container) {
    if (users.length === 0) {
        container.innerHTML = '<div class="empty-state">No users found</div>';
        return;
    }
    
    container.innerHTML = users.map(user => createUserCard(user)).join('');
    
    // Attach follow button listeners
    container.querySelectorAll('.follow-btn, .unfollow-btn').forEach(btn => {
        btn.addEventListener('click', () => handleFollowToggle(btn.dataset.userId, btn.dataset.action));
    });
}

function createUserCard(user) {
    const initials = user.username.substring(0, 2).toUpperCase();
    const isFollowing = user.isFollowing || false;
    const buttonHtml = isFollowing 
        ? `<button class="unfollow-btn" data-user-id="${user._id}" data-action="unfollow">Following</button>`
        : `<button class="follow-btn" data-user-id="${user._id}" data-action="follow">Follow</button>`;
    
    return `
        <div class="user-card">
            <div class="user-card-content">
                <div class="user-card-avatar">${initials}</div>
                <div class="user-card-info">
                    <h4>${user.username}</h4>
                    <p>@${user.username}</p>
                    ${user.bio ? `<div class="user-card-bio">${escapeHtml(user.bio)}</div>` : ''}
                </div>
            </div>
            ${buttonHtml}
        </div>
    `;
}

async function handleFollowToggle(userId, action) {
    const method = action === 'follow' ? 'POST' : 'DELETE';
    
    try {
        // Find the button that was clicked
        const button = document.querySelector(`[data-user-id="${userId}"]`);
        if (!button) return;
        
        // Disable button during request
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = action === 'follow' ? 'Following...' : 'Unfollowing...';
        
        const response = await fetch(`${API_BASE}/${STUDENT_ID}/follow`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ followingId: userId })
        });
        
        if (response.ok) {
            // Update button UI immediately
            if (action === 'follow') {
                button.className = 'unfollow-btn';
                button.textContent = 'Following';
                button.dataset.action = 'unfollow';
            } else {
                button.className = 'follow-btn';
                button.textContent = 'Follow';
                button.dataset.action = 'follow';
            }
            button.disabled = false;
        } else {
            // Revert on error
            button.textContent = originalText;
            button.disabled = false;
            console.error('Follow/unfollow failed');
        }
    } catch (error) {
        console.error('Follow error:', error);
    }
}

async function handleSearch(e) {
    const searchTerm = e.target.value.trim().toLowerCase();
    
    if (!searchTerm) {
        displayUsers(allUsers, document.getElementById('usersContainer'));
        return;
    }
    
    const filtered = allUsers.filter(user => 
        user.username.toLowerCase().includes(searchTerm) ||
        (user.bio && user.bio.toLowerCase().includes(searchTerm))
    );
    
    displayUsers(filtered, document.getElementById('usersContainer'));
}

// ===== Profile Management =====
async function loadUserProfile() {
    const container = document.getElementById('profileTweetsContainer');
    container.innerHTML = '<div class="loading">Loading your posts...</div>';
    
    // Update profile header
    if (currentUser) {
        const initials = currentUser.username.substring(0, 2).toUpperCase();
        document.getElementById('profileAvatar').textContent = initials;
        document.getElementById('profileName').textContent = currentUser.username;
        document.getElementById('profileUsername').textContent = `@${currentUser.username}`;
        document.getElementById('profileBio').textContent = currentUser.bio || 'No bio yet';
        document.getElementById('followingCount').textContent = currentUser.followingCount || 0;
        document.getElementById('followersCount').textContent = currentUser.followerCount || 0;
    }
    
    // Load user's posts
    try {
        const response = await fetch(`${API_BASE}/${STUDENT_ID}/contents?userId=${currentUser._id}`);
        const data = await response.json();
        
        if (response.ok) {
            if (data.contents && data.contents.length > 0) {
                displayTweets(data.contents, container);
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <h3>No posts yet</h3>
                        <p>Start sharing your thoughts!</p>
                    </div>
                `;
            }
        } else {
            container.innerHTML = '<div class="empty-state">Failed to load posts</div>';
        }
    } catch (error) {
        container.innerHTML = '<div class="empty-state">Network error</div>';
    }
}

// ===== Utility Functions =====
function showAlert(elementId, message, type) {
    const alertElement = document.getElementById(elementId);
    if (!alertElement) return;
    
    alertElement.className = `alert alert-${type}`;
    alertElement.textContent = message;
    alertElement.classList.remove('hidden');
    
    setTimeout(() => {
        alertElement.classList.add('hidden');
    }, 5000);
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make removeImage globally accessible
window.removeImage = removeImage;
