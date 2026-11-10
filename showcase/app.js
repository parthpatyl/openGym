/**
 * openGym Feature Showcase - High-Fidelity Reactive Engine
 * Author: Parth Patil
 * Zero-loss telemetry, persistent DOM probes, and real-time app replica
 */

(function () {
  'use strict';

  // Audio & Haptic Synthesizer
  let audioCtx = null;
  let audioEnabled = false;

  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function tone(freq, dur = 0.05, type = 'sine') {
    if (!audioEnabled) return;
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch (e) {}
  }

  // Melodic Synth Groove & Tracks (Tron Main Theme Wendy Carlos & The Weeknd Abyss)
  let musicPlaying = false;
  let musicInterval = null;
  let musicStep = 0;
  let squigglyAnimFrame = null;
  let wavePhase = 0;

  const MUSIC_TRACKS = [
    {
      title: "Tron Main Theme",
      artist: "Wendy Carlos",
      credit: "MUSIC BY WENDY CARLOS",
      curSec: 60, // 01:00
      totalSec: 93, // 01:33
      // Iconic Wendy Carlos electronic synthesizer arpeggio
      chords: [293.66, 349.23, 440.00, 523.25, 440.00, 349.23, 329.63, 261.63],
      oscType: 'sawtooth',
      filterFreq: 1100,
      tempo: 320
    },
    {
      title: "Abyss",
      artist: "The Weeknd",
      credit: "AFTER HOURS SESSIONS",
      curSec: 84, // 01:24
      totalSec: 222, // 03:42
      // R&B synth chords: Am7 - Fmaj7 - Dm7 - G
      chords: [220.00, 261.63, 329.63, 392.00, 349.23, 293.66, 261.63, 196.00],
      oscType: 'sine',
      filterFreq: 750,
      tempo: 380
    }
  ];
  let currentTrackIdx = 0;

  function playSynthNote() {
    if (!musicPlaying) return;
    try {
      const ctx = getAudioCtx();
      const track = MUSIC_TRACKS[currentTrackIdx];
      const note = track.chords[musicStep % track.chords.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = track.oscType;
      osc.frequency.setValueAtTime(note, ctx.currentTime);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(track.filterFreq, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.045, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.36);
      musicStep++;
    } catch (e) {}
  }

  function formatSec(s) {
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(Math.floor(s % 60)).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function updateSquigglyWave() {
    const track = MUSIC_TRACKS[currentTrackIdx];
    const wavePath = document.getElementById('music-wave-path');
    const thumbCircle = document.getElementById('music-thumb-circle');
    const timeCur = document.getElementById('music-time-cur');
    const timeEnd = document.getElementById('music-time-end');

    const totalWidth = 260; // viewBox 0 0 260 20
    const progress = Math.max(0, Math.min(1, track.curSec / track.totalSec));
    const thumbX = progress * totalWidth;

    if (timeCur) timeCur.textContent = formatSec(track.curSec);
    if (timeEnd) timeEnd.textContent = formatSec(track.totalSec);

    if (thumbCircle) {
      thumbCircle.setAttribute('cx', thumbX.toFixed(1));
      thumbCircle.setAttribute('cy', '10');
    }

    if (!wavePath) return;

    if (musicPlaying) {
      wavePhase += 0.12;
      const wavelength = 24;
      const amplitude = 3.6;
      let d = 'M 0 10';
      const step = 2.5;
      for (let x = 0; x <= thumbX; x += step) {
        const taper = Math.min(1, x / 14) * Math.min(1, (thumbX - x) / 10);
        const y = 10 + Math.sin(((x / wavelength) * 2 * Math.PI) - wavePhase) * amplitude * taper;
        d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      d += ` L ${thumbX.toFixed(1)} 10`;
      wavePath.setAttribute('d', d);
      squigglyAnimFrame = requestAnimationFrame(updateSquigglyWave);
    } else {
      wavePath.setAttribute('d', `M 0 10 L ${thumbX.toFixed(1)} 10`);
    }
  }

  /* ---------------------------------------------------------
     00. In-App Real-Time Workout Screen Replica (Hero Centerpiece)
     --------------------------------------------------------- */
  function initLiveAppReplica() {
    const clockEl = document.getElementById('app-elapsed-clock');
    let elapsedSec = 14 * 60 + 28; // 14:28
    setInterval(() => {
      elapsedSec++;
      if (clockEl) {
        const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const ss = String(elapsedSec % 60).padStart(2, '0');
        clockEl.textContent = `${mm}:${ss}`;
      }
    }, 1000);

    // Interactive Hold-for-Rep Biomechanical Press
    const btnHoldRep = document.getElementById('app-btn-hold-rep');
    const fillHoldRep = document.getElementById('app-rep-fill');
    const imgHoldRep = document.getElementById('app-rep-img');
    const textHoldBtn = document.getElementById('app-hold-btn-text');
    const repCountEl = document.getElementById('app-live-rep-count');

    let repCount = 0;
    let holdStartTime = null;
    let holdRaf = null;
    const HOLD_DURATION = 1200; // 1.2s

    function stepHold(now) {
      if (!holdStartTime) holdStartTime = now;
      const progress = Math.min(1, (now - holdStartTime) / HOLD_DURATION);

      if (fillHoldRep) {
        fillHoldRep.style.width = `${progress * 100}%`;
      }

      if (progress > 0.45 && imgHoldRep && !imgHoldRep.src.includes('decline-press-2.png')) {
        imgHoldRep.src = 'decline-press-2.png';
      }

      if (progress < 1) {
        holdRaf = requestAnimationFrame(stepHold);
      } else {
        repCount++;
        if (repCountEl) repCountEl.textContent = repCount;
        tone(660, 0.08);
        setTimeout(() => tone(880, 0.1), 80);
        if (navigator.vibrate) navigator.vibrate([20]);

        if (textHoldBtn) textHoldBtn.textContent = `REP ${repCount} LOCKED OUT!`;
        setTimeout(() => {
          if (textHoldBtn) textHoldBtn.textContent = 'PRESS \u00B7 HOLD FOR REP';
          if (fillHoldRep) fillHoldRep.style.width = '0%';
          if (imgHoldRep) imgHoldRep.src = 'decline-press-1.png';
        }, 600);
      }
    }

    function startHold(e) {
      e.preventDefault();
      holdStartTime = null;
      tone(440, 0.04);
      holdRaf = requestAnimationFrame(stepHold);
    }

    function cancelHold() {
      if (holdRaf) cancelAnimationFrame(holdRaf);
      holdStartTime = null;
      if (fillHoldRep) fillHoldRep.style.width = '0%';
      if (imgHoldRep) imgHoldRep.src = 'decline-press-1.png';
    }

    if (btnHoldRep) {
      btnHoldRep.addEventListener('mousedown', startHold);
      btnHoldRep.addEventListener('touchstart', startHold, { passive: false });
      window.addEventListener('mouseup', cancelHold);
      window.addEventListener('touchend', cancelHold);
    }

    // Dynamic Sets Matrix & Steppers (Exactly 3 Sets Total)
    let currentWeight = 70;
    let currentReps = 8;
    let activeSetIndex = 2; // Set 2 is initially active
    const wtEl = document.getElementById('app-val-wt');
    const repsEl = document.getElementById('app-val-reps');
    const btnMinusWt = document.getElementById('app-btn-minus-wt');
    const btnPlusWt = document.getElementById('app-btn-plus-wt');
    const btnMinusReps = document.getElementById('app-btn-minus-reps');
    const btnPlusReps = document.getElementById('app-btn-plus-reps');
    const btnLogSet = document.getElementById('app-btn-log-set');
    const toast = document.getElementById('app-sync-toast');
    const exTarget = document.getElementById('app-hero-ex-target');
    const finishBtn = document.getElementById('app-btn-finish');

    btnMinusWt?.addEventListener('click', () => {
      currentWeight = Math.max(10, currentWeight - 5);
      if (wtEl) wtEl.textContent = currentWeight;
      tone(420);
      syncWidgetPayload(currentWeight, currentReps);
    });

    btnPlusWt?.addEventListener('click', () => {
      currentWeight += 5;
      if (wtEl) wtEl.textContent = currentWeight;
      tone(520);
      syncWidgetPayload(currentWeight, currentReps);
    });

    btnMinusReps?.addEventListener('click', () => {
      currentReps = Math.max(1, currentReps - 1);
      if (repsEl) repsEl.textContent = currentReps;
      tone(420);
      syncWidgetPayload(currentWeight, currentReps);
    });

    btnPlusReps?.addEventListener('click', () => {
      currentReps += 1;
      if (repsEl) repsEl.textContent = currentReps;
      tone(520);
      syncWidgetPayload(currentWeight, currentReps);
    });

    // Logging Set 2
    btnLogSet?.addEventListener('click', () => {
      tone(600, 0.08);
      setTimeout(() => tone(900, 0.12), 70);
      if (navigator.vibrate) navigator.vibrate([15, 30, 20]);

      // Complete Set 2
      const LUCIDE_CHECK_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      const row2 = document.getElementById('app-row-set2');
      if (row2) {
        row2.classList.remove('row-active');
        row2.classList.add('row-done');
        const numBadge = row2.querySelector('.num-badge');
        if (numBadge) numBadge.classList.remove('badge-active');
        const checkCell = row2.querySelector('.col-check');
        if (checkCell) {
          checkCell.innerHTML = `<span class="app-check-done">${LUCIDE_CHECK_SVG}</span>`;
        }
      }

      // Activate Set 3 (Final Set)
      const row3 = document.getElementById('app-row-set3');
      if (row3) {
        row3.classList.add('row-active');
        const numBadge = row3.querySelector('.num-badge');
        if (numBadge) numBadge.classList.add('badge-active');
        const checkCell = document.getElementById('app-row3-check');
        if (checkCell) {
          checkCell.innerHTML = `<button class="app-check-trigger" id="app-btn-log-set3" title="Log final Set 3">${LUCIDE_CHECK_SVG}</button>`;
          
          document.getElementById('app-btn-log-set3')?.addEventListener('click', () => {
            tone(650, 0.1);
            setTimeout(() => tone(1000, 0.15), 80);
            row3.classList.remove('row-active');
            row3.classList.add('row-done');
            if (numBadge) numBadge.classList.remove('badge-active');
            checkCell.innerHTML = `<span class="app-check-done">${LUCIDE_CHECK_SVG}</span>`;
            if (exTarget) {
              exTarget.innerHTML = '<strong style="color: var(--acc);">&#9733; All 3 Sets Completed!</strong>';
            }
            if (finishBtn) {
              finishBtn.textContent = 'Complete Workout';
              finishBtn.style.background = 'var(--acc)';
              finishBtn.style.color = '#0c0e12';
            }
            if (toast) {
              toast.innerHTML = '<strong style="color: var(--acc);">&#9733; Workout Complete:</strong> All 3 sets logged cleanly!';
            }
            stopInAppRestTimer();
          });
        }
      }

      // Start authentic in-app rest countdown
      const metaSet = document.getElementById('app-rest-meta-set');
      if (metaSet) metaSet.textContent = 'Set 2 of 3';
      startInAppRestCountdown(90);

      if (toast) {
        toast.innerHTML = '<strong style="color: var(--acc);">&#10003; Set 2 Saved:</strong> 70 lbs &times; 8 reps &middot; Rest timer started (90s)';
      }

      advanceWidgetSet(3);
      syncRestTimerProbe(90);
      saturateBodyMapFatigue(['chest', 'triceps', 'deltoids']);
    });

    // Authentic In-App Rest Timer (Matching frontend/src/components/RestTimer.jsx)
    const ringFg = document.getElementById('app-rest-ring-fg');
    const ringIcon = document.getElementById('app-rest-ring-icon');
    const restDigits = document.getElementById('app-rest-digits');
    const statusLabel = document.getElementById('app-rest-status-label');
    const btnRestMinus = document.getElementById('app-btn-rest-minus');
    const btnRestPlus = document.getElementById('app-btn-rest-plus');
    const btnRestSkip = document.getElementById('app-btn-rest-skip');

    let inAppRestSec = 90;
    const inAppRestTotal = 90;
    const circumference = 2 * Math.PI * 17; // 106.81px
    let inAppRestTimer = null;

    function updateInAppRestUI() {
      if (!restDigits) return;
      const mm = String(Math.floor(inAppRestSec / 60)).padStart(2, '0');
      const ss = String(inAppRestSec % 60).padStart(2, '0');
      restDigits.textContent = `${mm}:${ss}`;

      const fraction = inAppRestSec / inAppRestTotal;
      const dash = circumference * fraction;
      if (ringFg) {
        ringFg.setAttribute('stroke-dasharray', `${dash.toFixed(2)} ${circumference.toFixed(2)}`);
      }

      if (statusLabel) {
        if (inAppRestSec <= 5) {
          statusLabel.textContent = 'Get ready!';
          statusLabel.style.color = 'var(--red)';
          if (ringIcon) ringIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>';
        } else if (inAppRestSec <= 20) {
          statusLabel.textContent = 'Almost time';
          statusLabel.style.color = 'var(--orange)';
        } else {
          statusLabel.textContent = 'Resting';
          statusLabel.style.color = 'var(--acc)';
          if (ringIcon) ringIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
        }
      }
    }

    function startInAppRestCountdown(sec = 90) {
      inAppRestSec = sec;
      updateInAppRestUI();
      if (inAppRestTimer) clearInterval(inAppRestTimer);
      inAppRestTimer = setInterval(() => {
        if (inAppRestSec > 0) {
          inAppRestSec--;
          updateInAppRestUI();
          if (inAppRestSec === 0) {
            tone(800, 0.2);
          }
        }
      }, 1000);
    }

    function stopInAppRestTimer() {
      inAppRestSec = 0;
      updateInAppRestUI();
      if (inAppRestTimer) clearInterval(inAppRestTimer);
    }

    startInAppRestCountdown(90);

    btnRestMinus?.addEventListener('click', () => {
      inAppRestSec = Math.max(0, inAppRestSec - 15);
      updateInAppRestUI();
      tone(440);
    });

    btnRestPlus?.addEventListener('click', () => {
      inAppRestSec += 15;
      updateInAppRestUI();
      tone(520);
    });

    btnRestSkip?.addEventListener('click', () => {
      stopInAppRestTimer();
      tone(330);
    });

    // Finish Workout Button
    finishBtn?.addEventListener('click', () => {
      tone(600, 0.1);
      if (toast) {
        toast.innerHTML = '<strong>Workout Completed!</strong> All sets saved safe in phone storage.';
      }
    });
  }

  /* ---------------------------------------------------------
     01. Home Screen Quick-Log Widget (Real-Life Complete Set & Rest Timer)
     --------------------------------------------------------- */
  let widgetSet = 2;
  const widgetTotalSets = 3;
  let widgetWt = 70;
  let widgetReps = 8;
  let widgetRestSec = 90;
  const widgetRestTotal = 90;
  let widgetRestTimer = null;

  function syncWidgetPayload(wt, reps) {
    widgetWt = wt;
    widgetReps = reps;
    const wtEl = document.getElementById('w-val-wt');
    const repsEl = document.getElementById('w-val-reps');
    if (wtEl) wtEl.textContent = wt;
    if (repsEl) repsEl.textContent = reps;
  }

  function advanceWidgetSet(setNum) {
    widgetSet = setNum;
    const label = document.getElementById('widget-live-set-label');
    if (label) label.textContent = `Set ${widgetSet} of ${widgetTotalSets}`;
    const nextSub = document.getElementById('w-rest-next-sub');
    if (nextSub) nextSub.textContent = `Set ${widgetSet}/${widgetTotalSets} · ${widgetWt} lbs × ${widgetReps} reps`;
    const telIpc = document.getElementById('tel-ipc-status');
    if (telIpc) {
      telIpc.textContent = `${(0.09 + Math.random() * 0.04).toFixed(2)}ms`;
    }
  }

  function initWidgetProbe() {
    const wtEl = document.getElementById('w-val-wt');
    const repsEl = document.getElementById('w-val-reps');
    const btnMinusWt = document.getElementById('w-minus-wt');
    const btnPlusWt = document.getElementById('w-plus-wt');
    const btnMinusReps = document.getElementById('w-minus-reps');
    const btnPlusReps = document.getElementById('w-plus-reps');
    const btnLog = document.getElementById('w-btn-log');

    const activeView = document.getElementById('widget-active-view');
    const restView = document.getElementById('widget-rest-view');
    const restCountdown = document.getElementById('w-rest-countdown');
    const restFill = document.getElementById('w-rest-bar-fill');
    const btnRestPlus = document.getElementById('w-btn-rest-plus');
    const btnRestSkip = document.getElementById('w-btn-rest-skip');

    btnMinusWt?.addEventListener('click', () => {
      widgetWt = Math.max(10, widgetWt - 5);
      if (wtEl) wtEl.textContent = widgetWt;
      tone(420);
    });

    btnPlusWt?.addEventListener('click', () => {
      widgetWt += 5;
      if (wtEl) wtEl.textContent = widgetWt;
      tone(520);
    });

    btnMinusReps?.addEventListener('click', () => {
      widgetReps = Math.max(1, widgetReps - 1);
      if (repsEl) repsEl.textContent = widgetReps;
      tone(420);
    });

    btnPlusReps?.addEventListener('click', () => {
      widgetReps += 1;
      if (repsEl) repsEl.textContent = widgetReps;
      tone(520);
    });

    function updateWidgetRestUI() {
      if (!restCountdown) return;
      const mm = String(Math.floor(widgetRestSec / 60)).padStart(2, '0');
      const ss = String(widgetRestSec % 60).padStart(2, '0');
      restCountdown.textContent = `${mm}:${ss}`;
      const pct = Math.max(0, Math.min(100, (widgetRestSec / widgetRestTotal) * 100));
      if (restFill) restFill.style.width = `${pct}%`;
    }

    function startWidgetRest(sec = 90) {
      widgetRestSec = sec;
      updateWidgetRestUI();
      if (activeView) activeView.style.display = 'none';
      if (restView) restView.style.display = 'flex';
      if (widgetRestTimer) clearInterval(widgetRestTimer);
      widgetRestTimer = setInterval(() => {
        if (widgetRestSec > 0) {
          widgetRestSec--;
          updateWidgetRestUI();
          if (widgetRestSec === 0) {
            tone(800, 0.2);
          }
        }
      }, 1000);
    }

    function stopWidgetRest() {
      if (widgetRestTimer) clearInterval(widgetRestTimer);
      if (restView) restView.style.display = 'none';
      if (activeView) activeView.style.display = 'block';
    }

    // Complete Set CTA: In-Real-Life Android Widget Flow
    btnLog?.addEventListener('click', () => {
      tone(600, 0.08);
      setTimeout(() => tone(900, 0.12), 70);
      if (navigator.vibrate) navigator.vibrate([20, 40]);
      
      startWidgetRest(90);
      advanceWidgetSet(3);
      syncRestTimerProbe(90);
    });

    btnRestPlus?.addEventListener('click', () => {
      widgetRestSec += 15;
      updateWidgetRestUI();
      tone(520);
    });

    btnRestSkip?.addEventListener('click', () => {
      stopWidgetRest();
      tone(400);
      advanceWidgetSet(3);
    });
  }

  /* ---------------------------------------------------------
     03. 7-Day Muscle Recovery Tracker (Clamped Height · Zero Shift)
     --------------------------------------------------------- */
  const MUSCLES_MAP = {
    trapezius: 'Traps', deltoids: 'Shoulders', chest: 'Chest', 'upper-back': 'Upper Back',
    serratus: 'Serratus', biceps: 'Biceps', triceps: 'Triceps', forearm: 'Forearms',
    abs: 'Abs', obliques: 'Obliques', 'lower-back': 'Lower Back', gluteal: 'Glutes',
    quadriceps: 'Quads', hamstring: 'Hamstrings', adductors: 'Adductors',
    'hip-flexors': 'Hip Flexors', calves: 'Calves', tibialis: 'Shins'
  };

  const INERT = ['head', 'hair', 'neck', 'hands', 'feet', 'knees', 'ankles'];
  const PUSH_MUSCLES = ['chest', 'triceps', 'deltoids', 'serratus'];
  let currentRecoveryHours = 8;

  function getDecayStatus(muscle, hours) {
    const isWorked = PUSH_MUSCLES.includes(muscle);
    if (!isWorked) {
      return { status: 'ready', pct: 100, cls: 'rec-ready' };
    }
    if (hours < 24) {
      return { status: 'fatigued', pct: Math.min(50, Math.round((hours / 24) * 50)), cls: 'rec-fatigued' };
    } else if (hours < 48) {
      return { status: 'recovering', pct: Math.round(50 + ((hours - 24) / 24) * 49), cls: 'rec-recovering' };
    }
    return { status: 'ready', pct: 100, cls: 'rec-ready' };
  }

  function updateBodyMapFills(hours) {
    currentRecoveryHours = hours;
    const hoursLabel = document.getElementById('probe-recovery-hours');
    if (hoursLabel) hoursLabel.textContent = `Elapsed: ${hours} Hours`;

    const allMusclePaths = document.querySelectorAll('.bm-m');
    allMusclePaths.forEach(path => {
      const muscle = path.getAttribute('data-muscle');
      if (muscle) {
        const st = getDecayStatus(muscle, hours);
        path.setAttribute('class', `bm-m ${st.cls}`);
      }
    });

    const chestStatus = getDecayStatus('chest', hours);
    const tricepsStatus = getDecayStatus('triceps', hours);
    const deltoidsStatus = getDecayStatus('deltoids', hours);

    const chestEl = document.getElementById('codex-val-chest');
    const tricepsEl = document.getElementById('codex-val-triceps');
    const deltoidsEl = document.getElementById('codex-val-deltoids');

    const formatPin = (st) => st.status.toUpperCase();
    const getPinColor = (st) => st.status === 'fatigued' ? 'var(--red)' : (st.status === 'recovering' ? 'var(--orange)' : 'var(--acc)');

    if (chestEl) {
      chestEl.textContent = formatPin(chestStatus);
      chestEl.style.color = getPinColor(chestStatus);
    }
    if (tricepsEl) {
      tricepsEl.textContent = formatPin(tricepsStatus);
      tricepsEl.style.color = getPinColor(tricepsStatus);
    }
    if (deltoidsEl) {
      deltoidsEl.textContent = formatPin(deltoidsStatus);
      deltoidsEl.style.color = getPinColor(deltoidsStatus);
    }
  }

  function saturateBodyMapFatigue(muscles) {
    muscles.forEach(m => {
      document.querySelectorAll(`.bm-m[data-muscle="${m}"]`).forEach(path => {
        path.setAttribute('class', 'bm-m rec-fatigued');
      });
    });
    const inspect = document.getElementById('rec-inspect');
    if (inspect) {
      inspect.innerHTML = '<strong style="color: var(--red);">Chest &amp; Triceps Fatigued</strong>';
    }
    const chestEl = document.getElementById('codex-val-chest');
    const tricepsEl = document.getElementById('codex-val-triceps');
    const deltoidsEl = document.getElementById('codex-val-deltoids');
    if (chestEl) { chestEl.textContent = 'FATIGUED'; chestEl.style.color = 'var(--red)'; }
    if (tricepsEl) { tricepsEl.textContent = 'FATIGUED'; tricepsEl.style.color = 'var(--red)'; }
    if (deltoidsEl) { deltoidsEl.textContent = 'FATIGUED'; deltoidsEl.style.color = 'var(--red)'; }
  }

  /* ---------------------------------------------------------
     02. Lock-Screen Rest Timer & Alerts Simulator (Plate 2)
     --------------------------------------------------------- */
  let timerProbeSec = 90;
  let timerProbeTotal = 90;
  let timerProbeInterval = null;

  function updateTimerProbeUI() {
    const digitsEl = document.getElementById('timer-probe-digits');
    const barEl = document.getElementById('timer-probe-bar');
    if (digitsEl) {
      const mm = String(Math.floor(timerProbeSec / 60)).padStart(2, '0');
      const ss = String(timerProbeSec % 60).padStart(2, '0');
      digitsEl.textContent = `${mm}:${ss}`;
    }
    if (barEl) {
      const pct = timerProbeTotal > 0 ? Math.max(0, Math.min(100, (timerProbeSec / timerProbeTotal) * 100)) : 0;
      barEl.style.width = `${pct}%`;
    }
  }

  function startTimerProbeCountdown(sec = 90) {
    timerProbeSec = sec;
    timerProbeTotal = Math.max(sec, timerProbeTotal || 90);
    updateTimerProbeUI();
    if (timerProbeInterval) clearInterval(timerProbeInterval);
    timerProbeInterval = setInterval(() => {
      if (timerProbeSec > 0) {
        timerProbeSec--;
        updateTimerProbeUI();
        if (timerProbeSec === 0) {
          clearInterval(timerProbeInterval);
          tone(880, 0.15);
          setTimeout(() => tone(1320, 0.25), 140);
          if (navigator.vibrate) navigator.vibrate([20, 40, 30]);
          const digitsEl = document.getElementById('timer-probe-digits');
          if (digitsEl) digitsEl.textContent = '00:00';
        }
      }
    }, 1000);
  }

  function syncRestTimerProbe(sec = 90) {
    try {
      startTimerProbeCountdown(sec);
    } catch (e) {
      console.warn('syncRestTimerProbe error:', e);
    }
  }

  function initTimerProbe() {
    const digitsEl = document.getElementById('timer-probe-digits');
    if (!digitsEl) return;

    startTimerProbeCountdown(90);

    const btnMinus = document.getElementById('t-minus-15');
    const btnPlus = document.getElementById('t-plus-15');
    const btnSkip = document.getElementById('t-skip');
    const btnRestart = document.getElementById('btn-timer-restart');

    btnMinus?.addEventListener('click', () => {
      timerProbeSec = Math.max(0, timerProbeSec - 15);
      updateTimerProbeUI();
      tone(440);
    });

    btnPlus?.addEventListener('click', () => {
      timerProbeSec += 15;
      timerProbeTotal = Math.max(timerProbeTotal, timerProbeSec);
      updateTimerProbeUI();
      tone(520);
    });

    btnSkip?.addEventListener('click', () => {
      if (timerProbeInterval) clearInterval(timerProbeInterval);
      timerProbeSec = 0;
      updateTimerProbeUI();
      tone(330);
    });

    btnRestart?.addEventListener('click', () => {
      startTimerProbeCountdown(90);
      tone(600, 0.1);
    });
  }

  function initBodyMapProbe() {
    const container = document.getElementById('recovery-sandbox-body');
    if (!container) return;
    if (!window.BODY_PATHS) {
      setTimeout(initBodyMapProbe, 50);
      return;
    }

    const data = window.BODY_PATHS;

    function buildSvg(viewData) {
      const paths = [];
      INERT.forEach(part => {
        (viewData.p[part] || []).forEach(d => paths.push(`<path class="bm-sil" d="${d}" />`));
      });
      Object.keys(MUSCLES_MAP).forEach(muscle => {
        const dList = viewData.p[muscle] || [];
        if (!dList.length) return;
        const st = getDecayStatus(muscle, currentRecoveryHours);
        dList.forEach(d => {
          paths.push(`<path class="bm-m ${st.cls}" data-muscle="${muscle}" d="${d}"></path>`);
        });
      });
      return `<svg class="bm-svg" viewBox="${viewData.vb}">${paths.join('')}</svg>`;
    }

    container.innerHTML = `
      <div class="bm-wrap">
        <div class="bm-col">
          <span class="bm-col-label">FRONT</span>
          ${buildSvg(data.front)}
        </div>
        <div class="bm-col">
          <span class="bm-col-label">BACK</span>
          ${buildSvg(data.back)}
        </div>
      </div>
    `;

    const slider = document.getElementById('rec-slider');
    slider?.addEventListener('input', (e) => {
      const h = parseInt(e.target.value, 10);
      updateBodyMapFills(h);
    });

    container.querySelectorAll('.bm-m').forEach(path => {
      path.addEventListener('click', () => {
        const m = path.getAttribute('data-muscle');
        const st = getDecayStatus(m, currentRecoveryHours);
        tone(520);
        const ins = document.getElementById('rec-inspect');
        if (ins) {
          ins.innerHTML = `<strong>${MUSCLES_MAP[m] || m}</strong>: ${st.status.toUpperCase()} (${st.pct}%) \u00B7 ${currentRecoveryHours}h`;
        }
      });
    });

    document.getElementById('btn-rec-simulate')?.addEventListener('click', () => {
      tone(600);
      if (slider) slider.value = 0;
      updateBodyMapFills(0);
      const ins = document.getElementById('rec-inspect');
      if (ins) {
        ins.innerHTML = '<strong style="color: var(--red);">Workout Completed</strong>: Chest &amp; Triceps fatigued';
      }
    });
  }

  /* ---------------------------------------------------------
     04. Workout Safety Timeline & Accidental Finish Guard
     --------------------------------------------------------- */
  function initLoopbackProbe() {
    const banner = document.getElementById('loop-probe-banner');
    const btnForce = document.getElementById('btn-loop-force');
    const btnReturn = document.getElementById('btn-loop-return');
    const btnReset = document.getElementById('btn-loop-reset');
    const btnCrash = document.getElementById('btn-simulate-crash');
    const btnRecover = document.getElementById('btn-sqlite-recover');
    const safetyBadge = document.getElementById('safety-guard-badge');
    const safetyStatus = document.getElementById('safety-restore-status');

    // Exercise Checklist Steppers
    const exData = {
      squat: { done: 3, total: 3 },
      rdl: { done: 1, total: 3 },
      calf: { done: 0, total: 3 }
    };

    function updateExUI(key) {
      const valEl = document.getElementById(`ex-val-${key}`);
      const tagEl = document.getElementById(`ex-tag-${key}`);
      const d = exData[key];
      if (valEl) valEl.textContent = d.done;
      if (tagEl) {
        if (d.done >= d.total) {
          tagEl.className = 'loop-tag-done';
          tagEl.textContent = 'COMPLETE';
        } else if (d.done > 0) {
          tagEl.className = 'loop-tag-warn';
          tagEl.textContent = `${d.total - d.done} PENDING`;
        } else {
          tagEl.className = 'loop-tag-err';
          tagEl.textContent = `${d.total} PENDING`;
        }
      }
    }

    ['squat', 'rdl', 'calf'].forEach(k => {
      const item = document.querySelector(`.loop-item[data-ex="${k}"]`);
      if (!item) return;
      item.querySelector('.loop-btn-minus')?.addEventListener('click', () => {
        exData[k].done = Math.max(0, exData[k].done - 1);
        updateExUI(k);
        tone(420);
      });
      item.querySelector('.loop-btn-plus')?.addEventListener('click', () => {
        exData[k].done = Math.min(exData[k].total, exData[k].done + 1);
        updateExUI(k);
        tone(520);
      });
    });

    btnForce?.addEventListener('click', () => {
      tone(400);
      if (banner) {
        banner.style.display = 'block';
        banner.className = 'inline-banner warn';
        banner.innerHTML = '<strong>Workout Saved:</strong> Unfinished sets marked skipped. Zero lost or corrupted history records.';
      }
    });

    btnReturn?.addEventListener('click', () => {
      tone(560);
      if (banner) {
        banner.style.display = 'block';
        banner.className = 'inline-banner ok';
        banner.innerHTML = '<strong>Resumed:</strong> Returned to active session at Romanian Deadlift.';
      }
    });

    btnReset?.addEventListener('click', () => {
      tone(500);
      exData.squat.done = 3;
      exData.rdl.done = 1;
      exData.calf.done = 0;
      ['squat', 'rdl', 'calf'].forEach(updateExUI);
      if (banner) {
        banner.style.display = 'none';
        banner.textContent = '';
      }
    });

    btnCrash?.addEventListener('click', () => {
      tone(400, 0.1);
      if (safetyBadge) {
        safetyBadge.className = 'card-status-badge';
        safetyBadge.style.color = 'var(--yellow)';
        safetyBadge.textContent = '! FINISH INTERCEPTED';
      }
      if (safetyStatus) {
        safetyStatus.className = 'status-safe';
        safetyStatus.style.color = 'var(--yellow)';
        safetyStatus.textContent = 'Premature finish blocked · 2 exercises have pending sets';
      }
      if (banner) {
        banner.style.display = 'block';
        banner.className = 'inline-banner warn';
        banner.innerHTML = '<strong>Incomplete Workout Detected:</strong> Review pending sets below before concluding session.';
      }
    });

    btnRecover?.addEventListener('click', () => {
      tone(600, 0.08);
      setTimeout(() => tone(800, 0.1), 70);
      if (safetyBadge) {
        safetyBadge.className = 'card-status-badge armed';
        safetyBadge.style.color = 'var(--acc)';
        safetyBadge.textContent = '\u2022 SESSION RESUMED';
      }
      if (safetyStatus) {
        safetyStatus.className = 'status-safe';
        safetyStatus.style.color = 'var(--acc)';
        safetyStatus.textContent = 'Focus restored · Resumed active session at Romanian Deadlift';
      }
      if (banner) {
        banner.style.display = 'block';
        banner.className = 'inline-banner ok';
        banner.innerHTML = '<strong>Workout Resumed:</strong> Returned to active session. Complete your pending sets.';
      }
    });
  }

  /* ---------------------------------------------------------
     05. Global Initializer (Dock Theme, Audio, Copy SHA)
     --------------------------------------------------------- */
  function updateTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('og_theme', theme);
    const themeBtn = document.getElementById('btn-theme');
    if (themeBtn) {
      themeBtn.setAttribute('data-tooltip', theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme');
      if (theme === 'dark') {
        themeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
      } else {
        themeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
      }
    }
  }

  function updateAudioBtn() {
    const audioBtn = document.getElementById('btn-audio');
    const dot = document.getElementById('audio-indicator-dot');
    if (!audioBtn) return;
    if (audioEnabled) {
      audioBtn.setAttribute('data-tooltip', 'Auditory & Haptics: Enabled (Click to Mute)');
      audioBtn.setAttribute('aria-label', 'Auditory and Haptics: Enabled');
      if (dot) dot.classList.add('active');
    } else {
      audioBtn.setAttribute('data-tooltip', 'Auditory & Haptics: Muted (Click to Enable)');
      audioBtn.setAttribute('aria-label', 'Auditory and Haptics: Muted');
      if (dot) dot.classList.remove('active');
    }
  }

  function initGlobal() {
    try {
      // Theme setup
      const urlParams = new URLSearchParams(window.location.search);
      const themeParam = urlParams.get('theme');
      const savedTheme = themeParam || localStorage.getItem('og_theme') || 'dark';
      updateTheme(savedTheme);

      const themeBtn = document.getElementById('btn-theme');
      themeBtn?.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = cur === 'dark' ? 'light' : 'dark';
        updateTheme(next);
        tone(520);
      });
    } catch (e) {
      console.warn('Theme init error:', e);
    }

    try {
      // Audio setup
      updateAudioBtn();
      const audioBtn = document.getElementById('btn-audio');
      audioBtn?.addEventListener('click', () => {
        audioEnabled = !audioEnabled;
        updateAudioBtn();
        if (audioEnabled) tone(600);
      });
    } catch (e) {
      console.warn('Audio init error:', e);
    }

    try {
      // Copy SHA-256 Hash
      const copyShaBtn = document.getElementById('btn-copy-sha');
      const copyShaLabel = document.getElementById('copy-sha-label');
      const shaCode = document.getElementById('apk-sha256');
      copyShaBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (shaCode) {
          navigator.clipboard.writeText(shaCode.textContent.trim()).then(() => {
            if (copyShaLabel) copyShaLabel.textContent = 'Copied!';
            else copyShaBtn.textContent = 'Copied!';
            tone(640);
            setTimeout(() => {
              if (copyShaLabel) copyShaLabel.textContent = 'SHA-256';
              else copyShaBtn.textContent = 'Copy Hash';
            }, 1800);
          }).catch(() => {
            tone(400);
          });
        }
      });
    } catch (e) {
      console.warn('Copy SHA init error:', e);
    }

    // Proportional Scale Clamp for Mobile: shrink previews without compressing internal layout
    function initClampedPreviewScaling() {
      const stages = [
        {
          stage: document.querySelector('.hero-stage-left'),
          mount: document.querySelector('.hero-stage-left .architectural-mount')
        },
        {
          stage: document.querySelector('.widget-centered-stage'),
          mount: document.querySelector('.widget-centered-stage .architectural-mount')
        },
        {
          stage: document.querySelector('.modal-centered-stage'),
          mount: document.querySelector('.modal-centered-stage .architectural-mount')
        }
      ];

      function updateClamp() {
        const screenW = document.documentElement.clientWidth;
        const maxAllowedW = Math.max(260, screenW - 32);

        stages.forEach(({ stage, mount }) => {
          if (!stage || !mount) return;

          // Temporarily reset to measure natural uncompressed dimensions
          mount.style.transform = 'none';
          mount.style.width = 'max-content';
          mount.style.minWidth = 'max-content';
          mount.style.maxWidth = 'none';

          const naturalW = Math.max(mount.scrollWidth || 0, mount.offsetWidth || 0);
          const naturalH = Math.max(mount.scrollHeight || 0, mount.offsetHeight || 0);

          if (screenW >= naturalW + 28) {
            // Desktop / Tablet: full unscaled 1:1 view
            mount.style.transform = '';
            mount.style.transformOrigin = '';
            mount.style.width = '';
            mount.style.minWidth = '';
            mount.style.maxWidth = '';
            stage.style.width = '';
            stage.style.height = '';
            stage.style.margin = '';
            return;
          }

          // Mobile: calculate exact proportional scale factor
          const scale = Math.min(1, maxAllowedW / naturalW);
          const scaledW = Math.round(naturalW * scale);
          const scaledH = Math.round(naturalH * scale);

          mount.style.width = naturalW + 'px';
          mount.style.minWidth = naturalW + 'px';
          mount.style.maxWidth = naturalW + 'px';
          mount.style.flexShrink = '0';
          mount.style.transformOrigin = 'top center';
          mount.style.transform = `scale(${scale})`;

          stage.style.width = scaledW + 'px';
          stage.style.height = scaledH + 'px';
          stage.style.margin = '0 auto 36px auto';
          stage.style.position = 'relative';
          stage.style.overflow = 'visible';
          stage.style.display = 'flex';
          stage.style.justifyContent = 'center';
          stage.style.alignItems = 'flex-start';
        });
      }

      window.addEventListener('resize', updateClamp);
      window.addEventListener('orientationchange', updateClamp);
      updateClamp();
    }

    // Initialize all persistent modules with individual fault isolation
    try { initLiveAppReplica(); } catch (e) { console.error('Live app replica init error:', e); }
    try { initWidgetProbe(); } catch (e) { console.error('Widget probe init error:', e); }
    try { initTimerProbe(); } catch (e) { console.error('Timer probe init error:', e); }
    try { initBodyMapProbe(); } catch (e) { console.error('Body map probe init error:', e); }
    try { initLoopbackProbe(); } catch (e) { console.error('Loopback probe init error:', e); }
    try { initClampedPreviewScaling(); } catch (e) { console.error('Clamp scaling init error:', e); }
  }

  // Failsafe execution: run immediately if document is already ready, or wait for DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobal);
  } else {
    initGlobal();
  }

  // Window load fallback to ensure SVG rendering if external scripts were asynchronous
  window.addEventListener('load', () => {
    try { initBodyMapProbe(); } catch (e) {}
  });
})();
