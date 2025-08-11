// Oracle Real API Integration Test
// Simple test to verify our production Oracle system works

console.log('🧪 Testing Production Oracle Real API Integration...\n');

// Test the new API endpoints
async function testOracleAPI() {
  try {
    // Test fetching production predictions
    console.log('📊 Testing production Oracle predictions API...');
    
    const response = await fetch('http://localhost:8765/api/oracle/predictions/production?week=1&season=2024');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Production Oracle API is working!');
      console.log(`   Retrieved ${data.data?.predictions?.length || 0} predictions`);
      console.log(`   Oracle accuracy: ${data.data?.meta?.oracleAccuracy || 0}%`);
    } else {
      console.log('❌ API returned error:', response.status);
    }
    
  } catch (error) {
    console.log('❌ Test failed - this is expected without real API keys configured');
    console.log('   Error:', error.message);
    console.log('   The system will fall back to mock data for development');
  }
}

// Run the test
testOracleAPI();
