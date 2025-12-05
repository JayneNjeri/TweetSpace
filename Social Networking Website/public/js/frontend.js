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
    
    // Profile followers/following
    document.getElementById('followersBtn')?.addEventListener('click', () => showFollowersModal('followers'));
    document.getElementById('followingBtn')?.addEventListener('click', () => showFollowersModal('following'));
    
    // Edit profile
    document.getElementById('editProfileBtn')?.addEventListener('click', openEditProfileModal);
    document.getElementById('editProfileForm')?.addEventListener('submit', handleEditProfile);
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
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Logging in<span class="spinner"></span>';
    
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
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const bio = document.getElementById('registerBio').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    // Client-side password validation
    if (password.length < 6) {
        showAlert('registerAlert', 'Password must be at least 6 characters long', 'danger');
        return;
    }
    
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (!hasLetter || !hasNumber) {
        showAlert('registerAlert', 'Password must include both letters and numbers', 'danger');
        return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Creating account<span class="spinner"></span>';
    
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
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
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
        
        // Update top nav avatar
        if (avatar) {
            if (currentUser.profilePictureUrl) {
                avatar.style.backgroundImage = `url(${currentUser.profilePictureUrl})`;
                avatar.style.backgroundSize = 'cover';
                avatar.style.backgroundPosition = 'center';
                avatar.textContent = '';
            } else {
                avatar.style.backgroundImage = 'none';
                avatar.textContent = initials;
            }
        }
        
        // Update composer avatar
        if (composerAvatar) {
            if (currentUser.profilePictureUrl) {
                composerAvatar.style.backgroundImage = `url(${currentUser.profilePictureUrl})`;
                composerAvatar.style.backgroundSize = 'cover';
                composerAvatar.style.backgroundPosition = 'center';
                composerAvatar.textContent = '';
            } else {
                composerAvatar.style.backgroundImage = 'none';
                composerAvatar.textContent = initials;
            }
        }
        
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
    
    // Attach comment button listeners
    container.querySelectorAll('.action-btn[data-action="comment"]').forEach(btn => {
        btn.addEventListener('click', () => toggleComments(btn.dataset.tweetId));
    });
    
    // Attach comment form listeners
    container.querySelectorAll('.comment-form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const tweetId = form.dataset.tweetId;
            const input = form.querySelector('.comment-input');
            handleAddComment(tweetId, input.value);
        });
    });
}

function createTweetCard(tweet) {
    const initials = tweet.authorUsername.substring(0, 2).toUpperCase();
    const timeAgo = formatTimeAgo(new Date(tweet.timestamp));
    const isLiked = tweet.isLiked ? 'liked' : '';
    const likeIcon = tweet.isLiked ? 'fas fa-heart' : 'far fa-heart';
    
    // Use profile picture if available, otherwise show initials
    const avatarContent = tweet.authorProfilePicture 
        ? `<div class="tweet-avatar" style="background-image: url(${tweet.authorProfilePicture}); background-size: cover; background-position: center;"></div>`
        : `<div class="tweet-avatar">${initials}</div>`;
    
    return `
        <div class="tweet-card" data-tweet-id="${tweet._id}">
            <div class="tweet-content">
                ${avatarContent}
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
                        <button class="action-btn" data-action="comment" data-tweet-id="${tweet._id}">
                            <i class="far fa-comment"></i>
                            <span>${tweet.commentCount || 0}</span>
                        </button>
                    </div>
                    <div class="comments-section hidden" id="comments-${tweet._id}">
                        <div class="comments-list">
                            <div class="loading">Loading comments...</div>
                        </div>
                        <form class="comment-form" data-tweet-id="${tweet._id}">
                            <input type="text" class="comment-input" placeholder="Write a comment..." required>
                            <button type="submit" class="btn-comment">Post</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function handleLikeTweet(tweetId) {
    try {
        // Find the like button specifically (not comment button)
        const button = document.querySelector(`button[data-action="like"][data-tweet-id="${tweetId}"]`);
        if (!button) {
            console.error('Like button not found for tweet:', tweetId);
            return;
        }
        
        // Get the span element
        const countSpan = button.querySelector('span');
        if (!countSpan) {
            console.error('Count span not found in button');
            return;
        }
        
        const currentCount = parseInt(countSpan.textContent) || 0;
        const isLiked = button.classList.contains('liked');
        
        console.log('Before like - Count:', currentCount, 'IsLiked:', isLiked, 'Span element:', countSpan);
        
        // Disable button while processing
        button.disabled = true;
        
        // Send request to server
        const response = await fetch(`${API_BASE}/${STUDENT_ID}/contents/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ contentId: tweetId })
        });
        
        const data = await response.json();
        console.log('Server response:', data);
        
        if (response.ok) {
            // Update heart icon and class
            const icon = button.querySelector('i');
            if (data.liked) {
                button.classList.add('liked');
                if (icon) icon.className = 'fas fa-heart';
            } else {
                button.classList.remove('liked');
                if (icon) icon.className = 'far fa-heart';
            }
            
            // Update counter - force update
            countSpan.innerText = data.likesCount;
            countSpan.textContent = data.likesCount;
            
            console.log('After like - New count set to:', data.likesCount);
            console.log('Span now shows:', countSpan.textContent);
        } else {
            console.error('Failed to like post:', data.error);
        }
        
        // Re-enable button
        button.disabled = false;
    } catch (error) {
        console.error('Like error:', error);
        // Re-enable button on error
        const button = document.querySelector(`button[data-action="like"][data-tweet-id="${tweetId}"]`);
        if (button) button.disabled = false;
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
        const profileAvatar = document.getElementById('profileAvatar');
        if (currentUser.profilePictureUrl) {
            profileAvatar.style.backgroundImage = `url(${currentUser.profilePictureUrl})`;
            profileAvatar.style.backgroundSize = 'cover';
            profileAvatar.style.backgroundPosition = 'center';
            profileAvatar.textContent = '';
        } else {
            const initials = currentUser.username.substring(0, 2).toUpperCase();
            profileAvatar.style.backgroundImage = 'none';
            profileAvatar.textContent = initials;
        }
        
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
window.closeFollowModal = closeFollowModal;
window.closeEditProfileModal = closeEditProfileModal;
window.showUserDetailsModal = showUserDetailsModal;
window.closeUserDetailsModal = closeUserDetailsModal;

// ===== User Details Modal =====
function showUserDetailsModal(userId, username, bio, followerCount, followingCount) {
    const modal = document.getElementById('userDetailsModal');
    const initials = username.substring(0, 2).toUpperCase();
    
    document.getElementById('userDetailAvatar').textContent = initials;
    document.getElementById('userDetailName').textContent = username;
    document.getElementById('userDetailUsername').textContent = `@${username}`;
    document.getElementById('userDetailBio').textContent = bio;
    document.getElementById('userDetailFollowers').textContent = followerCount;
    document.getElementById('userDetailFollowing').textContent = followingCount;
    
    // Close the followers modal first
    closeFollowModal();
    
    // Show user details modal
    modal.classList.remove('hidden');
    
    // Load user's posts
    loadUserPosts(userId);
}

function closeUserDetailsModal() {
    document.getElementById('userDetailsModal').classList.add('hidden');
}

async function loadUserPosts(userId) {
    const container = document.getElementById('userDetailPosts');
    container.innerHTML = '<div class="loading">Loading posts...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/${STUDENT_ID}/contents?userId=${userId}`);
        const data = await response.json();
        
        if (response.ok) {
            if (data.contents && data.contents.length > 0) {
                displayTweets(data.contents, container);
            } else {
                container.innerHTML = '<div class="empty-state">No posts yet</div>';
            }
        } else {
            container.innerHTML = '<div class="empty-state">Failed to load posts</div>';
        }
    } catch (error) {
        container.innerHTML = '<div class="empty-state">Network error</div>';
    }
}

// ===== Comments System =====
async function toggleComments(tweetId) {
    const commentsSection = document.getElementById(`comments-${tweetId}`);
    
    if (commentsSection.classList.contains('hidden')) {
        commentsSection.classList.remove('hidden');
        await loadComments(tweetId);
    } else {
        commentsSection.classList.add('hidden');
    }
}

async function loadComments(tweetId) {
    const commentsList = document.querySelector(`#comments-${tweetId} .comments-list`);
    commentsList.innerHTML = '<div class="loading">Loading comments...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/${STUDENT_ID}/comments/${tweetId}`);
        const data = await response.json();
        
        if (response.ok) {
            const comments = data.comments || [];
            
            if (comments.length === 0) {
                commentsList.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>';
            } else {
                commentsList.innerHTML = comments.map(comment => createCommentCard(comment)).join('');
                
                // Attach delete listeners for user's own comments
                commentsList.querySelectorAll('.delete-comment-btn').forEach(btn => {
                    btn.addEventListener('click', () => handleDeleteComment(btn.dataset.commentId, tweetId));
                });
            }
        } else {
            commentsList.innerHTML = '<div class="error-message">Failed to load comments</div>';
        }
    } catch (error) {
        commentsList.innerHTML = '<div class="error-message">Network error</div>';
    }
}

function createCommentCard(comment) {
    const initials = comment.authorUsername.substring(0, 2).toUpperCase();
    const timeAgo = formatTimeAgo(new Date(comment.timestamp));
    const isOwnComment = currentUser && comment.authorId === currentUser._id;
    
    // Profile picture or initials
    let avatarContent;
    if (comment.authorProfilePicture) {
        avatarContent = `<div class="comment-avatar" style="background-image: url('${comment.authorProfilePicture}'); background-size: cover; background-position: center;"></div>`;
    } else {
        avatarContent = `<div class="comment-avatar">${initials}</div>`;
    }
    
    return `
        <div class="comment-card">
            ${avatarContent}
            <div class="comment-body">
                <div class="comment-header">
                    <span class="comment-author">${escapeHtml(comment.authorUsername)}</span>
                    <span class="comment-time">${timeAgo}</span>
                    ${isOwnComment ? `
                        <button class="delete-comment-btn" data-comment-id="${comment._id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="comment-text">${escapeHtml(comment.text)}</div>
            </div>
        </div>
    `;
}

async function handleAddComment(tweetId, text) {
    if (!text || text.trim().length === 0) return;
    
    try {
        const response = await fetch(`${API_BASE}/${STUDENT_ID}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ contentId: tweetId, text: text.trim() })
        });
        
        if (response.ok) {
            // Clear input
            const form = document.querySelector(`form[data-tweet-id="${tweetId}"]`);
            if (form) {
                form.querySelector('.comment-input').value = '';
            }
            
            // Update comment count
            const commentBtn = document.querySelector(`button[data-action="comment"][data-tweet-id="${tweetId}"]`);
            if (commentBtn) {
                const countSpan = commentBtn.querySelector('span');
                countSpan.textContent = parseInt(countSpan.textContent) + 1;
            }
            
            // Reload comments
            await loadComments(tweetId);
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to add comment');
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
}

async function handleDeleteComment(commentId, tweetId) {
    if (!confirm('Delete this comment?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/${STUDENT_ID}/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            // Update comment count
            const commentBtn = document.querySelector(`button[data-action="comment"][data-tweet-id="${tweetId}"]`);
            if (commentBtn) {
                const countSpan = commentBtn.querySelector('span');
                countSpan.textContent = Math.max(0, parseInt(countSpan.textContent) - 1);
            }
            
            // Reload comments
            await loadComments(tweetId);
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to delete comment');
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
}

// ===== Followers/Following Modal =====
async function showFollowersModal(type) {
    const modal = document.getElementById('followModal');
    const title = document.getElementById('followModalTitle');
    const body = document.getElementById('followModalBody');
    
    title.textContent = type === 'followers' ? 'Followers' : 'Following';
    body.innerHTML = '<div class="loading">Loading...</div>';
    modal.classList.remove('hidden');
    
    try {
        const response = await fetch(`${API_BASE}/${STUDENT_ID}/follow/${type}/${currentUser._id}`);
        const data = await response.json();
        
        if (response.ok) {
            const users = data[type] || [];
            
            if (users.length === 0) {
                body.innerHTML = `<div class="empty-state">No ${type} yet</div>`;
            } else {
                body.innerHTML = users.map(user => `
                    <div class="user-item clickable" data-user-id="${user._id}" onclick="showUserDetailsModal('${user._id}', '${escapeHtml(user.username)}', '${escapeHtml(user.bio || 'No bio')}', ${user.followerCount || 0}, ${user.followingCount || 0})">
                        <div class="user-avatar">${user.username.substring(0, 2).toUpperCase()}</div>
                        <div class="user-details">
                            <div class="user-name">${escapeHtml(user.username)}</div>
                            <div class="user-bio">${escapeHtml(user.bio || 'No bio')}</div>
                            <div class="user-stats-small">
                                ${user.followerCount || 0} followers · ${user.followingCount || 0} following
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        } else {
            body.innerHTML = '<div class="empty-state">Failed to load users</div>';
        }
    } catch (error) {
        body.innerHTML = '<div class="empty-state">Network error</div>';
    }
}

function closeFollowModal() {
    document.getElementById('followModal').classList.add('hidden');
}

// ===== Edit Profile Modal =====
let selectedProfilePicture = null;

function openEditProfileModal() {
    document.getElementById('editUsername').value = currentUser.username;
    document.getElementById('editBio').value = currentUser.bio || '';
    
    // Reset submit button state
    const submitBtn = document.querySelector('#editProfileForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Save Changes';
    }
    
    // Display current profile picture or initials
    const editAvatar = document.getElementById('editProfileAvatar');
    if (currentUser.profilePictureUrl) {
        editAvatar.style.backgroundImage = `url(${currentUser.profilePictureUrl})`;
        editAvatar.style.backgroundSize = 'cover';
        editAvatar.style.backgroundPosition = 'center';
        editAvatar.textContent = '';
        document.getElementById('removeProfilePicBtn').style.display = 'inline-block';
    } else {
        editAvatar.textContent = currentUser.username.substring(0, 2).toUpperCase();
        editAvatar.style.backgroundImage = 'none';
        document.getElementById('removeProfilePicBtn').style.display = 'none';
    }
    
    selectedProfilePicture = null;
    
    // Setup profile picture input handler
    const profilePicInput = document.getElementById('profilePictureInput');
    profilePicInput.value = '';
    profilePicInput.onchange = handleProfilePictureSelect;
    
    // Setup remove button
    document.getElementById('removeProfilePicBtn').onclick = removeProfilePicture;
    
    document.getElementById('editProfileModal').classList.remove('hidden');
}

function handleProfilePictureSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showAlert('editProfileAlert', 'Image size must be less than 5MB', 'danger');
        return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
        showAlert('editProfileAlert', 'Please select an image file', 'danger');
        return;
    }
    
    // Read and display the image
    const reader = new FileReader();
    reader.onload = function(event) {
        selectedProfilePicture = event.target.result;
        const editAvatar = document.getElementById('editProfileAvatar');
        editAvatar.style.backgroundImage = `url(${selectedProfilePicture})`;
        editAvatar.style.backgroundSize = 'cover';
        editAvatar.style.backgroundPosition = 'center';
        editAvatar.textContent = '';
        document.getElementById('removeProfilePicBtn').style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
}

function removeProfilePicture() {
    selectedProfilePicture = '';
    const editAvatar = document.getElementById('editProfileAvatar');
    editAvatar.style.backgroundImage = 'none';
    editAvatar.textContent = currentUser.username.substring(0, 2).toUpperCase();
    document.getElementById('removeProfilePicBtn').style.display = 'none';
    document.getElementById('profilePictureInput').value = '';
}

function closeEditProfileModal() {
    document.getElementById('editProfileModal').classList.add('hidden');
}

async function handleEditProfile(e) {
    e.preventDefault();
    
    const username = document.getElementById('editUsername').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    // Prevent double submission
    if (submitBtn.disabled) {
        return;
    }
    
    if (!username) {
        showAlert('editProfileAlert', 'Username cannot be empty', 'danger');
        return;
    }
    
    const requestData = { username, bio };
    
    // Include profile picture if changed
    if (selectedProfilePicture !== null) {
        requestData.profilePicture = selectedProfilePicture;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Saving<span class="spinner"></span>';
    
    try {
        const response = await fetch(`${API_BASE}/${STUDENT_ID}/users/${currentUser._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Update currentUser immediately with new values
            currentUser.username = username;
            currentUser.bio = bio;
            if (selectedProfilePicture !== null) {
                currentUser.profilePictureUrl = selectedProfilePicture;
            }
            
            // Also fetch fresh data from server to get follower counts etc
            const userResponse = await fetch(`${API_BASE}/${STUDENT_ID}/users?userId=${currentUser._id}`);
            const userData = await userResponse.json();
            
            if (userResponse.ok && userData.users && userData.users.length > 0) {
                const updatedUser = userData.users.find(u => u._id === currentUser._id);
                if (updatedUser) {
                    Object.assign(currentUser, updatedUser);
                }
            }
            
            // Update UI with new profile picture
            updateUserInfo();
            
            showAlert('editProfileAlert', 'Profile updated successfully!', 'success');
            setTimeout(() => {
                closeEditProfileModal();
                loadUserProfile();
            }, 1000);
        } else {
            showAlert('editProfileAlert', data.error || 'Failed to update profile', 'danger');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    } catch (error) {
        showAlert('editProfileAlert', 'Network error. Please try again.', 'danger');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}
