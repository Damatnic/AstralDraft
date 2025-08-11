/**
 * Test Script for Production Oracle Real API Integration
 * Run with: npm run test:oracle-integration
 */

import { productionOraclePredictionService } from './services/productionOraclePredictionService';
import { productionSportsDataService } from './services/productionSportsDataService';

async function testProductionOracleIntegration() {
  console.log('🧪 Testing Production Oracle Real API Integration...\n');

  try {
    // Test 1: Sports Data Service
    console.log('📊 Test 1: Fetching current week NFL games...');
    const games = await productionSportsDataService.getCurrentWeekGames();
    console.log(`✅ Retrieved ${games.length} games for current week`);
    
    if (games.length > 0) {
      const game = games[0];
      console.log(`   Sample game: ${game.awayTeam.name} @ ${game.homeTeam.name} (${new Date(game.date).toLocaleDateString()})`);
    }

    // Test 2: Live Scores
    console.log('\n🏈 Test 2: Fetching live scores...');
    const liveScores = await productionSportsDataService.getLiveScores();
    console.log(`✅ Retrieved ${liveScores.length} live games`);

    // Test 3: Oracle Prediction Generation
    console.log('\n🔮 Test 3: Generating Oracle predictions...');
    const predictions = await productionOraclePredictionService.getPredictionsForWeek(1);
    console.log(`✅ Generated ${predictions.length} Oracle predictions`);
    
    if (predictions.length > 0) {
      const prediction = predictions[0];
      console.log(`   Sample prediction: "${prediction.question}"`);
      console.log(`   Oracle choice: ${prediction.options[prediction.oracleChoice].text} (${prediction.confidence}% confidence)`);
    }

    // Test 4: User Prediction Submission
    console.log('\n📝 Test 4: Testing user prediction submission...');
    if (predictions.length > 0) {
      const testResult = await productionOraclePredictionService.submitUserPrediction(
        predictions[0].id,
        'test_user_123',
        0,
        75
      );
      
      if (testResult.success) {
        console.log('✅ User prediction submission successful');
      } else {
        console.log(`❌ User prediction failed: ${testResult.error}`);
      }
    }

    // Test 5: Oracle Accuracy
    console.log('\n📈 Test 5: Getting Oracle accuracy stats...');
    const accuracy = productionOraclePredictionService.getOracleAccuracy(1);
    console.log(`✅ Oracle accuracy: ${accuracy.accuracy.toFixed(1)}% (${accuracy.correctPredictions}/${accuracy.totalPredictions})`);

    // Test 6: Leaderboard
    console.log('\n🏆 Test 6: Getting weekly leaderboard...');
    const leaderboard = productionOraclePredictionService.getWeeklyLeaderboard(1);
    console.log(`✅ Retrieved leaderboard with ${leaderboard.length} users`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Integration Summary:');
    console.log(`   • ${games.length} NFL games available`);
    console.log(`   • ${liveScores.length} live games tracked`);
    console.log(`   • ${predictions.length} Oracle predictions generated`);
    console.log(`   • ${accuracy.totalPredictions} total predictions in system`);
    console.log(`   • ${leaderboard.length} users on leaderboard`);
    
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔧 This is expected if you haven\'t configured real API keys yet.');
    console.log('   The system will fall back to mock data for development.');
    return false;
  }
}

// Export for use in other test files
export { testProductionOracleIntegration };

// Run if called directly
if (require.main === module) {
  testProductionOracleIntegration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
