"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * ============================================================================
 * CHOBI DAO — 2D MOTION GRAPHICS LAUNCH SHOWCASE (COMPLETE 8-SCENE REEL)
 * ============================================================================
 * - 120 BPM | 56 Beats (28.0 Seconds) | Deterministic 60 FPS rAF Engine
 * - Built-in Web Audio Synthesizer (Warm groove, DSLR shutter clicks, riser,
 *   deliberate 1-beat musical silence at Beat 50, warm chord drop at Beat 51)
 * - Clean blank architectural placeholders for Logo & Landing Page ready for
 *   local agent asset injection via MEDIA_ASSETS below.
 * - Cohesive illustrated editorial guest characters across Scenes 01, 03, 05, 06.
 */

// ----------------------------------------------------------------------------
// 1. LOCAL AGENT MEDIA ASSETS CONFIG (Plug real paths or URLs here)
// ----------------------------------------------------------------------------
const MEDIA_ASSETS = {
  logo: '/assets/chobidao.webp',
  landingPage: '/assets/landing.png',
  eventPhotos: [], // Optional array of photo URLs for Scene 06 gallery
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

// ----------------------------------------------------------------------------
// 2. BRAND DESIGN TOKENS & TIMELINE SINGLE SOURCE OF TRUTH
// ----------------------------------------------------------------------------
const BRAND = {
  CREAM: '#FFFBF7',
  CREAM_SOFT: '#FFF5EB',
  APRICOT_LIGHT: '#FDE4C8',
  APRICOT_MID: '#FCD5B5',
  TERRACOTTA: '#B8430D',
  TANGERINE: '#EA580C',
  GOLD: '#FBBF24',
  ESPRESSO: '#261710',
  ESPRESSO_DARK: '#1A110C',
  BROWN_MUTED: '#8C6E5D',
  BORDER_WARM: '#EFE0D2',
  EMERALD: '#059669',
};

const BPM = 120;
const SEC_PER_BEAT = 60 / BPM; // 0.5s per beat
const TOTAL_BEATS = 56; // 28.0 seconds total
const TOTAL_DURATION = TOTAL_BEATS * SEC_PER_BEAT;

const CUE_MAP = {
  SHOOT_START: 0.0,
  SHOOT_SHUTTERS: [1.0, 2.0, 3.0, 4.0, 5.0],
  PROBLEM_COPY: 5.5,
  LANDING_IN: 8.0,
  LANDING_CLICK: 12.5,
  UPLOAD_AI: 15.0,
  AI_SORT_START: 16.25,
  AI_ALBUM_READY: [17.25, 18.25, 19.0],
  QR_OR_LINK: 23.0,
  QR_LOCK: 27.0,
  LINK_OPEN: 27.5,
  SELFIE_START: 30.0,
  SELFIE_COUNTDOWN: [30.0, 31.0, 32.0],
  SELFIE_SHUTTER: 33.0,
  GALLERY_IN: 37.0,
  GALLERY_DOWNLOAD: 41.5,
  FAST_PRIVATE: 44.0,
  PRIVACY_LOCK: 46.25,
  READY_IN_SECONDS: 48.0,
  SILENCE_GAP: 50.0,
  BRAND_DROP: 51.0,
} as const;

const SCENES = [
  { id: 1, code: '01', name: 'Event Shoot', start: 0, end: 8 },
  { id: 2, code: '02', name: 'Landing Page', start: 8, end: 15 },
  { id: 3, code: '03', name: 'AI Sorting', start: 15, end: 23 },
  { id: 4, code: '04', name: 'QR or Link', start: 23, end: 30 },
  { id: 5, code: '05', name: 'Selfie Search', start: 30, end: 37 },
  { id: 6, code: '06', name: 'Your Gallery', start: 37, end: 44 },
  { id: 7, code: '07', name: 'Fast & Private', start: 44, end: 48 },
  { id: 8, code: '08', name: 'Brand Drop', start: 48, end: 56 },
];

// ----------------------------------------------------------------------------
// 3. DETERMINISTIC MATH, EASING & SPRING PHYSICS
// ----------------------------------------------------------------------------
const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const invLerp = (a: number, b: number, v: number) => (b === a ? 0 : clamp((v - a) / (b - a)));

const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const easeOutExpo = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeInOutQuint = (t: number) => {
  const x = clamp(t);
  return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
};

/**
 * Analytical damped harmonic spring driven purely by beat delta.
 */
function springBeat(beat: number, startBeat: number, stiffness = 220, damping = 20) {
  const dt = (beat - startBeat) * SEC_PER_BEAT;
  if (dt <= 0) return 0;
  const omega = Math.sqrt(stiffness);
  const zeta = damping / (2 * omega);
  if (zeta < 1) {
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    const val =
      1 -
      Math.exp(-zeta * omega * dt) *
        (Math.cos(omegaD * dt) +
          ((zeta * omega) / omegaD) * Math.sin(omegaD * dt));
    return Math.abs(1 - val) < 0.0005 && dt > 0.6 ? 1 : val;
  }
  return 1 - Math.exp(-omega * dt) * (1 + omega * dt);
}

// ----------------------------------------------------------------------------
// 4. WEB AUDIO SYNTHESIZER ENGINE (120 BPM WARM EDITORIAL SCORE + SFX)
// ----------------------------------------------------------------------------
class WarmShowcaseAudioEngine {
  private ctx!: AudioContext;
  private masterGain!: GainNode;
  private muted = false;
  private scheduledSteps = new Set<number>();

  init() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 0.42;
        this.masterGain.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch {
      // Gracefully ignore audio restrictions
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.42, this.ctx.currentTime, 0.02);
    }
  }

  reset() {
    this.scheduledSteps.clear();
  }

  playKick(time: number, gainVal = 0.65) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(128, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.13);
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(gainVal, time + 0.025);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.24);
  }

  playHat(time: number, gainVal = 0.08, open = false) {
    const bufSize = Math.floor(this.ctx.sampleRate * (open ? 0.14 : 0.045));
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.35));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gainVal, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + (open ? 0.13 : 0.04));
    src.connect(hp);
    hp.connect(g);
    g.connect(this.masterGain);
    src.start(time);
  }

  playShutterClick(time: number, gainVal = 0.42) {
    // Crisp dual-transient mechanical DSLR shutter
    const click = (offset: number, freq: number, dur: number) => {
      const bufSize = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.22));
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = 1.6;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gainVal, time + offset);
      g.gain.exponentialRampToValueAtTime(0.001, time + offset + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      src.start(time + offset);
    };
    click(0, 2600, 0.032);
    click(0.038, 1750, 0.042);
  }

  playUiClick(time: number, gainVal = 0.14) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1050, time);
    osc.frequency.exponentialRampToValueAtTime(720, time + 0.075);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainVal, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  playPhotoClick(time: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, time);
    osc.frequency.exponentialRampToValueAtTime(280, time + 0.09);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.13, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.14);
  }

  playQrScan(time: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, time);
    osc.frequency.exponentialRampToValueAtTime(1880, time + 0.3);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, time);
    filter.frequency.exponentialRampToValueAtTime(3000, time + 0.3);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.075, time + 0.08);
    gain.gain.setValueAtTime(0.075, time + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.48);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.5);
    this.playPluck(time + 0.39, 1760, 0.11, 0.17);
  }

  playScanLock(time: number) {
    const size = Math.floor(this.ctx.sampleRate * 0.42);
    const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (size * 0.7));
    }
    const source = this.ctx.createBufferSource();
    const band = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    band.type = 'bandpass';
    band.frequency.setValueAtTime(520, time);
    band.frequency.exponentialRampToValueAtTime(1900, time + 0.3);
    band.Q.value = 0.8;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.11, time + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.42);
    source.connect(band);
    band.connect(gain);
    gain.connect(this.masterGain);
    source.start(time);
  }

  playDownloadChime(time: number) {
    this.playPluck(time, 783.99, 0.075, 0.55);
    this.playPluck(time + 0.11, 659.25, 0.085, 0.62);
    this.playPluck(time + 0.22, 523.25, 0.095, 0.78);
  }

  playPrivacyLock(time: number) {
    const latch = this.ctx.createOscillator();
    const latchGain = this.ctx.createGain();
    latch.type = 'triangle';
    latch.frequency.setValueAtTime(196, time);
    latch.frequency.exponentialRampToValueAtTime(146, time + 0.16);
    latchGain.gain.setValueAtTime(0.001, time);
    latchGain.gain.linearRampToValueAtTime(0.13, time + 0.012);
    latchGain.gain.exponentialRampToValueAtTime(0.001, time + 0.19);
    latch.connect(latchGain);
    latchGain.connect(this.masterGain);
    latch.start(time);
    latch.stop(time + 0.2);

    [392, 523.25].forEach((frequency, index) => {
      const ring = this.ctx.createOscillator();
      const ringGain = this.ctx.createGain();
      const start = time + 0.06 + index * 0.035;
      ring.type = 'sine';
      ring.frequency.setValueAtTime(frequency, start);
      ringGain.gain.setValueAtTime(0.001, start);
      ringGain.gain.linearRampToValueAtTime(0.045, start + 0.045);
      ringGain.gain.exponentialRampToValueAtTime(0.001, start + 0.54);
      ring.connect(ringGain);
      ringGain.connect(this.masterGain);
      ring.start(start);
      ring.stop(start + 0.56);
    });
  }

  playPluck(time: number, freq: number, gainVal = 0.14, dur = 0.28) {
    const osc = this.ctx.createOscillator();
    const filt = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(2200, time);
    filt.frequency.exponentialRampToValueAtTime(520, time + dur);
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(gainVal, time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(filt);
    filt.connect(g);
    g.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  playWarmChordDrop(time: number) {
    // Rich warm Dmaj9 chord + sub bass bloom
    const notes = [146.83, 220.0, 277.18, 329.63, 369.99, 440.0];
    notes.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, time);
      g.gain.setValueAtTime(0.001, time);
      g.gain.linearRampToValueAtTime(idx === 0 ? 0.34 : 0.11, time + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, time + 2.3);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 2.35);
    });
  }

  scheduleWindow(currentBeat: number, speed = 1) {
    if (!this.ctx || this.muted) return;
    const lookAheadBeats = 0.45 * speed;
    const startStep = currentBeat < 0.25 && this.scheduledSteps.size === 0
      ? 0
      : Math.floor(currentBeat * 4) + 1;
    const endStep = Math.floor((currentBeat + lookAheadBeats) * 4);

    // Warm pentatonic melody scale (D major pentatonic)
    const arpScale = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33];

    for (let step = startStep; step <= endStep; step++) {
      if (step < 0 || step >= TOTAL_BEATS * 4) continue;
      if (this.scheduledSteps.has(step)) continue;
      this.scheduledSteps.add(step);

      const stepBeat = step / 4;
      const deltaSec = ((stepBeat - currentBeat) * SEC_PER_BEAT) / speed;
      const playTime = Math.max(this.ctx.currentTime + 0.008, this.ctx.currentTime + deltaSec);

      // Deliberate 1-beat musical silence right before Brand Drop (Beats 50.0 -> 51.0)
      if (stepBeat >= 50.0 && stepBeat < 51.0) continue;

      // Brand Finale Chord Drop at Beat 51.0
      if (step === 51 * 4) {
        this.playKick(playTime, 0.78);
        this.playWarmChordDrop(playTime);
        continue;
      }

      const cueStep = (cueBeat: number) => Math.round(cueBeat * 4);
      if (CUE_MAP.SHOOT_SHUTTERS.some((cueBeat) => step === cueStep(cueBeat))) {
        this.playShutterClick(playTime, 0.44);
      }
      if ([CUE_MAP.LANDING_CLICK, CUE_MAP.UPLOAD_AI, CUE_MAP.LINK_OPEN]
        .some((cueBeat) => step === cueStep(cueBeat))) {
        this.playUiClick(playTime);
      }
      if (step === cueStep(CUE_MAP.AI_SORT_START)) {
        this.playScanLock(playTime);
      }
      if (step === cueStep(CUE_MAP.PRIVACY_LOCK)) {
        this.playPrivacyLock(playTime);
      }
      if (CUE_MAP.AI_ALBUM_READY.some((cueBeat) => step === cueStep(cueBeat))) {
        this.playPhotoClick(playTime);
      }
      if (step === cueStep(CUE_MAP.QR_LOCK)) {
        this.playQrScan(playTime);
      }
      if (CUE_MAP.SELFIE_COUNTDOWN.some((cueBeat) => step === cueStep(cueBeat))) {
        this.playPluck(playTime, 587.33, 0.2, 0.14);
      }
      if (step === cueStep(CUE_MAP.SELFIE_SHUTTER)) {
        this.playShutterClick(playTime, 0.62);
      }
      if (step === cueStep(CUE_MAP.GALLERY_DOWNLOAD)) {
        this.playDownloadChime(playTime);
      }

      if (step === 33 * 4) {
        this.playKick(playTime, 0.72);
      }

      // Steady warm editorial pulse
      if (stepBeat < 50.0) {
        if (step % 4 === 0) {
          this.playKick(playTime, stepBeat < 8 ? 0.42 : 0.56);
        }
        if (step % 2 === 1) {
          this.playHat(playTime, 0.055, step % 8 === 7);
        }
        if (step % 2 === 0 && stepBeat >= 8) {
          const note = arpScale[(step / 2) % arpScale.length];
          this.playPluck(playTime, note, 0.095, 0.22);
        }
      }
    }
  }
}

// ----------------------------------------------------------------------------
// 5. STUDIO UI ICONS (Inline Geometric SVGs)
// ----------------------------------------------------------------------------
const Icons = {
  Play: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4.2 2.8L12.8 8L4.2 13.2V2.8Z" fill="currentColor" />
    </svg>
  ),
  Pause: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3.5" y="3" width="3.2" height="10" rx="1" fill="currentColor" />
      <rect x="9.3" y="3" width="3.2" height="10" rx="1" fill="currentColor" />
    </svg>
  ),
  Replay: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path
        d="M3.2 7.5A4.8 4.8 0 1 1 4.6 11.1M3.2 3.8V7.5H6.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  VolumeOn: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M3 6.2H5.6L9 3.5V12.5L5.6 9.8H3V6.2Z" fill="currentColor" />
      <path d="M11.2 5.4A3.4 3.4 0 0 1 11.2 10.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  VolumeOff: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M3 6.2H5.6L9 3.5V12.5L5.6 9.8H3V6.2Z" fill="currentColor" />
      <path d="M11 6L14 10M14 6L11 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Hud: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 7H8M5 9.5H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Clean: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path
        d="M2.5 6V3.5C2.5 2.95 2.95 2.5 3.5 2.5H6M10 2.5H12.5C13.05 2.5 13.5 2.95 13.5 3.5V6M13.5 10V12.5C13.5 13.05 13.05 13.5 12.5 13.5H10M6 13.5H3.5C2.95 13.5 2.5 13.05 2.5 12.5V10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  Folder: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path
        d="M2.2 4.5C2.2 3.7 2.8 3.1 3.6 3.1H6.3L7.6 4.5H12.4C13.2 4.5 13.8 5.1 13.8 5.9V11.5C13.8 12.3 13.2 12.9 12.4 12.9H3.6C2.8 12.9 2.2 12.3 2.2 11.5V4.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

// ----------------------------------------------------------------------------
// 6. LOGO PLACEHOLDER + COHESIVE EDITORIAL EVENT GUEST CHARACTERS
// ----------------------------------------------------------------------------
function BrandLogoSlot({ x = 0, y = 0, size = 48, logoSrc = '', dark = false }: { x?: number; y?: number; size?: number; logoSrc?: string; dark?: boolean }) {
  const half = size / 2;
  if (logoSrc) {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <image href={logoSrc} x="0" y="0" width={size} height={size} preserveAspectRatio="xMidYMid meet" />
      </g>
    );
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x="0"
        y="0"
        width={size}
        height={size}
        rx={Math.max(8, size * 0.22)}
        fill={dark ? '#2A1D16' : '#FFF4E8'}
        stroke={dark ? '#6B5041' : '#DFC3AC'}
        strokeWidth={Math.max(1.5, size * 0.03)}
        strokeDasharray="4 3"
      />
      <text
        x={half}
        y={half + Math.max(3, size * 0.06)}
        textAnchor="middle"
        fill={dark ? '#C4ADA0' : BRAND.BROWN_MUTED}
        fontSize={Math.max(8, size * 0.19)}
        fontFamily="JetBrains Mono, monospace"
        fontWeight="700"
        letterSpacing="0.8"
      >
        LOGO
      </text>
    </g>
  );
}

// Cohesive Editorial Event Guest Characters used across Scenes 01, 03, 05 & 06
const GUEST_PROFILES = [
  {
    id: 0,
    name: 'Maya',
    skin: '#E6A97E',
    hair: '#261710',
    hairStyle: 'wavy',
    outfit: '#B8430D',
    collar: '#FFFBF7',
    accent: '#FBBF24',
    glasses: false,
    earrings: true,
    bgTint: '#FDE9D5',
  },
  {
    id: 1,
    name: 'Aarav',
    skin: '#D5936A',
    hair: '#1E130D',
    hairStyle: 'short',
    outfit: '#2D2019',
    collar: '#FDE4C8',
    accent: '#F97316',
    glasses: true,
    earrings: false,
    bgTint: '#F7E7DA',
  },
  {
    id: 2,
    name: 'Nadia',
    skin: '#F1BE98',
    hair: '#4A2B1D',
    hairStyle: 'bob',
    outfit: '#EA580C',
    collar: '#FFF3E6',
    accent: '#FDE047',
    glasses: false,
    earrings: true,
    bgTint: '#FCE5CF',
  },
  {
    id: 3,
    name: 'Rafi',
    skin: '#B87850',
    hair: '#1C120D',
    hairStyle: 'curly',
    outfit: '#D97706',
    collar: '#FFFBF7',
    accent: '#FCD5B5',
    glasses: false,
    earrings: false,
    bgTint: '#F9E6D2',
  },
];

function GuestCharacterBust({ personId = 0, x = 0, y = 0, scale = 1, happy = true }: { personId?: number; x?: number; y?: number; scale?: number; happy?: boolean }) {
  const p =
    GUEST_PROFILES[((personId % GUEST_PROFILES.length) + GUEST_PROFILES.length) % GUEST_PROFILES.length];

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Back Hair Layer */}
      {p.hairStyle === 'wavy' && (
        <path
          d="M-24 -6 C-28 10 -24 26 -16 32 H16 C24 26 28 10 24 -6 C22 -24 14 -32 0 -32 C-14 -32 -22 -24 -24 -6 Z"
          fill={p.hair}
        />
      )}
      {p.hairStyle === 'bob' && (
        <path
          d="M-23 -4 C-25 10 -21 20 -14 24 H14 C21 20 25 10 23 -4 C22 -22 13 -30 0 -30 C-13 -30 -22 -22 -23 -4 Z"
          fill={p.hair}
        />
      )}

      {/* Shoulders & Editorial Outfit */}
      <path d="M-38 64 C-38 38 -22 28 0 28 C22 28 38 38 38 64 Z" fill={p.outfit} />
      <path d="M-11 28 L0 41 L11 28 Z" fill={p.collar} opacity="0.92" />

      {/* Neck */}
      <rect x="-7" y="14" width="14" height="18" rx="6" fill={p.skin} />
      <path d="M-7 20 Q0 25 7 20" fill="#000000" opacity="0.08" />

      {/* Ears & Optional Earrings */}
      <circle cx="-18" cy="2" r="4.5" fill={p.skin} />
      <circle cx="18" cy="2" r="4.5" fill={p.skin} />
      {p.earrings && (
        <>
          <circle cx="-18" cy="8" r="2.3" fill={p.accent} />
          <circle cx="18" cy="8" r="2.3" fill={p.accent} />
        </>
      )}

      {/* Head */}
      <rect x="-18" y="-22" width="36" height="42" rx="18" fill={p.skin} />

      {/* Front Hair Style */}
      {p.hairStyle === 'wavy' && (
        <path
          d="M-19 -6 C-19 -24 -10 -30 0 -30 C11 -30 19 -23 19 -6 C12 -14 4 -17 -6 -15 C-12 -14 -16 -10 -19 -6 Z"
          fill={p.hair}
        />
      )}
      {p.hairStyle === 'bob' && (
        <path
          d="M-19 -5 C-19 -23 -9 -29 0 -29 C11 -29 19 -22 19 -5 C13 -15 2 -18 -10 -14 C-14 -12 -17 -9 -19 -5 Z"
          fill={p.hair}
        />
      )}
      {p.hairStyle === 'short' && (
        <path
          d="M-19 -6 C-20 -22 -10 -30 2 -30 C13 -30 20 -22 19 -6 C15 -14 8 -18 -3 -17 C-10 -16 -15 -12 -19 -6 Z"
          fill={p.hair}
        />
      )}
      {p.hairStyle === 'curly' && (
        <g fill={p.hair}>
          <circle cx="-13" cy="-18" r="8" />
          <circle cx="-4" cy="-23" r="9" />
          <circle cx="7" cy="-22" r="8.5" />
          <circle cx="15" cy="-16" r="7.5" />
          <circle cx="-17" cy="-10" r="6" />
          <circle cx="17" cy="-10" r="6" />
        </g>
      )}

      {/* Subtle Warm Cheek Blush */}
      <ellipse cx="-10" cy="6" rx="3.8" ry="2" fill="#E11D48" opacity="0.14" />
      <ellipse cx="10" cy="6" rx="3.8" ry="2" fill="#E11D48" opacity="0.14" />

      {/* Eyes & Brows */}
      <path d="M-11 -6 Q-7 -8.5 -3 -6" stroke={p.hair} strokeWidth="1.7" strokeLinecap="round" fill="none" />
      <path d="M3 -6 Q7 -8.5 11 -6" stroke={p.hair} strokeWidth="1.7" strokeLinecap="round" fill="none" />
      <circle cx="-7" cy="0" r="2.3" fill={BRAND.ESPRESSO} />
      <circle cx="7" cy="0" r="2.3" fill={BRAND.ESPRESSO} />
      <circle cx="-6.2" cy="-0.8" r="0.8" fill="#FFFFFF" />
      <circle cx="7.8" cy="-0.8" r="0.8" fill="#FFFFFF" />

      {/* Optional Glasses */}
      {p.glasses && (
        <g stroke={BRAND.ESPRESSO} strokeWidth="1.6" fill="none">
          <rect x="-13.5" y="-4.5" width="11.5" height="8.5" rx="3" />
          <rect x="2" y="-4.5" width="11.5" height="8.5" rx="3" />
          <line x1="-2" y1="0" x2="2" y2="0" />
        </g>
      )}

      {/* Friendly Smile */}
      {happy ? (
        <path d="M-6 9 Q0 15 6 9" stroke={BRAND.ESPRESSO} strokeWidth="2.1" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M-5 10 Q0 12.5 5 10" stroke={BRAND.ESPRESSO} strokeWidth="1.9" strokeLinecap="round" fill="none" />
      )}
    </g>
  );
}

function WarmEventPhotoArt({ variant = 0, dark = false, photoSrc = '', focusPerson = null }: { variant?: number; dark?: boolean; photoSrc?: string; focusPerson?: number | null }) {
  const idx = ((variant % 8) + 8) % 8;
  const clipId = `photoSlotClip_${idx}_${dark ? 'd' : 'l'}_${focusPerson ?? 'n'}`;

  if (photoSrc) {
    return (
      <g>
        <clipPath id={clipId}>
          <rect width="172" height="110" rx="8" />
        </clipPath>
        <image
          href={photoSrc}
          x="0"
          y="0"
          width="172"
          height="110"
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
      </g>
    );
  }

  const backdrops = [
    ['#FFF1E2', '#FCD5B5'],
    ['#FCE7D2', '#F7C49A'],
    ['#FDF2E6', '#F9D1AE'],
    ['#FAE4D0', '#F5BC8E'],
  ];
  const bgPair = backdrops[idx % backdrops.length];
  const primaryId = focusPerson !== null ? focusPerson : idx % 4;
  const friendId = (primaryId + 1 + (idx % 3)) % 4;
  const thirdId = (primaryId + 2) % 4;
  const mode = idx % 4;

  return (
    <g>
      <clipPath id={clipId}>
        <rect width="172" height="110" rx="8" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect width="172" height="110" fill={dark ? '#2A1B13' : bgPair[0]} />
        <ellipse cx="136" cy="22" rx="74" ry="52" fill={dark ? '#4A2C1B' : bgPair[1]} opacity="0.72" />
        <rect x="0" y="84" width="172" height="26" fill={dark ? '#1F140E' : '#F3D8BE'} opacity="0.45" />

        {/* Soft Venue String-Light Bokeh */}
        <circle cx="24" cy="20" r="9" fill={BRAND.GOLD} opacity={dark ? 0.35 : 0.45} />
        <circle cx="52" cy="14" r="6" fill="#FFFFFF" opacity={dark ? 0.2 : 0.6} />
        <circle cx="144" cy="26" r="12" fill={BRAND.TANGERINE} opacity={dark ? 0.25 : 0.28} />
        <circle cx="122" cy="14" r="5" fill={BRAND.GOLD} opacity="0.5" />

        {mode === 0 && <GuestCharacterBust personId={primaryId} x={86} y={66} scale={1.08} happy />}
        {mode === 1 && (
          <g>
            <GuestCharacterBust personId={primaryId} x={60} y={68} scale={0.95} happy />
            <GuestCharacterBust personId={friendId} x={116} y={71} scale={0.9} happy />
          </g>
        )}
        {mode === 2 && (
          <g>
            <GuestCharacterBust personId={friendId} x={42} y={74} scale={0.82} happy />
            <GuestCharacterBust personId={thirdId} x={132} y={74} scale={0.82} happy />
            <GuestCharacterBust personId={primaryId} x={86} y={66} scale={0.96} happy />
          </g>
        )}
        {mode === 3 && (
          <g>
            <GuestCharacterBust personId={friendId} x={122} y={74} scale={0.84} happy={false} />
            <GuestCharacterBust personId={primaryId} x={64} y={66} scale={1.02} happy />
          </g>
        )}
      </g>
    </g>
  );
}

// ----------------------------------------------------------------------------
// 7. SCENE 01 (BEATS 0 - 8): EVENT PHOTOGRAPHER SHOOTING GUESTS ONE BY ONE
// ----------------------------------------------------------------------------
function Scene1Problem({ beat }: { beat: number }) {
  if (beat > 8.45) return null;

  const whipOut = easeInOutQuint(invLerp(7.6, 8.4, beat));
  const sceneX = -whipOut * 1360;

  const rigEnter = springBeat(beat, 0.0, 210, 19);
  const cameraRaise = easeOutExpo(invLerp(0.1, 0.95, beat));

  const snapBeats = CUE_MAP.SHOOT_SHUTTERS;
  let flashIntensity = 0;
  let recoilOffset = 0;
  let activeShotIndex = -1;
  for (let i = 0; i < snapBeats.length; i++) {
    const sb = snapBeats[i];
    if (beat >= sb) activeShotIndex = i;
    if (beat >= sb && beat < sb + 0.42) {
      const p = invLerp(sb, sb + 0.42, beat);
      flashIntensity = Math.max(flashIntensity, 1 - easeOutExpo(p));
      recoilOffset = Math.max(recoilOffset, Math.sin(p * Math.PI) * 10);
    }
  }

  const countP = easeOutCubic(invLerp(0.9, 6.2, beat));
  const capturedCount = Math.round(2840 * countP);
  const shotBadgeNumber = Math.max(0, activeShotIndex + 1);

  const headlineSpring = springBeat(beat, CUE_MAP.PROBLEM_COPY, 230, 19);
  const dimStage = easeOutExpo(invLerp(5.3, 6.1, beat));

  const stageGuests = [
    { personId: 0, x: 640, y: 410, scale: 1.55, enterBeat: 0.15 },
    { personId: 1, x: 760, y: 394, scale: 1.52, enterBeat: 0.3 },
    { personId: 2, x: 882, y: 414, scale: 1.5, enterBeat: 0.45 },
    { personId: 3, x: 1002, y: 398, scale: 1.52, enterBeat: 0.6 },
  ];

  const afTargets = [
    { x: 640, y: 368 },
    { x: 760, y: 352 },
    { x: 882, y: 372 },
    { x: 1002, y: 356 },
    { x: 820, y: 365 },
  ];
  const curTargetIdx = clamp(activeShotIndex, 0, afTargets.length - 1);
  const prevTargetIdx = Math.max(0, curTargetIdx - 1);
  const moveT =
    activeShotIndex >= 0
      ? easeOutExpo(invLerp(snapBeats[activeShotIndex], snapBeats[activeShotIndex] + 0.35, beat))
      : 0;
  const afX = lerp(afTargets[prevTargetIdx].x, afTargets[curTargetIdx].x, moveT);
  const afY = lerp(afTargets[prevTargetIdx].y, afTargets[curTargetIdx].y, moveT);

  const flyingShots = [
    { id: 0, startBeat: 1.0, endX: 985, endY: 148, rot: 7, variant: 0, shotLabel: 'SHOT #01' },
    { id: 1, startBeat: 2.0, endX: 1125, endY: 222, rot: -6, variant: 1, shotLabel: 'SHOT #02' },
    { id: 2, startBeat: 3.0, endX: 1015, endY: 318, rot: 5, variant: 2, shotLabel: 'SHOT #03' },
    { id: 3, startBeat: 4.0, endX: 1132, endY: 418, rot: -7, variant: 3, shotLabel: 'SHOT #04' },
    { id: 4, startBeat: 5.0, endX: 1038, endY: 506, rot: 4, variant: 6, shotLabel: 'SHOT #05' },
  ];

  return (
    <g transform={`translate(${sceneX}, 0)`}>
      <rect x="0" y="0" width="1280" height="720" fill={BRAND.CREAM} />
      <circle cx="840" cy="340" r="440" fill="url(#warmApricotGlow)" opacity="0.82" />
      <circle cx="260" cy="180" r="240" fill={BRAND.APRICOT_LIGHT} opacity="0.35" />

      {/* Warm Venue Floor & String Lights */}
      <rect x="0" y="546" width="1280" height="174" fill="#F6E5D4" opacity="0.55" />
      <path d="M510 56 Q840 132 1240 48" fill="none" stroke="#E5C8AE" strokeWidth="2.5" />
      {[590, 690, 795, 905, 1015, 1125].map((lx, i) => (
        <g key={i} transform={`translate(${lx}, ${86 + Math.sin(i * 0.9) * 14})`}>
          <circle cx="0" cy="0" r="14" fill={BRAND.GOLD} opacity="0.24" />
          <circle cx="0" cy="0" r="5" fill={BRAND.GOLD} opacity="0.9" />
        </g>
      ))}

      {/* Top Left Step Badge & Rolling Counter */}
      <g transform="translate(76, 56)">
        <rect width="248" height="32" rx="16" fill="#FDE4C8" />
        <text
          x="124"
          y="20.5"
          textAnchor="middle"
          fill={BRAND.TERRACOTTA}
          fontSize="11.5"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="700"
          letterSpacing="1"
        >
          STEP 1 // LIVE EVENT SHOOT
        </text>

        <g transform="translate(0, 54)">
          <text
            x="0"
            y="46"
            fill={BRAND.ESPRESSO}
            fontSize="58"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="800"
            letterSpacing="-2"
          >
            {capturedCount.toLocaleString()}
          </text>
          <text
            x="0"
            y="72"
            fill={BRAND.TERRACOTTA}
            fontSize="13.5"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
            letterSpacing="1.2"
          >
            EVENT PHOTOS CAPTURED {shotBadgeNumber > 0 ? `· SNAP ${shotBadgeNumber}/5` : ''}
          </text>
        </g>
      </g>

      {/* Event Guest Characters Posing on Stage */}
      <g opacity={lerp(1, 0.24, dimStage)}>
        {stageGuests.map((g, idx) => {
          const gSpring = springBeat(beat, g.enterBeat, 210, 18);
          const isBeingShot = activeShotIndex === idx || (activeShotIndex === 4 && idx >= 1 && idx <= 2);
          const posePop = isBeingShot && flashIntensity > 0.05 ? 1 + flashIntensity * 0.07 : 1;
          const sway = Math.sin(beat * 1.4 + idx * 1.6) * 2.5;

          return (
            <g
              key={g.personId}
              transform={`translate(${g.x}, ${lerp(660, g.y + sway, gSpring)}) scale(${posePop})`}
              opacity={clamp(gSpring)}
            >
              <ellipse cx="0" cy="148" rx="46" ry="10" fill={BRAND.ESPRESSO} opacity="0.1" />
              <rect x="-32" y="90" width="64" height="58" rx="18" fill={GUEST_PROFILES[g.personId].outfit} opacity="0.92" />
              <GuestCharacterBust
                personId={g.personId}
                x={0}
                y={0}
                scale={g.scale}
                happy={isBeingShot || beat > g.enterBeat + 0.5}
              />
              {isBeingShot && flashIntensity > 0.05 && (
                <circle
                  cx="0"
                  cy="-10"
                  r="64"
                  fill="none"
                  stroke={BRAND.TANGERINE}
                  strokeWidth="3.5"
                  opacity={flashIntensity}
                />
              )}
            </g>
          );
        })}
      </g>

      {/* Illustrated 2D Event Photographer with DSLR Camera */}
      <g
        transform={`translate(${lerp(56, 132, rigEnter) - recoilOffset}, ${lerp(295, 224, rigEnter)})`}
        opacity={clamp(rigEnter) * lerp(1, 0.28, dimStage)}
      >
        <circle cx="155" cy="130" r="46" fill={BRAND.ESPRESSO} />
        <path d="M68 410 C68 256 105 206 168 206 C230 206 268 252 276 410 Z" fill={BRAND.ESPRESSO} />
        <path d="M126 176 L216 250" stroke={BRAND.TERRACOTTA} strokeWidth="8" strokeLinecap="round" />

        <g transform={`translate(${lerp(-20, 0, cameraRaise)}, ${lerp(42, 0, cameraRaise)})`}>
          <path
            d="M120 278 C158 292 214 274 264 230"
            fill="none"
            stroke="#3B2418"
            strokeWidth="30"
            strokeLinecap="round"
          />
          <g transform="translate(204, 154)">
            <rect
              x="0"
              y="18"
              width="112"
              height="74"
              rx="14"
              fill="#261710"
              stroke="#4A3022"
              strokeWidth="3"
              filter="url(#softCardShadow)"
            />
            <path d="M22 18 L34 0 H74 L86 18 Z" fill="#1A110C" />
            <rect x="38" y="-16" width="32" height="16" rx="4" fill={BRAND.TERRACOTTA} />
            <rect x="44" y="-12" width="20" height="8" rx="2" fill={flashIntensity > 0.1 ? '#FFFFFF' : '#FDE4C8'} />
            <rect x="88" y="10" width="16" height="8" rx="3" fill={BRAND.TANGERINE} />

            <rect x="106" y="26" width="66" height="58" rx="8" fill="#1A110C" stroke="#4A3022" strokeWidth="2.5" />
            <rect x="128" y="26" width="12" height="58" fill={BRAND.TERRACOTTA} />
            <rect x="166" y="22" width="14" height="66" rx="5" fill="#3B2418" />

            {flashIntensity > 0.02 && (
              <g opacity={flashIntensity}>
                <polygon points="180,52 540,-95 540,215" fill="url(#warmApricotGlow)" opacity="0.72" />
                <circle cx="182" cy="54" r={lerp(18, 62, 1 - flashIntensity)} fill="#FFFFFF" opacity="0.92" />
              </g>
            )}
          </g>
        </g>
      </g>

      {/* Moving AF-LOCK Reticle */}
      <g transform={`translate(${afX - 66}, ${afY - 66})`} opacity={lerp(0.95, 0.18, dimStage)}>
        <g stroke={flashIntensity > 0.1 ? BRAND.TANGERINE : BRAND.TERRACOTTA} strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M0 24 V0 H24" />
          <path d="M108 0 H132 V24" />
          <path d="M132 108 V132 H108" />
          <path d="M24 132 H0 V108" />
        </g>
        <rect x="18" y="-26" width="96" height="20" rx="10" fill={BRAND.ESPRESSO} fillOpacity="0.88" />
        <text
          x="66"
          y="-13"
          textAnchor="middle"
          fill={BRAND.GOLD}
          fontSize="9.5"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="700"
        >
          AF-LOCK · 0{Math.max(1, shotBadgeNumber)}
        </text>
      </g>

      {/* Flying Event Photo Cards Piling Up One by One */}
      <g opacity={lerp(1, 0.26, dimStage)}>
        {flyingShots.map((shot) => {
          if (beat < shot.startBeat) return null;
          const p = springBeat(beat, shot.startBeat, 200, 18);
          const x = lerp(520, shot.endX, p);
          const y = lerp(340, shot.endY, p);
          const scale = lerp(0.35, 1.0, p);

          return (
            <g
              key={shot.id}
              transform={`translate(${x}, ${y}) rotate(${shot.rot}) scale(${scale}) translate(-94, -68)`}
              opacity={clamp(p)}
            >
              <rect
                width="188"
                height="136"
                rx="14"
                fill="#FFFFFF"
                stroke={BRAND.BORDER_WARM}
                strokeWidth="2.2"
                filter="url(#softCardShadow)"
              />
              <svg x="8" y="8" width="172" height="104" viewBox="0 0 172 110">
                <WarmEventPhotoArt variant={shot.variant} />
              </svg>
              <text x="14" y="126" fill={BRAND.TERRACOTTA} fontSize="9.5" fontFamily="JetBrains Mono, monospace" fontWeight="700">
                {shot.shotLabel}
              </text>
              <text x="174" y="126" textAnchor="end" fill={BRAND.BROWN_MUTED} fontSize="9.5" fontFamily="JetBrains Mono, monospace" fontWeight="700">
                RAW+JPG
              </text>
            </g>
          );
        })}
      </g>

      {/* Beat 5.5 -> 8.0: Editorial Problem Statement Overlay */}
      {beat >= 5.3 && (
        <g
          transform={`translate(640, ${lerp(420, 355, headlineSpring)}) scale(${lerp(0.9, 1, headlineSpring)})`}
          opacity={clamp(headlineSpring)}
        >
          <rect
            x="-490"
            y="-126"
            width="980"
            height="252"
            rx="30"
            fill="#FFFFFF"
            fillOpacity="0.96"
            stroke={BRAND.BORDER_WARM}
            strokeWidth="2.5"
            filter="url(#deepWarmShadow)"
          />
          <text
            x="0"
            y="-52"
            textAnchor="middle"
            fill={BRAND.TERRACOTTA}
            fontSize="13"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
            letterSpacing="1.6"
          >
            THE EVENT PHOTO PROBLEM
          </text>
          <text
            x="0"
            y="8"
            textAnchor="middle"
            fill={BRAND.ESPRESSO}
            fontSize="50"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="800"
            letterSpacing="-1.6"
          >
            Hundreds of clicks. Thousands of photos.
          </text>
          <text
            x="0"
            y="78"
            textAnchor="middle"
            fill={BRAND.TERRACOTTA}
            fontSize="56"
            fontFamily="Playfair Display, serif"
            fontStyle="italic"
            fontWeight="700"
          >
            Hours lost searching.
          </text>
        </g>
      )}

      {flashIntensity > 0.02 && (
        <rect x="0" y="0" width="1280" height="720" fill="#FFFFFF" opacity={flashIntensity * 0.24} />
      )}
    </g>
  );
}

// ----------------------------------------------------------------------------
// 8. SCENE 02 (BEATS 8 - 15): BRAND & BLANK LANDING PAGE PLACEHOLDER REVEAL
// ----------------------------------------------------------------------------
function Scene2BrandLanding({ beat, logoSrc, landingSrc }: { beat: number; logoSrc: string; landingSrc: string }) {
  if (beat < 7.6 || beat > 15.5) return null;

  const enterP = easeInOutQuint(invLerp(7.6, 8.5, beat));
  const exitP = easeInOutQuint(invLerp(14.5, 15.4, beat));
  const sceneX = lerp(1360, 0, enterP) - exitP * 1360;

  const logoPop = springBeat(beat, 8.2, 230, 18);
  const browserRise = springBeat(beat, 9.2, 190, 19);

  // Cursor glide over the browser viewport toward the primary CTA area
  const cursorMove = easeInOutQuint(invLerp(10.6, 12.4, beat));
  const cursorX = lerp(910, 412, cursorMove);
  const cursorY = lerp(520, 500, cursorMove);
  const clickPulse = beat >= CUE_MAP.LANDING_CLICK ? easeOutExpo(invLerp(CUE_MAP.LANDING_CLICK, 13.4, beat)) : 0;

  return (
    <g transform={`translate(${sceneX}, 0)`}>
      <rect x="0" y="0" width="1280" height="720" fill={BRAND.CREAM} />
      <circle cx="940" cy="360" r="420" fill="url(#warmApricotGlow)" opacity="0.85" />

      {/* Top Brand Header Lockup */}
      <g transform={`translate(640, ${lerp(130, 74, logoPop)})`} opacity={clamp(logoPop)}>
        <g transform="translate(-142, -26)">
          <BrandLogoSlot x={0} y={0} size={48} logoSrc={logoSrc} />
          <text
            x="64"
            y="33"
            fill={BRAND.ESPRESSO}
            fontSize="32"
            fontFamily="Playfair Display, serif"
            fontWeight="700"
          >
            Chobi Dao
          </text>
        </g>
        <text
          x="0"
          y="46"
          textAnchor="middle"
          fill={BRAND.BROWN_MUTED}
          fontSize="13"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="600"
          letterSpacing="1.2"
        >
          AI-POWERED EVENT PHOTO DELIVERY
        </text>
      </g>

      {/* Floating Browser Window with Blank Landing Page Placeholder (or real landingSrc) */}
      <g
        transform={`translate(170, ${lerp(280, 148, browserRise)}) scale(${lerp(0.92, 1, browserRise)})`}
        opacity={clamp(browserRise)}
      >
        <rect
          width="940"
          height="526"
          rx="22"
          fill="#FFFFFF"
          stroke={BRAND.BORDER_WARM}
          strokeWidth="2.5"
          filter="url(#deepWarmShadow)"
        />

        {/* macOS Browser Chrome Bar */}
        <path d="M22 0 H918 A22 22 0 0 1 940 22 V44 H0 V22 A22 22 0 0 1 22 0 Z" fill="#FAF1E8" />
        <line x1="0" y1="44" x2="940" y2="44" stroke={BRAND.BORDER_WARM} strokeWidth="1.5" />
        <circle cx="24" cy="22" r="6" fill="#F87171" />
        <circle cx="44" cy="22" r="6" fill="#FBBF24" />
        <circle cx="64" cy="22" r="6" fill="#34D399" />

        <rect x="290" y="10" width="360" height="24" rx="12" fill="#FFFFFF" stroke="#EAD8C7" strokeWidth="1" />
        <text
          x="470"
          y="25.5"
          textAnchor="middle"
          fill={BRAND.BROWN_MUTED}
          fontSize="11"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="600"
        >
          chobidao.com
        </text>

        {/* Browser Viewport Area */}
        <clipPath id="landingViewportClip">
          <rect x="12" y="54" width="916" height="460" rx="12" />
        </clipPath>

        {landingSrc ? (
          <image
            href={landingSrc}
            x="12"
            y="54"
            width="916"
            height="460"
            preserveAspectRatio="xMidYMin slice"
            clipPath="url(#landingViewportClip)"
          />
        ) : (
          <g clipPath="url(#landingViewportClip)">
            <rect
              x="12"
              y="54"
              width="916"
              height="460"
              rx="12"
              fill="#FFF8F1"
              stroke="#DEC2AA"
              strokeWidth="2.5"
              strokeDasharray="10 8"
            />
            <text
              x="470"
              y="268"
              textAnchor="middle"
              fill={BRAND.ESPRESSO}
              fontSize="22"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="700"
              letterSpacing="1.6"
            >
              LANDING PAGE PLACEHOLDER
            </text>
            <text
              x="470"
              y="302"
              textAnchor="middle"
              fill={BRAND.BROWN_MUTED}
              fontSize="13.5"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontWeight="500"
            >
              Assign MEDIA_ASSETS.landingPage (or drop landing.png in Assets)
            </text>

            {/* Target CTA Marker */}
            <rect
              x="166"
              y="306"
              width="156"
              height="42"
              rx="21"
              fill={BRAND.TERRACOTTA}
              opacity="0.14"
              stroke={BRAND.TERRACOTTA}
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          </g>
        )}
      </g>

      {/* Animated Pointer Cursor & Click Ripple */}
      {beat >= 10.4 && (
        <g transform={`translate(${cursorX}, ${cursorY})`}>
          {clickPulse > 0.01 && (
            <circle
              cx="0"
              cy="0"
              r={lerp(8, 42, clickPulse)}
              fill="none"
              stroke={BRAND.TERRACOTTA}
              strokeWidth="3"
              opacity={1 - clickPulse}
            />
          )}
          <path
            d="M0 0 L0 24 L6.5 18.5 L11.5 28 L15.5 26 L10.5 16.5 L18.5 16.5 Z"
            fill={BRAND.ESPRESSO}
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinejoin="round"
            transform={`scale(${beat >= CUE_MAP.LANDING_CLICK && beat < CUE_MAP.LANDING_CLICK + 0.25 ? 0.86 : 1})`}
          />
        </g>
      )}
    </g>
  );
}

// ----------------------------------------------------------------------------
// 9. SCENE 03 (BEATS 15 - 23): BEAUTIFUL 3-STEP UPLOAD -> AI HUB -> GUEST ALBUMS
// ----------------------------------------------------------------------------
function Scene3UploadAI({ beat }: { beat: number }) {
  if (beat < 14.6 || beat > 23.5) return null;

  const enterP = easeInOutQuint(invLerp(14.6, 15.5, beat));
  const exitP = easeInOutQuint(invLerp(22.5, 23.4, beat));
  const sceneX = lerp(1360, 0, enterP) - exitP * 1360;

  const headerSpring = springBeat(beat, 15.0, 220, 19);
  const col1Spring = springBeat(beat, 15.3, 210, 19);
  const hubSpring = springBeat(beat, CUE_MAP.AI_SORT_START, 220, 18);

  const uploadPct = Math.round(easeOutCubic(invLerp(15.3, 18.4, beat)) * 100);
  const scanY = ((beat * 70) % 140) - 70;

  const guestAlbums = [
    { id: 0, personId: 0, title: "Maya's Album", count: '24 Photos', delay: CUE_MAP.AI_ALBUM_READY[0], accent: BRAND.TERRACOTTA },
    { id: 1, personId: 1, title: "Aarav's Album", count: '18 Photos', delay: CUE_MAP.AI_ALBUM_READY[1], accent: BRAND.TANGERINE },
    { id: 2, personId: 2, title: "Nadia's Album", count: '31 Photos', delay: CUE_MAP.AI_ALBUM_READY[2], accent: BRAND.GOLD },
  ];

  return (
    <g transform={`translate(${sceneX}, 0)`}>
      <rect x="0" y="0" width="1280" height="720" fill={BRAND.CREAM} />
      <circle cx="640" cy="390" r="390" fill="url(#warmApricotGlow)" opacity="0.65" />

      {/* Header */}
      <g transform={`translate(640, ${lerp(36, 62, headerSpring)})`} opacity={clamp(headerSpring)}>
        <rect x="-112" y="-14" width="224" height="28" rx="14" fill="#FDE4C8" />
        <text
          x="0"
          y="4"
          textAnchor="middle"
          fill={BRAND.TERRACOTTA}
          fontSize="11.5"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="700"
          letterSpacing="1.2"
        >
          STEP 2 &amp; 3 // UPLOAD &amp; AI SORT
        </text>
        <text
          x="0"
          y="54"
          textAnchor="middle"
          fill={BRAND.ESPRESSO}
          fontSize="44"
          fontFamily="Plus Jakarta Sans, sans-serif"
          fontWeight="800"
          letterSpacing="-1.4"
        >
          Upload once.{' '}
          <tspan fill={BRAND.TERRACOTTA} fontFamily="Playfair Display, serif" fontStyle="italic">
            AI sorts every guest.
          </tspan>
        </text>
      </g>

      {/* Flowing Connecting Pipeline Curves */}
      <g opacity={clamp(hubSpring)}>
        {/* Left to Center Flow Track */}
        <path d="M412 418 C462 418 476 418 524 418" fill="none" stroke="#E8CEB8" strokeWidth="4" strokeDasharray="8 8" />
        {[0, 1, 2].map((pIdx) => {
          const t = (beat * 0.65 + pIdx * 0.33) % 1;
          return <circle key={pIdx} cx={lerp(414, 522, t)} cy={418} r="5.5" fill={BRAND.TANGERINE} opacity={Math.sin(t * Math.PI)} />;
        })}

        {/* Center to Right 3 Branching Tracks */}
        {[284, 418, 552].map((targetY, idx) => {
          const t = (beat * 0.58 + idx * 0.25) % 1;
          const px = lerp(754, 832, t);
          const py = lerp(418, targetY, easeInOutQuint(t));
          return (
            <g key={idx}>
              <path
                d={`M754 418 C796 418 794 ${targetY} 834 ${targetY}`}
                fill="none"
                stroke="#E8CEB8"
                strokeWidth="3.2"
                strokeDasharray="6 6"
              />
              <circle cx={px} cy={py} r="4.8" fill={BRAND.TERRACOTTA} opacity={Math.sin(t * Math.PI)} />
            </g>
          );
        })}
      </g>

      {/* COLUMN 1: 01 UPLOAD ALBUM */}
      <g transform={`translate(66, ${lerp(275, 224, col1Spring)})`} opacity={clamp(col1Spring)}>
        <rect
          width="346"
          height="386"
          rx="26"
          fill="#FFFFFF"
          stroke={BRAND.BORDER_WARM}
          strokeWidth="2.2"
          filter="url(#softCardShadow)"
        />
        <rect x="24" y="24" width="128" height="24" rx="12" fill="#FFF2E5" />
        <text x="88" y="40" textAnchor="middle" fill={BRAND.TERRACOTTA} fontSize="10.5" fontFamily="JetBrains Mono, monospace" fontWeight="700">
          01 / UPLOAD ALBUM
        </text>
        <text x="24" y="76" fill={BRAND.ESPRESSO} fontSize="21" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800">
          Event_Photos_Raw/
        </text>
        <text x="24" y="99" fill={BRAND.BROWN_MUTED} fontSize="12.5" fontFamily="Plus Jakarta Sans, sans-serif">
          Photographer drops full gallery
        </text>

        {/* 2x2 Grid of Illustrated Event Photos */}
        <g transform="translate(24, 122)">
          {[0, 1, 2, 3].map((i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const tileP = springBeat(beat, 15.4 + i * 0.2, 260, 19);
            return (
              <g
                key={i}
                transform={`translate(${col * 154}, ${row * 86}) scale(${lerp(0.84, 1, tileP)})`}
                opacity={clamp(tileP)}
              >
                <svg width="144" height="78" viewBox="0 0 172 110">
                  <WarmEventPhotoArt variant={i} />
                </svg>
              </g>
            );
          })}
        </g>

        {/* Upload Progress Bar */}
        <g transform="translate(24, 312)">
          <text x="0" y="14" fill={BRAND.ESPRESSO} fontSize="11.5" fontFamily="JetBrains Mono, monospace" fontWeight="700">
            UPLOADING 2,840 PHOTOS
          </text>
          <text x="298" y="14" textAnchor="end" fill={BRAND.TERRACOTTA} fontSize="11.5" fontFamily="JetBrains Mono, monospace" fontWeight="700">
            {uploadPct}%
          </text>
          <rect x="0" y="26" width="298" height="10" rx="5" fill="#F5E8DC" />
          <rect x="0" y="26" width={2.98 * uploadPct} height="10" rx="5" fill={BRAND.TERRACOTTA} />
        </g>
      </g>

      {/* COLUMN 2: 02 GLOWING DARK ESPRESSO AI FACE SCAN HUB */}
      <g transform={`translate(640, 418) scale(${lerp(0.75, 1, hubSpring)}) translate(-116, -158)`} opacity={clamp(hubSpring)}>
        <rect
          width="232"
          height="316"
          rx="30"
          fill={BRAND.ESPRESSO_DARK}
          stroke="#4A3022"
          strokeWidth="2.5"
          filter="url(#deepWarmShadow)"
        />
        <rect x="44" y="22" width="144" height="24" rx="12" fill="#322017" />
        <text x="116" y="38" textAnchor="middle" fill={BRAND.GOLD} fontSize="10.5" fontFamily="JetBrains Mono, monospace" fontWeight="700">
          02 / AI FACE ENGINE
        </text>

        {/* Central Scanning Face Reticle */}
        <g transform="translate(116, 152)">
          <circle cx="0" cy="0" r="76" fill="#281A12" stroke="#533728" strokeWidth="2" />
          <circle
            cx="0"
            cy="0"
            r="64"
            fill="none"
            stroke={BRAND.TANGERINE}
            strokeWidth="2.2"
            strokeDasharray="12 8"
            transform={`rotate(${beat * 26})`}
          />
          <circle cx="0" cy="-8" r="24" fill="none" stroke="#FDE4C8" strokeWidth="2" opacity="0.7" />
          <path d="M-32 42 C-32 22 -18 14 0 14 C18 14 32 22 32 42" fill="none" stroke="#FDE4C8" strokeWidth="2" opacity="0.6" />

          {/* Facial Vector Nodes */}
          <circle cx="-11" cy="-12" r="3" fill={BRAND.GOLD} />
          <circle cx="11" cy="-12" r="3" fill={BRAND.GOLD} />
          <circle cx="0" cy="2" r="3" fill={BRAND.TANGERINE} />
          <line x1="-11" y1="-12" x2="11" y2="-12" stroke={BRAND.GOLD} strokeWidth="1.2" opacity="0.8" />
          <line x1="-11" y1="-12" x2="0" y2="2" stroke={BRAND.GOLD} strokeWidth="1.2" opacity="0.8" />
          <line x1="11" y1="-12" x2="0" y2="2" stroke={BRAND.GOLD} strokeWidth="1.2" opacity="0.8" />

          {/* Laser Scanline */}
          <line x1="-58" y1={scanY * 0.72} x2="58" y2={scanY * 0.72} stroke={BRAND.TANGERINE} strokeWidth="3" strokeLinecap="round" />
        </g>

        <text x="116" y="264" textAnchor="middle" fill="#FFFFFF" fontSize="15" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700">
          Grouping Faces
        </text>
        <text x="116" y="286" textAnchor="middle" fill="#C4ADA0" fontSize="11.5" fontFamily="JetBrains Mono, monospace">
          99.4% ACCURACY
        </text>
      </g>

      {/* COLUMN 3: 03 AUTO-SORTED GUEST ALBUMS WITH CHARACTER PORTRAITS */}
      <g transform="translate(836, 224)">
        {guestAlbums.map((g, idx) => {
          const cardP = springBeat(beat, g.delay, 220, 18);
          return (
            <g
              key={g.id}
              transform={`translate(${lerp(56, 0, cardP)}, ${idx * 134})`}
              opacity={clamp(cardP)}
            >
              <rect
                width="378"
                height="112"
                rx="22"
                fill="#FFFFFF"
                stroke={BRAND.BORDER_WARM}
                strokeWidth="2.2"
                filter="url(#softCardShadow)"
              />

              {/* Illustrated Guest Character Avatar Circle */}
              <clipPath id={`guestAlbumAvatar_${g.id}`}>
                <circle cx="48" cy="56" r="27" />
              </clipPath>
              <circle cx="48" cy="56" r="28" fill={GUEST_PROFILES[g.personId].bgTint} stroke={g.accent} strokeWidth="2.5" />
              <g clipPath={`url(#guestAlbumAvatar_${g.id})`}>
                <GuestCharacterBust personId={g.personId} x={48} y={58} scale={0.62} happy />
              </g>

              {/* Album Metadata */}
              <text x="90" y="46" fill={BRAND.ESPRESSO} fontSize="16" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800">
                {g.title}
              </text>
              <text x="90" y="68" fill={BRAND.TERRACOTTA} fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="700">
                {g.count} · PRIVATE
              </text>

              {/* Mini Illustrated Photo Strip Preview Matching This Guest */}
              <g transform="translate(262, 18)">
                {[0, 1, 2].map((m) => (
                  <g key={m} transform={`translate(${m * 32}, 0)`}>
                    <rect width="28" height="38" rx="6" fill="#FFFFFF" stroke="#E5D2C0" strokeWidth="1.2" />
                    <svg x="2" y="2" width="24" height="34" viewBox="0 0 172 110">
                      <WarmEventPhotoArt variant={m + g.personId} focusPerson={g.personId} />
                    </svg>
                  </g>
                ))}
                <rect x="0" y="48" width="92" height="20" rx="10" fill="#ECFDF5" />
                <text x="46" y="61.5" textAnchor="middle" fill={BRAND.EMERALD} fontSize="9.5" fontFamily="JetBrains Mono, monospace" fontWeight="700">
                  ✓ READY
                </text>
              </g>
            </g>
          );
        })}
      </g>
    </g>
  );
}

// ----------------------------------------------------------------------------
// 10. SCENE 04 (BEATS 23 - 30): SCAN EVENT QR OR VISIT DIRECT LINK
// ----------------------------------------------------------------------------
function Scene4QRScan({ beat, logoSrc }: { beat: number; logoSrc: string }) {
  if (beat < 22.6 || beat > 30.5) return null;

  const enterP = easeInOutQuint(invLerp(22.6, 23.5, beat));
  const exitP = easeInOutQuint(invLerp(29.5, 30.4, beat));
  const sceneX = lerp(1360, 0, enterP) - exitP * 1360;

  const leftSpring = springBeat(beat, 23.2, 210, 19);
  const ticketSpring = springBeat(beat, 23.6, 200, 18);
  const phoneSpring = springBeat(beat, 24.4, 210, 18);
  const linkSpring = springBeat(beat, 25.4, 210, 19);

  const laserOffset = Math.sin(beat * 4.2) * 58;
  const qrLocked = beat >= CUE_MAP.QR_LOCK;
  const linkTap = beat >= CUE_MAP.LINK_OPEN ? easeOutExpo(invLerp(CUE_MAP.LINK_OPEN, 28.3, beat)) : 0;

  return (
    <g transform={`translate(${sceneX}, 0)`}>
      <rect x="0" y="0" width="1280" height="720" fill={BRAND.CREAM} />
      <circle cx="880" cy="360" r="400" fill="url(#warmApricotGlow)" opacity="0.88" />

      {/* Left Column: Editorial Headline + Direct Link Card */}
      <g transform={`translate(76, ${lerp(185, 134, leftSpring)})`} opacity={clamp(leftSpring)}>
        <rect width="212" height="30" rx="15" fill="#FDE4C8" />
        <text x="106" y="19.5" textAnchor="middle" fill={BRAND.TERRACOTTA} fontSize="11.5" fontFamily="JetBrains Mono, monospace" fontWeight="700" letterSpacing="1">
          STEP 4 &amp; 5 // OPEN EVENT
        </text>

        <text x="0" y="92" fill={BRAND.ESPRESSO} fontSize="54" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800" letterSpacing="-1.6">
          Scan the QR
        </text>
        <text x="0" y="156" fill={BRAND.TERRACOTTA} fontSize="58" fontFamily="Playfair Display, serif" fontStyle="italic" fontWeight="700">
          or visit the link.
        </text>
        <text x="0" y="204" fill={BRAND.BROWN_MUTED} fontSize="18" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="500">
          Attendees scan a venue QR code or tap a shared
        </text>
        <text x="0" y="230" fill={BRAND.BROWN_MUTED} fontSize="18" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="500">
          event URL — right in their browser. No app needed.
        </text>

        {/* Interactive Direct Event Link Card */}
        <g transform={`translate(0, ${lerp(310, 274, linkSpring)})`} opacity={clamp(linkSpring)}>
          <rect
            width="456"
            height="92"
            rx="22"
            fill="#FFFFFF"
            stroke={linkTap > 0.05 ? BRAND.TERRACOTTA : BRAND.BORDER_WARM}
            strokeWidth="2.2"
            filter="url(#softCardShadow)"
          />
          <rect x="18" y="22" width="48" height="48" rx="14" fill="#FFF2E5" />
          <path
            d="M36 46 H48 M39 40 H35 A6 6 0 0 0 35 52 H39 M45 40 H49 A6 6 0 0 1 49 52 H45"
            fill="none"
            stroke={BRAND.TERRACOTTA}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <text x="82" y="42" fill={BRAND.BROWN_MUTED} fontSize="10.5" fontFamily="JetBrains Mono, monospace" fontWeight="700">
            OR TAP DIRECT EVENT LINK
          </text>
          <text x="82" y="64" fill={BRAND.ESPRESSO} fontSize="16.5" fontFamily="JetBrains Mono, monospace" fontWeight="700">
            chobidao.com/e/summit-26
          </text>

          {/* Tap Ripple */}
          {linkTap > 0.01 && (
            <circle
              cx="396"
              cy="46"
              r={lerp(6, 30, linkTap)}
              fill="none"
              stroke={BRAND.TERRACOTTA}
              strokeWidth="2.5"
              opacity={1 - linkTap}
            />
          )}
          <rect x="372" y="30" width="66" height="32" rx="16" fill={BRAND.TERRACOTTA} />
          <text x="405" y="50" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700">
            OPEN
          </text>
        </g>
      </g>

      {/* Right Column: Branded Event QR Ticket + Clay Smartphone Scanner */}
      <g transform="translate(620, 128)">
        {/* Event QR Ticket */}
        <g
          transform={`translate(${lerp(60, 0, ticketSpring)}, 74) rotate(-8)`}
          opacity={clamp(ticketSpring)}
        >
          <rect
            width="284"
            height="334"
            rx="28"
            fill="#FFF7EE"
            stroke="#E7C8AE"
            strokeWidth="3"
            filter="url(#deepWarmShadow)"
          />
          <text x="142" y="42" textAnchor="middle" fill={BRAND.TERRACOTTA} fontSize="11.5" fontFamily="JetBrains Mono, monospace" fontWeight="700" letterSpacing="1.2">
            EVENT GALLERY PASS
          </text>

          {/* Geometric QR Pattern */}
          <g transform="translate(54, 64)">
            <rect width="176" height="176" rx="16" fill="#FFFFFF" stroke="#EAD4C0" strokeWidth="2" />
            {/* 3 Corner Finder Squares */}
            <rect x="16" y="16" width="40" height="40" rx="6" fill="none" stroke={BRAND.TERRACOTTA} strokeWidth="6" />
            <rect x="28" y="28" width="16" height="16" rx="3" fill={BRAND.TERRACOTTA} />

            <rect x="120" y="16" width="40" height="40" rx="6" fill="none" stroke={BRAND.TERRACOTTA} strokeWidth="6" />
            <rect x="132" y="28" width="16" height="16" rx="3" fill={BRAND.TERRACOTTA} />

            <rect x="16" y="120" width="40" height="40" rx="6" fill="none" stroke={BRAND.TERRACOTTA} strokeWidth="6" />
            <rect x="28" y="132" width="16" height="16" rx="3" fill={BRAND.TERRACOTTA} />

            {/* QR Data Modules */}
            {[
              [70, 22], [88, 22], [100, 38], [70, 50],
              [22, 74], [42, 74], [22, 96], [134, 74],
              [148, 92], [124, 122], [146, 122], [124, 146], [146, 146], [76, 134], [96, 146],
            ].map(([qx, qy], i) => (
              <rect key={i} x={qx} y={qy} width="12" height="12" rx="3" fill={BRAND.TERRACOTTA} opacity="0.85" />
            ))}

            {/* Center Brand Logo Placeholder inside QR */}
            <BrandLogoSlot x={68} y={68} size={40} logoSrc={logoSrc} />
          </g>

          <text x="142" y="276" textAnchor="middle" fill={BRAND.ESPRESSO} fontSize="15" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800">
            Scan to Find Your Photos
          </text>
          <text x="142" y="300" textAnchor="middle" fill={BRAND.BROWN_MUTED} fontSize="11.5" fontFamily="JetBrains Mono, monospace">
            CHOBI DAO · PRIVATE ACCESS
          </text>
        </g>

        {/* Clay / Matte Smartphone Scanning the QR */}
        <g
          transform={`translate(${lerp(340, 224, phoneSpring)}, ${lerp(130, 32, phoneSpring)}) rotate(6)`}
          opacity={clamp(phoneSpring)}
        >
          <rect
            width="238"
            height="432"
            rx="40"
            fill="#FFF7EE"
            stroke="#DFC3AC"
            strokeWidth="4"
            filter="url(#deepWarmShadow)"
          />
          <rect x="86" y="18" width="66" height="9" rx="4.5" fill="#D5B8A0" />

          {/* Phone Screen */}
          <rect x="16" y="42" width="206" height="330" rx="22" fill="#FFFFFF" stroke="#EFE0D2" strokeWidth="1.5" />

          {/* Orange Viewfinder Corner Brackets */}
          <g
            transform="translate(44, 108)"
            stroke={qrLocked ? BRAND.EMERALD : BRAND.TANGERINE}
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          >
            <path d="M0 28 V0 H28" />
            <path d="M122 0 H150 V28" />
            <path d="M150 122 V150 H122" />
            <path d="M28 150 H0 V122" />
          </g>

          {/* Animated Scanning Laser Line */}
          {!qrLocked && (
            <line
              x1="46"
              y1={182 + laserOffset}
              x2="192"
              y2={182 + laserOffset}
              stroke={BRAND.TANGERINE}
              strokeWidth="4"
              strokeLinecap="round"
            />
          )}

          {/* Lock Status Pill */}
          <rect
            x="40"
            y="306"
            width="158"
            height="34"
            rx="17"
            fill={qrLocked ? '#ECFDF5' : '#FFF2E5'}
          />
          <text
            x="119"
            y="327"
            textAnchor="middle"
            fill={qrLocked ? BRAND.EMERALD : BRAND.TERRACOTTA}
            fontSize="11.5"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
          >
            {qrLocked ? '✓ EVENT OPENED' : 'SCANNING QR...'}
          </text>

          {/* Clay Home Ring */}
          <circle cx="119" cy="400" r="14" fill="none" stroke={BRAND.TANGERINE} strokeWidth="4" />
        </g>
      </g>
    </g>
  );
}

// ----------------------------------------------------------------------------
// 11. SCENE 05 (BEATS 30 - 37): ONE SELFIE, INSTANT AI FACE SEARCH
// ----------------------------------------------------------------------------
function Scene5SelfieSearch({ beat }: { beat: number }) {
  if (beat < 29.6 || beat > 37.5) return null;

  const enterP = easeInOutQuint(invLerp(29.6, 30.5, beat));
  const exitP = easeInOutQuint(invLerp(36.5, 37.4, beat));
  const sceneX = lerp(1360, 0, enterP) - exitP * 1360;

  const frameSpring = springBeat(beat, 30.0, 220, 19);
  const isPostShutter = beat >= CUE_MAP.SELFIE_SHUTTER;
  const shutterFlash = isPostShutter ? 1 - easeOutExpo(invLerp(33.0, 33.6, beat)) : 0;

  const countdownNum = beat < CUE_MAP.SELFIE_COUNTDOWN[1]
    ? 3
    : beat < CUE_MAP.SELFIE_COUNTDOWN[2]
      ? 2
      : beat < CUE_MAP.SELFIE_SHUTTER
        ? 1
        : 0;
  const sweepP = invLerp(30.0, 33.0, beat);
  const ringCirc = 2 * Math.PI * 144;
  const searchPulse = isPostShutter ? easeOutExpo(invLerp(33.0, 35.6, beat)) : 0;

  const photoNodes = [
    { id: 0, x: 186, y: 196, variant: 0, isMatch: true, delay: 33.3 },
    { id: 1, x: 248, y: 492, variant: 1, isMatch: false, delay: 33.5 },
    { id: 2, x: 1034, y: 192, variant: 2, isMatch: true, delay: 33.4 },
    { id: 3, x: 1010, y: 498, variant: 3, isMatch: true, delay: 33.7 },
    { id: 4, x: 112, y: 348, variant: 4, isMatch: true, delay: 33.6 },
    { id: 5, x: 1152, y: 346, variant: 5, isMatch: false, delay: 33.8 },
  ];

  return (
    <g transform={`translate(${sceneX}, 0)`}>
      <rect x="0" y="0" width="1280" height="720" fill={BRAND.CREAM} />
      <circle cx="640" cy="360" r="390" fill="url(#warmApricotGlow)" opacity="0.82" />

      {/* Header */}
      <g transform="translate(640, 60)">
        <rect x="-112" y="-14" width="224" height="28" rx="14" fill="#FDE4C8" />
        <text x="0" y="4" textAnchor="middle" fill={BRAND.TERRACOTTA} fontSize="11.5" fontFamily="JetBrains Mono, monospace" fontWeight="700" letterSpacing="1.2">
          STEP 6 // SELFIE FACE MATCH
        </text>
        <text x="0" y="54" textAnchor="middle" fill={BRAND.ESPRESSO} fontSize="44" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800" letterSpacing="-1.4">
          {isPostShutter ? (
            <>
              Searching 2,840 photos{' '}
              <tspan fill={BRAND.TERRACOTTA} fontFamily="Playfair Display, serif" fontStyle="italic">
                in seconds.
              </tspan>
            </>
          ) : (
            <>
              Take one{' '}
              <tspan fill={BRAND.TERRACOTTA} fontFamily="Playfair Display, serif" fontStyle="italic">
                quick selfie.
              </tspan>
            </>
          )}
        </text>
      </g>

      {/* Expanding Radial Search Pulse + Surrounding Event Photo Nodes */}
      {isPostShutter && (
        <g>
          <circle
            cx="640"
            cy="360"
            r={lerp(150, 540, searchPulse)}
            fill="none"
            stroke={BRAND.TANGERINE}
            strokeWidth="3.5"
            opacity={(1 - searchPulse) * 0.7}
          />
          {photoNodes.map((node) => {
            const np = springBeat(beat, node.delay, 220, 18);
            const lit = node.isMatch && beat > node.delay + 0.4;
            return (
              <g key={node.id} opacity={clamp(np)}>
                {lit && (
                  <line
                    x1="640"
                    y1="360"
                    x2={node.x}
                    y2={node.y}
                    stroke={BRAND.TANGERINE}
                    strokeWidth="2.2"
                    strokeDasharray="6 6"
                    opacity="0.7"
                  />
                )}
                <g transform={`translate(${node.x - 42}, ${node.y - 42}) scale(${lerp(0.75, 1, np)})`}>
                  <rect
                    width="84"
                    height="84"
                    rx="14"
                    fill="#FFFFFF"
                    stroke={lit ? BRAND.TERRACOTTA : BRAND.BORDER_WARM}
                    strokeWidth={lit ? '2.8' : '1.8'}
                    filter="url(#softCardShadow)"
                  />
                  <svg x="6" y="6" width="72" height="52" viewBox="0 0 172 110">
                    <WarmEventPhotoArt variant={node.variant} focusPerson={node.isMatch ? 0 : (node.variant % 3) + 1} />
                  </svg>
                  <rect x="6" y="62" width="72" height="16" rx="6" fill={lit ? BRAND.TERRACOTTA : '#F4EAE0'} />
                  <text
                    x="42"
                    y="73.5"
                    textAnchor="middle"
                    fill={lit ? '#FFFFFF' : BRAND.BROWN_MUTED}
                    fontSize="8.5"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="700"
                  >
                    {lit ? '99.4% MATCH' : 'SCANNED'}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      )}

      {/* Center Circular Biometric Selfie Viewfinder */}
      <g transform={`translate(640, 360) scale(${lerp(0.76, 1, frameSpring)}) translate(-640, -360)`}>
        <circle cx="640" cy="360" r="168" fill="#FFFFFF" stroke={BRAND.BORDER_WARM} strokeWidth="3" filter="url(#deepWarmShadow)" />
        <circle cx="640" cy="360" r="144" fill="#FFF4E8" stroke="#E9C7AA" strokeWidth="3" />

        {/* Biometric Countdown Ring */}
        <circle
          cx="640"
          cy="360"
          r="144"
          fill="none"
          stroke={isPostShutter ? BRAND.TERRACOTTA : BRAND.TANGERINE}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={ringCirc}
          strokeDashoffset={isPostShutter ? 0 : ringCirc * (1 - sweepP)}
          transform="rotate(-90 640 360)"
        />

        {/* Illustrated Attendee Character (Maya) Snapping a Selfie inside Viewfinder */}
        <clipPath id="selfieCircleClip">
          <circle cx="640" cy="360" r="136" />
        </clipPath>
        <g clipPath="url(#selfieCircleClip)">
          <circle cx="640" cy="360" r="136" fill="#FDE9D5" />
          <circle cx="570" cy="270" r="46" fill={BRAND.GOLD} opacity="0.22" />
          <circle cx="715" cy="285" r="34" fill={BRAND.TANGERINE} opacity="0.18" />

          <GuestCharacterBust personId={0} x={640} y={376} scale={2.45} happy />

          {/* Warm Biometric Facial Vector Mesh */}
          <g stroke={BRAND.TANGERINE} strokeWidth="1.8" opacity="0.82">
            <line x1="622" y1="376" x2="658" y2="376" />
            <line x1="622" y1="376" x2="640" y2="402" />
            <line x1="658" y1="376" x2="640" y2="402" />
            <line x1="608" y1="358" x2="672" y2="358" strokeDasharray="3 3" opacity="0.55" />
            <circle cx="622" cy="376" r="3.8" fill={BRAND.TERRACOTTA} />
            <circle cx="658" cy="376" r="3.8" fill={BRAND.TERRACOTTA} />
            <circle cx="640" cy="402" r="3.8" fill={BRAND.TERRACOTTA} />
          </g>
        </g>

        {/* Beat-Synced Countdown Pill (3 -> 2 -> 1 -> MATCHED) */}
        <g transform="translate(640, 560)">
          <rect x="-126" y="-22" width="252" height="44" rx="22" fill={isPostShutter ? BRAND.ESPRESSO : BRAND.TERRACOTTA} filter="url(#softCardShadow)" />
          <text
            x="0"
            y="6"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="14.5"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
            letterSpacing="1"
          >
            {isPostShutter ? '✓ 24 MATCHING PHOTOS' : `CAPTURING IN ${countdownNum}...`}
          </text>
        </g>
      </g>

      {shutterFlash > 0.02 && (
        <rect x="0" y="0" width="1280" height="720" fill="#FFFFFF" opacity={shutterFlash * 0.72} />
      )}
    </g>
  );
}

// ----------------------------------------------------------------------------
// 12. SCENE 06 (BEATS 37 - 44): MATCHED PRIVATE GALLERY & INSTANT DOWNLOAD
// ----------------------------------------------------------------------------
function Scene6Gallery({ beat }: { beat: number }) {
  if (beat < 36.6 || beat > 44.5) return null;

  const enterP = easeInOutQuint(invLerp(36.6, 37.5, beat));
  const exitP = easeInOutQuint(invLerp(43.5, 44.4, beat));
  const sceneX = lerp(1360, 0, enterP) - exitP * 1360;

  const downloaded = beat >= CUE_MAP.GALLERY_DOWNLOAD;
  const sweepX = lerp(-60, 320, easeInOutQuint(invLerp(40.8, 42.1, beat)));

  const items = Array.from({ length: 8 }, (_, id) => ({
    id,
    col: id % 4,
    row: Math.floor(id / 4),
    delay: 37.4 + id * 0.16,
  }));

  return (
    <g transform={`translate(${sceneX}, 0)`}>
      <rect x="0" y="0" width="1280" height="720" fill={BRAND.CREAM} />
      <circle cx="960" cy="220" r="360" fill="url(#warmApricotGlow)" opacity="0.65" />

      {/* Top Gallery Bar */}
      <g transform="translate(88, 56)">
        <rect width="194" height="28" rx="14" fill="#FDE4C8" />
        <text x="97" y="18.5" textAnchor="middle" fill={BRAND.TERRACOTTA} fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="700" letterSpacing="1">
          STEP 7 &amp; 8 // YOUR PHOTOS
        </text>
        <text x="0" y="72" fill={BRAND.ESPRESSO} fontSize="42" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800" letterSpacing="-1.2">
          Maya&apos;s Private Gallery{' '}
          <tspan fill={BRAND.TERRACOTTA} fontFamily="Playfair Display, serif" fontStyle="italic">
            (24 found)
          </tspan>
        </text>

        {/* Download All CTA Button */}
        <g transform="translate(840, 26)">
          <clipPath id="dlBtnClip">
            <rect width="264" height="54" rx="27" />
          </clipPath>
          <rect
            width="264"
            height="54"
            rx="27"
            fill={downloaded ? BRAND.EMERALD : BRAND.TERRACOTTA}
            filter="url(#softCardShadow)"
          />
          {!downloaded && (
            <rect
              x={sweepX}
              y="0"
              width="52"
              height="54"
              fill="#FFFFFF"
              opacity="0.28"
              transform="skewX(-20)"
              clipPath="url(#dlBtnClip)"
            />
          )}
          <text
            x="132"
            y="32"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="14.5"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="700"
          >
            {downloaded ? '✓ Saved to Device' : 'Download All Photos'}
          </text>
        </g>
      </g>

      {/* 4x2 Staggered Private Photo Gallery Grid */}
      <g transform="translate(88, 168)">
        {items.map((item) => {
          const p = springBeat(beat, item.delay, 220, 18);
          return (
            <g
              key={item.id}
              transform={`translate(${item.col * 280}, ${item.row * 224 + lerp(40, 0, p)}) scale(${lerp(0.88, 1, p)})`}
              opacity={clamp(p)}
            >
              <rect
                width="248"
                height="196"
                rx="18"
                fill="#FFFFFF"
                stroke={downloaded ? BRAND.EMERALD : BRAND.BORDER_WARM}
                strokeWidth={downloaded ? '2.2' : '1.8'}
                filter="url(#softCardShadow)"
              />
              <svg x="10" y="10" width="228" height="136" viewBox="0 0 172 110">
                <WarmEventPhotoArt
                  variant={item.id}
                  focusPerson={0}
                  photoSrc={MEDIA_ASSETS.eventPhotos[item.id] || ''}
                />
              </svg>
              <text x="16" y="174" fill={BRAND.ESPRESSO} fontSize="12" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700">
                IMG_0{412 + item.id}.JPG
              </text>
              <rect x="172" y="158" width="62" height="22" rx="11" fill={downloaded ? '#ECFDF5' : '#FFF2E5'} />
              <text
                x="203"
                y="172.5"
                textAnchor="middle"
                fill={downloaded ? BRAND.EMERALD : BRAND.TERRACOTTA}
                fontSize="9.5"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="700"
              >
                {downloaded ? 'SAVED' : 'HD RAW'}
              </text>
            </g>
          );
        })}
      </g>
    </g>
  );
}

// ----------------------------------------------------------------------------
// 13. SCENE 07 (BEATS 44 - 48): GET EVENT PHOTOS FAST & PRIVATELY
// ----------------------------------------------------------------------------
function Scene7FastPrivate({ beat }: { beat: number }) {
  if (beat < 43.6 || beat > 48.5) return null;

  const enterP = easeInOutQuint(invLerp(43.6, 44.5, beat));
  const exitP = easeInOutQuint(invLerp(47.5, 48.5, beat));
  const sceneX = lerp(1360, 0, enterP) - exitP * 1360;

  const card1P = springBeat(beat, 44.4, 210, 18);
  const card2P = springBeat(beat, 45.1, 210, 18);
  const gaugeP = easeOutExpo(invLerp(44.8, 47.4, beat));
  const lockP = springBeat(beat, CUE_MAP.PRIVACY_LOCK, 230, 17);

  const speedSec = (lerp(12.0, 1.4, gaugeP)).toFixed(1);
  const arcLen = Math.PI * 84;

  return (
    <g transform={`translate(${sceneX}, 0)`}>
      <rect x="0" y="0" width="1280" height="720" fill={BRAND.CREAM} />
      <circle cx="640" cy="360" r="430" fill="url(#warmApricotGlow)" opacity="0.72" />

      {/* Editorial Header */}
      <g transform="translate(640, 78)">
        <rect x="-106" y="-14" width="212" height="28" rx="14" fill="#FDE4C8" />
        <text x="0" y="4" textAnchor="middle" fill={BRAND.TERRACOTTA} fontSize="11.5" fontFamily="JetBrains Mono, monospace" fontWeight="700" letterSpacing="1.2">
          BUILT FOR EVERY GUEST
        </text>
        <text x="0" y="64" textAnchor="middle" fill={BRAND.ESPRESSO} fontSize="50" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800" letterSpacing="-1.5">
          Get event photos{' '}
          <tspan fill={BRAND.TERRACOTTA} fontFamily="Playfair Display, serif" fontStyle="italic">
            fast &amp; privately.
          </tspan>
        </text>
      </g>

      {/* Feature Card 1: Delivered in Seconds (Speed Gauge) */}
      <g transform={`translate(116, ${lerp(275, 206, card1P)})`} opacity={clamp(card1P)}>
        <rect width="500" height="412" rx="30" fill="#FFFFFF" stroke={BRAND.BORDER_WARM} strokeWidth="2.5" filter="url(#deepWarmShadow)" />
        <rect x="34" y="34" width="144" height="28" rx="14" fill="#FFF2E5" />
        <text x="106" y="52" textAnchor="middle" fill={BRAND.TERRACOTTA} fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="700">
          INSTANT DELIVERY
        </text>

        {/* Semi-Circle Speed Gauge */}
        <g transform="translate(250, 218)">
          <path d="M-84 0 A84 84 0 0 1 84 0" fill="none" stroke="#F5E6D8" strokeWidth="18" strokeLinecap="round" />
          <path
            d="M-84 0 A84 84 0 0 1 84 0"
            fill="none"
            stroke={BRAND.TERRACOTTA}
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={arcLen}
            strokeDashoffset={arcLen * (1 - gaugeP * 0.88)}
          />
          <text x="0" y="-12" textAnchor="middle" fill={BRAND.ESPRESSO} fontSize="52" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800" letterSpacing="-2">
            {speedSec}s
          </text>
          <text x="0" y="18" textAnchor="middle" fill={BRAND.BROWN_MUTED} fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="700">
            AVERAGE MATCH TIME
          </text>
        </g>

        <text x="250" y="314" textAnchor="middle" fill={BRAND.ESPRESSO} fontSize="24" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800">
          No waiting. No scrolling.
        </text>
        <text x="250" y="348" textAnchor="middle" fill={BRAND.BROWN_MUTED} fontSize="15.5" fontFamily="Plus Jakarta Sans, sans-serif">
          Guests get their full HD moments immediately.
        </text>
      </g>

      {/* Feature Card 2: Private & Secure (Animated Locking Shield) */}
      <g transform={`translate(664, ${lerp(275, 206, card2P)})`} opacity={clamp(card2P)}>
        <rect width="500" height="412" rx="30" fill={BRAND.ESPRESSO_DARK} stroke="#4A3022" strokeWidth="2.5" filter="url(#deepWarmShadow)" />
        <rect x="34" y="34" width="148" height="28" rx="14" fill="#322017" />
        <text x="108" y="52" textAnchor="middle" fill={BRAND.GOLD} fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="700">
          PRIVATE BY DESIGN
        </text>

        {/* Animated Shield + Lock */}
        <g transform="translate(250, 178)">
          <circle cx="0" cy="0" r="76" fill="#2A1C14" stroke="#4F3526" strokeWidth="2" />
          <path
            d="M0 -52 L44 -34 V6 C44 36 24 54 0 64 C-24 54 -44 36 -44 6 V-34 Z"
            fill="#3B2418"
            stroke={BRAND.TANGERINE}
            strokeWidth="3.2"
          />
          <g transform={`translate(0, ${lerp(-8, 0, lockP)})`}>
            <path d="M-12 -4 V-14 A12 12 0 0 1 12 -14 V-4" fill="none" stroke={BRAND.GOLD} strokeWidth="3.5" strokeLinecap="round" />
            <rect x="-18" y="-4" width="36" height="26" rx="7" fill={BRAND.GOLD} />
            <circle cx="0" cy="9" r="3.5" fill={BRAND.ESPRESSO_DARK} />
          </g>
        </g>

        <text x="250" y="314" textAnchor="middle" fill="#FFFFFF" fontSize="24" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800">
          Only your own photos.
        </text>
        <text x="250" y="348" textAnchor="middle" fill="#C4ADA0" fontSize="15.5" fontFamily="Plus Jakarta Sans, sans-serif">
          Private face matching with zero app download.
        </text>
      </g>
    </g>
  );
}

// ----------------------------------------------------------------------------
// 14. SCENE 08 (BEATS 48 - 56): CLOCK REVEAL & WARM BRAND FINALE
// ----------------------------------------------------------------------------
function Scene8Finale({ beat, logoSrc }: { beat: number; logoSrc: string }) {
  if (beat < CUE_MAP.READY_IN_SECONDS) return null;

  const isDropped = beat >= CUE_MAP.BRAND_DROP;
  const readyProgress = clamp(invLerp(CUE_MAP.READY_IN_SECONDS, CUE_MAP.BRAND_DROP, beat));
  const readyEnter = easeOutExpo(invLerp(CUE_MAP.READY_IN_SECONDS, CUE_MAP.READY_IN_SECONDS + 0.4, beat));
  const clockPop = springBeat(beat, CUE_MAP.READY_IN_SECONDS, 180, 22);
  const headlinePop = springBeat(beat, CUE_MAP.READY_IN_SECONDS + 0.25, 190, 22);
  const copyPop = springBeat(beat, CUE_MAP.READY_IN_SECONDS + 0.55, 190, 22);
  const clockRotation = (beat - CUE_MAP.READY_IN_SECONDS) * 120;
  const clockCircumference = 2 * Math.PI * 100;
  const dropSpring = springBeat(beat, CUE_MAP.BRAND_DROP, 200, 16);
  const subSpring = springBeat(beat, 51.8, 210, 19);
  const launchPulse = 0.5 + 0.5 * Math.sin((beat - 51.8) * Math.PI * 1.35);
  const launchSheen = easeInOutQuint(invLerp(52.2, 54.5, beat));

  return (
    <g>
      <rect x="0" y="0" width="1280" height="720" fill={BRAND.CREAM} opacity={isDropped ? 1 : readyEnter} />

      {!isDropped ? (
        /* Clock reveal builds before the final beat of silence and brand drop. */
        <g opacity={readyEnter}>
          <circle cx="640" cy="322" r="350" fill="url(#warmApricotGlow)" opacity="0.72" />
          <circle cx="640" cy="276" r="184" fill="url(#warmApricotGlow)" opacity={0.22 + Math.sin(readyProgress * Math.PI) * 0.18} />

          <g transform={`translate(640 266) scale(${lerp(0.74, 1, clockPop)})`} opacity={clamp(clockPop)}>
            <circle r="116" fill="#FFFFFF" stroke="#F4E6DA" strokeWidth="1.5" filter="url(#deepWarmShadow)" />
            <circle r="101" fill="none" stroke="#F1E0D2" strokeWidth="2" />
            <circle
              r="100"
              fill="none"
              stroke={BRAND.TANGERINE}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={clockCircumference}
              strokeDashoffset={clockCircumference * (1 - readyProgress)}
              transform="rotate(-90)"
            />
            <circle r="88" fill="#FFFCF9" stroke="#FAF0E8" strokeWidth="1" />
            {Array.from({ length: 60 }, (_, i) => {
              const angle = (i * Math.PI) / 30;
              const major = i % 5 === 0;
              const inner = major ? 72 : 79;
              const x1 = Math.sin(angle) * inner;
              const y1 = -Math.cos(angle) * inner;
              const x2 = Math.sin(angle) * 84;
              const y2 = -Math.cos(angle) * 84;
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={major ? '#B8430D' : '#D9C6B8'} strokeWidth={major ? 2.7 : 1.15} strokeLinecap="round" opacity={major ? 0.9 : 0.7} />;
            })}

            <g transform={`rotate(${clockRotation * 0.08})`}>
              <line x1="0" y1="8" x2="0" y2="-39" stroke={BRAND.ESPRESSO} strokeWidth="7" strokeLinecap="round" />
            </g>
            <g transform={`rotate(${clockRotation * 0.5})`}>
              <line x1="0" y1="10" x2="0" y2="-62" stroke={BRAND.ESPRESSO} strokeWidth="4.5" strokeLinecap="round" />
            </g>
            <g transform={`rotate(${clockRotation})`}>
              <line x1="0" y1="17" x2="0" y2="-75" stroke={BRAND.TANGERINE} strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="0" cy="-75" r="3.5" fill={BRAND.TANGERINE} />
            </g>
            <circle r="6" fill={BRAND.TERRACOTTA} stroke="#FFFFFF" strokeWidth="2" />
          </g>

          <g opacity={clamp(headlinePop)} transform={`translate(0 ${lerp(20, 0, headlinePop)})`}>
            <text x="640" y="438" textAnchor="middle" fill={BRAND.ESPRESSO} fontSize="51" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800" letterSpacing="-2.2">
              Ready in <tspan fill={BRAND.TERRACOTTA} fontFamily="Playfair Display, serif" fontStyle="italic" fontWeight="700">seconds.</tspan>
            </text>
            <rect x="552" y="457" width="176" height="3" rx="1.5" fill={BRAND.TANGERINE} opacity={clamp(headlinePop)} />
          </g>

          <g opacity={clamp(copyPop)} transform={`translate(0 ${lerp(12, 0, copyPop)})`}>
            <text x="640" y="498" textAnchor="middle" fill={BRAND.BROWN_MUTED} fontSize="17" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="500">
              Your private gallery, ready before the moment fades.
            </text>
            <g transform="translate(640 545)">
              <rect x="-132" y="-16" width="264" height="32" rx="16" fill="#FFFFFF" stroke={BRAND.BORDER_WARM} />
              <text x="0" y="4" textAnchor="middle" fill={BRAND.TERRACOTTA} fontSize="10.5" fontFamily="JetBrains Mono, monospace" fontWeight="700" letterSpacing="1.1">
                PRIVATE MATCH · INSTANT GALLERY
              </text>
            </g>
          </g>
        </g>
      ) : (
        <g>
          <circle cx="640" cy="360" r={lerp(120, 520, dropSpring)} fill="url(#warmApricotGlow)" opacity="0.92" />

          <g
            transform={`translate(640, 316) scale(${lerp(0.62, 1, dropSpring)})`}
            opacity={clamp(dropSpring)}
          >
            <g transform="translate(-52, -138)">
              <BrandLogoSlot x={0} y={0} size={104} logoSrc={logoSrc} />
            </g>

            <text
              x="0"
              y="32"
              textAnchor="middle"
              fill={BRAND.ESPRESSO}
              fontSize="82"
              fontFamily="Playfair Display, serif"
              fontWeight="700"
              letterSpacing="-1.5"
            >
              Chobi Dao
            </text>

            <text
              x="0"
              y="98"
              textAnchor="middle"
              fill={BRAND.TERRACOTTA}
              fontSize="32"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontWeight="700"
              opacity={clamp(subSpring)}
            >
              Get your photos instantly.
            </text>

            <g transform={`translate(-158, ${lerp(156, 134, subSpring)})`} opacity={clamp(subSpring)}>
              <defs>
                <clipPath id="launchCtaClip"><rect width="316" height="54" rx="27" /></clipPath>
              </defs>
              <ellipse cx="158" cy="28" rx={lerp(164, 174, launchPulse)} ry={lerp(30, 34, launchPulse)} fill={BRAND.TANGERINE} opacity={0.1 + launchPulse * 0.09} />
              <rect x="1" y="1" width="314" height="52" rx="26" fill={BRAND.TERRACOTTA} stroke="#F6B27F" strokeWidth="1.5" filter="url(#softCardShadow)" />
              <g clipPath="url(#launchCtaClip)">
                <path d={`M${lerp(-100, 330, launchSheen)} 0 l34 0 l-55 54 l-34 0 Z`} fill="#FFFFFF" opacity={0.15 * (1 - launchSheen * 0.35)} />
              </g>
              <circle cx="34" cy="27" r="5" fill="#FFD8A5" />
              <circle cx="34" cy="27" r={lerp(8, 12, launchPulse)} fill="none" stroke="#FFE8C9" strokeWidth="1.2" opacity={0.45 + launchPulse * 0.35} />
              <text
                x="170"
                y="33"
                textAnchor="middle"
                fill="#FFFBF7"
                fontSize="17"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontWeight="800"
                letterSpacing="0.1"
              >
                Launching soon
              </text>
            </g>
          </g>
        </g>
      )}
    </g>
  );
}

/** Clean, frame-accurate Remotion composition for exporting the reel itself. */
export function ShowcaseVideo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [fontHandle] = useState(() => delayRender('Loading showcase fonts'));
  useEffect(() => {
    document.fonts.ready.then(() => continueRender(fontHandle)).catch(() => continueRender(fontHandle));
  }, [fontHandle]);
  const currentBeat = clamp((frame / fps) / SEC_PER_BEAT, 0, TOTAL_BEATS);
  const beatPulse = Math.exp(-((currentBeat % 1) * 5.2));
  const camScale = 1 + (currentBeat >= 51 ? 0 : beatPulse * 0.004);
  const logoSrc = staticFile('assets/chobidao.webp');
  const landingSrc = staticFile('assets/landing.png');

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.CREAM }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Playfair+Display:ital,wght@0,700;1,700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');`}</style>
      <Audio src={staticFile('assets/showcase-soundtrack.wav')} />
      <svg viewBox="0 0 1280 720" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="warmApricotGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE4C8" stopOpacity="0.95" />
            <stop offset="65%" stopColor="#FCE9D5" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FFFBF7" stopOpacity="0" />
          </radialGradient>
          <filter id="softCardShadow" x="-15%" y="-15%" width="130%" height="135%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#261710" floodOpacity="0.09" />
          </filter>
          <filter id="deepWarmShadow" x="-20%" y="-20%" width="140%" height="145%">
            <feDropShadow dx="0" dy="18" stdDeviation="20" floodColor="#261710" floodOpacity="0.14" />
          </filter>
        </defs>
        <g transform={`translate(640 360) scale(${camScale}) translate(-640 -360)`}>
          <Scene1Problem beat={currentBeat} />
          <Scene2BrandLanding beat={currentBeat} logoSrc={logoSrc} landingSrc={landingSrc} />
          <Scene3UploadAI beat={currentBeat} />
          <Scene4QRScan beat={currentBeat} logoSrc={logoSrc} />
          <Scene5SelfieSearch beat={currentBeat} />
          <Scene6Gallery beat={currentBeat} />
          <Scene7FastPrivate beat={currentBeat} />
          <Scene8Finale beat={currentBeat} logoSrc={logoSrc} />
        </g>
      </svg>
    </AbsoluteFill>
  );
}

// ----------------------------------------------------------------------------
// 15. MAIN APPLICATION SHELL (STAGE, SCRUBBER, HUD, ASSETS DRAWER, CLEAN MODE)
// ----------------------------------------------------------------------------
export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showHud, setShowHud] = useState(false);
  const [cleanStage, setCleanStage] = useState(false);
  const [showAssets, setShowAssets] = useState(false);

  // Optional runtime overrides (defaults to MEDIA_ASSETS blank placeholders)
  const [logoSrc, setLogoSrc] = useState(MEDIA_ASSETS.logo);
  const [landingSrc, setLandingSrc] = useState(MEDIA_ASSETS.landingPage);

  const audioEngine = useMemo(() => new WarmShowcaseAudioEngine(), []);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  const currentBeat = clamp(currentTime / SEC_PER_BEAT, 0, TOTAL_BEATS);
  const activeScene =
    SCENES.find((s) => currentBeat >= s.start && currentBeat < s.end) || SCENES[SCENES.length - 1];

  // Deterministic 60fps requestAnimationFrame loop
  useEffect(() => {
    if (!isPlaying) {
      lastFrameRef.current = null;
      return;
    }

    const tick = (now: number) => {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = now;
      }
      const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;

      let nextTime = timeRef.current + dt * speed;
      if (nextTime >= TOTAL_DURATION) {
        nextTime = 0;
        audioEngine.reset();
      }

      timeRef.current = nextTime;
      setCurrentTime(nextTime);
      audioEngine.scheduleWindow(nextTime / SEC_PER_BEAT, speed);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [audioEngine, isPlaying, speed]);

  const handlePlayToggle = useCallback(() => {
    audioEngine.init();
    setHasStarted(true);
    setIsPlaying((prev) => !prev);
  }, [audioEngine]);

  const handleSeekBeat = useCallback((beatVal: number) => {
    const clampedBeat = clamp(beatVal, 0, TOTAL_BEATS);
    const nextTime = clampedBeat * SEC_PER_BEAT;
    timeRef.current = nextTime;
    setCurrentTime(nextTime);
    audioEngine.reset();
  }, [audioEngine]);

  const handleReplay = useCallback(() => {
    audioEngine.init();
    audioEngine.reset();
    timeRef.current = 0;
    setCurrentTime(0);
    setHasStarted(true);
    setIsPlaying(true);
  }, [audioEngine]);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      audioEngine.setMuted(next);
      return next;
    });
  }, [audioEngine]);

  // Keyboard shortcuts (Space = play/pause, C = clean stage, Esc = exit clean stage)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayToggle();
      } else if (e.key === 'c' || e.key === 'C') {
        setCleanStage((prev) => !prev);
      } else if (e.key === 'Escape') {
        setCleanStage(false);
        setShowAssets(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePlayToggle]);

  // Optional local file attach handler inside Assets Drawer
  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setter(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Subtle deterministic micro-zoom camera breathing synced to beat
  const beatPulse = Math.exp(-((currentBeat % 1) * 5.2));
  const camScale = 1 + (currentBeat >= 51 ? 0 : beatPulse * 0.004);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-between select-none"
      style={{
        backgroundColor: cleanStage ? '#0F0A07' : '#19110D',
        color: '#FFFBF7',
        fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
      }}
    >
      {/* Google Fonts for Editorial Brand Typography */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Playfair+Display:ital,wght@0,700;1,700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
      `}</style>

      {/* TOP STUDIO BAR (Hidden in Clean Stage Mode) */}
      {!cleanStage && (
        <header className="w-full max-w-6xl px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-[#FFFBF7]">
                  Chobi Dao
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#352218] text-[#FDBA74] border border-[#523526]">
                  120 BPM · 8-Scene Reel
                </span>
              </div>
              <p className="text-xs text-[#A88F81] truncate">
                Scene {activeScene.code}: {activeScene.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAssets((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                showAssets
                  ? 'bg-[#B8430D] text-white border-[#B8430D]'
                  : 'bg-[#261912] text-[#E6D5C9] border-[#3F2B20] hover:border-[#6B4A38]'
              }`}
            >
              <Icons.Folder />
              <span>Assets</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHud((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                showHud
                  ? 'bg-[#B8430D] text-white border-[#B8430D]'
                  : 'bg-[#261912] text-[#E6D5C9] border-[#3F2B20] hover:border-[#6B4A38]'
              }`}
            >
              <Icons.Hud />
              <span className="hidden sm:inline">HUD</span>
            </button>

            <button
              type="button"
              onClick={() => setCleanStage(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#261912] text-[#E6D5C9] border border-[#3F2B20] hover:border-[#6B4A38] transition cursor-pointer"
              title="Clean 16:9 Stage for screen recording (C)"
            >
              <Icons.Clean />
              <span className="hidden sm:inline">Clean Stage</span>
            </button>
            <div className="w-10 h-10 rounded-xl bg-[#FFFBF7] border border-[#F2D7C3] flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/assets/chobidao.webp" alt="Chobi Dao mark" className="w-9 h-9 object-contain" />
            </div>
          </div>
        </header>
      )}

      {/* MAIN 16:9 MOTION GRAPHICS STAGE */}
      <main
        className={`w-full flex-1 flex items-center justify-center relative ${
          cleanStage ? 'p-0' : 'px-4 sm:px-6 py-2 max-w-6xl'
        }`}
      >
        <div
          className={`relative w-full aspect-video overflow-hidden ${
            cleanStage
              ? 'max-h-screen'
              : 'rounded-2xl border border-[#3F2B20] shadow-2xl'
          }`}
          style={{ backgroundColor: BRAND.CREAM }}
        >
          {/* 1280x720 Virtual Camera SVG Stage */}
          <svg
            viewBox="0 0 1280 720"
            className="w-full h-full block"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <radialGradient id="warmApricotGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FDE4C8" stopOpacity="0.95" />
                <stop offset="65%" stopColor="#FCE9D5" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#FFFBF7" stopOpacity="0" />
              </radialGradient>

              <filter id="softCardShadow" x="-15%" y="-15%" width="130%" height="135%">
                <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#261710" floodOpacity="0.09" />
              </filter>

              <filter id="deepWarmShadow" x="-20%" y="-20%" width="140%" height="145%">
                <feDropShadow dx="0" dy="18" stdDeviation="20" floodColor="#261710" floodOpacity="0.14" />
              </filter>
            </defs>

            <g transform={`translate(640, 360) scale(${camScale}) translate(-640, -360)`}>
              <Scene1Problem beat={currentBeat} />
              <Scene2BrandLanding beat={currentBeat} logoSrc={logoSrc} landingSrc={landingSrc} />
              <Scene3UploadAI beat={currentBeat} />
              <Scene4QRScan beat={currentBeat} logoSrc={logoSrc} />
              <Scene5SelfieSearch beat={currentBeat} />
              <Scene6Gallery beat={currentBeat} />
              <Scene7FastPrivate beat={currentBeat} />
              <Scene8Finale beat={currentBeat} logoSrc={logoSrc} />
            </g>
          </svg>

          {/* Start Overlay before first Play */}
          {!hasStarted && !isPlaying && (
            <div className="absolute inset-0 bg-[#1A110C]/65 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="px-3 py-1 rounded-full bg-[#352218] border border-[#5B3A29] text-[11px] font-mono font-bold text-[#FDBA74] tracking-widest uppercase mb-4">
                Chobi Dao · Launch Reel
              </div>
              <h1
                className="text-3xl sm:text-5xl font-bold text-[#FFFBF7] tracking-tight mb-3"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                Get your photos <span className="italic text-[#FB923C]">instantly.</span>
              </h1>
              <p className="text-sm text-[#D8C3B6] max-w-md mb-6">
                28-second beat-synced 2D motion graphics showcase with synthesized Web Audio soundtrack.
              </p>
              <button
                type="button"
                onClick={handlePlayToggle}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#B8430D] hover:bg-[#EA580C] text-white font-bold text-sm shadow-lg transition transform hover:scale-[1.02] cursor-pointer"
              >
                <Icons.Play />
                <span>PLAY WITH SOUND</span>
              </button>
            </div>
          )}

          {/* Director HUD Overlay */}
          {showHud && !cleanStage && (
            <div className="absolute top-3 left-3 bg-[#1A110C]/88 backdrop-blur-md border border-[#463024] rounded-xl px-3.5 py-2.5 text-[11px] font-mono text-[#FDE4C8] pointer-events-none z-20 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
                <span>
                  BEAT {currentBeat.toFixed(2)} / {TOTAL_BEATS} ({currentTime.toFixed(1)}s)
                </span>
              </div>
              <div className="text-[#C4ADA0]">
                SCENE {activeScene.code} · {activeScene.name.toUpperCase()} · {speed}x
              </div>
            </div>
          )}

          {/* Clean Stage Exit Pill */}
          {cleanStage && (
            <button
              type="button"
              onClick={() => setCleanStage(false)}
              className="fixed bottom-4 right-4 z-50 px-3.5 py-2 rounded-full bg-[#1A110C]/80 hover:bg-[#1A110C] text-[#FDE4C8] text-xs font-mono border border-[#4A3022] cursor-pointer"
            >
              Exit Clean Stage (Esc)
            </button>
          )}
        </div>

        {/* ASSETS DRAWER (Shows MEDIA_ASSETS placeholder config + optional quick file attach) */}
        {showAssets && !cleanStage && (
          <div className="absolute right-6 top-4 z-30 w-80 bg-[#221610] border border-[#463024] rounded-2xl p-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#38251C]">
              <span className="font-bold text-[#FFFBF7] uppercase tracking-wider font-mono">
                Placeholder Assets
              </span>
              <button
                type="button"
                onClick={() => setShowAssets(false)}
                className="text-[#A88F81] hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <p className="text-[#BFA89B] mt-3 leading-relaxed">
              Logo and Landing Page are blank placeholders ready for your local agent via{' '}
              <code className="text-[#FDBA74]">MEDIA_ASSETS</code>, or you can preview local files right now:
            </p>
            <div className="mt-3 space-y-2.5">
              <label className="block p-2.5 rounded-xl bg-[#1A110C] border border-[#3F2B20] hover:border-[#B8430D] cursor-pointer">
                <div className="font-semibold text-[#FFFBF7] mb-1">
                  Logo Slot {logoSrc ? '(Loaded)' : '(Blank Placeholder)'}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileAttach(e, setLogoSrc)}
                  className="text-[11px] text-[#A88F81] w-full"
                />
              </label>
              <label className="block p-2.5 rounded-xl bg-[#1A110C] border border-[#3F2B20] hover:border-[#B8430D] cursor-pointer">
                <div className="font-semibold text-[#FFFBF7] mb-1">
                  Landing Page Slot {landingSrc ? '(Loaded)' : '(Blank Placeholder)'}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileAttach(e, setLandingSrc)}
                  className="text-[11px] text-[#A88F81] w-full"
                />
              </label>
              {(logoSrc || landingSrc) && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoSrc('');
                    setLandingSrc('');
                  }}
                  className="w-full py-1.5 rounded-lg bg-[#352218] text-[#FDBA74] font-semibold hover:bg-[#462D20] cursor-pointer"
                >
                  Reset to Blank Placeholders
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM TIMELINE SCRUBBER & 8-SCENE JUMP DOCK */}
      {!cleanStage && (
        <footer className="w-full max-w-6xl px-4 sm:px-6 pb-4 pt-1">
          <div className="bg-[#231711] border border-[#3F2B20] rounded-2xl p-3 space-y-3">
            {/* Transport + Scrubber Row */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePlayToggle}
                className="w-9 h-9 rounded-xl bg-[#B8430D] hover:bg-[#EA580C] text-white flex items-center justify-center shrink-0 transition cursor-pointer"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Icons.Pause /> : <Icons.Play />}
              </button>

              <button
                type="button"
                onClick={handleReplay}
                className="w-9 h-9 rounded-xl bg-[#2E1E16] hover:bg-[#3D291E] text-[#FDE4C8] flex items-center justify-center shrink-0 transition cursor-pointer"
                aria-label="Replay"
              >
                <Icons.Replay />
              </button>

              {/* Range Scrubber */}
              <div className="flex-1 flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={TOTAL_BEATS}
                  step={0.05}
                  value={currentBeat}
                  onChange={(e) => handleSeekBeat(parseFloat(e.target.value))}
                  className="w-full accent-[#EA580C] cursor-pointer"
                  aria-label="Timeline Scrubber"
                />
                <span className="text-[11px] font-mono text-[#C4ADA0] w-20 text-right shrink-0">
                  {currentTime.toFixed(1)}s / {TOTAL_DURATION.toFixed(0)}s
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSpeed((s) => (s === 1 ? 0.5 : 1))}
                className="px-2.5 py-1.5 rounded-lg bg-[#2E1E16] hover:bg-[#3D291E] text-[11px] font-mono font-bold text-[#FDE4C8] cursor-pointer"
              >
                {speed}x
              </button>

              <button
                type="button"
                onClick={handleToggleMute}
                className="w-9 h-9 rounded-xl bg-[#2E1E16] hover:bg-[#3D291E] text-[#FDE4C8] flex items-center justify-center shrink-0 cursor-pointer"
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <Icons.VolumeOff /> : <Icons.VolumeOn />}
              </button>
            </div>

            {/* 8-Scene Quick Jump Bar */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {SCENES.map((sc) => {
                const isActive = activeScene.id === sc.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      setHasStarted(true);
                      handleSeekBeat(sc.start + 0.05);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left transition cursor-pointer border ${
                      isActive
                        ? 'bg-[#B8430D] text-white border-[#EA580C]'
                        : 'bg-[#1B110C] text-[#BFA89B] border-[#332219] hover:border-[#5C3D2D]'
                    }`}
                  >
                    <div className="text-[9px] font-mono opacity-80">{sc.code}</div>
                    <div className="text-[11px] font-semibold truncate">{sc.name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
