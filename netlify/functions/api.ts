/**
 * Main API Handler for Netlify Functions
 * Serverless backend using Neon PostgreSQL
 */

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

// Database connection
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_f4RsDM1onJAq@ep-red-glitter-aea4mz96-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DATABASE_URL);

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'astral-draft-secret-change-in-production';
const JWT_EXPIRES_IN = '15m';
const JWT_REFRESH_EXPIRES_IN = '30d';

// CORS headers for Netlify Functions
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
};

// Helper function to parse JSON body
const parseBody = (body: string | null) => {
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    return {};
  }
};

// Helper function to generate tokens
const generateTokens = (userId: number, email: string, username: string) => {
  const payload = { userId, email, username };
  
  const accessToken = jwt.sign(
    { ...payload, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  
  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
  
  return { accessToken, refreshToken };
};

// Helper function to verify token
const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Extract token from Authorization header
const extractToken = (event: HandlerEvent): string | null => {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

// Main handler function
export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const path = event.path.replace('/.netlify/functions/api', '');
  const method = event.httpMethod;
  const body = parseBody(event.body);

  try {
    // Route: POST /auth/register
    if (path === '/auth/register' && method === 'POST') {
      const { email, username, password } = body;
      
      if (!email || !username || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email, username, and password are required' })
        };
      }

      // Check if user exists
      const existingUser = await sql`
        SELECT id FROM users 
        WHERE email = ${email} OR username = ${username}
      `;

      if (existingUser.length > 0) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'User already exists' })
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const [newUser] = await sql`
        INSERT INTO users (email, username, password_hash)
        VALUES (${email}, ${username}, ${passwordHash})
        RETURNING id, email, username, created_at
      `;

      // Generate tokens
      const tokens = generateTokens(newUser.id, newUser.email, newUser.username);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          user: {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            createdAt: newUser.created_at
          },
          ...tokens
        })
      };
    }

    // Route: POST /auth/login
    if (path === '/auth/login' && method === 'POST') {
      const { email, password } = body;
      
      if (!email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email and password are required' })
        };
      }

      // Find user
      const [user] = await sql`
        SELECT id, email, username, password_hash, account_locked
        FROM users 
        WHERE email = ${email}
      `;

      if (!user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid credentials' })
        };
      }

      if (user.account_locked) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Account is locked' })
        };
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid credentials' })
        };
      }

      // Update last login
      await sql`
        UPDATE users 
        SET last_login = NOW(), login_count = login_count + 1
        WHERE id = ${user.id}
      `;

      // Generate tokens
      const tokens = generateTokens(user.id, user.email, user.username);

      // Store session
      const tokenHash = createHash('sha256').update(tokens.accessToken).digest('hex');
      const refreshTokenHash = createHash('sha256').update(tokens.refreshToken).digest('hex');
      
      await sql`
        INSERT INTO user_sessions (user_id, token_hash, refresh_token_hash, expires_at)
        VALUES (${user.id}, ${tokenHash}, ${refreshTokenHash}, NOW() + INTERVAL '30 days')
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          user: {
            id: user.id,
            email: user.email,
            username: user.username
          },
          ...tokens
        })
      };
    }

    // Route: GET /auth/me (Protected)
    if (path === '/auth/me' && method === 'GET') {
      const token = extractToken(event);
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'No token provided' })
        };
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid token' })
        };
      }

      // Get user details
      const [user] = await sql`
        SELECT id, email, username, avatar_url, bio, created_at
        FROM users 
        WHERE id = ${decoded.userId}
      `;

      if (!user) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'User not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ user })
      };
    }

    // Route: POST /auth/refresh
    if (path === '/auth/refresh' && method === 'POST') {
      const { refreshToken } = body;
      
      if (!refreshToken) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Refresh token required' })
        };
      }

      const decoded = verifyToken(refreshToken);
      if (!decoded || decoded.type !== 'refresh') {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid refresh token' })
        };
      }

      // Check if refresh token exists in database
      const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex');
      const [session] = await sql`
        SELECT user_id, is_revoked
        FROM user_sessions
        WHERE refresh_token_hash = ${refreshTokenHash}
        AND expires_at > NOW()
      `;

      if (!session || session.is_revoked) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Refresh token revoked or expired' })
        };
      }

      // Generate new tokens
      const tokens = generateTokens(decoded.userId, decoded.email, decoded.username);

      // Update session with new tokens
      const newTokenHash = createHash('sha256').update(tokens.accessToken).digest('hex');
      const newRefreshTokenHash = createHash('sha256').update(tokens.refreshToken).digest('hex');
      
      await sql`
        UPDATE user_sessions
        SET token_hash = ${newTokenHash}, 
            refresh_token_hash = ${newRefreshTokenHash},
            parent_token = ${refreshTokenHash}
        WHERE refresh_token_hash = ${refreshTokenHash}
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(tokens)
      };
    }

    // Route: POST /auth/logout
    if (path === '/auth/logout' && method === 'POST') {
      const token = extractToken(event);
      
      if (token) {
        const tokenHash = createHash('sha256').update(token).digest('hex');
        await sql`
          UPDATE user_sessions
          SET is_revoked = true, revoked_at = NOW()
          WHERE token_hash = ${tokenHash}
        `;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Logged out successfully' })
      };
    }

    // Route: GET /leagues (Protected)
    if (path === '/leagues' && method === 'GET') {
      const token = extractToken(event);
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Authentication required' })
        };
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid token' })
        };
      }

      // Get user's leagues
      const leagues = await sql`
        SELECT l.*, t.name as team_name
        FROM leagues l
        LEFT JOIN teams t ON t.league_id = l.id AND t.owner_id = ${decoded.userId}
        WHERE l.id IN (
          SELECT league_id FROM teams WHERE owner_id = ${decoded.userId}
        )
        OR l.commissioner_id = ${decoded.userId}
        ORDER BY l.created_at DESC
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ leagues })
      };
    }

    // Route: POST /leagues (Protected)
    if (path === '/leagues' && method === 'POST') {
      const token = extractToken(event);
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Authentication required' })
        };
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid token' })
        };
      }

      const { name, settings, scoring_system, season_year } = body;

      if (!name || !season_year) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'League name and season year are required' })
        };
      }

      // Create league
      const [league] = await sql`
        INSERT INTO leagues (name, commissioner_id, settings, scoring_system, season_year)
        VALUES (${name}, ${decoded.userId}, ${JSON.stringify(settings || {})}, 
                ${JSON.stringify(scoring_system || {})}, ${season_year})
        RETURNING *
      `;

      // Create commissioner's team
      await sql`
        INSERT INTO teams (league_id, owner_id, name)
        VALUES (${league.id}, ${decoded.userId}, ${decoded.username + "'s Team"})
      `;

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ league })
      };
    }

    // Default 404 response
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Route not found' })
    };

  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};