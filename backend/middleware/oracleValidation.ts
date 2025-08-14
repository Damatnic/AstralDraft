/**
 * Oracle API Input Validation Middleware
 * Comprehensive validation for all Oracle prediction endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';

// Types for validation
interface ValidationError {
    field: string;
    message: string;
    value?: any;
}

/**
 * Handle validation errors consistently
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const formattedErrors: ValidationError[] = errors.array().map(error => ({
            field: (error as any).path || (error as any).param || 'unknown',
            message: error.msg,
            value: (error as any).value
        }));
        
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: formattedErrors,
            timestamp: new Date().toISOString()
        });
    }
    
    next();
};

/**
 * Validation for creating Oracle predictions
 */
export const validateCreatePrediction = [
    body('week')
        .isInt({ min: 1, max: 18 })
        .withMessage('Week must be an integer between 1 and 18'),
    
    body('season')
        .optional()
        .isInt({ min: 2020, max: 2030 })
        .withMessage('Season must be between 2020 and 2030'),
    
    body('type')
        .isIn(['GAME_OUTCOME', 'PLAYER_PERFORMANCE', 'TEAM_STAT', 'PROP_BET', 'SEASON_LONG'])
        .withMessage('Type must be a valid prediction type'),
    
    body('question')
        .isLength({ min: 10, max: 500 })
        .withMessage('Question must be between 10 and 500 characters')
        .trim()
        .escape(),
    
    body('options')
        .isArray({ min: 2, max: 10 })
        .withMessage('Options must be an array with 2-10 items'),
    
    body('options.*.id')
        .isInt({ min: 0 })
        .withMessage('Option ID must be a non-negative integer'),
    
    body('options.*.text')
        .isLength({ min: 1, max: 200 })
        .withMessage('Option text must be between 1 and 200 characters')
        .trim()
        .escape(),
    
    body('options.*.probability')
        .isFloat({ min: 0, max: 1 })
        .withMessage('Probability must be between 0 and 1'),
    
    body('options.*.supportingData')
        .isArray()
        .withMessage('Supporting data must be an array'),
    
    body('oracleChoice')
        .isInt({ min: 0 })
        .withMessage('Oracle choice must be a non-negative integer'),
    
    body('confidence')
        .isInt({ min: 1, max: 100 })
        .withMessage('Confidence must be between 1 and 100'),
    
    body('reasoning')
        .isLength({ min: 10, max: 1000 })
        .withMessage('Reasoning must be between 10 and 1000 characters')
        .trim()
        .escape(),
    
    body('dataPoints')
        .isArray()
        .withMessage('Data points must be an array'),
    
    body('dataPoints.*')
        .isLength({ min: 1, max: 500 })
        .withMessage('Each data point must be between 1 and 500 characters')
        .trim()
        .escape(),
    
    // Custom validation for options consistency
    body().custom((value) => {
        const { options, oracleChoice } = value;
        if (options && Array.isArray(options)) {
            const optionIds = options.map((opt: any) => opt.id);
            if (!optionIds.includes(oracleChoice)) {
                throw new Error('Oracle choice must match one of the option IDs');
            }
            
            // Check probability sum
            const probabilitySum = options.reduce((sum: number, opt: any) => sum + (opt.probability || 0), 0);
            if (Math.abs(probabilitySum - 1) > 0.01) {
                throw new Error('Option probabilities must sum to approximately 1.0');
            }
        }
        return true;
    }),
    
    handleValidationErrors
];

/**
 * Validation for submitting user predictions
 */
export const validateSubmitPrediction = [
    param('id')
        .isUUID()
        .withMessage('Prediction ID must be a valid UUID'),
    
    body('userChoice')
        .isInt({ min: 0 })
        .withMessage('User choice must be a non-negative integer'),
    
    body('confidence')
        .isInt({ min: 1, max: 100 })
        .withMessage('Confidence must be between 1 and 100'),
    
    body('reasoning')
        .optional()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Reasoning must be between 1 and 1000 characters')
        .trim()
        .escape(),
    
    handleValidationErrors
];

/**
 * Validation for resolving predictions
 */
export const validateResolvePrediction = [
    param('id')
        .isUUID()
        .withMessage('Prediction ID must be a valid UUID'),
    
    body('actualResult')
        .isInt({ min: 0 })
        .withMessage('Actual result must be a non-negative integer'),
    
    body('resolution')
        .optional()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Resolution details must be between 1 and 1000 characters')
        .trim()
        .escape(),
    
    handleValidationErrors
];

/**
 * Validation for production predictions query
 */
export const validateProductionQuery = [
    query('week')
        .optional()
        .isInt({ min: 1, max: 18 })
        .withMessage('Week must be between 1 and 18'),
    
    query('season')
        .optional()
        .isInt({ min: 2020, max: 2030 })
        .withMessage('Season must be between 2020 and 2030'),
    
    query('type')
        .optional()
        .isIn(['GAME_OUTCOME', 'PLAYER_PERFORMANCE', 'TEAM_STAT', 'PROP_BET', 'SEASON_LONG'])
        .withMessage('Type must be a valid prediction type'),
    
    query('status')
        .optional()
        .isIn(['open', 'closed', 'resolved', 'cancelled'])
        .withMessage('Status must be open, closed, resolved, or cancelled'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    
    handleValidationErrors
];

/**
 * Validation for analytics report generation
 */
export const validateAnalyticsReport = [
    body('startDate')
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),
    
    body('endDate')
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date'),
    
    body('metrics')
        .isArray({ min: 1 })
        .withMessage('Metrics must be a non-empty array'),
    
    body('metrics.*')
        .isIn(['accuracy', 'confidence', 'calibration', 'volume', 'roi', 'streaks'])
        .withMessage('Invalid metric type'),
    
    body('groupBy')
        .optional()
        .isIn(['day', 'week', 'month', 'season', 'type'])
        .withMessage('GroupBy must be day, week, month, season, or type'),
    
    body('filters')
        .optional()
        .isObject()
        .withMessage('Filters must be an object'),
    
    // Custom validation for date range
    body().custom((value) => {
        const { startDate, endDate } = value;
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffDays = Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
            
            if (start >= end) {
                throw new Error('Start date must be before end date');
            }
            
            if (diffDays > 365) {
                throw new Error('Date range cannot exceed 365 days');
            }
        }
        return true;
    }),
    
    handleValidationErrors
];

/**
 * Validation for education service interactions
 */
export const validateEducationQuery = [
    query('topic')
        .optional()
        .isIn(['prediction_accuracy', 'confidence_calibration', 'data_analysis', 'betting_strategy'])
        .withMessage('Invalid education topic'),
    
    query('difficulty')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced'])
        .withMessage('Difficulty must be beginner, intermediate, or advanced'),
    
    query('format')
        .optional()
        .isIn(['article', 'video', 'interactive', 'quiz'])
        .withMessage('Format must be article, video, interactive, or quiz'),
    
    handleValidationErrors
];

/**
 * Validation for bulk operations
 */
export const validateBulkOperation = [
    body('operation')
        .isIn(['create', 'update', 'resolve', 'delete'])
        .withMessage('Operation must be create, update, resolve, or delete'),
    
    body('items')
        .isArray({ min: 1, max: 100 })
        .withMessage('Items must be an array with 1-100 items'),
    
    body('dryRun')
        .optional()
        .isBoolean()
        .withMessage('DryRun must be a boolean'),
    
    handleValidationErrors
];

/**
 * Validation for real-time sync operations
 */
export const validateSyncOperation = [
    body('syncType')
        .isIn(['predictions', 'analytics', 'user_data', 'preferences'])
        .withMessage('Sync type must be predictions, analytics, user_data, or preferences'),
    
    body('lastSyncTime')
        .optional()
        .isISO8601()
        .withMessage('Last sync time must be a valid ISO 8601 date'),
    
    body('deviceId')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Device ID must be between 1 and 100 characters')
        .trim(),
    
    handleValidationErrors
];

/**
 * Validation for ensemble ML requests
 */
export const validateEnsembleMLRequest = [
    body('models')
        .isArray({ min: 1, max: 10 })
        .withMessage('Models must be an array with 1-10 items'),
    
    body('models.*')
        .isIn(['random_forest', 'xgboost', 'neural_network', 'svm', 'logistic_regression'])
        .withMessage('Invalid model type'),
    
    body('features')
        .isArray({ min: 1 })
        .withMessage('Features must be a non-empty array'),
    
    body('target')
        .isString()
        .isLength({ min: 1, max: 100 })
        .withMessage('Target must be a string between 1 and 100 characters'),
    
    body('splitRatio')
        .optional()
        .isFloat({ min: 0.1, max: 0.9 })
        .withMessage('Split ratio must be between 0.1 and 0.9'),
    
    handleValidationErrors
];

/**
 * Validation for advanced analytics requests
 */
export const validateAdvancedAnalytics = [
    body('analysisType')
        .isIn(['correlation', 'trend', 'anomaly', 'forecast', 'clustering'])
        .withMessage('Analysis type must be correlation, trend, anomaly, forecast, or clustering'),
    
    body('timeWindow')
        .optional()
        .isIn(['1d', '7d', '30d', '90d', '1y'])
        .withMessage('Time window must be 1d, 7d, 30d, 90d, or 1y'),
    
    body('confidence')
        .optional()
        .isFloat({ min: 0.8, max: 0.99 })
        .withMessage('Confidence must be between 0.8 and 0.99'),
    
    handleValidationErrors
];

/**
 * Sanitize HTML input to prevent XSS
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    // Additional sanitization beyond express-validator
    const sanitizeValue = (value: any): any => {
        if (typeof value === 'string') {
            return value
                .replace(/<script[^>]*>.*?<\/script>/gi, '')
                .replace(/<[^>]*>/g, '')
                .trim();
        }
        if (Array.isArray(value)) {
            return value.map(sanitizeValue);
        }
        if (typeof value === 'object' && value !== null) {
            const sanitized: any = {};
            for (const [key, val] of Object.entries(value)) {
                sanitized[key] = sanitizeValue(val);
            }
            return sanitized;
        }
        return value;
    };
    
    if (req.body) {
        req.body = sanitizeValue(req.body);
    }
    if (req.query) {
        req.query = sanitizeValue(req.query);
    }
    
    next();
};

/**
 * Rate limiting for prediction submissions
 */
export const predictionRateLimit = (req: Request, res: Response, next: NextFunction) => {
    // Simple in-memory rate limiting (should use Redis in production)
    const userId = (req as any).user?.id;
    if (!userId) {
        return next();
    }
    
    // TODO: Implement proper rate limiting with Redis or similar
    // For now, just pass through - this is a placeholder for production implementation
    next();
};
