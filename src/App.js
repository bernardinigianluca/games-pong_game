import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const DIFFICULTY_PRESETS = {
  easy: {
    reactionMs: 190,
    reactionVarianceMs: 120,
    maxAimErrorY: 36,
    maxAimErrorX: 28,
    verticalSpeedFactor: 0.58,
    horizontalSpeedFactor: 0.48,
  },
  medium: {
    reactionMs: 120,
    reactionVarianceMs: 90,
    maxAimErrorY: 22,
    maxAimErrorX: 18,
    verticalSpeedFactor: 0.72,
    horizontalSpeedFactor: 0.6,
  },
  hard: {
    reactionMs: 70,
    reactionVarianceMs: 60,
    maxAimErrorY: 10,
    maxAimErrorX: 8,
    verticalSpeedFactor: 0.9,
    horizontalSpeedFactor: 0.78,
  },
};

export default function PongGame() {
  const ballSize = 10;
  const paddleWidth = 10;
  const paddleHeight = 80;
  const sideMargin = 20;
  const initialBallSpeed = 3;
  const paddleSpeed = 6;
  const aiServeDelayMs = 850;
  const aceServeSpeedMultiplier = 2.6;
  const aceServeMaxSpeed = 9.5;
  const paddleHitCooldownMs = 45;
  const paddleSwingBoostFactor = 0.22;
  const paddleTowardBallBoostFactor = 0.28;
  const rallySpeedStep = 0.18;
  const maxBallSpeed = 8;
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1366,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));

  const isCompactLayout = viewportSize.width <= 980;
  const isPhoneLayout = viewportSize.width <= 640;
  const uiHorizontalPadding = isPhoneLayout ? 14 : isCompactLayout ? 18 : 30;
  const uiVerticalReserve = isPhoneLayout ? 370 : isCompactLayout ? 320 : 235;
  const minResponsiveWidth = isPhoneLayout ? 300 : isCompactLayout ? 360 : 820;
  const minResponsiveHeight = isPhoneLayout ? 220 : isCompactLayout ? 260 : 420;
  const maxResponsiveWidth = isPhoneLayout ? 640 : 1180;
  const gameWidth = Math.max(
    minResponsiveWidth,
    Math.min(maxResponsiveWidth, viewportSize.width - uiHorizontalPadding)
  );
  const gameHeight = Math.max(minResponsiveHeight, viewportSize.height - uiVerticalReserve);
  const playerAreaMinX = gameWidth / 2 + 10;
  const playerAreaMaxX = gameWidth - paddleWidth - sideMargin;
  const aiAreaMinX = sideMargin;
  const aiAreaMaxX = gameWidth / 2 - paddleWidth - 10;

  const [ballX, setBallX] = useState(gameWidth / 2 - ballSize / 2);
  const [ballY, setBallY] = useState(gameHeight / 2 - ballSize / 2);
  const [ballVelocityX, setBallVelocityX] = useState(initialBallSpeed);
  const [ballVelocityY, setBallVelocityY] = useState(initialBallSpeed);
  const [ballSpin, setBallSpin] = useState(0);
  const [playerPaddleX, setPlayerPaddleX] = useState(playerAreaMaxX);
  const [playerPaddleY, setPlayerPaddleY] = useState(gameHeight / 2 - paddleHeight / 2);
  const [aiPaddleX, setAiPaddleX] = useState(aiAreaMinX);
  const [aiPaddleY, setAiPaddleY] = useState(gameHeight / 2 - paddleHeight / 2);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [playerName, setPlayerName] = useState('Player');
  const [aiName, setAiName] = useState('AI');
  const [playerColor, setPlayerColor] = useState('#00d4ff');
  const [aiColor, setAiColor] = useState('#ff5e8a');
  const [ballColor, setBallColor] = useState('#ffd54a');
  const [difficulty, setDifficulty] = useState('medium');
  const [winningScore, setWinningScore] = useState(3);
  const [hasPlayedWelcome, setHasPlayedWelcome] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [effectsVolume, setEffectsVolume] = useState(0.9);
  const [crowdVolume, setCrowdVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [waitingForMatchStart, setWaitingForMatchStart] = useState(true);
  const [initialServer, setInitialServer] = useState(null);
  const [countdownValue, setCountdownValue] = useState(null);
  const [waitingForPlayerServe, setWaitingForPlayerServe] = useState(false);
  const [waitingForAiServe, setWaitingForAiServe] = useState(false);
  const [serveVisualMode, setServeVisualMode] = useState('none');
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [showWinCelebration, setShowWinCelebration] = useState(false);
  const [showLoseCelebration, setShowLoseCelebration] = useState(false);
  const [pointFlashSide, setPointFlashSide] = useState(null);
  const [isServicePulse, setIsServicePulse] = useState(false);
  const [scorePopSide, setScorePopSide] = useState(null);
  const keysPressed = useRef({});
  const audioContextRef = useRef(null);
  const ballOutRef = useRef(false); // ✅ Flag per evitare multiple score
  const serveTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const aiServeDueTimeRef = useRef(null);
  const crowdAmbienceIntervalRef = useRef(null);
  const masterVolumeRef = useRef(masterVolume);
  const effectsVolumeRef = useRef(effectsVolume);
  const crowdVolumeRef = useRef(crowdVolume);
  const isMutedRef = useRef(isMuted);
  const aiDecisionTimeRef = useRef(0);
  const aiTargetYOffsetRef = useRef(0);
  const aiTargetXOffsetRef = useRef(0);
  const paddleHitCooldownUntilRef = useRef(0);
  const crowdPeakCooldownUntilRef = useRef(0);
  const pointFlashTimeoutRef = useRef(null);
  const servicePulseTimeoutRef = useRef(null);
  const scorePopTimeoutRef = useRef(null);
  const bgMusicRef = useRef(null);
  const aiSettings = DIFFICULTY_PRESETS[difficulty];
  const {
    reactionMs,
    reactionVarianceMs,
    maxAimErrorY,
    maxAimErrorX,
    verticalSpeedFactor,
    horizontalSpeedFactor,
  } = aiSettings;
  const spinState = ballSpin > 0.03 ? 'down' : ballSpin < -0.03 ? 'up' : 'none';

  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  }, []);

  useEffect(() => {
    masterVolumeRef.current = masterVolume;
    effectsVolumeRef.current = effectsVolume;
    crowdVolumeRef.current = crowdVolume;
    isMutedRef.current = isMuted;
  }, [masterVolume, effectsVolume, crowdVolume, isMuted]);

  const playSound = useCallback((
    frequency,
    duration,
    channel = 'effects',
    type = 'sine',
    gainScale = 1
  ) => {
    try {
      const audioContext = audioContextRef.current;
      if (!audioContext) return;
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const channelVolume = channel === 'crowd' ? crowdVolumeRef.current : effectsVolumeRef.current;
      const channelBoost = channel === 'crowd' ? 2.9 : 1;
      const baseGain = channel === 'crowd' ? 0.42 : 0.3;
      const outputVolume = isMutedRef.current
        ? 0
        : Math.min(1, baseGain * masterVolumeRef.current * channelVolume * gainScale * channelBoost);
      if (outputVolume <= 0.0001) return;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(outputVolume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
      console.log('Audio non disponibile');
    }
  }, []);

  const playPaddleHit = useCallback(() => playSound(400, 0.1, 'effects'), [playSound]);
  const playWallHit = useCallback(() => playSound(300, 0.1, 'effects'), [playSound]);
  const playScore = useCallback(() => playSound(800, 0.2, 'effects'), [playSound]);
  const playCountdownBeep = useCallback(() => playSound(520, 0.08, 'effects'), [playSound]);
  const playGoBeep = useCallback(() => playSound(760, 0.14, 'effects'), [playSound]);

  const playWelcomeJingle = useCallback(() => {
    [392, 523, 659].forEach((freq, idx) => {
      setTimeout(() => playSound(freq, 0.18, 'effects', 'triangle', 1.05), idx * 120);
    });
  }, [playSound]);

  const playMatchStartSignal = useCallback(() => {
    [784, 988, 1174].forEach((freq, idx) => {
      setTimeout(() => playSound(freq, 0.14, 'effects', 'square', 1.1), idx * 90);
    });
  }, [playSound]);

  const playMatchIntroTheme = useCallback(() => {
    [262, 330, 392, 523].forEach((freq, idx) => {
      setTimeout(() => playSound(freq, 0.16, 'effects', 'triangle', 0.95), idx * 130);
    });
  }, [playSound]);



  const playCrowdCheer = useCallback(() => {
    [320, 420, 560, 700].forEach((freq, idx) => {
      setTimeout(() => playSound(freq, 0.45, 'crowd', 'sawtooth', 1.55), idx * 55);
    });
    [860, 980, 1120].forEach((freq, idx) => {
      setTimeout(() => playSound(freq, 0.26, 'crowd', 'triangle', 1.2), 120 + idx * 65);
    });
  }, [playSound]);

  const playLosePointCrowd = useCallback(() => {
    [420, 330, 260].forEach((freq, idx) => {
      setTimeout(() => playSound(freq, 0.34, 'crowd', 'sawtooth', 1.4), idx * 70);
    });
    [190].forEach((freq, idx) => {
      setTimeout(() => playSound(freq, 0.28, 'crowd', 'triangle', 1.15), 170 + idx * 70);
    });
  }, [playSound]);

  const previewCrowdAudio = useCallback(() => {
    playCrowdCheer();
    setTimeout(() => playLosePointCrowd(), 260);
  }, [playCrowdCheer, playLosePointCrowd]);

  const playSadTrombone = useCallback(() => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;
    const vol = isMutedRef.current ? 0 : Math.min(1, masterVolumeRef.current * effectsVolumeRef.current * 1.1);
    if (vol <= 0) return;
    if (audioContext.state === 'suspended') audioContext.resume();

    // Classic sad trombone: wah-wah-wah-waaaah (descending glide)
    const segments = [
      { startFreq: 466, endFreq: 370, startT: 0,    dur: 0.38 },
      { startFreq: 415, endFreq: 330, startT: 0.40, dur: 0.38 },
      { startFreq: 370, endFreq: 294, startT: 0.80, dur: 0.38 },
      { startFreq: 330, endFreq: 196, startT: 1.20, dur: 0.95 }, // long waaaah
    ];

    segments.forEach(({ startFreq, endFreq, startT, dur }) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      // Add a slight vibrato via a second osc
      const vibrato = audioContext.createOscillator();
      const vibratoGain = audioContext.createGain();
      vibrato.frequency.value = 5.5;
      vibrato.type = 'sine';
      vibratoGain.gain.value = 6;
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);

      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.type = 'sawtooth';

      const start = audioContext.currentTime + startT;
      osc.frequency.setValueAtTime(startFreq, start);
      osc.frequency.linearRampToValueAtTime(endFreq, start + dur);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol * 0.55, start + 0.04);
      gain.gain.setValueAtTime(vol * 0.55, start + dur - 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur + 0.08);

      vibrato.start(start);
      osc.start(start);
      vibrato.stop(start + dur + 0.1);
      osc.stop(start + dur + 0.1);
    });
  }, [audioContextRef, isMutedRef, masterVolumeRef, effectsVolumeRef]);

  const playWinFanfare = useCallback(() => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;
    const vol = isMutedRef.current ? 0 : Math.min(1, masterVolumeRef.current * effectsVolumeRef.current * 1.2);
    if (vol <= 0) return;
    if (audioContext.state === 'suspended') audioContext.resume();

    // Victory fanfare: ascending arpeggio + triumphant chord + final flourish
    const notes = [
      { freq: 523.25, t: 0,    dur: 0.18 }, // C5
      { freq: 659.25, t: 0.13, dur: 0.18 }, // E5
      { freq: 783.99, t: 0.26, dur: 0.18 }, // G5
      { freq: 1046.5, t: 0.39, dur: 0.28 }, // C6
      { freq: 1318.5, t: 0.55, dur: 0.22 }, // E6
      { freq: 1046.5, t: 0.72, dur: 0.14 }, // C6
      { freq: 1318.5, t: 0.80, dur: 0.14 }, // E6
      { freq: 1567.98,t: 0.88, dur: 0.55 }, // G6 long
    ];

    notes.forEach(({ freq, t, dur }) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = audioContext.currentTime + t;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol * 0.5, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    });

    // Harmony chord at the end
    [523.25, 659.25, 783.99, 1046.5].forEach((freq) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = audioContext.currentTime + 0.88;
      gain.gain.setValueAtTime(vol * 0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);
      osc.start(start);
      osc.stop(start + 1.3);
    });
  }, [audioContextRef, isMutedRef, masterVolumeRef, effectsVolumeRef]);

  const playCrowdAmbienceLayer = useCallback(() => {
    const soundType = Math.random();
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    const channelVolume = crowdVolumeRef.current;
    const channelBoost = 2.9;
    const baseGain = 0.42;
    const outputVolume = isMutedRef.current
      ? 0
      : Math.min(1, baseGain * masterVolumeRef.current * channelVolume * channelBoost);
    if (outputVolume <= 0.0001) return;

    try {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      if (soundType < 0.4) {
        // Random shout: Hooooo, Haaaa, Ooooo pattern
        const shoutFreq = 120 + Math.random() * 80;
        const formantFreq = 500 + Math.random() * 300;
        const duration = 0.35 + Math.random() * 0.25;
        const wobbleAmount = 15 + Math.random() * 20;

        const osc1 = audioContext.createOscillator();
        const osc2 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        const gain2 = audioContext.createGain();
        const masterGain = audioContext.createGain();

        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(masterGain);
        gain2.connect(masterGain);
        masterGain.connect(audioContext.destination);

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(shoutFreq, audioContext.currentTime);
        osc2.frequency.setValueAtTime(formantFreq, audioContext.currentTime);

        osc1.frequency.setTargetAtTime(shoutFreq - wobbleAmount, audioContext.currentTime, 0.08);
        gain1.gain.setValueAtTime(outputVolume * 0.6, audioContext.currentTime);
        gain2.gain.setValueAtTime(outputVolume * 0.35, audioContext.currentTime);
        masterGain.gain.setValueAtTime(outputVolume, audioContext.currentTime);
        masterGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

        osc1.start(audioContext.currentTime);
        osc2.start(audioContext.currentTime);
        osc1.stop(audioContext.currentTime + duration);
        osc2.stop(audioContext.currentTime + duration);
      } else if (soundType < 0.75) {
        // Applause burst with noise
        const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.2, audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) {
          noiseData[i] = Math.random() * 2 - 1;
        }

        const noiseSource = audioContext.createBufferSource();
        const noiseGain = audioContext.createGain();
        const lpFilter = audioContext.createBiquadFilter();

        noiseSource.buffer = noiseBuffer;
        noiseSource.connect(lpFilter);
        lpFilter.connect(noiseGain);
        noiseGain.connect(audioContext.destination);

        lpFilter.type = 'lowpass';
        lpFilter.frequency.setValueAtTime(5500, audioContext.currentTime);
        noiseGain.gain.setValueAtTime(outputVolume * 0.7, audioContext.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.18);

        noiseSource.start(audioContext.currentTime);
      } else {
        // Crowd murmur: low overlapping voices
        const freqs = [85, 95, 110, 130, 150];
        const selectedFreq = freqs[Math.floor(Math.random() * freqs.length)];
        const duration = 0.28 + Math.random() * 0.15;

        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(selectedFreq, audioContext.currentTime);
        osc.frequency.setTargetAtTime(selectedFreq + (Math.random() * 8 - 4), audioContext.currentTime, 0.1);
        gain.gain.setValueAtTime(outputVolume * 0.4, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + duration);
      }
    } catch (e) {
      console.log('Crowd ambience error:', e.message);
    }
  }, [masterVolumeRef, crowdVolumeRef, isMutedRef, audioContextRef]);

  const playCrowdRallyPeak = useCallback((intensity = 0.5) => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    const channelVolume = crowdVolumeRef.current;
    const channelBoost = 2.9;
    const baseGain = 0.42;
    const outputVolume = isMutedRef.current
      ? 0
      : Math.min(1, baseGain * masterVolumeRef.current * channelVolume * channelBoost);
    if (outputVolume <= 0.0001) return;

    try {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const level = Math.max(0, Math.min(1, intensity));
      const numShouts = 2 + Math.floor(level * 3);

      for (let i = 0; i < numShouts; i++) {
        setTimeout(() => {
          if (!audioContext) return;
          const freq = 150 + Math.random() * 120;
          const duration = 0.2 + level * 0.15;

          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, audioContext.currentTime);
          gain.gain.setValueAtTime((outputVolume * 0.5) + (level * 0.3), audioContext.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

          osc.start(audioContext.currentTime);
          osc.stop(audioContext.currentTime + duration);
        }, i * 45);
      }
    } catch (e) {
      console.log('Rally peak error:', e.message);
    }
  }, [masterVolumeRef, crowdVolumeRef, isMutedRef, audioContextRef]);

  const triggerPointFlash = useCallback((side) => {
    if (pointFlashTimeoutRef.current) {
      clearTimeout(pointFlashTimeoutRef.current);
      pointFlashTimeoutRef.current = null;
    }
    setPointFlashSide(side);
    pointFlashTimeoutRef.current = setTimeout(() => {
      setPointFlashSide(null);
      pointFlashTimeoutRef.current = null;
    }, 230);
  }, []);

  const triggerScorePop = useCallback((side) => {
    if (scorePopTimeoutRef.current) {
      clearTimeout(scorePopTimeoutRef.current);
      scorePopTimeoutRef.current = null;
    }
    setScorePopSide(side);
    scorePopTimeoutRef.current = setTimeout(() => {
      setScorePopSide(null);
      scorePopTimeoutRef.current = null;
    }, 420);
  }, []);

  const applyPaddleBounce = (
    ballCenterY,
    paddleTop,
    currentVelX,
    currentVelY,
    direction,
    paddleVelX = 0,
    paddleVelY = 0
  ) => {
    const paddleCenterY = paddleTop + paddleHeight / 2;
    const normalizedImpact = Math.max(
      -1,
      Math.min(1, (ballCenterY - paddleCenterY) / (paddleHeight / 2))
    );
    const maxBounceAngle = Math.PI / 4;
    const bounceAngle = normalizedImpact * maxBounceAngle;
    const currentSpeed = Math.max(initialBallSpeed, Math.hypot(currentVelX, currentVelY));

    // Bonus velocita se la racchetta impatta in movimento rapido.
    const swingSpeed = Math.hypot(paddleVelX, paddleVelY);
    const towardBallX = direction === -1 ? Math.max(0, -paddleVelX) : Math.max(0, paddleVelX);
    const impactBoost = swingSpeed * paddleSwingBoostFactor + towardBallX * paddleTowardBallBoostFactor;
    const speed = Math.min(maxBallSpeed, currentSpeed + rallySpeedStep + impactBoost);

    return {
      vx: direction * speed * Math.cos(bounceAngle),
      vy: speed * Math.sin(bounceAngle),
    };
  };

  const startMatchCountdown = useCallback(() => {
    if (
      gameOver ||
      waitingForPlayerServe ||
      waitingForAiServe ||
      !waitingForMatchStart ||
      !initialServer
    ) return;
    if (!hasPlayedWelcome) {
      playWelcomeJingle();
      setHasPlayedWelcome(true);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    let current = 3;
    setCountdownValue(current);
    playCountdownBeep();
    playMatchIntroTheme();

    countdownIntervalRef.current = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdownValue(current);
        playCountdownBeep();
        return;
      }

      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
      setCountdownValue(null);
      setWaitingForMatchStart(false);
      setGameActive(false);
      playGoBeep();
      playMatchStartSignal();
      setBallX(gameWidth / 2 - ballSize / 2);
      setBallY(gameHeight / 2 - ballSize / 2);
      setBallVelocityX(0);
      setBallVelocityY(0);
      setBallSpin(0);
      setServeVisualMode('none');
      setWaitingForPlayerServe(initialServer === 'player');
      setWaitingForAiServe(initialServer === 'ai');
      ballOutRef.current = false;
    }, 1000);
  }, [
    ballSize,
    gameHeight,
    gameOver,
    gameWidth,
    hasPlayedWelcome,
    initialServer,
    playCountdownBeep,
    playGoBeep,
    playMatchIntroTheme,
    playMatchStartSignal,
    playWelcomeJingle,
    waitingForMatchStart,
    waitingForPlayerServe,
    waitingForAiServe,
  ]);

  // Background MP3 music (432 Hz)
  useEffect(() => {
    const audio = new Audio('/audio/Drake Stafford - 432 Hz.mp3');
    audio.loop = true;
    audio.volume = isMutedRef.current
      ? 0
      : Math.min(1, masterVolumeRef.current * crowdVolumeRef.current * 0.35);
    bgMusicRef.current = audio;

    let resumeOnFirstClick = null;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        resumeOnFirstClick = () => {
          audio.play().catch(() => {});
          document.removeEventListener('click', resumeOnFirstClick);
        };
        document.addEventListener('click', resumeOnFirstClick, { once: true });
      });
    }

    return () => {
      if (resumeOnFirstClick) {
        document.removeEventListener('click', resumeOnFirstClick);
      }
      audio.pause();
      audio.src = '';
      bgMusicRef.current = null;
    };
  }, []);

  // Sync bg music volume / mute in real time
  useEffect(() => {
    if (!bgMusicRef.current) return;
    bgMusicRef.current.volume = isMuted
      ? 0
      : Math.min(1, masterVolume * crowdVolume * 0.35);
  }, [isMuted, masterVolume, crowdVolume]);

  // Cleanup game timers/refs only on component unmount.
  useEffect(() => {
    return () => {
      if (serveTimeoutRef.current) {
        clearTimeout(serveTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (crowdAmbienceIntervalRef.current) {
        clearInterval(crowdAmbienceIntervalRef.current);
      }
      if (pointFlashTimeoutRef.current) {
        clearTimeout(pointFlashTimeoutRef.current);
      }
      if (servicePulseTimeoutRef.current) {
        clearTimeout(servicePulseTimeoutRef.current);
      }
      if (scorePopTimeoutRef.current) {
        clearTimeout(scorePopTimeoutRef.current);
      }
      aiServeDueTimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const isServePhase = waitingForPlayerServe || waitingForAiServe;
    if (!isServePhase) {
      setIsServicePulse(false);
      if (servicePulseTimeoutRef.current) {
        clearTimeout(servicePulseTimeoutRef.current);
        servicePulseTimeoutRef.current = null;
      }
      return;
    }

    setIsServicePulse(true);
    if (servicePulseTimeoutRef.current) {
      clearTimeout(servicePulseTimeoutRef.current);
    }
    servicePulseTimeoutRef.current = setTimeout(() => {
      setIsServicePulse(false);
      servicePulseTimeoutRef.current = null;
    }, 720);
  }, [waitingForPlayerServe, waitingForAiServe]);

  useEffect(() => {
    const shouldPlayAmbience =
      gameActive &&
      !isPaused &&
      !gameOver &&
      !waitingForMatchStart &&
      countdownValue === null &&
      !waitingForPlayerServe &&
      !waitingForAiServe;

    if (!shouldPlayAmbience) {
      if (crowdAmbienceIntervalRef.current) {
        clearInterval(crowdAmbienceIntervalRef.current);
        crowdAmbienceIntervalRef.current = null;
      }
      return undefined;
    }

    playCrowdAmbienceLayer();
    crowdAmbienceIntervalRef.current = setInterval(() => {
      playCrowdAmbienceLayer();
    }, 460);

    return () => {
      if (crowdAmbienceIntervalRef.current) {
        clearInterval(crowdAmbienceIntervalRef.current);
        crowdAmbienceIntervalRef.current = null;
      }
    };
  }, [
    gameActive,
    gameOver,
    waitingForMatchStart,
    countdownValue,
    isPaused,
    waitingForPlayerServe,
    waitingForAiServe,
    playCrowdAmbienceLayer,
  ]);

  useEffect(() => {
    aiDecisionTimeRef.current = 0;
    aiTargetYOffsetRef.current = 0;
    aiTargetXOffsetRef.current = 0;
  }, [difficulty]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.key] = true;
    };
    const handleKeyUp = (e) => {
      keysPressed.current[e.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hideCursor = gameActive && !isPaused && !gameOver;

  useEffect(() => {
    setBallX((prev) => Math.max(0, Math.min(gameWidth - ballSize, prev)));
    setBallY((prev) => Math.max(0, Math.min(gameHeight - ballSize, prev)));
    setPlayerPaddleY((prev) => Math.max(0, Math.min(gameHeight - paddleHeight, prev)));
    setAiPaddleY((prev) => Math.max(0, Math.min(gameHeight - paddleHeight, prev)));
    setPlayerPaddleX((prev) => Math.max(playerAreaMinX, Math.min(playerAreaMaxX, prev)));
    setAiPaddleX((prev) => Math.max(aiAreaMinX, Math.min(aiAreaMaxX, prev)));
  }, [
    gameWidth,
    gameHeight,
    playerAreaMinX,
    playerAreaMaxX,
    aiAreaMinX,
    aiAreaMaxX,
  ]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // ✅ GAME LOOP CORRETTO
  useEffect(() => {
    const gameLoop = setInterval(() => {
      if (gameOver) return;

      let nextPlayerPaddleY = playerPaddleY;
      let nextPlayerPaddleX = playerPaddleX;
      const prevPlayerPaddleX = playerPaddleX;
      const prevPlayerPaddleY = playerPaddleY;

      // Movimento paddle player (applicato prima delle collisioni)
      if (keysPressed.current['ArrowUp']) {
        nextPlayerPaddleY = Math.max(0, nextPlayerPaddleY - paddleSpeed);
      }
      if (keysPressed.current['ArrowDown']) {
        nextPlayerPaddleY = Math.min(gameHeight - paddleHeight, nextPlayerPaddleY + paddleSpeed);
      }
      if (keysPressed.current['ArrowLeft']) {
        nextPlayerPaddleX = Math.max(playerAreaMinX, nextPlayerPaddleX - paddleSpeed);
      }
      if (keysPressed.current['ArrowRight']) {
        nextPlayerPaddleX = Math.min(playerAreaMaxX, nextPlayerPaddleX + paddleSpeed);
      }

      if (waitingForMatchStart || countdownValue !== null) {
        setPlayerPaddleX(nextPlayerPaddleX);
        setPlayerPaddleY(nextPlayerPaddleY);
        setBallX(gameWidth / 2 - ballSize / 2);
        setBallY(gameHeight / 2 - ballSize / 2);
        setBallVelocityX(0);
        setBallVelocityY(0);
        setBallSpin(0);
        return;
      }

      if (waitingForPlayerServe) {
        const attachedBallX = nextPlayerPaddleX - ballSize;
        const attachedBallY = nextPlayerPaddleY + paddleHeight / 2 - ballSize / 2;
        const normalServePressed = keysPressed.current[' '] || keysPressed.current['Enter'];
        const spinServePressed = keysPressed.current['s'] || keysPressed.current['S'];
        const aceServePressed = keysPressed.current['a'] || keysPressed.current['A'];

        setPlayerPaddleX(nextPlayerPaddleX);
        setPlayerPaddleY(nextPlayerPaddleY);
        setBallX(attachedBallX);
        setBallY(attachedBallY);
        setBallVelocityX(0);
        setBallVelocityY(0);
        setBallSpin(0);
        setServeVisualMode('none');

        if (normalServePressed || spinServePressed || aceServePressed) {
          let serveSpeed = initialBallSpeed;
          let serveAngle = (Math.random() * 2 - 1) * (Math.PI / 8);
          let serveSpin = 0;

          if (spinServePressed) {
            serveSpeed = initialBallSpeed * 0.95;
            serveAngle = (Math.random() * 2 - 1) * (Math.PI / 6);
            if (keysPressed.current['ArrowUp']) {
              serveSpin = -0.12;
            } else if (keysPressed.current['ArrowDown']) {
              serveSpin = 0.12;
            } else {
              serveSpin = Math.random() > 0.5 ? 0.12 : -0.12;
            }
          }

          if (aceServePressed) {
            serveSpeed = Math.min(aceServeMaxSpeed, initialBallSpeed * aceServeSpeedMultiplier);
            serveAngle = (Math.random() * 2 - 1) * (Math.PI / 20);
            serveSpin = 0.02;
            aiDecisionTimeRef.current = Date.now() + 220;
          }

          setBallVelocityX(-serveSpeed * Math.cos(serveAngle));
          setBallVelocityY(serveSpeed * Math.sin(serveAngle));
          setBallSpin(serveSpin);
          setServeVisualMode(aceServePressed ? 'ace' : spinServePressed ? 'spin' : 'none');
          setWaitingForPlayerServe(false);
          setGameActive(true);
          ballOutRef.current = false;
        }
        return;
      }

      if (waitingForAiServe) {
        const attachedBallX = aiPaddleX + paddleWidth;
        const attachedBallY = aiPaddleY + paddleHeight / 2 - ballSize / 2;

        setPlayerPaddleX(nextPlayerPaddleX);
        setPlayerPaddleY(nextPlayerPaddleY);
        setBallX(attachedBallX);
        setBallY(attachedBallY);
        setBallVelocityX(0);
        setBallVelocityY(0);
        setBallSpin(0);
        setServeVisualMode('none');

        if (!aiServeDueTimeRef.current) {
          aiServeDueTimeRef.current = Date.now() + aiServeDelayMs + Math.random() * 350;
        }

        if (Date.now() >= aiServeDueTimeRef.current) {
          const serveAngle = (Math.random() * 2 - 1) * (Math.PI / 8);
          setBallVelocityX(initialBallSpeed * Math.cos(serveAngle));
          setBallVelocityY(initialBallSpeed * Math.sin(serveAngle));
          setBallSpin((Math.random() * 2 - 1) * 0.06);
          setServeVisualMode('none');
          setWaitingForAiServe(false);
          setGameActive(true);
          aiServeDueTimeRef.current = null;
          ballOutRef.current = false;
        }
        return;
      }

      if (!gameActive || isPaused) return;

      let newX = ballX + ballVelocityX * speedMultiplier;
      let newY = ballY + ballVelocityY * speedMultiplier;
      let newVelX = ballVelocityX;
      let newVelY = ballVelocityY;
      let newSpin = ballSpin;
      const prevX = ballX;
      const prevY = ballY;

      if (Math.abs(newSpin) > 0.0001) {
        newVelY += newSpin * speedMultiplier;
        newSpin *= 0.985;
      }

      const rallySpeed = Math.hypot(newVelX, newVelY);
      const nowMs = Date.now();
      if (rallySpeed > 5.5 && nowMs >= crowdPeakCooldownUntilRef.current) {
        const intensity = Math.max(0, Math.min(1, (rallySpeed - 5.5) / 2.5));
        playCrowdRallyPeak(intensity);
        const baseCooldown = 1800 - intensity * 700;
        crowdPeakCooldownUntilRef.current = nowMs + baseCooldown + Math.random() * 350;
      }

      const intersectsY = (aTop, aBottom, bTop, bBottom) => aBottom >= bTop && aTop <= bBottom;
      const sweptBallTop = Math.min(prevY, newY);
      const sweptBallBottom = Math.max(prevY, newY) + ballSize;
      const canRegisterPaddleHit = Date.now() >= paddleHitCooldownUntilRef.current;

      // Rimbalzo su top e bottom
      if (newY <= 0 || newY + ballSize >= gameHeight) {
        newVelY = -newVelY;
        newY = Math.max(0, Math.min(gameHeight - ballSize, newY));
        setServeVisualMode('none');
        playWallHit();
      }

      // Collisione con paddle destra (Player)
      const isBallMovingToPlayer = newVelX > 0;
      const playerPaddleHit =
        canRegisterPaddleHit &&
        isBallMovingToPlayer &&
        newX + ballSize >= nextPlayerPaddleX &&
        newX <= nextPlayerPaddleX + paddleWidth &&
        newY + ballSize >= nextPlayerPaddleY &&
        newY <= nextPlayerPaddleY + paddleHeight;

      const playerPaddleSweptHit =
        canRegisterPaddleHit &&
        isBallMovingToPlayer &&
        prevX + ballSize <= nextPlayerPaddleX &&
        newX + ballSize >= nextPlayerPaddleX &&
        intersectsY(sweptBallTop, sweptBallBottom, nextPlayerPaddleY, nextPlayerPaddleY + paddleHeight);

      // Se la racchetta si muove verso sinistra "entrando" nella palla,
      // registra il contatto anche se la palla non ha oltrepassato il bordo nel frame.
      const playerPaddleMotionHit =
        canRegisterPaddleHit &&
        isBallMovingToPlayer &&
        nextPlayerPaddleX < prevPlayerPaddleX &&
        prevX + ballSize >= nextPlayerPaddleX &&
        prevX <= prevPlayerPaddleX + paddleWidth &&
        intersectsY(prevY, prevY + ballSize, nextPlayerPaddleY, nextPlayerPaddleY + paddleHeight);

      if (playerPaddleHit || playerPaddleSweptHit || playerPaddleMotionHit) {
        const ballCenterY = newY + ballSize / 2;
        const playerVelX = nextPlayerPaddleX - prevPlayerPaddleX;
        const playerVelY = nextPlayerPaddleY - prevPlayerPaddleY;
        const bouncedVelocity = applyPaddleBounce(
          ballCenterY,
          nextPlayerPaddleY,
          newVelX,
          newVelY,
          -1,
          playerVelX,
          playerVelY
        );
        newVelX = bouncedVelocity.vx;
        newVelY = bouncedVelocity.vy;
        newX = nextPlayerPaddleX - ballSize;
        paddleHitCooldownUntilRef.current = Date.now() + paddleHitCooldownMs;
        setServeVisualMode('none');
        playPaddleHit();
        ballOutRef.current = false; // ✅ Reset flag quando rimbalza
      }

      // Collisione con paddle sinistra (AI)
      const isBallMovingToAi = newVelX < 0;
      const aiPaddleHit =
        canRegisterPaddleHit &&
        isBallMovingToAi &&
        newX <= aiPaddleX + paddleWidth &&
        newX + ballSize >= aiPaddleX &&
        newY + ballSize >= aiPaddleY &&
        newY <= aiPaddleY + paddleHeight;

      const aiPaddleSweptHit =
        canRegisterPaddleHit &&
        isBallMovingToAi &&
        prevX >= aiPaddleX + paddleWidth &&
        newX <= aiPaddleX + paddleWidth &&
        intersectsY(sweptBallTop, sweptBallBottom, aiPaddleY, aiPaddleY + paddleHeight);

      if (aiPaddleHit || aiPaddleSweptHit) {
        const ballCenterY = newY + ballSize / 2;
        const bouncedVelocity = applyPaddleBounce(
          ballCenterY,
          aiPaddleY,
          newVelX,
          newVelY,
          1
        );
        newVelX = bouncedVelocity.vx;
        newVelY = bouncedVelocity.vy;
        newX = aiPaddleX + paddleWidth;
        paddleHitCooldownUntilRef.current = Date.now() + paddleHitCooldownMs;
        setServeVisualMode('none');
        playPaddleHit();
        ballOutRef.current = false; // ✅ Reset flag quando rimbalza
      }

      // ✅ PALLINA ESCE A DESTRA - AI SCORE (Una sola volta!)
      if (newX > gameWidth && !ballOutRef.current) {
        ballOutRef.current = true; // ✅ Imposta flag per evitare ripetizioni
        triggerPointFlash('left');
        triggerScorePop('left');
        playScore();
        const newScore = aiScore + 1;
        setAiScore(newScore);

        if (newScore >= winningScore) {
          setGameActive(false);
          setGameOver(true);
          setWinner('AI');
          setShowLoseCelebration(true);
          playSadTrombone();
          playLosePointCrowd();
        } else {
          if (serveTimeoutRef.current) {
            clearTimeout(serveTimeoutRef.current);
            serveTimeoutRef.current = null;
          }
          setWaitingForPlayerServe(true);
          setGameActive(false);
          newX = nextPlayerPaddleX - ballSize;
          newY = nextPlayerPaddleY + paddleHeight / 2 - ballSize / 2;
          newVelX = 0;
          newVelY = 0;
          newSpin = 0;
          setServeVisualMode('none');
          playLosePointCrowd();
          ballOutRef.current = false;
        }
      }

      // ✅ PALLINA ESCE A SINISTRA - PLAYER SCORE (Una sola volta!)
      if (newX < 0 && !ballOutRef.current) {
        ballOutRef.current = true; // ✅ Imposta flag per evitare ripetizioni
        triggerPointFlash('right');
        triggerScorePop('right');
        playScore();
        const newScore = playerScore + 1;
        setPlayerScore(newScore);

        if (newScore >= winningScore) {
          setGameActive(false);
          setGameOver(true);
          setWinner('Player');
          setShowWinCelebration(true);
          playWinFanfare();
          playCrowdCheer();
        } else {
          if (serveTimeoutRef.current) {
            clearTimeout(serveTimeoutRef.current);
            serveTimeoutRef.current = null;
          }
          setWaitingForAiServe(true);
          setGameActive(false);
          newX = aiPaddleX + paddleWidth;
          newY = aiPaddleY + paddleHeight / 2 - ballSize / 2;
          newVelX = 0;
          newVelY = 0;
          newSpin = 0;
          setServeVisualMode('none');
          playCrowdCheer();
          ballOutRef.current = false;
          aiServeDueTimeRef.current = null;
        }
      }

      // ✅ RESETTA PALLINA quando esce completamente
      if ((newX < -ballSize || newX > gameWidth + ballSize) && ballOutRef.current) {
        newX = gameWidth / 2 - ballSize / 2;
        newY = gameHeight / 2 - ballSize / 2;
        newVelX = initialBallSpeed * (Math.random() > 0.5 ? 1 : -1); // Direzione casuale
        newVelY = initialBallSpeed * (Math.random() > 0.5 ? 1 : -1);
        newSpin = 0;
        setServeVisualMode('none');
        ballOutRef.current = false; // ✅ Reset flag per il prossimo gol
      }

      setBallX(newX);
      setBallY(newY);
      setBallVelocityX(newVelX);
      setBallVelocityY(newVelY);
      setBallSpin(newSpin);
      setPlayerPaddleX(nextPlayerPaddleX);
      setPlayerPaddleY(nextPlayerPaddleY);

      // L'AI aggiorna il target solo a intervalli per simulare tempo di reazione.
      const now = Date.now();
      if (now >= aiDecisionTimeRef.current) {
        aiDecisionTimeRef.current = now + reactionMs + Math.random() * reactionVarianceMs;
        aiTargetYOffsetRef.current = (Math.random() * 2 - 1) * maxAimErrorY;
        aiTargetXOffsetRef.current = (Math.random() * 2 - 1) * maxAimErrorX;
      }

      // AI paddle movement
      setAiPaddleY((prev) => {
        const aiCenter = prev + paddleHeight / 2;
        const targetCenterY = ballY + ballSize / 2 + aiTargetYOffsetRef.current;
        const aiSpeed = paddleSpeed * verticalSpeedFactor;

        if (targetCenterY < aiCenter - 14) {
          return Math.max(0, prev - aiSpeed);
        } else if (targetCenterY > aiCenter + 14) {
          return Math.min(gameHeight - paddleHeight, prev + aiSpeed);
        }
        return prev;
      });

      setAiPaddleX((prev) => {
        const aiSpeedX = paddleSpeed * horizontalSpeedFactor;
        const targetX = ballX < gameWidth / 2
          ? Math.max(aiAreaMinX, Math.min(aiAreaMaxX, ballX - 30 + aiTargetXOffsetRef.current))
          : aiAreaMinX;

        if (targetX < prev - aiSpeedX) {
          return Math.max(aiAreaMinX, prev - aiSpeedX);
        }
        if (targetX > prev + aiSpeedX) {
          return Math.min(aiAreaMaxX, prev + aiSpeedX);
        }
        return targetX;
      });
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(gameLoop);
  }, [
    gameActive,
    isPaused,
    gameOver,
    waitingForMatchStart,
    countdownValue,
    ballX,
    ballY,
    ballVelocityX,
    ballVelocityY,
    ballSpin,
    playerPaddleX,
    playerPaddleY,
    aiPaddleX,
    aiPaddleY,
    difficulty,
    winningScore,
    waitingForPlayerServe,
    waitingForAiServe,
    playerScore,
    aiScore,
    speedMultiplier,
    gameWidth,
    gameHeight,
    aiAreaMinX,
    aiAreaMaxX,
    playerAreaMinX,
    playerAreaMaxX,
    playPaddleHit,
    playScore,
    playWallHit,
    triggerPointFlash,
    triggerScorePop,
    playCrowdCheer,
    playCrowdRallyPeak,
    playLosePointCrowd,
    playSadTrombone,
    playWinFanfare,
    reactionMs,
    reactionVarianceMs,
    maxAimErrorY,
    maxAimErrorX,
    verticalSpeedFactor,
    horizontalSpeedFactor,
  ]);

  const resetGame = () => {
    if (serveTimeoutRef.current) {
      clearTimeout(serveTimeoutRef.current);
      serveTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    aiServeDueTimeRef.current = null;

    setBallX(gameWidth / 2 - ballSize / 2);
    setBallY(gameHeight / 2 - ballSize / 2);
    setBallVelocityX(0);
    setBallVelocityY(0);
    setBallSpin(0);
    setServeVisualMode('none');
    setPlayerPaddleX(playerAreaMaxX);
    setPlayerPaddleY(gameHeight / 2 - paddleHeight / 2);
    setAiPaddleX(aiAreaMinX);
    setAiPaddleY(gameHeight / 2 - paddleHeight / 2);
    setPlayerScore(0);
    setAiScore(0);
    setGameActive(false);
    setIsPaused(false);
    setWaitingForMatchStart(true);
    setInitialServer(null);
    setCountdownValue(null);
    setWaitingForPlayerServe(false);
    setWaitingForAiServe(false);
    setGameOver(false);
    setWinner(null);
    setShowWinCelebration(false);
    setShowLoseCelebration(false);
    setPointFlashSide(null);
    setIsServicePulse(false);
    setScorePopSide(null);
    setSpeedMultiplier(1);
    aiDecisionTimeRef.current = 0;
    aiTargetYOffsetRef.current = 0;
    aiTargetXOffsetRef.current = 0;
    paddleHitCooldownUntilRef.current = 0;
    crowdPeakCooldownUntilRef.current = 0;
    ballOutRef.current = false; // ✅ Reset flag
  };

  const gamePhase = gameOver
    ? 'phase-game-over'
    : countdownValue !== null
      ? 'phase-countdown'
      : waitingForMatchStart
        ? 'phase-pre-match'
        : (waitingForPlayerServe || waitingForAiServe)
            ? 'phase-serve'
            : 'phase-rally';

  const serviceLabel = waitingForPlayerServe
    ? playerName
    : waitingForAiServe
      ? aiName
      : initialServer === 'player'
        ? playerName
        : initialServer === 'ai'
          ? aiName
          : 'Da scegliere';

  const statusMessage = gameOver
    ? `GAME OVER - ${winner === 'Player' ? playerName : aiName} ha vinto!`
    : countdownValue !== null
      ? `Inizio tra ${countdownValue}...`
      : waitingForMatchStart
        ? initialServer
          ? `Primo servizio: ${initialServer === 'player' ? playerName : aiName}. Premi Inizia Partita`
          : 'Scegli chi inizia a servire'
        : waitingForAiServe
          ? 'AI al servizio...'
          : waitingForPlayerServe
            ? 'Hai il servizio: SPAZIO/INVIO normale | S effetto | A ace'
            : 'Usa frecce su/giu e sinistra/destra per muoverti';

  return (
    <div className={`game-container ${gamePhase} ${hideCursor ? 'hide-cursor' : ''}`}>
      <header className="game-header">
        <h1>PONG AI OPEN | PRO ARENA</h1>
      </header>

      <div className="game-wrapper">
        <div className="court-column">
          <div className="court-topbar">
            <div className="score-board">
              <div className={`score-section ${scorePopSide === 'left' ? 'is-score-pop' : ''}`}>
                <p className="score-label">{aiName}</p>
                <p className="score-value">{aiScore}</p>
              </div>
              <div className="score-divider">vs</div>
              <div className={`score-section ${scorePopSide === 'right' ? 'is-score-pop' : ''}`}>
                <p className="score-label">{playerName}</p>
                <p className="score-value">{playerScore}</p>
              </div>
            </div>

            <div className="status-actions">
              <div className="game-status" role="status" aria-live="polite">
                <p className={`status-text ${gameOver ? 'is-game-over' : ''}`}>{statusMessage}</p>
              </div>

              <div
                className={`service-badge ${isServicePulse ? 'is-pulse' : ''}`}
                aria-label={`Servizio corrente: ${serviceLabel}`}
              >
                <span className="service-badge-label">Servizio</span>
                <span className="service-badge-value">{serviceLabel}</span>
              </div>

              <button onClick={() => setIsSettingsOpen(true)} className="settings-btn">
                Settings
              </button>

              <div className="topbar-buttons">
                {waitingForMatchStart && countdownValue === null && !gameOver && (
                  <>
                    <button
                      onClick={() => setInitialServer('player')}
                      className={`reset-btn ${initialServer === 'player' ? 'is-selected' : ''}`}
                    >
                      Serve {playerName}
                    </button>
                    <button
                      onClick={() => setInitialServer('ai')}
                      className={`reset-btn ${initialServer === 'ai' ? 'is-selected' : ''}`}
                    >
                      Serve {aiName}
                    </button>
                    <button onClick={startMatchCountdown} className="reset-btn" disabled={!initialServer}>
                      Inizia Partita
                    </button>
                  </>
                )}
                {gameActive && !gameOver && (
                  <button
                    onClick={() => setIsPaused(p => !p)}
                    className={`reset-btn pause-btn${isPaused ? ' is-paused' : ''}`}
                  >
                    {isPaused ? '▶ Riprendi' : '⏸ Pausa'}
                  </button>
                )}
                <button onClick={resetGame} className="reset-btn">
                  {gameOver ? 'Nuovo Gioco' : 'Reset'}
                </button>
              </div>
            </div>
          </div>

          <div
            className={`game-board ${pointFlashSide ? `flash-${pointFlashSide}` : ''}`}
            style={{ width: gameWidth, height: gameHeight }}
          >
            {countdownValue !== null && (
              <div className="countdown-overlay">
                <span className="countdown-number">{countdownValue}</span>
              </div>
            )}

            {showLoseCelebration && (
              <div className="lose-celebration-overlay" onClick={() => setShowLoseCelebration(false)}>
                <div className="lose-celebration-content">
                  <div className="lose-icon">😢</div>
                  <div className="lose-title">HAI PERSO!</div>
                  <div className="lose-subtitle">{aiName} ha vinto questa volta...</div>
                  <div className="lose-hint">clicca per continuare</div>
                </div>
              </div>
            )}

            {showWinCelebration && (
              <div className="win-celebration-overlay" onClick={() => setShowWinCelebration(false)}>
                <div className="win-celebration-content">
                  <div className="win-trophy">🏆</div>
                  <div className="win-title">HAI VINTO!</div>
                  <div className="win-subtitle">{playerName} · Campione</div>
                </div>
                {Array.from({ length: 28 }).map((_, i) => (
                  <div
                    key={i}
                    className="confetti-piece"
                    style={{
                      '--cx': `${Math.random() * 100}%`,
                      '--cy': `${-10 - Math.random() * 20}%`,
                      '--cr': `${Math.random() * 360}deg`,
                      '--cd': `${0.2 + Math.random() * 1.4}s`,
                      '--cs': `${0.6 + Math.random() * 0.8}`,
                      '--cc': `hsl(${Math.floor(Math.random() * 360)}, 90%, 65%)`,
                    }}
                  />
                ))}
              </div>
            )}

            <div
              className="paddle ai-paddle"
              style={{
                left: aiPaddleX,
                top: aiPaddleY,
                background: `linear-gradient(to right, ${aiColor}, ${aiColor})`,
                boxShadow: `0 0 10px ${aiColor}, 0 0 20px ${aiColor}99`,
              }}
            />

            <div
              className={`ball ${spinState !== 'none' ? `spin-${spinState}` : ''} ${serveVisualMode !== 'none' ? `trail-${serveVisualMode}` : ''}`}
              data-spin={spinState !== 'none' ? spinState : undefined}
              style={{
                left: ballX,
                top: ballY,
                background: `radial-gradient(circle at 30% 30%, #ffffff, ${ballColor})`,
                boxShadow: `0 0 10px ${ballColor}, 0 0 20px ${ballColor}99`,
              }}
            />

            <div
              className="paddle player-paddle"
              style={{
                left: playerPaddleX,
                top: playerPaddleY,
                background: `linear-gradient(to right, ${playerColor}, ${playerColor})`,
                boxShadow: `0 0 10px ${playerColor}, 0 0 20px ${playerColor}99`,
              }}
            />

            <div className="center-line" />
          </div>
        </div>
      </div>

      {isSettingsOpen && (
        <div className="settings-modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h2>Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="settings-close-btn">
                Chiudi
              </button>
            </div>

            <div className="controls-section">
              <label htmlFor="player-name">Nome Giocatore</label>
              <input
                id="player-name"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.slice(0, 16))}
                className="text-input"
                placeholder="Il tuo nome"
              />

              <label htmlFor="ai-name">Nome Avversario AI</label>
              <input
                id="ai-name"
                type="text"
                value={aiName}
                onChange={(e) => setAiName(e.target.value.slice(0, 16))}
                className="text-input"
                placeholder="Nome AI"
              />

              <label htmlFor="speed">Velocità Pallina: {speedMultiplier.toFixed(1)}x</label>
              <input
                id="speed"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speedMultiplier}
                onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                className="speed-slider"
              />

              <label htmlFor="difficulty">Difficoltà AI</label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="difficulty-select"
              >
                <option value="easy">Facile</option>
                <option value="medium">Media</option>
                <option value="hard">Difficile</option>
              </select>

              <label htmlFor="winning-score">Punti per Vincere: {winningScore}</label>
              <input
                id="winning-score"
                type="range"
                min="3"
                max="21"
                step="1"
                value={winningScore}
                onChange={(e) => setWinningScore(parseInt(e.target.value, 10))}
                className="speed-slider"
              />

              <div className="audio-controls">
                <button onClick={() => setIsMuted((prev) => !prev)} className="audio-toggle-btn">
                  {isMuted ? 'Audio: OFF' : 'Audio: ON'}
                </button>

                <button onClick={previewCrowdAudio} className="audio-toggle-btn">
                  Test Pubblico
                </button>

                <label htmlFor="master-volume">Volume Generale: {Math.round(masterVolume * 100)}%</label>
                <input
                  id="master-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                  className="speed-slider volume-slider"
                />

                <label htmlFor="effects-volume">Volume Effetti: {Math.round(effectsVolume * 100)}%</label>
                <input
                  id="effects-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={effectsVolume}
                  onChange={(e) => setEffectsVolume(parseFloat(e.target.value))}
                  className="speed-slider volume-slider"
                />

                <label htmlFor="crowd-volume">Volume Pubblico: {Math.round(crowdVolume * 100)}%</label>
                <input
                  id="crowd-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={crowdVolume}
                  onChange={(e) => setCrowdVolume(parseFloat(e.target.value))}
                  className="speed-slider volume-slider"
                />
              </div>
            </div>

            <div className="instructions">
              <p>🎮 {playerName} vs {aiName}</p>
              <p>🎯 Primo a raggiungere {winningScore} punti vince!</p>
              <p>🤖 Difficoltà AI: {difficulty === 'easy' ? 'Facile' : difficulty === 'hard' ? 'Difficile' : 'Media'}</p>
              <p>🎾 Servizio: SPAZIO/INVIO normale, S con effetto, A ace potente</p>
              <p>⚡ Trail servizio: rosso per ace, verde per spin</p>
              <p>🔊 Audio eventi: countdown, pubblico, vittoria, punto perso</p>
              <p>🎚️ Mixer audio: generale, effetti e pubblico</p>
              <p>📊 Usa il cursore per controllare la velocità della pallina</p>
            </div>

            <div className="color-controls">
              <h3>Colori Gioco</h3>

              <label htmlFor="player-color">Colore Player</label>
              <input
                id="player-color"
                type="color"
                value={playerColor}
                onChange={(e) => setPlayerColor(e.target.value)}
                className="color-input"
              />

              <label htmlFor="ai-color">Colore AI</label>
              <input
                id="ai-color"
                type="color"
                value={aiColor}
                onChange={(e) => setAiColor(e.target.value)}
                className="color-input"
              />

              <label htmlFor="ball-color">Colore Palla</label>
              <input
                id="ball-color"
                type="color"
                value={ballColor}
                onChange={(e) => setBallColor(e.target.value)}
                className="color-input"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
