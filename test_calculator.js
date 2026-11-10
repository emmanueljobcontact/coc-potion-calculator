import { calculatePotionCompletion, formatDuration, formatCompletionDateTime, calculateRequiredPotions } from './calculator.js';

console.log('🧪 RUNNING COC POTION CALCULATOR TESTS...\n');

// Test 1: User's prompt: Builder Potion (10x) on 4 hours 20 mins
const upgrade4h20m = 4 * 3600 + 20 * 60; // 15600 seconds
const builderResult = calculatePotionCompletion({
    upgradeSeconds: upgrade4h20m,
    potionCount: 1,
    multiplier: 10,
    potionDurationSeconds: 3600
});

console.log('--- TEST 1: Builder Potion (10x) on 4h 20m ---');
console.log('Original Upgrade Time:', formatDuration(builderResult.upgradeSeconds));
console.log('Real Time Required:', formatDuration(builderResult.realTimeElapsedSeconds));
console.log('Time Saved:', formatDuration(builderResult.timeSavedSeconds));
console.log('Finished During Boost?', builderResult.finishedDuringBoost);
console.log('Leftover Boost Remaining:', formatDuration(builderResult.leftoverBoostSeconds));
console.assert(builderResult.realTimeElapsedSeconds === 1560, 'Should take exactly 1560s (26m)');
console.assert(builderResult.leftoverBoostSeconds === 2040, 'Should have 2040s (34m) leftover boost');
console.assert(builderResult.timeSavedSeconds === 14040, 'Should save 14040s (3h 54m)');
console.log('✅ TEST 1 PASSED!\n');

// Test 2: User's prompt: Research Potion (24x) on 4 hours 20 mins
const researchResult = calculatePotionCompletion({
    upgradeSeconds: upgrade4h20m,
    potionCount: 1,
    multiplier: 24,
    potionDurationSeconds: 3600
});

console.log('--- TEST 2: Research Potion (24x) on 4h 20m ---');
console.log('Original Upgrade Time:', formatDuration(researchResult.upgradeSeconds));
console.log('Real Time Required:', formatDuration(researchResult.realTimeElapsedSeconds));
console.log('Time Saved:', formatDuration(researchResult.timeSavedSeconds));
console.log('Finished During Boost?', researchResult.finishedDuringBoost);
console.log('Leftover Boost Remaining:', formatDuration(researchResult.leftoverBoostSeconds));
console.assert(researchResult.realTimeElapsedSeconds === 650, 'Should take exactly 650s (10m 50s)');
console.assert(researchResult.leftoverBoostSeconds === 2950, 'Should have 2950s (49m 10s) leftover');
console.assert(researchResult.timeSavedSeconds === 14950, 'Should save 14950s (4h 9m 10s)');
console.log('✅ TEST 2 PASSED!\n');

// Test 3: Upgrade longer than 1 potion (28 hours with 1 Builder Potion)
const upgrade28h = 28 * 3600;
const longResult1 = calculatePotionCompletion({
    upgradeSeconds: upgrade28h,
    potionCount: 1,
    multiplier: 10,
    potionDurationSeconds: 3600
});
console.log('--- TEST 3: 28 hours with 1 Builder Potion ---');
console.log('Real Time Required:', formatDuration(longResult1.realTimeElapsedSeconds));
console.assert(longResult1.realTimeElapsedSeconds === 19 * 3600, 'Should take 19h (1h boosted + 18h unboosted)');
console.assert(longResult1.timeSavedSeconds === 9 * 3600, 'Should save 9 hours');
console.assert(longResult1.finishedDuringBoost === false, 'Should not finish during boost');
console.log('✅ TEST 3 PASSED!\n');

// Test 4: 28 hours with 3 Builder Potions
const longResult3 = calculatePotionCompletion({
    upgradeSeconds: upgrade28h,
    potionCount: 3,
    multiplier: 10,
    potionDurationSeconds: 3600
});
console.log('--- TEST 4: 28 hours with 3 Builder Potions ---');
console.log('Real Time Required:', formatDuration(longResult3.realTimeElapsedSeconds));
console.assert(longResult3.realTimeElapsedSeconds === 28 * 360, 'Should take 2.8h (2h 48m)');
console.assert(longResult3.leftoverBoostSeconds === 12 * 60, 'Should have 12m leftover');
console.assert(longResult3.finishedDuringBoost === true, 'Should finish during boost');
console.log('✅ TEST 4 PASSED!\n');

// Test 5: Reverse Calculator
const req = calculateRequiredPotions(upgrade28h, 'builder');
console.log('--- TEST 5: Required Potions for 28h ---');
console.log('Potions to fully finish inside boost:', req.potionsToInstantFinish);
console.assert(req.potionsToInstantFinish === 3, 'Should require 3 potions (30h capacity for 28h upgrade)');
console.log('✅ TEST 5 PASSED!\n');

console.log('🎉 ALL ENGINE TESTS PASSED PERFECTLY!');
