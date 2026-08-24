import { writeFile } from "node:fs/promises";

const sampleRate = 44_100;
const durationSeconds = 23.5;
const beatSeconds = 0.9;
const notes = [
  { frequency: 523.25, beat: 0 },
  { frequency: 659.25, beat: 1 },
  { frequency: 587.33, beat: 2 },
  { frequency: 392, beat: 3 },
  { frequency: 523.25, beat: 6 },
  { frequency: 587.33, beat: 7 },
  { frequency: 659.25, beat: 8 },
  { frequency: 523.25, beat: 9 },
  { frequency: 659.25, beat: 12 },
  { frequency: 523.25, beat: 13 },
  { frequency: 587.33, beat: 14 },
  { frequency: 392, beat: 15 },
  { frequency: 392, beat: 18 },
  { frequency: 587.33, beat: 19 },
  { frequency: 659.25, beat: 20 },
  { frequency: 523.25, beat: 21, decayScale: 1.45 },
];
const partials = [
  { ratio: 1, gain: 0.14, duration: 2.5 },
  { ratio: 2.01, gain: 0.052, duration: 1.8 },
  { ratio: 2.72, gain: 0.028, duration: 1.25 },
  { ratio: 4.08, gain: 0.014, duration: 0.82 },
];

const frameCount = Math.ceil(sampleRate * durationSeconds);
const samples = new Float64Array(frameCount);
const floorGain = 0.0001;
const attackSeconds = 0.018;

for (const note of notes) {
  const startSeconds = 0.04 + note.beat * beatSeconds;
  const startFrame = Math.floor(startSeconds * sampleRate);
  for (const partial of partials) {
    const decaySeconds = partial.duration * (note.decayScale || 1);
    const endFrame = Math.min(frameCount, Math.ceil((startSeconds + decaySeconds) * sampleRate));
    for (let frame = startFrame; frame < endFrame; frame += 1) {
      const elapsed = frame / sampleRate - startSeconds;
      const envelope = elapsed <= attackSeconds
        ? floorGain * (partial.gain / floorGain) ** (elapsed / attackSeconds)
        : partial.gain * (floorGain / partial.gain) ** ((elapsed - attackSeconds) / (decaySeconds - attackSeconds));
      samples[frame] += Math.sin(2 * Math.PI * note.frequency * partial.ratio * elapsed) * envelope;
    }
  }
}

const bytesPerSample = 2;
const dataLength = frameCount * bytesPerSample;
const wav = Buffer.alloc(44 + dataLength);
wav.write("RIFF", 0, "ascii");
wav.writeUInt32LE(36 + dataLength, 4);
wav.write("WAVE", 8, "ascii");
wav.write("fmt ", 12, "ascii");
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * bytesPerSample, 28);
wav.writeUInt16LE(bytesPerSample, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36, "ascii");
wav.writeUInt32LE(dataLength, 40);

let rawPeak = 0;
for (const sample of samples) rawPeak = Math.max(rawPeak, Math.abs(sample));
const targetPeak = 0.82;
const normalization = rawPeak > 0 ? targetPeak / rawPeak : 1;
let peak = 0;
for (let frame = 0; frame < frameCount; frame += 1) {
  const sample = Math.max(-0.98, Math.min(0.98, samples[frame] * normalization));
  peak = Math.max(peak, Math.abs(sample));
  wav.writeInt16LE(Math.round(sample * 32767), 44 + frame * bytesPerSample);
}

const outputUrl = new URL("./chime.wav", import.meta.url);
await writeFile(outputUrl, wav);
console.log(`Generated ${outputUrl.pathname}: ${durationSeconds.toFixed(1)}s, raw peak ${rawPeak.toFixed(3)}, normalized peak ${peak.toFixed(3)}, ${wav.length} bytes`);
