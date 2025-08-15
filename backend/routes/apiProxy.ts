/**
 * API Proxy Routes
 * Secure backend proxy endpoints for external API calls
 * Keeps API keys on the server side only
 */

import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// Environment variables (API keys stored securely on backend)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const SPORTSIO_API_KEY = process.env.SPORTSIO_API_KEY || '';
const ESPN_API_KEY = process.env.ESPN_API_KEY || '';
const ODDS_API_KEY = process.env.ODDS_API_KEY || '';
const NFL_API_KEY = process.env.NFL_API_KEY || '';

// Validate API keys on startup
const validateApiKeys = () => {
  const missingKeys = [];
  if (!GEMINI_API_KEY) missingKeys.push('GEMINI_API_KEY');
  if (!SPORTSIO_API_KEY) missingKeys.push('SPORTSIO_API_KEY');
  
  if (missingKeys.length > 0) {
    console.warn(`⚠️ Missing API keys: ${missingKeys.join(', ')}`);
    console.warn('Some features may not work properly. Please configure API keys in environment variables.');
  } else {
    console.log('✅ All API keys configured successfully');
  }
};

validateApiKeys();

// Initialize Gemini AI client
let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// Rate limiting middleware
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const rateLimit = (limit: number = 100, windowMs: number = 60000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    const clientData = rateLimitMap.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (clientData.count >= limit) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }
    
    clientData.count++;
    next();
  };
};

/**
 * Gemini AI Proxy Endpoints
 */
router.post('/gemini/generate', rateLimit(50, 60000), async (req: Request, res: Response) => {
  try {
    if (!genAI) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Gemini API is not configured. Please contact support.'
      });
    }

    const { prompt, model = 'gemini-pro', config = {} } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Prompt is required'
      });
    }

    // Generate content using Gemini
    const genModel = genAI.getGenerativeModel({ model });
    const result = await genModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      success: true,
      data: {
        text,
        model,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate content'
    });
  }
});

router.post('/gemini/stream', rateLimit(30, 60000), async (req: Request, res: Response) => {
  try {
    if (!genAI) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Gemini API is not configured'
      });
    }

    const { prompt, model = 'gemini-pro', history = [] } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Prompt is required'
      });
    }

    // Set up SSE (Server-Sent Events) for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const genModel = genAI.getGenerativeModel({ model });
    
    // Start chat session with history
    const chat = genModel.startChat({
      history: history.map((msg: any) => ({
        role: msg.role,
        parts: msg.parts
      })),
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });

    // Stream the response
    const result = await chat.sendMessageStream(prompt);
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Gemini streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    res.end();
  }
});

/**
 * Sports Data API Proxy Endpoints
 */
router.get('/sports/nfl/games', rateLimit(100, 60000), async (req: Request, res: Response) => {
  try {
    const { week, season = new Date().getFullYear() } = req.query;
    
    // ESPN API endpoint (public, no key required for basic data)
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`;
    
    const response = await axios.get(url, {
      params: { week, season },
      headers: {
        'User-Agent': 'AstralDraft/1.0'
      }
    });

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('ESPN API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch NFL games'
    });
  }
});

router.get('/sports/nfl/players/:playerId', rateLimit(100, 60000), async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    
    // ESPN API endpoint for player data
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/athletes/${playerId}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'AstralDraft/1.0'
      }
    });

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('ESPN API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch player data'
    });
  }
});

router.get('/sports/odds', rateLimit(50, 60000), async (req: Request, res: Response) => {
  try {
    if (!ODDS_API_KEY) {
      // Return mock odds if API key not configured
      return res.json({
        success: true,
        data: {
          games: [],
          message: 'Odds data unavailable - API key not configured'
        }
      });
    }

    const url = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds';
    
    const response = await axios.get(url, {
      params: {
        apiKey: ODDS_API_KEY,
        regions: 'us',
        markets: 'h2h,spreads,totals',
        oddsFormat: 'american'
      }
    });

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Odds API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch odds data'
    });
  }
});

/**
 * Sports.io API Proxy (if configured)
 */
router.post('/sports/sportsio', rateLimit(50, 60000), async (req: Request, res: Response) => {
  try {
    if (!SPORTSIO_API_KEY) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Sports.io API is not configured'
      });
    }

    const { endpoint, params = {} } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Endpoint is required'
      });
    }

    const url = `https://api.sportsdata.io/v3/nfl/${endpoint}`;
    
    const response = await axios.get(url, {
      params: {
        key: SPORTSIO_API_KEY,
        ...params
      }
    });

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Sports.io API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch sports data'
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  const apiStatus = {
    gemini: !!GEMINI_API_KEY,
    sportsio: !!SPORTSIO_API_KEY,
    espn: true, // ESPN API is public
    odds: !!ODDS_API_KEY,
    nfl: !!NFL_API_KEY
  };

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    apis: apiStatus,
    message: 'API proxy service is running'
  });
});

export default router;