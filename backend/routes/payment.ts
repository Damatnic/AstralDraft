/**
 * Payment API Routes
 * Handles Stripe integration for contest entries, subscriptions, and premium features
 */

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { paymentService, PAYMENT_PRODUCTS } from '../../services/paymentService';
import { runQuery, getRow } from '../db/index';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * POST /api/payment/contest-entry
 * Create payment intent for contest entry
 */
router.post('/contest-entry',
  authenticateToken,
  [
    body('contestId').isString().notEmpty().withMessage('Contest ID is required'),
    body('entryType').isIn(['CONTEST_ENTRY_SMALL', 'CONTEST_ENTRY_MEDIUM', 'CONTEST_ENTRY_LARGE'])
      .withMessage('Valid entry type is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { contestId, entryType } = req.body;
      const userId = req.user?.id?.toString();

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
      }

      // Check if user already entered this contest
      const existingEntry = await getRow(
        'SELECT id FROM contest_entries WHERE user_id = ? AND contest_id = ?',
        [userId, contestId]
      );

      if (existingEntry) {
        return res.status(400).json({
          success: false,
          error: 'User already entered this contest'
        });
      }

      // Create payment intent
      const paymentIntent = await paymentService.createContestEntryPayment(
        userId,
        contestId,
        entryType
      );

      res.json({
        success: true,
        data: {
          paymentIntent,
          product: PAYMENT_PRODUCTS[entryType],
          contestId
        }
      });

    } catch (error) {
      console.error('❌ Failed to create contest entry payment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create payment intent',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/payment/subscription
 * Create subscription for premium features
 */
router.post('/subscription',
  authenticateToken,
  [
    body('subscriptionType').isIn(['ORACLE_PREMIUM', 'ANALYTICS_PRO', 'ORACLE_ULTIMATE'])
      .withMessage('Valid subscription type is required'),
    body('trialDays').optional().isInt({ min: 0, max: 30 }).withMessage('Trial days must be 0-30')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { subscriptionType, trialDays = 7 } = req.body;
      const userId = req.user?.id?.toString();
      const userEmail = req.user?.email;

      if (!userId || !userEmail) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
      }

      // Get or create Stripe customer
      const customer = await paymentService.createOrGetCustomer(
        userId,
        userEmail,
        req.user?.username
      );

      // Check for existing active subscription
      const existingSubscriptions = await paymentService.getUserSubscriptions(customer.id);
      const activeSubscription = existingSubscriptions.find(sub => 
        sub.status === 'active' && sub.productId === PAYMENT_PRODUCTS[subscriptionType].id
      );

      if (activeSubscription) {
        return res.status(400).json({
          success: false,
          error: 'User already has an active subscription of this type'
        });
      }

      // Create subscription
      const subscription = await paymentService.createSubscription(
        userId,
        customer.id,
        subscriptionType,
        trialDays
      );

      // Record subscription in database
      await runQuery(
        `INSERT INTO user_subscriptions (user_id, stripe_subscription_id, product_id, status, trial_ends_at, current_period_start, current_period_end)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          subscription.id,
          PAYMENT_PRODUCTS[subscriptionType].id,
          subscription.status,
          subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          new Date((subscription as any).current_period_start * 1000).toISOString(),
          new Date((subscription as any).current_period_end * 1000).toISOString()
        ]
      );

      res.json({
        success: true,
        data: {
          subscription: {
            id: subscription.id,
            status: subscription.status,
            trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000)
          },
          product: PAYMENT_PRODUCTS[subscriptionType],
          customer: {
            id: customer.id,
            email: customer.email
          }
        }
      });

    } catch (error) {
      console.error('❌ Failed to create subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create subscription',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/payment/subscriptions
 * Get user's current subscriptions
 */
router.get('/subscriptions',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user?.id?.toString();
      const userEmail = req.user?.email;

      if (!userId || !userEmail) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
      }

      // Get Stripe customer
      const customer = await paymentService.createOrGetCustomer(userId, userEmail);
      const subscriptions = await paymentService.getUserSubscriptions(customer.id);

      res.json({
        success: true,
        data: {
          subscriptions,
          products: PAYMENT_PRODUCTS
        }
      });

    } catch (error) {
      console.error('❌ Failed to get subscriptions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve subscriptions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * PUT /api/payment/subscription/:id/cancel
 * Cancel subscription
 */
router.put('/subscription/:id/cancel',
  authenticateToken,
  [
    param('id').isString().notEmpty().withMessage('Subscription ID is required'),
    body('immediate').optional().isBoolean().withMessage('Immediate must be boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id: subscriptionId } = req.params;
      const { immediate = false } = req.body;
      const userId = req.user?.id?.toString();

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
      }

      // Verify user owns this subscription
      const userSubscription = await getRow(
        'SELECT id FROM user_subscriptions WHERE user_id = ? AND stripe_subscription_id = ?',
        [userId, subscriptionId]
      );

      if (!userSubscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
      }

      // Cancel subscription
      const cancelledSubscription = await paymentService.cancelSubscription(subscriptionId, immediate);

      // Update database
      await runQuery(
        'UPDATE user_subscriptions SET status = ?, cancel_at_period_end = ?, cancelled_at = ? WHERE stripe_subscription_id = ?',
        [
          cancelledSubscription.status,
          (cancelledSubscription as any).cancel_at_period_end ? 1 : 0,
          new Date().toISOString(),
          subscriptionId
        ]
      );

      res.json({
        success: true,
        data: {
          subscription: {
            id: cancelledSubscription.id,
            status: cancelledSubscription.status,
            cancelAtPeriodEnd: (cancelledSubscription as any).cancel_at_period_end,
            currentPeriodEnd: new Date((cancelledSubscription as any).current_period_end * 1000)
          }
        }
      });

    } catch (error) {
      console.error('❌ Failed to cancel subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel subscription',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/payment/history
 * Get user's payment history
 */
router.get('/history',
  authenticateToken,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user?.id?.toString();
      const limit = parseInt(req.query.limit as string) || 50;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
      }

      const paymentHistory = await paymentService.getPaymentHistory(userId, limit);

      res.json({
        success: true,
        data: {
          payments: paymentHistory,
          total: paymentHistory.length
        }
      });

    } catch (error) {
      console.error('❌ Failed to get payment history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve payment history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/payment/refund
 * Process refund (admin only)
 */
router.post('/refund',
  requireAdmin,
  [
    body('paymentId').isString().notEmpty().withMessage('Payment ID is required'),
    body('amount').optional().isInt({ min: 1 }).withMessage('Amount must be positive'),
    body('reason').isIn(['duplicate', 'fraudulent', 'requested_by_customer', 'contest_cancelled'])
      .withMessage('Valid reason is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { paymentId, amount, reason, metadata } = req.body;

      const refund = await paymentService.processRefund({
        paymentId,
        amount,
        reason,
        metadata
      });

      res.json({
        success: true,
        data: {
          refund: {
            id: refund.id,
            amount: refund.amount,
            status: refund.status,
            reason: refund.reason
          }
        }
      });

    } catch (error) {
      console.error('❌ Failed to process refund:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process refund',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/payment/analytics
 * Get payment analytics (admin only)
 */
router.get('/analytics',
  requireAdmin,
  [
    query('startDate').isISO8601().withMessage('Valid start date is required'),
    query('endDate').isISO8601().withMessage('Valid end date is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);

      const analytics = await paymentService.getPaymentAnalytics(startDate, endDate);

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('❌ Failed to get payment analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/payment/webhook
 * Handle Stripe webhooks with enhanced security and logging
 */
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const startTime = Date.now();
    let eventType = 'unknown';
    let eventId = 'unknown';

    try {
      const signature = req.headers['stripe-signature'] as string;
      const payload = req.body;

      if (!signature) {
        console.error('❌ Missing stripe-signature header');
        return res.status(400).json({
          success: false,
          error: 'Missing stripe-signature header'
        });
      }

      if (!payload) {
        console.error('❌ Missing request body');
        return res.status(400).json({
          success: false,
          error: 'Missing request body'
        });
      }

      // Log webhook attempt for monitoring
      const payloadString = payload.toString();
      console.log(`🔔 Webhook received: ${payloadString.length} bytes`);

      // Parse the event to get type and ID for logging
      try {
        const event = JSON.parse(payloadString);
        eventType = event.type || 'unknown';
        eventId = event.id || 'unknown';
        console.log(`   Event: ${eventType} (${eventId})`);
      } catch (parseError) {
        console.error('❌ Failed to parse webhook payload:', parseError);
      }

      // Process the webhook
      const result = await paymentService.handleWebhook(payloadString, signature);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Webhook processed successfully in ${processingTime}ms`);
      console.log(`   Event: ${eventType} (${eventId})`);
      console.log(`   Result:`, result);

      res.json({ 
        received: true,
        eventType,
        eventId,
        processingTime
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ Webhook processing failed:', {
        eventType,
        eventId,
        processingTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Check if it's a signature verification error
      if (error instanceof Error && error.message.includes('signature')) {
        return res.status(401).json({
          success: false,
          error: 'Invalid signature',
          eventType,
          eventId
        });
      }

      // Check if it's a timestamp tolerance error
      if (error instanceof Error && error.message.includes('timestamp')) {
        return res.status(400).json({
          success: false,
          error: 'Request timestamp too old',
          eventType,
          eventId
        });
      }

      res.status(400).json({
        success: false,
        error: 'Webhook processing failed',
        eventType,
        eventId,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/payment/products
 * Get available payment products
 */
router.get('/products', (req, res) => {
  res.json({
    success: true,
    data: {
      products: PAYMENT_PRODUCTS,
      categories: {
        contest_entries: ['CONTEST_ENTRY_SMALL', 'CONTEST_ENTRY_MEDIUM', 'CONTEST_ENTRY_LARGE'],
        subscriptions: ['ORACLE_PREMIUM', 'ANALYTICS_PRO', 'ORACLE_ULTIMATE']
      }
    }
  });
});

export default router;
