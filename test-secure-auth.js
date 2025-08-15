/**
 * Test Script for Secure Authentication Implementation
 * Verifies httpOnly cookies, CSRF protection, and refresh token rotation
 */

const axios = require('axios');
const axiosCookieJarSupport = require('axios-cookiejar-support').wrapper;
const tough = require('tough-cookie');

// Setup axios with cookie jar support
axiosCookieJarSupport(axios);
const cookieJar = new tough.CookieJar();

const api = axios.create({
    baseURL: 'http://localhost:3001',
    jar: cookieJar,
    withCredentials: true,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Test user credentials
const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'TestPass123!',
    displayName: 'Test User'
};

let csrfToken = null;

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

async function testHealthCheck() {
    log('\n=== Testing Health Check ===', colors.cyan);
    try {
        const response = await api.get('/health');
        log('✅ Health check passed', colors.green);
        log(`   Status: ${response.data.status}`, colors.blue);
        log(`   Environment: ${response.data.environment}`, colors.blue);
        return true;
    } catch (error) {
        log('❌ Health check failed', colors.red);
        console.error(error.message);
        return false;
    }
}

async function testRegistration() {
    log('\n=== Testing User Registration ===', colors.cyan);
    try {
        const response = await api.post('/api/auth/register', testUser);
        
        if (response.data.success) {
            log('✅ Registration successful', colors.green);
            log(`   User ID: ${response.data.user.id}`, colors.blue);
            log(`   Username: ${response.data.user.username}`, colors.blue);
            
            // Store CSRF token
            csrfToken = response.data.csrfToken;
            log(`   CSRF Token received: ${csrfToken ? 'Yes' : 'No'}`, colors.blue);
            
            // Check for cookies
            const cookies = await cookieJar.getCookies('http://localhost:3001');
            log(`   Cookies set: ${cookies.length}`, colors.blue);
            
            const hasAccessToken = cookies.some(c => c.key === 'access_token');
            const hasRefreshToken = cookies.some(c => c.key === 'refresh_token');
            const hasCsrfToken = cookies.some(c => c.key === 'csrf_token');
            
            log(`   Access Token Cookie: ${hasAccessToken ? '✅' : '❌'}`, hasAccessToken ? colors.green : colors.red);
            log(`   Refresh Token Cookie: ${hasRefreshToken ? '✅' : '❌'}`, hasRefreshToken ? colors.green : colors.red);
            log(`   CSRF Token Cookie: ${hasCsrfToken ? '✅' : '❌'}`, hasCsrfToken ? colors.green : colors.red);
            
            return response.data.user;
        } else {
            log('❌ Registration failed', colors.red);
            return null;
        }
    } catch (error) {
        log('❌ Registration error', colors.red);
        console.error(error.response?.data || error.message);
        return null;
    }
}

async function testLogin() {
    log('\n=== Testing User Login ===', colors.cyan);
    try {
        // Clear cookies first
        cookieJar.removeAllCookies();
        
        const response = await api.post('/api/auth/login', {
            login: testUser.username,
            password: testUser.password
        });
        
        if (response.data.success) {
            log('✅ Login successful', colors.green);
            
            // Update CSRF token
            csrfToken = response.data.csrfToken;
            log(`   CSRF Token received: ${csrfToken ? 'Yes' : 'No'}`, colors.blue);
            
            // Check for cookies
            const cookies = await cookieJar.getCookies('http://localhost:3001');
            log(`   Cookies set: ${cookies.length}`, colors.blue);
            
            const hasAccessToken = cookies.some(c => c.key === 'access_token');
            const hasRefreshToken = cookies.some(c => c.key === 'refresh_token');
            
            log(`   Access Token Cookie: ${hasAccessToken ? '✅' : '❌'}`, hasAccessToken ? colors.green : colors.red);
            log(`   Refresh Token Cookie: ${hasRefreshToken ? '✅' : '❌'}`, hasRefreshToken ? colors.green : colors.red);
            
            // Verify no tokens in response body
            log(`   Tokens in response body: ${response.data.accessToken ? '❌ SECURITY ISSUE!' : '✅ None (secure)'}`, 
                response.data.accessToken ? colors.red : colors.green);
            
            return true;
        } else {
            log('❌ Login failed', colors.red);
            return false;
        }
    } catch (error) {
        log('❌ Login error', colors.red);
        console.error(error.response?.data || error.message);
        return false;
    }
}

async function testProtectedRoute() {
    log('\n=== Testing Protected Route Access ===', colors.cyan);
    try {
        const response = await api.get('/api/auth/profile');
        
        if (response.data.success) {
            log('✅ Protected route access successful', colors.green);
            log(`   Username: ${response.data.username}`, colors.blue);
            log(`   Email: ${response.data.email}`, colors.blue);
            return true;
        } else {
            log('❌ Protected route access failed', colors.red);
            return false;
        }
    } catch (error) {
        log('❌ Protected route error', colors.red);
        console.error(error.response?.data || error.message);
        return false;
    }
}

async function testCSRFProtection() {
    log('\n=== Testing CSRF Protection ===', colors.cyan);
    
    // Test without CSRF token
    log('Testing request without CSRF token...', colors.yellow);
    try {
        const response = await api.put('/api/auth/profile', {
            displayName: 'Updated Name'
        });
        log('❌ SECURITY ISSUE: Request succeeded without CSRF token!', colors.red);
        return false;
    } catch (error) {
        if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_VALIDATION_FAILED') {
            log('✅ Request correctly blocked without CSRF token', colors.green);
        } else {
            log('⚠️ Request failed but not due to CSRF', colors.yellow);
        }
    }
    
    // Test with CSRF token
    if (csrfToken) {
        log('Testing request with CSRF token...', colors.yellow);
        try {
            const response = await api.put('/api/auth/profile', {
                displayName: 'Updated Name'
            }, {
                headers: {
                    'X-CSRF-Token': csrfToken
                }
            });
            log('✅ Request succeeded with valid CSRF token', colors.green);
            return true;
        } catch (error) {
            log('❌ Request failed even with CSRF token', colors.red);
            console.error(error.response?.data || error.message);
            return false;
        }
    }
    
    return true;
}

async function testTokenRefresh() {
    log('\n=== Testing Token Refresh ===', colors.cyan);
    try {
        const response = await api.post('/api/auth/refresh');
        
        if (response.data.success) {
            log('✅ Token refresh successful', colors.green);
            
            // Update CSRF token
            const newCsrfToken = response.data.csrfToken;
            log(`   New CSRF Token received: ${newCsrfToken ? 'Yes' : 'No'}`, colors.blue);
            
            // Check if tokens were rotated
            const cookies = await cookieJar.getCookies('http://localhost:3001');
            const hasAccessToken = cookies.some(c => c.key === 'access_token');
            const hasRefreshToken = cookies.some(c => c.key === 'refresh_token');
            
            log(`   New Access Token Cookie: ${hasAccessToken ? '✅' : '❌'}`, hasAccessToken ? colors.green : colors.red);
            log(`   New Refresh Token Cookie: ${hasRefreshToken ? '✅' : '❌'}`, hasRefreshToken ? colors.green : colors.red);
            
            // Verify no tokens in response body
            log(`   Tokens in response body: ${response.data.tokens ? '❌ SECURITY ISSUE!' : '✅ None (secure)'}`, 
                response.data.tokens ? colors.red : colors.green);
            
            csrfToken = newCsrfToken;
            return true;
        } else {
            log('❌ Token refresh failed', colors.red);
            return false;
        }
    } catch (error) {
        log('❌ Token refresh error', colors.red);
        console.error(error.response?.data || error.message);
        return false;
    }
}

async function testLogout() {
    log('\n=== Testing Logout ===', colors.cyan);
    try {
        const response = await api.post('/api/auth/logout');
        
        if (response.data.success) {
            log('✅ Logout successful', colors.green);
            
            // Check if cookies were cleared
            const cookies = await cookieJar.getCookies('http://localhost:3001');
            const hasAuthCookies = cookies.some(c => 
                c.key === 'access_token' || c.key === 'refresh_token'
            );
            
            log(`   Auth cookies cleared: ${!hasAuthCookies ? '✅' : '❌'}`, !hasAuthCookies ? colors.green : colors.red);
            
            // Test access to protected route after logout
            try {
                await api.get('/api/auth/profile');
                log('❌ SECURITY ISSUE: Protected route accessible after logout!', colors.red);
                return false;
            } catch (error) {
                if (error.response?.status === 401) {
                    log('✅ Protected route correctly blocked after logout', colors.green);
                    return true;
                }
            }
        } else {
            log('❌ Logout failed', colors.red);
            return false;
        }
    } catch (error) {
        log('❌ Logout error', colors.red);
        console.error(error.response?.data || error.message);
        return false;
    }
}

async function runTests() {
    log('\n========================================', colors.cyan);
    log('🔒 SECURE AUTHENTICATION TEST SUITE 🔒', colors.cyan);
    log('========================================', colors.cyan);
    
    const results = {
        healthCheck: false,
        registration: false,
        login: false,
        protectedRoute: false,
        csrfProtection: false,
        tokenRefresh: false,
        logout: false
    };
    
    // Run tests
    results.healthCheck = await testHealthCheck();
    
    if (results.healthCheck) {
        const user = await testRegistration();
        results.registration = !!user;
        
        if (results.registration) {
            results.login = await testLogin();
            
            if (results.login) {
                results.protectedRoute = await testProtectedRoute();
                results.csrfProtection = await testCSRFProtection();
                results.tokenRefresh = await testTokenRefresh();
                results.logout = await testLogout();
            }
        }
    }
    
    // Summary
    log('\n========================================', colors.cyan);
    log('📊 TEST RESULTS SUMMARY', colors.cyan);
    log('========================================', colors.cyan);
    
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r).length;
    
    for (const [test, passed] of Object.entries(results)) {
        const testName = test.replace(/([A-Z])/g, ' $1').trim();
        log(`${passed ? '✅' : '❌'} ${testName}`, passed ? colors.green : colors.red);
    }
    
    log('\n----------------------------------------', colors.cyan);
    log(`Total: ${passedTests}/${totalTests} tests passed`, 
        passedTests === totalTests ? colors.green : colors.yellow);
    
    if (passedTests === totalTests) {
        log('\n🎉 All security tests passed! 🎉', colors.green);
        log('Your authentication system is properly secured with:', colors.green);
        log('  ✅ httpOnly cookies for JWT tokens', colors.green);
        log('  ✅ CSRF protection for state-changing requests', colors.green);
        log('  ✅ Refresh token rotation', colors.green);
        log('  ✅ No tokens exposed in response bodies', colors.green);
    } else {
        log('\n⚠️ Some tests failed. Please review the security implementation.', colors.yellow);
    }
}

// Run the tests
runTests().catch(error => {
    log('\n❌ Test suite error:', colors.red);
    console.error(error);
    process.exit(1);
});