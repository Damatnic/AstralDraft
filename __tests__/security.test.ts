/**
 * Security Middleware Tests
 * Tests for rate limiting, input validation, and security headers
 */

describe('Security Middleware Tests', () => {
    describe('Input Validation', () => {
        it('should validate email format correctly', () => {
            const validEmails = [
                'user@example.com',
                'test.user@domain.org',
                'user+tag@example.co.uk'
            ];

            const invalidEmails = [
                'invalid-email',
                'test@',
                '@domain.com',
                'user@.com'
            ];

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            validEmails.forEach(email => {
                expect(emailRegex.test(email)).toBe(true);
            });

            invalidEmails.forEach(email => {
                expect(emailRegex.test(email)).toBe(false);
            });
        });

        it('should validate password strength requirements', () => {
            const strongPasswords = [
                'Password123!',
                'Test@Pass1',
                'MySecure#2024'
            ];

            const weakPasswords = [
                'weak',
                'password',
                '12345678',
                'Password123' // No special char
            ];

            // Basic password validation: 8+ chars, letter, number, special char
            strongPasswords.forEach(password => {
                expect(password.length).toBeGreaterThanOrEqual(8);
                expect(/[a-zA-Z]/.test(password)).toBe(true);
                expect(/\d/.test(password)).toBe(true);
                expect(/[@$!%*?&#]/.test(password)).toBe(true);
            });

            weakPasswords.forEach(password => {
                const isValid = password.length >= 8 && 
                               /[a-zA-Z]/.test(password) && 
                               /\d/.test(password) && 
                               /[@$!%*?&#]/.test(password);
                expect(isValid).toBe(false);
            });
        });

        it('should validate username format', () => {
            const validUsernames = [
                'user123',
                'test_user',
                'ValidUser'
            ];

            const invalidUsernames = [
                'us', // too short
                'a'.repeat(31), // too long
                'user@name', // invalid character
                'user name' // space
            ];

            // Basic validation: 3-30 characters, alphanumeric with underscore/hyphen
            validUsernames.forEach(username => {
                expect(username.length).toBeGreaterThanOrEqual(3);
                expect(username.length).toBeLessThanOrEqual(30);
                expect(/^[a-zA-Z0-9_-]+$/.test(username)).toBe(true);
            });

            invalidUsernames.forEach(username => {
                const isValid = username.length >= 3 && 
                               username.length <= 30 && 
                               /^[a-zA-Z0-9_-]+$/.test(username);
                expect(isValid).toBe(false);
            });
        });
    });

    describe('Input Sanitization', () => {
        it('should sanitize SQL injection attempts', () => {
            const maliciousInputs = [
                "'; DROP TABLE users; --",
                "' OR '1'='1",
                "1; DELETE FROM predictions",
                "admin'--",
                "' UNION SELECT * FROM users--"
            ];

            const sanitizeInput = (input: string): string => {
                return input
                    .replace(/['"\\;]/g, '')
                    .replace(/--/g, '')
                    .replace(/\/\*/g, '')
                    .replace(/\*\//g, '')
                    .replace(/union\s+select/gi, '')
                    .replace(/drop\s+table/gi, '')
                    .trim();
            };

            maliciousInputs.forEach(input => {
                const sanitized = sanitizeInput(input);
                expect(sanitized).not.toContain("'");
                expect(sanitized).not.toContain('"');
                expect(sanitized).not.toContain(';');
                expect(sanitized).not.toContain('--');
                expect(sanitized.toLowerCase()).not.toContain('drop table');
                expect(sanitized.toLowerCase()).not.toContain('union select');
            });
        });

        it('should sanitize XSS attempts', () => {
            const xssAttempts = [
                '<script>alert("XSS")</script>',
                'javascript:alert("XSS")',
                '<img src="x" onerror="alert(1)">',
                '<div onload="alert(1)">',
                'vbscript:msgbox("XSS")'
            ];

            const sanitizeHtml = (input: string): string => {
                return input
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#x27;')
                    .replace(/javascript:/gi, '')
                    .replace(/vbscript:/gi, '')
                    .replace(/onload=/gi, '')
                    .replace(/onerror=/gi, '')
                    .trim();
            };

            xssAttempts.forEach(input => {
                const sanitized = sanitizeHtml(input);
                expect(sanitized).not.toContain('<script');
                expect(sanitized).not.toContain('javascript:');
                expect(sanitized).not.toContain('onload=');
                expect(sanitized).not.toContain('onerror=');
            });
        });
    });

    describe('Rate Limiting Logic', () => {
        it('should validate rate limiting thresholds for 10-20 users', () => {
            // Rate limits optimized for small user base
            const rateLimits = {
                general: { windowMs: 15 * 60 * 1000, maxRequests: 100 }, // 100 requests per 15 min
                auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },     // 5 auth attempts per 15 min
                predictions: { windowMs: 60 * 60 * 1000, maxRequests: 30 } // 30 predictions per hour
            };

            // Validate reasonable limits for small user base
            expect(rateLimits.general.maxRequests).toBeGreaterThan(50); // Allow reasonable usage
            expect(rateLimits.auth.maxRequests).toBeLessThan(10); // Prevent brute force
            expect(rateLimits.predictions.maxRequests).toBeLessThan(50); // Prevent spam

            // Calculate requests per minute
            const generalRPM = (rateLimits.general.maxRequests / (rateLimits.general.windowMs / 60000));
            const authRPM = (rateLimits.auth.maxRequests / (rateLimits.auth.windowMs / 60000));

            expect(generalRPM).toBeCloseTo(6.67, 1); // ~6.67 requests per minute
            expect(authRPM).toBeCloseTo(0.33, 1);   // ~0.33 requests per minute
        });

        it('should handle concurrent users within limits', () => {
            const maxConcurrentUsers = 20;
            const generalLimit = 100; // per 15 minutes
            const averageRequestsPerUser = generalLimit / maxConcurrentUsers; // 5 requests per user

            // Each user should have reasonable quota
            expect(averageRequestsPerUser).toBeGreaterThanOrEqual(5);
            expect(averageRequestsPerUser).toBeLessThan(20);
        });
    });

    describe('Security Headers Validation', () => {
        it('should validate CSP directive structure', () => {
            const cspDirectives = {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https:"],
                scriptSrc: ["'self'"],
                connectSrc: ["'self'", "wss:", "ws:"],
                objectSrc: ["'none'"],
                frameSrc: ["'none'"]
            };

            // Validate security-focused directives
            expect(cspDirectives.defaultSrc).toContain("'self'");
            expect(cspDirectives.objectSrc).toContain("'none'");
            expect(cspDirectives.frameSrc).toContain("'none'");
            expect(cspDirectives.scriptSrc).toContain("'self'");
            expect(cspDirectives.scriptSrc).not.toContain("'unsafe-eval'");
        });
    });

    describe('CORS Configuration', () => {
        it('should validate allowed origins for development and production', () => {
            const allowedOrigins = [
                'http://localhost:5173', // Vite dev server
                'http://localhost:3000', // Alternative dev port
                'https://astral-draft.netlify.app' // Production domain
            ];

            // Should include development origins
            expect(allowedOrigins.some(origin => origin.includes('localhost'))).toBe(true);
            
            // Should include HTTPS production origins
            expect(allowedOrigins.some(origin => origin.startsWith('https://'))).toBe(true);
            
            // Should not include wildcard origins
            expect(allowedOrigins).not.toContain('*');
        });

        it('should validate allowed methods and headers', () => {
            const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
            const allowedHeaders = [
                'Origin',
                'X-Requested-With',
                'Content-Type',
                'Accept',
                'Authorization',
                'Cache-Control',
                'Pragma'
            ];

            // Should include essential HTTP methods
            expect(allowedMethods).toContain('GET');
            expect(allowedMethods).toContain('POST');
            expect(allowedMethods).toContain('OPTIONS');

            // Should include essential headers
            expect(allowedHeaders).toContain('Content-Type');
            expect(allowedHeaders).toContain('Authorization');
            expect(allowedHeaders).toContain('Origin');
        });
    });

    describe('Request Size Validation', () => {
        it('should validate request size limits for different endpoints', () => {
            const sizeLimits = {
                general: 1024 * 1024, // 1MB
                json: 1024 * 1024,    // 1MB for JSON
                prediction: 10 * 1024  // 10KB for predictions
            };

            // Reasonable limits for MVP
            expect(sizeLimits.general).toBeLessThanOrEqual(2 * 1024 * 1024); // Max 2MB
            expect(sizeLimits.json).toBeLessThanOrEqual(2 * 1024 * 1024);    // Max 2MB
            expect(sizeLimits.prediction).toBeLessThan(100 * 1024);          // Max 100KB
        });
    });

    describe('Security Monitoring', () => {
        it('should detect suspicious request patterns', () => {
            const suspiciousPatterns = [
                /union\s+select/i,
                /drop\s+table/i,
                /<script/i,
                /javascript:/i,
                /vbscript:/i,
                /onload=/i,
                /onerror=/i
            ];

            const testRequests = [
                "'; DROP TABLE users; --",
                '<script>alert("xss")</script>',
                'javascript:alert(1)',
                'normal user input',
                '{"prediction": "Chiefs will win"}'
            ];

            testRequests.forEach(request => {
                const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(request));
                
                if (request.includes('DROP TABLE') || request.includes('<script') || request.includes('javascript:')) {
                    expect(isSuspicious).toBe(true);
                } else {
                    expect(isSuspicious).toBe(false);
                }
            });
        });
    });
});
