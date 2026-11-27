// Drop any image and see it as ASCII art. Everything happens in your browser: the picture is
// drawn onto a small canvas, each cell's brightness picks a character, and nothing is
// uploaded anywhere. The drop box's feel (it swells when a file is carried over it, then
// gulps) is after Bencho's Upload dropzone (MIT); the code is written for this site.
import { useRef, useState } from 'react';

const RAMP = ' .:-=+*#%@';
const COLS = 72;

async function toAscii(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const cols = COLS;
    // Characters are about twice as tall as they are wide.
    const rows = Math.max(1, Math.round((img.height / img.width) * cols * 0.5));
    const c = document.createElement('canvas');
    c.width = cols;
    c.height = rows;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(img, 0, 0, cols, rows);
    const { data } = g.getImageData(0, 0, cols, rows);
    let out = '';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const a = data[i + 3] / 255;
        const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
        // Light characters on a dark screen: bright pixels get dense glyphs.
        const v = lum * a;
        out += RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))];
      }
      out += '\n';
    }
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function AsciiDrop() {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [gulp, setGulp] = useState(false);
  const [art, setArt] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const take = async (file?: File | null) => {
    setOver(false);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNote('That isn’t an image. Try a PNG, JPG or GIF.');
      return;
    }
    if (file.size > 15e6) {
      setNote('That one’s over 15 MB. Try a smaller picture.');
      return;
    }
    setNote(null);
    setGulp(true);
    window.setTimeout(() => setGulp(false), 420);
    try {
      setArt(await toAscii(file));
    } catch {
      setNote('Couldn’t read that image.');
    }
  };

  return (
    <div className="ascii-drop">
      <div
        className="ascii-drop-zone"
        data-over={over || undefined}
        data-gulp={gulp || undefined}
        onDragEnter={(e) => (e.preventDefault(), setOver(true))}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          void take(e.dataTransfer.files[0]);
        }}
      >
        {art ? (
          <pre className="ascii-drop-art" aria-label="Your picture as ASCII art">
            {art}
          </pre>
        ) : (
          <p className="ascii-drop-hint">
            <span className="ascii-drop-arrow" aria-hidden="true">
              ↑
            </span>
            Drop an image here
          </p>
        )}
      </div>
      <div className="ascii-drop-row">
        <button type="button" className="toy-button" onClick={() => input.current?.click()}>
          {art ? 'Try another' : 'Choose an image'}
        </button>
        <span className="ascii-drop-note" role="status" aria-live="polite">
          {note ?? 'Stays on your device. Nothing is uploaded.'}
        </span>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void take(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
