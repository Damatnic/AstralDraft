/**
 * Webhook Test Runner
 * Tests the webhook infrastructure with comprehensive scenarios
 */

const { webhookTestingService } = require('./services/webhookTestingService');

async function runWebhookTests() {
    console.log('🚀 Starting Stripe Webhook Testing Suite\n');
    console.log('=' .repeat(60));
    
    try {
        // Test 1: Security Tests
        console.log('\n🔒 SECURITY TESTS');
        console.log('=' .repeat(40));
        const securityResults = await webhookTestingService.testWebhookSecurity();
        
        const securityPassed = Object.values(securityResults).every(Boolean);
        console.log(`\n🔒 Security Tests: ${securityPassed ? '✅ PASSED' : '❌ FAILED'}`);
        
        // Test 2: Functional Tests
        console.log('\n\n🧪 FUNCTIONAL TESTS');
        console.log('=' .repeat(40));
        const functionalResults = await webhookTestingService.runComprehensiveTests();
        
        console.log(`\n🧪 Functional Tests: ${functionalResults.summary.failed === 0 ? '✅ PASSED' : '❌ FAILED'}`);
        
        // Overall Results
        console.log('\n\n📊 OVERALL RESULTS');
        console.log('=' .repeat(40));
        
        const allTestsPassed = securityPassed && functionalResults.summary.failed === 0;
        
        console.log(`🔒 Security: ${securityPassed ? '✅' : '❌'} (${Object.values(securityResults).filter(Boolean).length}/4 passed)`);
        console.log(`🧪 Functional: ${functionalResults.summary.failed === 0 ? '✅' : '❌'} (${functionalResults.summary.passed}/${functionalResults.summary.total} passed)`);
        console.log(`⏱️  Average Processing Time: ${functionalResults.summary.averageTime}ms`);
        
        if (allTestsPassed) {
            console.log('\n🎉 ALL WEBHOOK TESTS PASSED!');
            console.log('✅ Your webhook infrastructure is ready for production');
            console.log('\n📋 Next Steps:');
            console.log('   1. Deploy webhook endpoint to production');
            console.log('   2. Configure webhook URL in Stripe Dashboard');
            console.log('   3. Set up monitoring and alerting');
            console.log('   4. Test with real Stripe events');
        } else {
            console.log('\n❌ SOME TESTS FAILED');
            console.log('🔧 Please review the failed tests and fix issues before deployment');
            
            if (!securityPassed) {
                console.log('\n🚨 Security Issues Found:');
                Object.entries(securityResults).forEach(([test, passed]) => {
                    if (!passed) {
                        console.log(`   ❌ ${test}`);
                    }
                });
            }
            
            if (functionalResults.summary.failed > 0) {
                console.log('\n🚨 Functional Issues Found:');
                functionalResults.results.filter(r => !r.success).forEach(result => {
                    console.log(`   ❌ ${result.eventType}: ${result.error}`);
                });
            }
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('📝 Test Report Generated');
        console.log(`   Total Tests: ${4 + functionalResults.summary.total}`);
        console.log(`   Passed: ${Object.values(securityResults).filter(Boolean).length + functionalResults.summary.passed}`);
        console.log(`   Failed: ${Object.values(securityResults).filter(v => !v).length + functionalResults.summary.failed}`);
        console.log(`   Success Rate: ${Math.round(((Object.values(securityResults).filter(Boolean).length + functionalResults.summary.passed) / (4 + functionalResults.summary.total)) * 100)}%`);
        
        return allTestsPassed;
        
    } catch (error) {
        console.error('\n❌ Test suite failed to run:', error);
        console.log('\n🔧 Troubleshooting:');
        console.log('   1. Check that payment service is properly configured');
        console.log('   2. Verify environment variables are set');
        console.log('   3. Ensure database is accessible');
        console.log('   4. Check Stripe SDK configuration');
        
        return false;
    }
}

// Additional utility functions for webhook testing

/**
 * Test webhook endpoint directly (if server is running)
 */
async function testWebhookEndpoint(port = 3001) {
    console.log(`🌐 Testing webhook endpoint at http://localhost:${port}/api/payment/webhook`);
    
    try {
        const axios = require('axios');
        const crypto = require('crypto');
        
        const testPayload = JSON.stringify({
            id: 'evt_test_endpoint',
            type: 'payment_intent.succeeded',
            data: { object: { id: 'pi_test_endpoint' } },
            created: Math.floor(Date.now() / 1000),
            livemode: false
        });
        
        const secret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = crypto
            .createHmac('sha256', secret)
            .update(timestamp + '.' + testPayload, 'utf8')
            .digest('hex');
            
        const stripeSignature = `t=${timestamp},v1=${signature}`;
        
        const response = await axios.post(`http://localhost:${port}/api/payment/webhook`, testPayload, {
            headers: {
                'stripe-signature': stripeSignature,
                'content-type': 'application/json'
            },
            timeout: 5000
        });
        
        console.log('✅ Webhook endpoint responded successfully');
        console.log('   Status:', response.status);
        console.log('   Response:', response.data);
        
        return true;
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('⚠️  Server not running - skipping endpoint test');
            console.log(`   Start server with: npm run dev`);
            console.log(`   Then test with: node test-webhooks.js --endpoint`);
        } else {
            console.error('❌ Webhook endpoint test failed:', error.message);
        }
        
        return false;
    }
}

/**
 * Generate Stripe CLI test commands
 */
function generateStripeCLICommands() {
    console.log('\n📋 Stripe CLI Test Commands');
    console.log('=' .repeat(40));
    console.log('Use these commands to test with real Stripe events:\n');
    
    const commands = [
        {
            name: 'Payment Intent Succeeded',
            command: 'stripe trigger payment_intent.succeeded'
        },
        {
            name: 'Subscription Created',
            command: 'stripe trigger customer.subscription.created'
        },
        {
            name: 'Subscription Updated',
            command: 'stripe trigger customer.subscription.updated'
        },
        {
            name: 'Invoice Payment Succeeded',
            command: 'stripe trigger invoice.payment_succeeded'
        },
        {
            name: 'Invoice Payment Failed',
            command: 'stripe trigger invoice.payment_failed'
        }
    ];
    
    commands.forEach((cmd, index) => {
        console.log(`${index + 1}. ${cmd.name}:`);
        console.log(`   ${cmd.command}`);
        console.log('');
    });
    
    console.log('💡 Tips:');
    console.log('   • Install Stripe CLI: https://stripe.com/docs/stripe-cli');
    console.log('   • Login: stripe login');
    console.log('   • Forward events: stripe listen --forward-to localhost:3001/api/payment/webhook');
    console.log('   • Test events: stripe trigger <event_type>');
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--endpoint')) {
        testWebhookEndpoint().then(success => {
            process.exit(success ? 0 : 1);
        });
    } else if (args.includes('--stripe-cli')) {
        generateStripeCLICommands();
        process.exit(0);
    } else {
        runWebhookTests().then(success => {
            process.exit(success ? 0 : 1);
        });
    }
}

module.exports = {
    runWebhookTests,
    testWebhookEndpoint,
    generateStripeCLICommands
};
