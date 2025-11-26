// API Testing Script for Social Networking Website
// Run this after starting the server to test all endpoints

const API_BASE = 'http://localhost:3000';
const STUDENT_ID = 'STUDENTID'; // Replace with your actual student ID

let authToken = '';
let userId = '';
let secondUserId = '';
let postId = '';

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, requiresAuth = false) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (requiresAuth && authToken) {
        options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE}/${STUDENT_ID}${endpoint}`, options);
        const result = await response.json();
        return { status: response.status, data: result };
    } catch (error) {
        return { status: 'error', data: error.message };
    }
}

// Test Suite
async function runTests() {
    console.log('🧪 Starting API Tests...\n');

    // 1. Register First User
    console.log('1️⃣ Testing User Registration (First User)...');
    const registerResult = await apiCall('POST', '/users', {
        username: 'testuser1',
        email: 'test1@example.com',
        password: 'password123',
        bio: 'Hello, I am test user 1!'
    });
    console.log('Status:', registerResult.status);
    console.log('Response:', registerResult.data);
    if (registerResult.data.user) {
        userId = registerResult.data.user._id;
    }
    console.log('\n---\n');

    // 2. Register Second User
    console.log('2️⃣ Testing User Registration (Second User)...');
    const register2Result = await apiCall('POST', '/users', {
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'password123',
        bio: 'Hello, I am test user 2!'
    });
    console.log('Status:', register2Result.status);
    console.log('Response:', register2Result.data);
    if (register2Result.data.user) {
        secondUserId = register2Result.data.user._id;
    }
    console.log('\n---\n');

    // 3. Login
    console.log('3️⃣ Testing User Login...');
    const loginResult = await apiCall('POST', '/login', {
        username: 'testuser1',
        password: 'password123'
    });
    console.log('Status:', loginResult.status);
    console.log('Response:', loginResult.data);
    if (loginResult.data.token) {
        authToken = loginResult.data.token;
    }
    console.log('\n---\n');

    // 4. Check Login Status
    console.log('4️⃣ Testing Login Status Check...');
    const statusResult = await apiCall('GET', '/login', null, true);
    console.log('Status:', statusResult.status);
    console.log('Response:', statusResult.data);
    console.log('\n---\n');

    // 5. Get All Users
    console.log('5️⃣ Testing Get All Users...');
    const usersResult = await apiCall('GET', '/users');
    console.log('Status:', usersResult.status);
    console.log('Response:', usersResult.data);
    console.log('\n---\n');

    // 6. Search Users
    console.log('6️⃣ Testing User Search...');
    const searchResult = await apiCall('GET', '/users?search=testuser');
    console.log('Status:', searchResult.status);
    console.log('Response:', searchResult.data);
    console.log('\n---\n');

    // 7. Create a Post
    console.log('7️⃣ Testing Create Post...');
    const postResult = await apiCall('POST', '/contents', {
        text: 'This is my first post! Testing the API.'
    }, true);
    console.log('Status:', postResult.status);
    console.log('Response:', postResult.data);
    if (postResult.data.content) {
        postId = postResult.data.content._id;
    }
    console.log('\n---\n');

    // 8. Get All Posts
    console.log('8️⃣ Testing Get All Posts...');
    const postsResult = await apiCall('GET', '/contents');
    console.log('Status:', postsResult.status);
    console.log('Response:', postsResult.data);
    console.log('\n---\n');

    // 9. Follow a User
    console.log('9️⃣ Testing Follow User...');
    const followResult = await apiCall('POST', '/follow', {
        followingId: secondUserId
    }, true);
    console.log('Status:', followResult.status);
    console.log('Response:', followResult.data);
    console.log('\n---\n');

    // 10. Get Feed (should be empty since testuser2 hasn't posted)
    console.log('🔟 Testing Get Feed...');
    const feedResult = await apiCall('GET', '/feed', null, true);
    console.log('Status:', feedResult.status);
    console.log('Response:', feedResult.data);
    console.log('\n---\n');

    // 11. Like a Post
    console.log('1️⃣1️⃣ Testing Like Post...');
    const likeResult = await apiCall('POST', '/contents/like', {
        contentId: postId
    }, true);
    console.log('Status:', likeResult.status);
    console.log('Response:', likeResult.data);
    console.log('\n---\n');

    // 12. Unfollow a User
    console.log('1️⃣2️⃣ Testing Unfollow User...');
    const unfollowResult = await apiCall('DELETE', '/follow', {
        followingId: secondUserId
    }, true);
    console.log('Status:', unfollowResult.status);
    console.log('Response:', unfollowResult.data);
    console.log('\n---\n');

    // 13. Logout
    console.log('1️⃣3️⃣ Testing Logout...');
    const logoutResult = await apiCall('DELETE', '/login', null, true);
    console.log('Status:', logoutResult.status);
    console.log('Response:', logoutResult.data);
    console.log('\n---\n');

    console.log('✅ All tests completed!');
}

// Run tests when this file is executed
if (typeof window !== 'undefined') {
    // Running in browser
    window.runAPITests = runTests;
    console.log('Run window.runAPITests() to start testing');
} else {
    // Running in Node.js
    runTests();
}
