/**
 * Clash of Clans Potion Calculator Engine
 * Handles all mathematical calculations for upgrade boosts, finish times,
 * leftover boost durations, and multi-builder projections.
 * 
 * Compatible with both ES Modules, CommonJS, and direct browser <script> inclusion (file:// protocol).
 */

const POTION_TYPES = {
    builder: {
        id: 'builder',
        name: 'Builder Potion',
        multiplier: 10,
        durationSeconds: 3600, // 1 hour
        category: 'builder',
        icon: 'hammer',
        color: '#3b82f6',
        accentColor: '#60a5fa',
        bgGradient: 'from-blue-600 to-indigo-900',
        description: 'Boosts building construction and hero upgrades by 10x for 1 hour. Affects ALL active builders simultaneously!',
        savingsPerHour: 9 * 3600 // 9 hours saved per full potion
    },
    research: {
        id: 'research',
        name: 'Research Potion',
        multiplier: 24,
        durationSeconds: 3600, // 1 hour
        category: 'lab',
        icon: 'flask-conical',
        color: '#06b6d4',
        accentColor: '#22d3ee',
        bgGradient: 'from-cyan-600 to-teal-900',
        description: 'Boosts Laboratory research speed by 24x for 1 hour. Completes 1 full day of research in 1 hour!',
        savingsPerHour: 23 * 3600 // 23 hours saved per full potion
    },
    pet: {
        id: 'pet',
        name: 'Pet Potion',
        multiplier: 24,
        durationSeconds: 3600, // 1 hour
        category: 'pet',
        icon: 'paw-print',
        color: '#a855f7',
        accentColor: '#c084fc',
        bgGradient: 'from-purple-600 to-fuchsia-950',
        description: 'Boosts Pet House upgrade speed by 24x for 1 hour. Shaves off 23 hours of pet upgrading time.',
        savingsPerHour: 23 * 3600
    },
    clock_tower: {
        id: 'clock_tower',
        name: 'Clock Tower Potion',
        multiplier: 10,
        durationSeconds: 1800, // 30 minutes
        category: 'builder_base',
        icon: 'clock',
        color: '#eab308',
        accentColor: '#facc15',
        bgGradient: 'from-amber-600 to-yellow-950',
        description: 'Activates the Builder Base Clock Tower boost for 30 minutes at 10x speed.',
        savingsPerHour: 4.5 * 3600
    },
    custom: {
        id: 'custom',
        name: 'Custom Booster',
        multiplier: 10,
        durationSeconds: 3600,
        category: 'custom',
        icon: 'sliders',
        color: '#ec4899',
        accentColor: '#f472b6',
        bgGradient: 'from-pink-600 to-rose-950',
        description: 'Customize any speed multiplier and potion duration.',
        savingsPerHour: 0
    }
};

/**
 * Calculates the exact completion details for an upgrade when one or more potions are applied.
 */
function calculatePotionCompletion({
    upgradeSeconds,
    potionCount = 1,
    multiplier = 10,
    potionDurationSeconds = 3600,
    activeBoostSeconds = 0,
    startTime = Date.now()
}) {
    const startTimestamp = typeof startTime === 'number' ? startTime : startTime.getTime();
    
    // Total available boosted real time
    const totalBoostRealSeconds = Math.max(0, activeBoostSeconds) + (Math.max(0, potionCount) * Math.max(0, potionDurationSeconds));
    
    // Maximum upgrade progress that can be completed during the boost period
    const maxBoostProgressSeconds = totalBoostRealSeconds * multiplier;
    
    let realTimeElapsedSeconds = 0;
    let boostTimeConsumedSeconds = 0;
    let leftoverBoostSeconds = 0;
    let finishedDuringBoost = false;
    let progressDuringBoostSeconds = 0;
    let progressAtNormalSpeedSeconds = 0;
    let unboostedRemainingSeconds = 0;

    if (upgradeSeconds <= 0) {
        return {
            upgradeSeconds: 0,
            realTimeElapsedSeconds: 0,
            completionTimestamp: startTimestamp,
            completionDate: new Date(startTimestamp),
            timeSavedSeconds: 0,
            finishedDuringBoost: true,
            boostTimeConsumedSeconds: 0,
            leftoverBoostSeconds: totalBoostRealSeconds,
            progressDuringBoostSeconds: 0,
            progressAtNormalSpeedSeconds: 0,
            totalBoostRealSeconds,
            speedMultiplier: multiplier,
            efficiencyPercent: 0
        };
    }

    if (totalBoostRealSeconds <= 0 || multiplier <= 1) {
        // No boost applied
        realTimeElapsedSeconds = upgradeSeconds;
        progressAtNormalSpeedSeconds = upgradeSeconds;
        leftoverBoostSeconds = 0;
        finishedDuringBoost = false;
    } else if (upgradeSeconds <= maxBoostProgressSeconds) {
        // Upgrade finishes while the boost is still active
        finishedDuringBoost = true;
        realTimeElapsedSeconds = upgradeSeconds / multiplier;
        boostTimeConsumedSeconds = realTimeElapsedSeconds;
        leftoverBoostSeconds = totalBoostRealSeconds - boostTimeConsumedSeconds;
        progressDuringBoostSeconds = upgradeSeconds;
        progressAtNormalSpeedSeconds = 0;
    } else {
        // Boost expires before the upgrade completes
        finishedDuringBoost = false;
        boostTimeConsumedSeconds = totalBoostRealSeconds;
        leftoverBoostSeconds = 0;
        progressDuringBoostSeconds = maxBoostProgressSeconds;
        
        unboostedRemainingSeconds = upgradeSeconds - maxBoostProgressSeconds;
        progressAtNormalSpeedSeconds = unboostedRemainingSeconds;
        
        // Real time = boost duration + unboosted remaining time
        realTimeElapsedSeconds = totalBoostRealSeconds + unboostedRemainingSeconds;
    }

    const completionTimestamp = startTimestamp + Math.round(realTimeElapsedSeconds * 1000);
    const timeSavedSeconds = Math.max(0, upgradeSeconds - realTimeElapsedSeconds);
    const efficiencyPercent = upgradeSeconds > 0 ? ((timeSavedSeconds / upgradeSeconds) * 100) : 0;

    return {
        upgradeSeconds,
        realTimeElapsedSeconds,
        completionTimestamp,
        completionDate: new Date(completionTimestamp),
        timeSavedSeconds,
        finishedDuringBoost,
        boostTimeConsumedSeconds,
        leftoverBoostSeconds,
        progressDuringBoostSeconds,
        progressAtNormalSpeedSeconds,
        totalBoostRealSeconds,
        speedMultiplier: multiplier,
        efficiencyPercent: Math.min(100, Math.round(efficiencyPercent * 10) / 10),
        
        // Timeline segments for visualization
        timeline: [
            {
                phase: 'Boosted Phase',
                speedMultiplier: multiplier,
                realDurationSeconds: boostTimeConsumedSeconds,
                upgradeProgressSeconds: progressDuringBoostSeconds,
                isBoosted: true
            },
            ...(progressAtNormalSpeedSeconds > 0 ? [{
                phase: 'Normal Speed Phase',
                speedMultiplier: 1,
                realDurationSeconds: progressAtNormalSpeedSeconds,
                upgradeProgressSeconds: progressAtNormalSpeedSeconds,
                isBoosted: false
            }] : [])
        ]
    };
}

/**
 * Calculates how many potions are required to achieve various milestones.
 */
function calculateRequiredPotions(upgradeSeconds, potionTypeKey = 'builder', customMultiplier = 10, customDuration = 3600) {
    const potionConfig = POTION_TYPES[potionTypeKey] || POTION_TYPES.builder;
    const multiplier = potionTypeKey === 'custom' ? customMultiplier : potionConfig.multiplier;
    const duration = potionTypeKey === 'custom' ? customDuration : potionConfig.durationSeconds;
    
    // Upgrade progress completed by 1 single full potion
    const progressPerPotion = duration * multiplier;
    
    // Exact potions needed to complete the entire upgrade inside boost
    const potionsToInstantFinish = Math.max(1, Math.ceil(upgradeSeconds / progressPerPotion));
    
    const tiers = [];
    const maxTiers = Math.min(10, Math.max(5, potionsToInstantFinish));
    
    for (let count = 1; count <= maxTiers; count++) {
        const result = calculatePotionCompletion({
            upgradeSeconds,
            potionCount: count,
            multiplier,
            potionDurationSeconds: duration
        });
        
        tiers.push({
            potionCount: count,
            realTimeElapsedSeconds: result.realTimeElapsedSeconds,
            timeSavedSeconds: result.timeSavedSeconds,
            finishedDuringBoost: result.finishedDuringBoost,
            leftoverBoostSeconds: result.leftoverBoostSeconds
        });

        if (result.finishedDuringBoost && count >= potionsToInstantFinish) {
            break;
        }
    }
    
    return {
        potionConfig,
        potionsToInstantFinish,
        progressPerPotion,
        tiers
    };
}

/**
 * Format seconds into human readable string: e.g. "4h 20m 00s" or "1d 2h 15m"
 */
function formatDuration(totalSeconds, includeSeconds = true) {
    if (isNaN(totalSeconds) || totalSeconds <= 0) return '0s';
    
    const sec = Math.round(totalSeconds);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
    if (includeSeconds || parts.length === 0) {
        if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    }
    
    return parts.join(' ');
}

/**
 * Format seconds into a compact tag like "26 mins" or "1d 4h"
 */
function formatDurationFriendly(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds <= 0) return '0 mins';
    
    const sec = Math.round(totalSeconds);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    if (d > 0) {
        return h > 0 ? `${d}d ${h}h` : `${d}d`;
    }
    if (h > 0) {
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    if (m > 0) {
        return s > 0 ? `${m}m ${s}s` : `${m}m`;
    }
    return `${s}s`;
}

/**
 * Formats a Date object into local date & time representation
 */
function formatCompletionDateTime(date) {
    if (!date || isNaN(date.getTime())) return 'N/A';
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    if (isToday) {
        return `Today at ${timeStr}`;
    }
    if (isTomorrow) {
        return `Tomorrow at ${timeStr}`;
    }
    
    const dateStr = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    return `${dateStr} at ${timeStr}`;
}

const CocCalc = {
    POTION_TYPES,
    calculatePotionCompletion,
    calculateRequiredPotions,
    formatDuration,
    formatDurationFriendly,
    formatCompletionDateTime
};

// Export for browser global
if (typeof window !== 'undefined') {
    window.CocCalc = CocCalc;
}

// Export for CommonJS / Node
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CocCalc;
}

// Export for ES modules
export {
    POTION_TYPES,
    calculatePotionCompletion,
    calculateRequiredPotions,
    formatDuration,
    formatDurationFriendly,
    formatCompletionDateTime
};

export default CocCalc;
