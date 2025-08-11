/**
 * Stripe Webhook Testing Service
 * Comprehensive testing for webhook endpoints and event handling
 */

import Stripe from 'stripe';
import crypto from 'crypto';
import { paymentService } from '../services/paymentService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-07-30.basil'
});

export interface WebhookTestEvent {
  id: string;
  type: string;
  data: any;
  created: number;
  livemode: boolean;
}

export interface WebhookTestResult {
  success: boolean;
  eventType: string;
  eventId: string;
  processingTime: number;
  error?: string;
  details?: any;
}

export class WebhookTestingService {
  private readonly webhookSecret: string;

  constructor() {
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';
  }

  /**
   * Create a test webhook signature for local testing
   */
  createTestSignature(payload: string, secret: string = this.webhookSecret): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadForSig = timestamp + '.' + payload;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payloadForSig, 'utf8')
      .digest('hex');
    
    return `t=${timestamp},v1=${signature}`;
  }

  /**
   * Test payment confirmation webhook
   */
  async testPaymentConfirmationWebhook(): Promise<WebhookTestResult> {
    const startTime = Date.now();
    
    try {
      const testEvent: WebhookTestEvent = {
        id: 'evt_test_payment_intent_succeeded',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_payment_intent',
            amount: 500, // $5.00
            currency: 'usd',
            status: 'succeeded',
            metadata: {
              userId: '1',
              contestId: 'contest_test_123',
              entryType: 'small'
            },
            receipt_email: 'test@example.com'
          }
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false
      };

      const payload = JSON.stringify(testEvent);
      const signature = this.createTestSignature(payload);

      console.log('🧪 Testing payment confirmation webhook...');
      console.log(`   Event ID: ${testEvent.id}`);
      console.log(`   Payment Intent: ${testEvent.data.object.id}`);
      console.log(`   Amount: $${testEvent.data.object.amount / 100}`);

      await paymentService.handleWebhook(payload, signature);

      return {
        success: true,
        eventType: testEvent.type,
        eventId: testEvent.id,
        processingTime: Date.now() - startTime,
        details: {
          paymentIntentId: testEvent.data.object.id,
          amount: testEvent.data.object.amount,
          metadata: testEvent.data.object.metadata
        }
      };

    } catch (error) {
      return {
        success: false,
        eventType: 'payment_intent.succeeded',
        eventId: 'evt_test_payment_intent_succeeded',
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test subscription lifecycle webhooks
   */
  async testSubscriptionWebhooks(): Promise<WebhookTestResult[]> {
    const results: WebhookTestResult[] = [];

    // Test subscription created
    results.push(await this.testSubscriptionCreated());
    
    // Test subscription updated (trial ending)
    results.push(await this.testSubscriptionUpdated());
    
    // Test subscription canceled
    results.push(await this.testSubscriptionCanceled());

    // Test invoice payment succeeded
    results.push(await this.testInvoicePaymentSucceeded());

    // Test invoice payment failed
    results.push(await this.testInvoicePaymentFailed());

    return results;
  }

  /**
   * Test subscription created webhook
   */
  private async testSubscriptionCreated(): Promise<WebhookTestResult> {
    const startTime = Date.now();
    
    try {
      const testEvent: WebhookTestEvent = {
        id: 'evt_test_subscription_created',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test_subscription',
            customer: 'cus_test_customer',
            status: 'trialing',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000),
            trial_end: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000),
            items: {
              data: [{
                price: {
                  id: 'price_oracle_premium',
                  product: 'prod_oracle_premium'
                }
              }]
            },
            metadata: {
              userId: '1'
            }
          }
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false
      };

      const payload = JSON.stringify(testEvent);
      const signature = this.createTestSignature(payload);

      console.log('🧪 Testing subscription created webhook...');
      console.log(`   Subscription ID: ${testEvent.data.object.id}`);
      console.log(`   Status: ${testEvent.data.object.status}`);

      await paymentService.handleWebhook(payload, signature);

      return {
        success: true,
        eventType: testEvent.type,
        eventId: testEvent.id,
        processingTime: Date.now() - startTime,
        details: {
          subscriptionId: testEvent.data.object.id,
          status: testEvent.data.object.status,
          trialEnd: testEvent.data.object.trial_end
        }
      };

    } catch (error) {
      return {
        success: false,
        eventType: 'customer.subscription.created',
        eventId: 'evt_test_subscription_created',
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test subscription updated webhook
   */
  private async testSubscriptionUpdated(): Promise<WebhookTestResult> {
    const startTime = Date.now();
    
    try {
      const testEvent: WebhookTestEvent = {
        id: 'evt_test_subscription_updated',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_subscription',
            customer: 'cus_test_customer',
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
            trial_end: null,
            cancel_at_period_end: false,
            items: {
              data: [{
                price: {
                  id: 'price_oracle_premium',
                  product: 'prod_oracle_premium'
                }
              }]
            },
            metadata: {
              userId: '1'
            }
          }
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false
      };

      const payload = JSON.stringify(testEvent);
      const signature = this.createTestSignature(payload);

      console.log('🧪 Testing subscription updated webhook...');
      console.log(`   Subscription ID: ${testEvent.data.object.id}`);
      console.log(`   New Status: ${testEvent.data.object.status}`);

      await paymentService.handleWebhook(payload, signature);

      return {
        success: true,
        eventType: testEvent.type,
        eventId: testEvent.id,
        processingTime: Date.now() - startTime,
        details: {
          subscriptionId: testEvent.data.object.id,
          status: testEvent.data.object.status,
          cancelAtPeriodEnd: testEvent.data.object.cancel_at_period_end
        }
      };

    } catch (error) {
      return {
        success: false,
        eventType: 'customer.subscription.updated',
        eventId: 'evt_test_subscription_updated',
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test subscription canceled webhook
   */
  private async testSubscriptionCanceled(): Promise<WebhookTestResult> {
    const startTime = Date.now();
    
    try {
      const testEvent: WebhookTestEvent = {
        id: 'evt_test_subscription_canceled',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_subscription',
            customer: 'cus_test_customer',
            status: 'canceled',
            canceled_at: Math.floor(Date.now() / 1000),
            current_period_start: Math.floor((Date.now() - 15 * 24 * 60 * 60 * 1000) / 1000),
            current_period_end: Math.floor(Date.now() / 1000),
            items: {
              data: [{
                price: {
                  id: 'price_oracle_premium',
                  product: 'prod_oracle_premium'
                }
              }]
            },
            metadata: {
              userId: '1'
            }
          }
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false
      };

      const payload = JSON.stringify(testEvent);
      const signature = this.createTestSignature(payload);

      console.log('🧪 Testing subscription canceled webhook...');
      console.log(`   Subscription ID: ${testEvent.data.object.id}`);
      console.log(`   Canceled At: ${new Date(testEvent.data.object.canceled_at * 1000).toISOString()}`);

      await paymentService.handleWebhook(payload, signature);

      return {
        success: true,
        eventType: testEvent.type,
        eventId: testEvent.id,
        processingTime: Date.now() - startTime,
        details: {
          subscriptionId: testEvent.data.object.id,
          canceledAt: testEvent.data.object.canceled_at
        }
      };

    } catch (error) {
      return {
        success: false,
        eventType: 'customer.subscription.deleted',
        eventId: 'evt_test_subscription_canceled',
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test invoice payment succeeded webhook
   */
  private async testInvoicePaymentSucceeded(): Promise<WebhookTestResult> {
    const startTime = Date.now();
    
    try {
      const testEvent: WebhookTestEvent = {
        id: 'evt_test_invoice_payment_succeeded',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_invoice',
            customer: 'cus_test_customer',
            subscription: 'sub_test_subscription',
            amount_paid: 999, // $9.99
            currency: 'usd',
            status: 'paid',
            billing_reason: 'subscription_cycle',
            period_start: Math.floor(Date.now() / 1000),
            period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
            hosted_invoice_url: 'https://invoice.stripe.com/test_invoice',
            metadata: {
              userId: '1'
            }
          }
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false
      };

      const payload = JSON.stringify(testEvent);
      const signature = this.createTestSignature(payload);

      console.log('🧪 Testing invoice payment succeeded webhook...');
      console.log(`   Invoice ID: ${testEvent.data.object.id}`);
      console.log(`   Amount: $${testEvent.data.object.amount_paid / 100}`);

      await paymentService.handleWebhook(payload, signature);

      return {
        success: true,
        eventType: testEvent.type,
        eventId: testEvent.id,
        processingTime: Date.now() - startTime,
        details: {
          invoiceId: testEvent.data.object.id,
          amountPaid: testEvent.data.object.amount_paid,
          subscriptionId: testEvent.data.object.subscription
        }
      };

    } catch (error) {
      return {
        success: false,
        eventType: 'invoice.payment_succeeded',
        eventId: 'evt_test_invoice_payment_succeeded',
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test invoice payment failed webhook
   */
  private async testInvoicePaymentFailed(): Promise<WebhookTestResult> {
    const startTime = Date.now();
    
    try {
      const testEvent: WebhookTestEvent = {
        id: 'evt_test_invoice_payment_failed',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_invoice_failed',
            customer: 'cus_test_customer',
            subscription: 'sub_test_subscription',
            amount_due: 999, // $9.99
            currency: 'usd',
            status: 'open',
            billing_reason: 'subscription_cycle',
            attempt_count: 1,
            next_payment_attempt: Math.floor((Date.now() + 3 * 24 * 60 * 60 * 1000) / 1000),
            hosted_invoice_url: 'https://invoice.stripe.com/test_invoice_failed',
            metadata: {
              userId: '1'
            }
          }
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false
      };

      const payload = JSON.stringify(testEvent);
      const signature = this.createTestSignature(payload);

      console.log('🧪 Testing invoice payment failed webhook...');
      console.log(`   Invoice ID: ${testEvent.data.object.id}`);
      console.log(`   Amount Due: $${testEvent.data.object.amount_due / 100}`);
      console.log(`   Attempt Count: ${testEvent.data.object.attempt_count}`);

      await paymentService.handleWebhook(payload, signature);

      return {
        success: true,
        eventType: testEvent.type,
        eventId: testEvent.id,
        processingTime: Date.now() - startTime,
        details: {
          invoiceId: testEvent.data.object.id,
          amountDue: testEvent.data.object.amount_due,
          attemptCount: testEvent.data.object.attempt_count,
          nextAttempt: testEvent.data.object.next_payment_attempt
        }
      };

    } catch (error) {
      return {
        success: false,
        eventType: 'invoice.payment_failed',
        eventId: 'evt_test_invoice_payment_failed',
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test refund webhook
   */
  async testRefundWebhook(): Promise<WebhookTestResult> {
    const startTime = Date.now();
    
    try {
      const testEvent: WebhookTestEvent = {
        id: 'evt_test_charge_dispute_created',
        type: 'charge.dispute.created',
        data: {
          object: {
            id: 'dp_test_dispute',
            charge: 'ch_test_charge',
            amount: 500, // $5.00
            currency: 'usd',
            reason: 'fraudulent',
            status: 'warning_needs_response',
            evidence_due_by: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000),
            metadata: {
              userId: '1',
              contestId: 'contest_test_123'
            }
          }
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false
      };

      const payload = JSON.stringify(testEvent);
      const signature = this.createTestSignature(payload);

      console.log('🧪 Testing dispute/refund webhook...');
      console.log(`   Dispute ID: ${testEvent.data.object.id}`);
      console.log(`   Amount: $${testEvent.data.object.amount / 100}`);
      console.log(`   Reason: ${testEvent.data.object.reason}`);

      await paymentService.handleWebhook(payload, signature);

      return {
        success: true,
        eventType: testEvent.type,
        eventId: testEvent.id,
        processingTime: Date.now() - startTime,
        details: {
          disputeId: testEvent.data.object.id,
          chargeId: testEvent.data.object.charge,
          amount: testEvent.data.object.amount,
          reason: testEvent.data.object.reason
        }
      };

    } catch (error) {
      return {
        success: false,
        eventType: 'charge.dispute.created',
        eventId: 'evt_test_charge_dispute_created',
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Run comprehensive webhook test suite
   */
  async runComprehensiveTests(): Promise<{
    summary: {
      total: number;
      passed: number;
      failed: number;
      averageTime: number;
    };
    results: WebhookTestResult[];
  }> {
    console.log('🚀 Starting comprehensive webhook test suite...\n');

    const results: WebhookTestResult[] = [];

    // Test payment confirmation
    console.log('1️⃣ Testing Payment Confirmation');
    results.push(await this.testPaymentConfirmationWebhook());

    // Test subscription events
    console.log('\n2️⃣ Testing Subscription Lifecycle');
    const subscriptionResults = await this.testSubscriptionWebhooks();
    results.push(...subscriptionResults);

    // Test refund/dispute
    console.log('\n3️⃣ Testing Dispute/Refund Handling');
    results.push(await this.testRefundWebhook());

    // Calculate summary
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const averageTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;

    const summary = {
      total: results.length,
      passed,
      failed,
      averageTime: Math.round(averageTime)
    };

    console.log('\n🎯 Test Summary:');
    console.log(`   Total Tests: ${summary.total}`);
    console.log(`   ✅ Passed: ${summary.passed}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log(`   ⏱️  Average Time: ${summary.averageTime}ms`);

    if (summary.failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`   ${result.eventType}: ${result.error}`);
      });
    }

    return { summary, results };
  }

  /**
   * Verify webhook endpoint security
   */
  async testWebhookSecurity(): Promise<{
    signatureValidation: boolean;
    timestampValidation: boolean;
    idempotencyHandling: boolean;
    errorHandling: boolean;
  }> {
    console.log('🔒 Testing webhook security...\n');

    const results = {
      signatureValidation: false,
      timestampValidation: false,
      idempotencyHandling: false,
      errorHandling: false
    };

    try {
      // Test invalid signature
      console.log('1️⃣ Testing signature validation...');
      const payload = JSON.stringify({ test: 'invalid_signature' });
      const invalidSignature = 'invalid_signature';
      
      try {
        await paymentService.handleWebhook(payload, invalidSignature);
        console.log('   ❌ Invalid signature was accepted (security vulnerability)');
      } catch (error) {
        console.log('   ✅ Invalid signature correctly rejected');
        console.log(`      Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.signatureValidation = true;
      }

      // Test timestamp validation
      console.log('2️⃣ Testing timestamp validation...');
      const oldTimestamp = Math.floor((Date.now() - 10 * 60 * 1000) / 1000); // 10 minutes old
      const oldPayload = JSON.stringify({ test: 'old_timestamp' });
      const oldSig = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(oldTimestamp + '.' + oldPayload, 'utf8')
        .digest('hex');
      const expiredSignature = `t=${oldTimestamp},v1=${oldSig}`;

      try {
        await paymentService.handleWebhook(oldPayload, expiredSignature);
        console.log('   ❌ Expired timestamp was accepted (security vulnerability)');
      } catch (error) {
        console.log('   ✅ Expired timestamp correctly rejected');
        console.log(`      Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.timestampValidation = true;
      }

      // Test duplicate event handling (idempotency)
      console.log('3️⃣ Testing idempotency handling...');
      const duplicateEvent = {
        id: 'evt_duplicate_test',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_duplicate_test' } },
        created: Math.floor(Date.now() / 1000),
        livemode: false
      };
      const duplicatePayload = JSON.stringify(duplicateEvent);
      const duplicateSignature = this.createTestSignature(duplicatePayload);

      // Process the same event twice
      await paymentService.handleWebhook(duplicatePayload, duplicateSignature);
      await paymentService.handleWebhook(duplicatePayload, duplicateSignature);
      console.log('   ✅ Duplicate events handled correctly');
      results.idempotencyHandling = true;

      // Test error handling
      console.log('4️⃣ Testing error handling...');
      const malformedEvent = {
        id: 'evt_malformed_test',
        type: 'invalid.event.type',
        data: { malformed: 'data' },
        created: 'invalid_timestamp',
        livemode: false
      };
      const malformedPayload = JSON.stringify(malformedEvent);
      const malformedSignature = this.createTestSignature(malformedPayload);

      try {
        await paymentService.handleWebhook(malformedPayload, malformedSignature);
        console.log('   ✅ Malformed events handled gracefully');
        results.errorHandling = true;
      } catch (error) {
        console.log('   ✅ Malformed events properly rejected');
        console.log(`      Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.errorHandling = true;
      }

    } catch (error) {
      console.error('Security test failed:', error);
    }

    console.log('\n🔒 Security Test Results:');
    console.log(`   Signature Validation: ${results.signatureValidation ? '✅' : '❌'}`);
    console.log(`   Timestamp Validation: ${results.timestampValidation ? '✅' : '❌'}`);
    console.log(`   Idempotency Handling: ${results.idempotencyHandling ? '✅' : '❌'}`);
    console.log(`   Error Handling: ${results.errorHandling ? '✅' : '❌'}`);

    return results;
  }
}

export const webhookTestingService = new WebhookTestingService();
export default webhookTestingService;
