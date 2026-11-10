/**
 * Clash of Clans Potion Calculator - Web Application Logic
 * Runs seamlessly both via local file:// protocol and hosted HTTP servers.
 */

// Retrieve calculator engine from global window or fallback
const CocEngine = (typeof window !== 'undefined' && window.CocCalc) ? window.CocCalc : {};

const {
    POTION_TYPES = {},
    calculatePotionCompletion,
    calculateRequiredPotions,
    formatDuration,
    formatDurationFriendly,
    formatCompletionDateTime
} = CocEngine;

// Application State
const state = {
    selectedPotionKey: 'builder',
    days: 0,
    hours: 4,
    minutes: 20,
    seconds: 0,
    potionCount: 1,
    hasOngoingPotion: false,
    activeMinutesRemaining: 30,
    isCustomStartTime: false,
    customStartTime: null,
    customMultiplier: 10,
    customDurationMins: 60,
    soundEnabled: true,
    activeCountdownInterval: null,
    countdownTargetTimestamp: null,
    
    // Multi-builder Village State
    villagePotionCount: 1,
    villageSlots: [
        { id: 1, name: 'Builder 1: Town Hall / Eagle', days: 2, hours: 14, mins: 0, type: 'builder' },
        { id: 2, name: 'Builder 2: Archer Queen', days: 1, hours: 6, mins: 0, type: 'builder' },
        { id: 3, name: 'Builder 3: Grand Warden', days: 0, hours: 18, mins: 30, type: 'builder' },
        { id: 4, name: 'Builder 4: Scattershot / Cannon', days: 0, hours: 4, mins: 20, type: 'builder' },
        { id: 5, name: 'Builder 5: Hidden Tesla', days: 0, hours: 9, mins: 0, type: 'builder' },
        { id: 6, name: 'Builder 6: B.O.B / Trap', days: 0, hours: 1, mins: 45, type: 'builder' },
        { id: 7, name: 'Laboratory: Troop / Spell', days: 1, hours: 0, mins: 0, type: 'lab' },
        { id: 8, name: 'Pet House: Hero Pet', days: 0, hours: 12, mins: 0, type: 'pet' }
    ]
};

// Web Audio API Sound Effects Synthesizer (No external audio files needed)
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(type) {
    if (!state.soundEnabled) return;
    try {
        initAudio();
        if (!audioCtx) return;

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.06);
            osc.start(now);
            osc.stop(now + 0.06);
        } else if (type === 'preset') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.09);
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.09);
            osc.start(now);
            osc.stop(now + 0.09);
        } else if (type === 'potion_switch') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(329.63, now);
            osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.12);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'victory') {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const noteOsc = audioCtx.createOscillator();
                const noteGain = audioCtx.createGain();
                noteOsc.connect(noteGain);
                noteGain.connect(audioCtx.destination);

                noteOsc.type = 'triangle';
                noteOsc.frequency.setValueAtTime(freq, now + idx * 0.08);
                noteGain.gain.setValueAtTime(0.1, now + idx * 0.08);
                noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

                noteOsc.start(now + idx * 0.08);
                noteOsc.stop(now + idx * 0.08 + 0.4);
            });
        }
    } catch (e) {
        console.warn('Audio play error:', e);
    }
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 shadow-xl text-xs font-semibold text-slate-100 flex items-center space-x-2 transform transition-all duration-300 translate-y-2 opacity-0 pointer-events-auto';
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'warn') icon = 'alert-triangle';

    toast.innerHTML = `
        <i data-lucide="${icon}" class="w-4 h-4 ${type === 'success' ? 'text-emerald-400' : 'text-amber-400'}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons({ root: toast });

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Tab Switching
function setupTabs() {
    const tabButtons = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            playSound('click');

            tabButtons.forEach(b => {
                b.classList.remove('active-tab', 'text-white');
                b.classList.add('text-slate-400');
            });
            btn.classList.add('active-tab', 'text-white');
            btn.classList.remove('text-slate-400');

            tabContents.forEach(c => {
                if (c.id === `tab-${targetTab}`) {
                    c.classList.remove('hidden');
                    c.classList.add('block');
                } else {
                    c.classList.remove('block');
                    c.classList.add('hidden');
                }
            });

            if (targetTab === 'reverse') {
                updateReverseCalculator();
            } else if (targetTab === 'village') {
                renderVillageDashboard();
            }

            if (window.lucide) window.lucide.createIcons();
        });
    });
}

// Live Header Clock
function setupLiveClock() {
    const clockEl = document.getElementById('headerLiveClock');
    if (!clockEl) return;

    function tick() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    tick();
    setInterval(tick, 1000);
}

// Calculation Engine Trigger & DOM Updates
function updateSingleCalculator() {
    const totalUpgradeSeconds = (state.days * 86400) + (state.hours * 3600) + (state.minutes * 60) + state.seconds;
    
    let multiplier = 10;
    let durationSeconds = 3600;
    
    if (state.selectedPotionKey === 'custom') {
        multiplier = Math.max(1, state.customMultiplier);
        durationSeconds = Math.max(1, state.customDurationMins * 60);
    } else {
        const potionConfig = POTION_TYPES[state.selectedPotionKey] || POTION_TYPES.builder;
        multiplier = potionConfig.multiplier;
        durationSeconds = potionConfig.durationSeconds;
    }

    const activeBoostSeconds = state.hasOngoingPotion ? (state.activeMinutesRemaining * 60) : 0;
    
    let startTimestamp = Date.now();
    if (state.isCustomStartTime && state.customStartTime) {
        startTimestamp = new Date(state.customStartTime).getTime();
    }

    const calcResult = calculatePotionCompletion({
        upgradeSeconds: totalUpgradeSeconds,
        potionCount: state.potionCount,
        multiplier,
        potionDurationSeconds: durationSeconds,
        activeBoostSeconds,
        startTime: startTimestamp
    });

    state.lastCalcResult = calcResult;

    // Update Hero Completion Time
    const completionEl = document.getElementById('resultCompletionDateTime');
    if (completionEl) {
        completionEl.textContent = formatCompletionDateTime(calcResult.completionDate);
    }

    // Relative Time
    const relativeTimeEl = document.getElementById('resultRelativeTime');
    if (relativeTimeEl) {
        if (calcResult.upgradeSeconds <= 0) {
            relativeTimeEl.textContent = 'Completed immediately (0s)';
        } else {
            relativeTimeEl.textContent = `finishes in ${formatDuration(calcResult.realTimeElapsedSeconds)} of real time`;
        }
    }

    // Boost Status Badge
    const boostBadge = document.getElementById('boostStatusBadge');
    if (boostBadge) {
        if (calcResult.finishedDuringBoost) {
            boostBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1';
            boostBadge.innerHTML = `<i data-lucide="zap" class="w-3 h-3"></i><span>Finishes During ${multiplier}x Boost!</span>`;
        } else {
            boostBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1';
            boostBadge.innerHTML = `<i data-lucide="clock" class="w-3 h-3"></i><span>Finishes After Boost (Normal Speed)</span>`;
        }
    }

    // 3 Stat Cards
    const realTimeEl = document.getElementById('resultRealTime');
    const origTimeEl = document.getElementById('resultOriginalTime');
    const timeSavedEl = document.getElementById('resultTimeSaved');
    const efficiencyEl = document.getElementById('resultEfficiencyPercent');
    const leftoverBoostEl = document.getElementById('resultLeftoverBoost');
    const leftoverSubtextEl = document.getElementById('resultLeftoverSubtext');

    if (realTimeEl) realTimeEl.textContent = formatDuration(calcResult.realTimeElapsedSeconds);
    if (origTimeEl) origTimeEl.textContent = `was ${formatDuration(totalUpgradeSeconds)}`;
    if (timeSavedEl) timeSavedEl.textContent = formatDuration(calcResult.timeSavedSeconds);
    if (efficiencyEl) efficiencyEl.textContent = `${calcResult.efficiencyPercent}% time shaved off`;

    if (leftoverBoostEl) {
        leftoverBoostEl.textContent = formatDuration(calcResult.leftoverBoostSeconds);
    }
    if (leftoverSubtextEl) {
        if (calcResult.leftoverBoostSeconds > 0) {
            leftoverSubtextEl.textContent = `ready for your next upgrade`;
            leftoverSubtextEl.className = 'text-[11px] text-cyan-400 mt-0.5';
        } else {
            leftoverSubtextEl.textContent = `100% boost used up`;
            leftoverSubtextEl.className = 'text-[11px] text-slate-500 mt-0.5';
        }
    }

    // Timeline Progress Bar
    const boostBar = document.getElementById('timelineBoostBar');
    const normalBar = document.getElementById('timelineNormalBar');
    const boostText = document.getElementById('timelineBoostText');
    const normalText = document.getElementById('timelineNormalText');
    const speedSummary = document.getElementById('timelineSpeedSummary');

    if (speedSummary) {
        speedSummary.textContent = `${multiplier}x Boost Active`;
    }

    if (boostBar && normalBar) {
        if (calcResult.realTimeElapsedSeconds <= 0) {
            boostBar.style.width = '100%';
            normalBar.style.width = '0%';
        } else {
            const boostPercent = Math.min(100, Math.round((calcResult.boostTimeConsumedSeconds / calcResult.realTimeElapsedSeconds) * 100));
            const normalPercent = 100 - boostPercent;
            boostBar.style.width = `${boostPercent}%`;
            normalBar.style.width = `${normalPercent}%`;

            if (boostText) {
                boostText.textContent = `Boosted Phase: ${formatDuration(calcResult.boostTimeConsumedSeconds)} @ ${multiplier}x`;
            }
            if (normalText) {
                normalText.textContent = `Normal: ${formatDuration(calcResult.progressAtNormalSpeedSeconds)} @ 1x`;
            }
        }
    }

    // Dynamic Math Breakdown Explanation Text
    const explanationEl = document.getElementById('calculationExplanationText');
    if (explanationEl) {
        const potionName = POTION_TYPES[state.selectedPotionKey]?.name || 'Potion';
        const formattedTotal = formatDuration(totalUpgradeSeconds);
        const formattedReal = formatDuration(calcResult.realTimeElapsedSeconds);
        const formattedSaved = formatDuration(calcResult.timeSavedSeconds);
        const formattedLeftover = formatDuration(calcResult.leftoverBoostSeconds);
        const totalBoostHours = (calcResult.totalBoostRealSeconds / 3600);
        const boostProgressCapacityHours = totalBoostHours * multiplier;

        let explanationHtml = `
            <p>For your <strong class="text-white">${formattedTotal}</strong> upgrade using ${state.potionCount} <strong class="text-amber-400">${potionName} (${multiplier}x)</strong>:</p>
            <p>• In ${totalBoostHours} real hour(s) of boost duration, this potion can complete up to <strong class="text-cyan-300">${boostProgressCapacityHours} hours</strong> of upgrade progress.</p>
        `;

        if (calcResult.finishedDuringBoost) {
            explanationHtml += `
                <p>• Since your upgrade requires ${formattedTotal} (which is within the ${boostProgressCapacityHours}h limit), it runs at ${multiplier}x speed the entire time!</p>
                <p>• Real-world time: <strong class="text-emerald-400 font-bold">${formattedReal}</strong>.</p>
                <p>• You save <strong class="text-emerald-300 font-bold">${formattedSaved}</strong>, and you still have <strong class="text-cyan-400 font-bold">${formattedLeftover}</strong> of active ${multiplier}x boost left over for whatever you upgrade next!</p>
            `;
        } else {
            explanationHtml += `
                <p>• During the boosted hour(s), <strong class="text-cyan-300">${boostProgressCapacityHours} hours</strong> of upgrade progress are completed.</p>
                <p>• The remaining <strong class="text-slate-200">${formatDuration(calcResult.progressAtNormalSpeedSeconds)}</strong> continues at standard 1x speed after the boost expires.</p>
                <p>• Total real-world wait: <strong class="text-amber-400 font-bold">${formattedReal}</strong> (Saving <strong class="text-emerald-400 font-bold">${formattedSaved}</strong>).</p>
            `;
        }

        explanationEl.innerHTML = explanationHtml;
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Setup Presets
function setupPresets() {
    const presetButtons = document.querySelectorAll('[data-preset]');
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            playSound('preset');
            const preset = btn.getAttribute('data-preset');

            state.days = 0;
            state.hours = 0;
            state.minutes = 0;
            state.seconds = 0;

            if (preset === '4h20m') {
                state.hours = 4;
                state.minutes = 20;
            } else if (preset === '30m') {
                state.minutes = 30;
            } else if (preset === '1h') {
                state.hours = 1;
            } else if (preset === '2h') {
                state.hours = 2;
            } else if (preset === '8h') {
                state.hours = 8;
            } else if (preset === '12h') {
                state.hours = 12;
            } else if (preset === '1d') {
                state.days = 1;
            } else if (preset === '2d') {
                state.days = 2;
            } else if (preset === '5d') {
                state.days = 5;
            } else if (preset === '7d') {
                state.days = 7;
            }

            syncInputsFromState();
            updateSingleCalculator();
            showToast(`Loaded ${preset} preset!`, 'info');
        });
    });
}

function syncInputsFromState() {
    const inputD = document.getElementById('inputDays');
    const inputH = document.getElementById('inputHours');
    const inputM = document.getElementById('inputMins');
    const inputS = document.getElementById('inputSecs');

    if (inputD) inputD.value = state.days;
    if (inputH) inputH.value = state.hours;
    if (inputM) inputM.value = state.minutes;
    if (inputS) inputS.value = state.seconds;
}

// Setup Potion Selection Buttons
function setupPotionSelection() {
    const potionButtons = document.querySelectorAll('.potion-btn');
    const customControls = document.getElementById('customControls');
    const potionNoteText = document.getElementById('potionDescriptionText');
    const multiplierBadge = document.getElementById('activePotionMultiplierBadge');

    potionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const potionKey = btn.getAttribute('data-potion');
            if (potionKey === state.selectedPotionKey) return;

            playSound('potion_switch');
            state.selectedPotionKey = potionKey;

            potionButtons.forEach(b => b.classList.remove('active-potion'));
            btn.classList.add('active-potion');

            const potion = POTION_TYPES[potionKey];

            if (potionKey === 'custom') {
                if (customControls) customControls.classList.remove('hidden');
                if (multiplierBadge) multiplierBadge.textContent = `${state.customMultiplier}x Custom`;
                if (potionNoteText) potionNoteText.textContent = 'Custom multiplier and duration boost active.';
            } else {
                if (customControls) customControls.classList.add('hidden');
                if (multiplierBadge && potion) {
                    multiplierBadge.textContent = `${potion.multiplier}x Speed`;
                    multiplierBadge.style.color = potion.accentColor;
                    multiplierBadge.style.borderColor = potion.color;
                }
                if (potionNoteText && potion) potionNoteText.textContent = potion.description;
            }

            updateSingleCalculator();
        });
    });

    const customMultInput = document.getElementById('customMultiplier');
    const customDurInput = document.getElementById('customDurationMins');

    if (customMultInput) {
        customMultInput.addEventListener('input', (e) => {
            state.customMultiplier = parseFloat(e.target.value) || 1;
            updateSingleCalculator();
        });
    }

    if (customDurInput) {
        customDurInput.addEventListener('input', (e) => {
            state.customDurationMins = parseFloat(e.target.value) || 60;
            updateSingleCalculator();
        });
    }
}

// Setup Upgrade Time Number Inputs
function setupInputs() {
    const inputD = document.getElementById('inputDays');
    const inputH = document.getElementById('inputHours');
    const inputM = document.getElementById('inputMins');
    const inputS = document.getElementById('inputSecs');
    const clearBtn = document.getElementById('clearUpgradeBtn');

    const updateFromInputs = () => {
        state.days = Math.max(0, parseInt(inputD.value) || 0);
        state.hours = Math.max(0, parseInt(inputH.value) || 0);
        state.minutes = Math.max(0, parseInt(inputM.value) || 0);
        state.seconds = Math.max(0, parseInt(inputS.value) || 0);
        updateSingleCalculator();
    };

    [inputD, inputH, inputM, inputS].forEach(input => {
        if (input) {
            input.addEventListener('input', updateFromInputs);
            input.addEventListener('change', updateFromInputs);
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            playSound('click');
            state.days = 0;
            state.hours = 0;
            state.minutes = 0;
            state.seconds = 0;
            syncInputsFromState();
            updateSingleCalculator();
            showToast('Cleared upgrade time', 'info');
        });
    }

    // Potion Count Stepper
    const potionMinus = document.getElementById('potionMinusBtn');
    const potionPlus = document.getElementById('potionPlusBtn');
    const potionInput = document.getElementById('inputPotionCount');
    const potionLabel = document.getElementById('potionTotalBoostLabel');

    const updatePotionCount = (newCount) => {
        state.potionCount = Math.max(1, Math.min(50, newCount));
        if (potionInput) potionInput.value = state.potionCount;
        
        const mult = state.selectedPotionKey === 'research' ? 24 : 10;
        if (potionLabel) {
            potionLabel.textContent = `${state.potionCount} Potion(s) = ${state.potionCount} hr boost (${state.potionCount * mult}h progress)`;
        }
        updateSingleCalculator();
    };

    if (potionMinus) {
        potionMinus.addEventListener('click', () => {
            playSound('click');
            updatePotionCount(state.potionCount - 1);
        });
    }

    if (potionPlus) {
        potionPlus.addEventListener('click', () => {
            playSound('click');
            updatePotionCount(state.potionCount + 1);
        });
    }

    if (potionInput) {
        potionInput.addEventListener('input', (e) => {
            updatePotionCount(parseInt(e.target.value) || 1);
        });
    }

    // Ongoing Potion Checkbox
    const toggleOngoing = document.getElementById('toggleOngoingPotion');
    const ongoingInputs = document.getElementById('ongoingPotionInputs');
    const activeMinutesInput = document.getElementById('inputActiveMinutes');

    if (toggleOngoing) {
        toggleOngoing.addEventListener('change', (e) => {
            playSound('click');
            state.hasOngoingPotion = e.target.checked;
            if (ongoingInputs) {
                if (state.hasOngoingPotion) {
                    ongoingInputs.classList.remove('hidden');
                } else {
                    ongoingInputs.classList.add('hidden');
                }
            }
            updateSingleCalculator();
        });
    }

    if (activeMinutesInput) {
        activeMinutesInput.addEventListener('input', (e) => {
            state.activeMinutesRemaining = Math.max(0, parseInt(e.target.value) || 0);
            updateSingleCalculator();
        });
    }

    // Future Start Time Checkbox
    const toggleCustomStart = document.getElementById('toggleCustomStartTime');
    const customStartInputs = document.getElementById('customStartTimeInputs');
    const customStartTimeInput = document.getElementById('inputCustomStartTime');

    if (toggleCustomStart) {
        toggleCustomStart.addEventListener('change', (e) => {
            playSound('click');
            state.isCustomStartTime = e.target.checked;
            if (customStartInputs) {
                if (state.isCustomStartTime) {
                    customStartInputs.classList.remove('hidden');
                    if (!state.customStartTime) {
                        const now = new Date();
                        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                        customStartTimeInput.value = now.toISOString().slice(0, 16);
                        state.customStartTime = customStartTimeInput.value;
                    }
                } else {
                    customStartInputs.classList.add('hidden');
                }
            }
            updateSingleCalculator();
        });
    }

    if (customStartTimeInput) {
        customStartTimeInput.addEventListener('change', (e) => {
            state.customStartTime = e.target.value;
            updateSingleCalculator();
        });
    }
}

// Copy Calculation to Clipboard
function setupCopyButton() {
    const copyBtn = document.getElementById('copyResultBtn');
    const copyBtnText = document.getElementById('copyBtnText');

    if (!copyBtn) return;

    copyBtn.addEventListener('click', () => {
        playSound('click');
        const calc = state.lastCalcResult;
        if (!calc) return;

        const potionName = POTION_TYPES[state.selectedPotionKey]?.name || 'Potion';
        const formattedTotal = formatDuration(calc.upgradeSeconds);
        const completionStr = formatCompletionDateTime(calc.completionDate);
        const waitStr = formatDuration(calc.realTimeElapsedSeconds);
        const savedStr = formatDuration(calc.timeSavedSeconds);

        const textToCopy = `🏰 Clash of Clans Potion Calculator:
⚡ ${state.potionCount}x ${potionName} (${calc.speedMultiplier}x Speed)
⏳ Upgrade Time: ${formattedTotal}
🕒 Completes At: ${completionStr} (in ${waitStr})
🚀 Time Saved: ${savedStr} (${calc.efficiencyPercent}% faster!)
🧪 Leftover Boost: ${formatDuration(calc.leftoverBoostSeconds)}`;

        navigator.clipboard.writeText(textToCopy).then(() => {
            if (copyBtnText) copyBtnText.textContent = 'Copied to Clipboard!';
            showToast('Calculation copied to clipboard!', 'success');
            setTimeout(() => {
                if (copyBtnText) copyBtnText.textContent = 'Copy Calculation';
            }, 2500);
        }).catch(err => {
            console.error('Clipboard copy error:', err);
            showToast('Failed to copy to clipboard', 'warn');
        });
    });
}

// Live Countdown Timer
function setupCountdownTimer() {
    const startBtn = document.getElementById('startCountdownBtn');
    const stopBtn = document.getElementById('stopCountdownBtn');
    const countdownCard = document.getElementById('activeCountdownCard');
    const tickingClock = document.getElementById('liveTickingClock');
    const countdownBtnText = document.getElementById('countdownBtnText');

    if (!startBtn) return;

    startBtn.addEventListener('click', () => {
        playSound('click');
        const calc = state.lastCalcResult;
        if (!calc || calc.upgradeSeconds <= 0) {
            showToast('Please enter an upgrade time first!', 'warn');
            return;
        }

        if (state.activeCountdownInterval) {
            clearInterval(state.activeCountdownInterval);
        }

        state.countdownTargetTimestamp = Date.now() + Math.round(calc.realTimeElapsedSeconds * 1000);
        countdownCard.classList.remove('hidden');
        countdownBtnText.textContent = 'Timer Running';
        startBtn.classList.add('opacity-75');

        showToast('Live upgrade countdown started!', 'success');

        const updateTick = () => {
            const now = Date.now();
            const diffMs = state.countdownTargetTimestamp - now;

            if (diffMs <= 0) {
                clearInterval(state.activeCountdownInterval);
                state.activeCountdownInterval = null;
                tickingClock.textContent = '00:00:00 - DONE!';
                countdownBtnText.textContent = 'Start Live Timer';
                startBtn.classList.remove('opacity-75');
                playSound('victory');
                showToast('🎉 UPGRADE 100% COMPLETE! Builder is free!', 'success');
                return;
            }

            const totalSec = Math.floor(diffMs / 1000);
            const h = Math.floor(totalSec / 3600);
            const m = Math.floor((totalSec % 3600) / 60);
            const s = totalSec % 60;

            const pad = (num) => String(num).padStart(2, '0');
            tickingClock.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
        };

        updateTick();
        state.activeCountdownInterval = setInterval(updateTick, 1000);
    });

    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            playSound('click');
            if (state.activeCountdownInterval) {
                clearInterval(state.activeCountdownInterval);
                state.activeCountdownInterval = null;
            }
            countdownCard.classList.add('hidden');
            countdownBtnText.textContent = 'Start Live Timer';
            startBtn.classList.remove('opacity-75');
            showToast('Countdown stopped', 'info');
        });
    }
}

// TAB 2: REVERSE CALCULATOR ("HOW MANY POTIONS DO I NEED?")
function updateReverseCalculator() {
    const potionType = document.getElementById('reversePotionType')?.value || 'builder';
    const days = parseInt(document.getElementById('reverseDays')?.value) || 0;
    const hours = parseInt(document.getElementById('reverseHours')?.value) || 0;
    const mins = parseInt(document.getElementById('reverseMins')?.value) || 0;

    const totalSeconds = (days * 86400) + (hours * 3600) + (mins * 60);

    const reverseData = calculateRequiredPotions(totalSeconds, potionType);
    
    const recHeadline = document.getElementById('reverseRecHeadline');
    const recSubtext = document.getElementById('reverseRecSubtext');
    const recBadge = document.getElementById('reverseRecBadge');

    const mult = reverseData.potionConfig.multiplier;
    const reqPotions = reverseData.potionsToInstantFinish;
    const fastestRealSec = totalSeconds / mult;

    if (recHeadline) {
        recHeadline.textContent = `Drink ${reqPotions} ${reverseData.potionConfig.name}${reqPotions > 1 ? 's' : ''} to finish in ${formatDurationFriendly(fastestRealSec)}!`;
    }
    if (recSubtext) {
        recSubtext.textContent = `Each potion completes ${formatDurationFriendly(reverseData.progressPerPotion)} of work (${mult}x speed). ${reqPotions} potions covers ${formatDurationFriendly(reqPotions * reverseData.progressPerPotion)}.`;
    }
    if (recBadge) {
        recBadge.textContent = `${reqPotions}x`;
    }

    const tableBody = document.getElementById('reverseTableBody');
    if (!tableBody) return;

    let rowsHtml = '';
    reverseData.tiers.forEach(tier => {
        const isOptimal = tier.potionCount === reqPotions;
        const rowClass = isOptimal ? 'bg-amber-500/10 font-bold border-l-2 border-amber-400' : 'hover:bg-slate-800/40';

        rowsHtml += `
            <tr class="${rowClass}">
                <td class="py-3 px-3 flex items-center space-x-2">
                    <span class="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-gaming">${tier.potionCount} Potion${tier.potionCount > 1 ? 's' : ''}</span>
                    ${isOptimal ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">FASTEST</span>' : ''}
                </td>
                <td class="py-3 px-3 text-white font-gaming">${formatDuration(tier.realTimeElapsedSeconds)}</td>
                <td class="py-3 px-3 text-emerald-400">${formatDuration(tier.timeSavedSeconds)}</td>
                <td class="py-3 px-3">
                    ${tier.finishedDuringBoost 
                        ? '<span class="text-emerald-400 flex items-center space-x-1"><i data-lucide="zap" class="w-3 h-3"></i><span>Finishes in Boost</span></span>' 
                        : '<span class="text-slate-400">Continues at 1x</span>'}
                </td>
                <td class="py-3 px-3 text-cyan-400 font-gaming">${formatDuration(tier.leftoverBoostSeconds)}</td>
            </tr>
        `;
    });

    tableBody.innerHTML = rowsHtml;
    if (window.lucide) window.lucide.createIcons();
}

function setupReverseCalculatorListeners() {
    const inputs = ['reversePotionType', 'reverseDays', 'reverseHours', 'reverseMins'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                playSound('click');
                updateReverseCalculator();
            });
            el.addEventListener('change', () => {
                updateReverseCalculator();
            });
        }
    });
}

// TAB 3: VILLAGE MULTI-BUILDER DASHBOARD
function renderVillageDashboard() {
    const grid = document.getElementById('villageBuildersGrid');
    const totalSavedText = document.getElementById('villageTotalSavedText');
    const potionCountDisplay = document.getElementById('villagePotionCountDisplay');

    if (!grid) return;

    if (potionCountDisplay) {
        potionCountDisplay.textContent = state.villagePotionCount;
    }

    let totalCombinedSecondsSaved = 0;
    let cardsHtml = '';

    state.villageSlots.forEach((slot, index) => {
        const totalSlotSeconds = (slot.days * 86400) + (slot.hours * 3600) + (slot.mins * 60);
        const multiplier = slot.type === 'lab' || slot.type === 'pet' ? 24 : 10;
        const potionsToApply = state.villagePotionCount;
        
        const result = calculatePotionCompletion({
            upgradeSeconds: totalSlotSeconds,
            potionCount: potionsToApply,
            multiplier,
            potionDurationSeconds: 3600
        });

        totalCombinedSecondsSaved += result.timeSavedSeconds;

        const isLab = slot.type === 'lab';
        const isPet = slot.type === 'pet';
        const badgeColor = isLab ? 'text-cyan-400 bg-cyan-950/40 border-cyan-800/50' : (isPet ? 'text-purple-400 bg-purple-950/40 border-purple-800/50' : 'text-blue-400 bg-blue-950/40 border-blue-800/50');
        const iconName = isLab ? 'flask-conical' : (isPet ? 'paw-print' : 'hammer');

        cardsHtml += `
            <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <div class="w-7 h-7 rounded-lg ${badgeColor} border flex items-center justify-center">
                            <i data-lucide="${iconName}" class="w-3.5 h-3.5"></i>
                        </div>
                        <input type="text" data-slot-id="${slot.id}" value="${slot.name}" class="village-name-input bg-transparent text-xs font-bold text-slate-200 border-b border-transparent hover:border-slate-700 focus:border-amber-400 focus:outline-none">
                    </div>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor} border">${multiplier}x Speed</span>
                </div>

                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <span class="text-[10px] text-slate-500 uppercase block font-semibold">Days</span>
                        <input type="number" min="0" max="30" data-slot-field="days" data-slot-id="${slot.id}" value="${slot.days}" class="village-time-input coc-input w-full py-1 text-center text-xs font-gaming rounded">
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-500 uppercase block font-semibold">Hours</span>
                        <input type="number" min="0" max="23" data-slot-field="hours" data-slot-id="${slot.id}" value="${slot.hours}" class="village-time-input coc-input w-full py-1 text-center text-xs font-gaming rounded text-amber-300">
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-500 uppercase block font-semibold">Mins</span>
                        <input type="number" min="0" max="59" data-slot-field="mins" data-slot-id="${slot.id}" value="${slot.mins}" class="village-time-input coc-input w-full py-1 text-center text-xs font-gaming rounded text-cyan-300">
                    </div>
                </div>

                <div class="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <div>
                        <div class="text-[11px] text-slate-400">Finish Time:</div>
                        <div class="font-bold text-white">${formatCompletionDateTime(result.completionDate)}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-[11px] text-slate-400">Time Saved:</div>
                        <div class="font-bold text-emerald-400">${formatDuration(result.timeSavedSeconds)}</div>
                    </div>
                </div>
            </div>
        `;
    });

    grid.innerHTML = cardsHtml;

    if (totalSavedText) {
        totalSavedText.textContent = `${formatDurationFriendly(totalCombinedSecondsSaved)} Total Village Time Saved!`;
    }

    if (window.lucide) window.lucide.createIcons();

    document.querySelectorAll('.village-time-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const slotId = parseInt(e.target.getAttribute('data-slot-id'));
            const field = e.target.getAttribute('data-slot-field');
            const val = Math.max(0, parseInt(e.target.value) || 0);

            const targetSlot = state.villageSlots.find(s => s.id === slotId);
            if (targetSlot) {
                targetSlot[field] = val;
                renderVillageDashboard();
            }
        });
    });

    document.querySelectorAll('.village-name-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const slotId = parseInt(e.target.getAttribute('data-slot-id'));
            const targetSlot = state.villageSlots.find(s => s.id === slotId);
            if (targetSlot) {
                targetSlot.name = e.target.value;
            }
        });
    });
}

function setupVillageListeners() {
    const minusBtn = document.getElementById('villagePotionMinus');
    const plusBtn = document.getElementById('villagePotionPlus');
    const resetBtn = document.getElementById('resetVillageDefaultsBtn');

    if (minusBtn) {
        minusBtn.addEventListener('click', () => {
            playSound('click');
            state.villagePotionCount = Math.max(1, state.villagePotionCount - 1);
            renderVillageDashboard();
        });
    }

    if (plusBtn) {
        plusBtn.addEventListener('click', () => {
            playSound('click');
            state.villagePotionCount = Math.min(20, state.villagePotionCount + 1);
            renderVillageDashboard();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            playSound('click');
            state.villagePotionCount = 1;
            renderVillageDashboard();
            showToast('Reset village planners to default values', 'info');
        });
    }
}

// Sound Toggle Setup
function setupSoundToggle() {
    const soundBtn = document.getElementById('soundToggleBtn');
    const soundIcon = document.getElementById('soundIcon');

    if (!soundBtn) return;

    soundBtn.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        if (state.soundEnabled) {
            soundIcon.setAttribute('data-lucide', 'volume-2');
            soundBtn.classList.remove('text-rose-400');
            soundBtn.classList.add('text-slate-300');
            playSound('click');
            showToast('Sound effects enabled', 'info');
        } else {
            soundIcon.setAttribute('data-lucide', 'volume-x');
            soundBtn.classList.add('text-rose-400');
            showToast('Sound effects muted', 'info');
        }
        if (window.lucide) window.lucide.createIcons();
    });
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupLiveClock();
    setupPotionSelection();
    setupPresets();
    setupInputs();
    setupCopyButton();
    setupCountdownTimer();
    setupReverseCalculatorListeners();
    setupVillageListeners();
    setupSoundToggle();

    // Initial calculation run
    updateSingleCalculator();

    // Initial reverse calculator update
    updateReverseCalculator();
});
