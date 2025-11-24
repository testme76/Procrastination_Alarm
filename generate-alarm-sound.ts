// This script generates a simple alarm sound using Web Audio API concepts
// We'll create a simple beep sound as a base64 encoded WAV file

function createAlarmWav(): Uint8Array {
  const sampleRate = 44100;
  const duration = 1; // 1 second
  const frequency = 880; // A5 note (high pitch)
  const numSamples = sampleRate * duration;

  // Create WAV header
  const header = new Uint8Array([
    // "RIFF" chunk descriptor
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0, 0, 0, 0, // File size (will be filled later)
    0x57, 0x41, 0x56, 0x45, // "WAVE"

    // "fmt " sub-chunk
    0x66, 0x6d, 0x74, 0x20, // "fmt "
    16, 0, 0, 0, // Subchunk1Size (16 for PCM)
    1, 0, // AudioFormat (1 for PCM)
    1, 0, // NumChannels (1 for mono)
    0x44, 0xac, 0, 0, // SampleRate (44100)
    0x88, 0x58, 0x01, 0, // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
    2, 0, // BlockAlign (NumChannels * BitsPerSample/8)
    16, 0, // BitsPerSample (16)

    // "data" sub-chunk
    0x64, 0x61, 0x74, 0x61, // "data"
    0, 0, 0, 0, // Subchunk2Size (will be filled later)
  ]);

  // Generate audio samples (simple sine wave)
  const samples = new Int16Array(numSamples);
  const maxAmplitude = 0x7fff; // Maximum amplitude for 16-bit audio

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Create a beep with envelope (fade in/out)
    const envelope = Math.sin(Math.PI * t / duration);
    samples[i] = Math.floor(maxAmplitude * 0.5 * envelope * Math.sin(2 * Math.PI * frequency * t));
  }

  // Convert samples to bytes
  const dataBytes = new Uint8Array(samples.buffer);

  // Update sizes in header
  const fileSize = header.length + dataBytes.length - 8;
  const dataSize = dataBytes.length;

  header[4] = fileSize & 0xff;
  header[5] = (fileSize >> 8) & 0xff;
  header[6] = (fileSize >> 16) & 0xff;
  header[7] = (fileSize >> 24) & 0xff;

  header[40] = dataSize & 0xff;
  header[41] = (dataSize >> 8) & 0xff;
  header[42] = (dataSize >> 16) & 0xff;
  header[43] = (dataSize >> 24) & 0xff;

  // Combine header and data
  const wav = new Uint8Array(header.length + dataBytes.length);
  wav.set(header, 0);
  wav.set(dataBytes, header.length);

  return wav;
}

// Generate the alarm sound
const wavData = createAlarmWav();

// Write to file
await Deno.writeFile("public/alarm.wav", wavData);

console.log("✅ Alarm sound generated at public/alarm.wav");
