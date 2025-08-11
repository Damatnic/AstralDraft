/**
 * Payment System Test Script
 * Tests the payment infrastructure setup
 */

const { createPaymentTables, createPaymentIndexes, getUserSubscription } = require('./backend/db/payment-schema');
const { setupCompleteDatabase } = require('./backend/db/setup');
const { PremiumFeatureService } = require('./services/premiumFeatureService');

async function testPaymentSystem() {
    console.log('🧪 Testing Payment System Infrastructure...\n');

    try {
        // Test 1: Database Setup
        console.log('1️⃣ Testing database setup...');
        await setupCompleteDatabase();
        console.log('✅ Database setup completed successfully\n');

        // Test 2: Payment Tables
        console.log('2️⃣ Testing payment tables creation...');
        await createPaymentTables();
        await createPaymentIndexes();
        console.log('✅ Payment tables created successfully\n');

        // Test 3: Premium Features Service
        console.log('3️⃣ Testing premium features service...');
        
        // Test user tier retrieval (with mock user ID)
        const testUserId = 1;
        const userTier = await PremiumFeatureService.getUserTier(testUserId);
        console.log(`   User ${testUserId} tier: ${userTier}`);

        // Test feature access checking
        const featureAccess = await PremiumFeatureService.checkFeatureAccess(testUserId, 'oracle_predictions');
        console.log(`   Oracle predictions access:`, featureAccess);

        // Test feature limits
        const featureLimits = await PremiumFeatureService.getUserFeatureLimits(testUserId);
        console.log(`   Feature limits for user:`, Object.keys(featureLimits).length, 'features configured');

        console.log('✅ Premium features service working correctly\n');

        // Test 4: Payment Schema Functions
        console.log('4️⃣ Testing payment schema functions...');
        
        // Test user subscription retrieval (should return null for new user)
        const subscription = await getUserSubscription(testUserId);
        console.log(`   User subscription:`, subscription ? 'Found' : 'None (expected for new user)');
        
        console.log('✅ Payment schema functions working correctly\n');

        console.log('🎉 Payment System Test Complete!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Database setup working');
        console.log('   ✅ Payment tables created');
        console.log('   ✅ Premium features service functional');
        console.log('   ✅ Payment schema functions operational');
        console.log('\n🚀 Payment system ready for Stripe integration!');

    } catch (error) {
        console.error('❌ Payment system test failed:', error);
        console.log('\n🔧 Next steps:');
        console.log('   1. Check database connection');
        console.log('   2. Verify payment table schemas');
        console.log('   3. Test individual components');
        return false;
    }

    return true;
}

// Run the test if this script is executed directly
if (require.main === module) {
    testPaymentSystem().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = testPaymentSystem;
