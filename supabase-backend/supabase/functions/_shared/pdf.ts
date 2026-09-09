// The original used `pdfkit`, which depends on Node's `fs` module to load
// embedded font files — risky to trust inside a sandboxed Deno Edge
// Function without being able to test a real deployment first. This is a
// small, dependency-free PDF writer instead: it builds the raw PDF byte
// structure directly using only the built-in Helvetica font (one of the
// 14 "base" PDF fonts every PDF viewer already has — no font file needs
// to be embedded or read from disk at all).
//
// Standard Helvetica character-width metrics (1/1000 em units) — this is
// published, standard font metric data (part of the Adobe Core 14 Fonts
// specification), used here only to right-align text accurately.
const HELVETICA_WIDTHS: Record<number, number> = {
  32: 278, 33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 191,
  40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
  48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556,
  56: 556, 57: 556, 58: 278, 59: 278, 60: 584, 61: 584, 62: 584, 63: 556,
  64: 1015, 65: 667, 66: 667, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
  72: 722, 73: 278, 74: 500, 75: 667, 76: 556, 77: 833, 78: 722, 79: 778,
  80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944,
  88: 667, 89: 667, 90: 611, 91: 278, 92: 278, 93: 278, 94: 469, 95: 556,
  96: 333, 97: 556, 98: 556, 99: 500, 100: 556, 101: 556, 102: 278,
  103: 556, 104: 556, 105: 222, 106: 222, 107: 500, 108: 222, 109: 833,
  110: 556, 111: 556, 112: 556, 113: 556, 114: 333, 115: 500, 116: 278,
  117: 556, 118: 500, 119: 722, 120: 500, 121: 500, 122: 500, 123: 334,
  124: 260, 125: 334, 126: 584,
};

function textWidth(text: string, fontSize: number): number {
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    total += HELVETICA_WIDTHS[text.charCodeAt(i)] ?? 556;
  }
  return (total / 1000) * fontSize;
}

function escapePdfString(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

type Align = "left" | "right";

interface TextOp {
  x: number;
  y: number;
  size: number;
  text: string;
  gray?: number; // 0 = black, 1 = white; defaults to black
  align?: Align;
}

interface LineOp {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const PAGE_WIDTH = 612; // US Letter, points (matches pdfkit's default)
const PAGE_HEIGHT = 792;

// Minimal single-page PDF builder. Call text()/line() to add content
// (coordinates are from the top-left, like screen/CSS coordinates — the
// flip to PDF's bottom-left origin happens internally so callers don't
// have to think about it), then build() to get the final file bytes.
//
// LIMITATION: only plain ASCII renders correctly. This writer doesn't
// implement a custom /Encoding dictionary, so any character outside
// Helvetica's default WinAnsi mapping (e.g. an em dash "—", curly
// quotes) will come out as mojibake. Stick to plain ASCII (a "-" instead
// of "—", straight quotes) in any text passed to text().
export class SimplePdf {
  private textOps: TextOp[] = [];
  private lineOps: LineOp[] = [];

  text(x: number, y: number, size: number, text: string, opts: { align?: Align; gray?: number } = {}): void {
    this.textOps.push({ x, y, size, text, align: opts.align, gray: opts.gray });
  }

  line(x1: number, y1: number, x2: number, y2: number): void {
    this.lineOps.push({ x1, y1, x2, y2 });
  }

  private buildContentStream(): string {
    const lines: string[] = [];

    for (const op of this.textOps) {
      const yFlipped = PAGE_HEIGHT - op.y;
      const x = op.align === "right" ? op.x - textWidth(op.text, op.size) : op.x;
      const gray = op.gray ?? 0;

      lines.push(`${gray} g`);
      lines.push("BT");
      lines.push(`/F1 ${op.size} Tf`);
      lines.push(`${x.toFixed(2)} ${yFlipped.toFixed(2)} Td`);
      lines.push(`(${escapePdfString(op.text)}) Tj`);
      lines.push("ET");
    }

    for (const op of this.lineOps) {
      lines.push("0 G"); // stroke color black
      lines.push("0.5 w"); // line width
      lines.push(`${op.x1.toFixed(2)} ${(PAGE_HEIGHT - op.y1).toFixed(2)} m`);
      lines.push(`${op.x2.toFixed(2)} ${(PAGE_HEIGHT - op.y2).toFixed(2)} l`);
      lines.push("S");
    }

    return lines.join("\n");
  }

  build(): Uint8Array {
    const content = this.buildContentStream();
    const encoder = new TextEncoder();

    // Object 4 (the content stream) needs its own byte length up front.
    const contentBytes = encoder.encode(content);

    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      `<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 5 0 R >> >> ` +
        `/MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents 4 0 R >>`,
      `<< /Length ${contentBytes.length} >>\nstream\n${content}\nendstream`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ];

    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0]; // object 0 is the free-list head, unused here

    objects.forEach((body, i) => {
      offsets.push(encoder.encode(pdf).length);
      pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });

    const xrefOffset = encoder.encode(pdf).length;
    const objectCount = objects.length + 1;

    pdf += `xref\n0 ${objectCount}\n`;
    pdf += "0000000000 65535 f \n";
    for (let i = 1; i < objectCount; i++) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objectCount} /Root 1 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF`;

    return encoder.encode(pdf);
  }
}

export { PAGE_WIDTH, PAGE_HEIGHT };
