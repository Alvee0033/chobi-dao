"""Render a smooth, noise-free 120 BPM beat and warm pad for the showcase."""
from pathlib import Path
import wave
import numpy as np

RATE = 48000
DURATION = 28
BEAT = 0.5
N = RATE * DURATION
mix = np.zeros(N, dtype=np.float32)


def add_sine(t, frequency, duration, gain, attack=0.08, release=0.5):
    start = max(0, int(t * RATE))
    count = min(int(duration * RATE), N - start)
    if count <= 0:
        return
    x = np.arange(count, dtype=np.float32) / RATE
    rise = np.minimum(x / attack, 1)
    tail = np.exp(-np.maximum(x - duration * 0.42, 0) / release)
    envelope = rise * tail
    mix[start:start + count] += (np.sin(2 * np.pi * frequency * x) * envelope * gain).astype(np.float32)


def add_tone(t, frequency, duration, gain, attack=0.01, release=0.12):
    add_sine(t, frequency, duration, gain, attack=attack, release=release)


def add_kick(t, gain):
    start = int(t * RATE)
    duration = 0.24
    count = min(int(duration * RATE), N - start)
    if count <= 0:
        return
    x = np.arange(count, dtype=np.float32) / RATE
    frequency = 42 + (128 - 42) * np.exp(-x / 0.035)
    phase = 2 * np.pi * np.cumsum(frequency, dtype=np.float32) / RATE
    envelope = np.exp(-x / 0.065)
    mix[start:start + count] += (np.sin(phase) * envelope * gain).astype(np.float32)


def add_pluck(t, frequency, gain=0.095, duration=0.22):
    start = int(t * RATE)
    count = min(int(duration * RATE), N - start)
    if count <= 0:
        return
    x = np.arange(count, dtype=np.float32) / RATE
    attack = np.minimum(x / 0.012, 1)
    decay = np.exp(-x / (duration * 0.32))
    # A soft triangle-like timbre, matching the preview's warm arpeggio.
    fundamental = np.sin(2 * np.pi * frequency * x)
    harmonic = 0.22 * np.sin(2 * np.pi * frequency * 3 * x)
    mix[start:start + count] += ((fundamental + harmonic) * attack * decay * gain).astype(np.float32)


def add_sweep(t, start_frequency, end_frequency, duration, gain=0.12):
    start = max(0, int(t * RATE))
    count = min(int(duration * RATE), N - start)
    if count <= 0:
        return
    x = np.arange(count, dtype=np.float32) / RATE
    slope = (end_frequency - start_frequency) / duration
    phase = 2 * np.pi * (start_frequency * x + 0.5 * slope * x * x)
    envelope = np.minimum(x / 0.035, 1) * np.exp(-np.maximum(x - duration * 0.55, 0) / 0.14)
    mix[start:start + count] += (np.sin(phase) * envelope * gain).astype(np.float32)


def add_photo_click(t):
    start = int(t * RATE)
    duration = 0.14
    count = min(int(duration * RATE), N - start)
    if count <= 0:
        return
    x = np.arange(count, dtype=np.float32) / RATE
    envelope = np.minimum(x / 0.008, 1) * np.exp(-x / 0.035)
    tap = 0.75 * np.sin(2 * np.pi * 620 * x) + 0.25 * np.sin(2 * np.pi * 280 * x)
    mix[start:start + count] += (tap * envelope * 0.13).astype(np.float32)


def add_qr_scan(t):
    add_sweep(t, 520, 1880, 0.48, 0.10)
    add_tone(t + 0.39, 1760, 0.17, 0.085, attack=0.012, release=0.1)


def add_privacy_lock(t):
    add_sweep(t, 196, 146, 0.19, 0.13)
    add_tone(t + 0.06, 392, 0.54, 0.045, attack=0.045, release=0.42)
    add_tone(t + 0.095, 523.25, 0.56, 0.045, attack=0.045, release=0.44)


def add_shutter(t, gain=0.16):
    rng = np.random.default_rng(int(t * RATE) + 71)
    for offset, duration, level in ((0, 0.034, 1.0), (0.042, 0.045, 0.68)):
        start = int((t + offset) * RATE)
        count = min(int(duration * RATE), N - start)
        if count <= 0:
            continue
        x = np.arange(count, dtype=np.float32) / RATE
        noise = rng.normal(0, 1, count).astype(np.float32)
        # A short, softened camera snap with a little low-mid body.
        smoothed = np.convolve(noise, np.ones(5, dtype=np.float32) / 5, mode='same')
        envelope = np.exp(-x / (duration * 0.22))
        mix[start:start + count] += smoothed * envelope * gain * level


# Restore the preview's 120 BPM kick and melodic pulse, without the rattling hat layer.
for beat in range(50):
    t = beat * BEAT
    add_kick(t, 0.42 if beat < 8 else 0.56)

arp_scale = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33]
for step in range(8 * 4, 50 * 4, 2):
    beat = step / 4
    add_pluck(beat * BEAT, arp_scale[(step // 2) % len(arp_scale)])

# A slow, low-volume harmonic pad keeps the rhythm musical without busy attacks.
progression = [
    [146.83, 220.0, 293.66],
    [123.47, 185.0, 246.94],
    [98.0, 146.83, 196.0],
    [110.0, 164.81, 220.0],
]
for measure, chord in enumerate(progression * 3):
    beat = 8 + measure * 4
    if beat >= 50:
        break
    for frequency in chord:
        add_sine(beat * BEAT, frequency, 1.9, 0.045, attack=0.28, release=1.1)

# Keep the pause before the final warm resolving chord.
for frequency in [146.83, 220.0, 277.18, 329.63, 369.99, 440.0]:
    add_sine(51 * BEAT, frequency, 2.3, 0.045, attack=0.22, release=1.7)

# Action cues follow the visible camera, scan, and gallery moments.
for beat in [1, 2, 3, 4, 5, 33]:
    add_shutter(beat * BEAT, 0.17 if beat != 33 else 0.22)
for beat in [16.25]:
    add_sweep(beat * BEAT, 340, 920, 0.62, 0.075)
add_qr_scan(27 * BEAT)
add_privacy_lock(46.25 * BEAT)
for beat in [12.5, 15, 27.5]:
    add_tone(beat * BEAT, 920, 0.09, 0.1)
for beat in [17.25, 18.25, 19]:
    add_photo_click(beat * BEAT)
for beat in [30, 31, 32]:
    add_tone(beat * BEAT, 587.33, 0.18, 0.085, release=0.16)
add_tone(41.5 * BEAT, 783.99, 0.55, 0.075, release=0.45)
add_tone(41.72 * BEAT, 659.25, 0.62, 0.085, release=0.52)
add_tone(41.94 * BEAT, 523.25, 0.78, 0.095, release=0.66)

peak = float(np.max(np.abs(mix)))
if peak > 0:
    mix *= 0.9 / peak
stereo = np.column_stack((mix, mix)).astype(np.float32)
out = Path(__file__).resolve().parents[2] / "public/assets/showcase-soundtrack.wav"
out.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(out), "wb") as wav:
    wav.setnchannels(2)
    wav.setsampwidth(2)
    wav.setframerate(RATE)
    wav.writeframes((np.clip(stereo, -1, 1) * 32767).astype("<i2").tobytes())
print(out)
