// where the ring's nodes sit and how its wires run; plain maths, so it is tested without a browser

export type Point = [number, number];
export type Enter = ['scale', number] | ['blur'];
export type WireKind = 'top' | 'down' | 'across' | 'straight';

export interface RingNodeSpec {
  id: string;
  // the centre, in percent of the ring's box
  at: [number, number];
  tilt: number;
  show: number;
  enter: Enter;
  label?: string;
  // tool names are set in the code face
  isTool?: boolean;
}

export interface WireSpec {
  from: string;
  to: string;
  kind: WireKind;
  draw: [number, number];
  isAccent?: boolean;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

// the two platforms at the top, the tools down the sides, and what lands on the computer along the bottom
export const NODES: RingNodeSpec[] = [
  { id: 'platforms', at: [50, 7.5], tilt: 0, show: 0.685, enter: ['scale', 0.62] },
  { id: 'ytdlp', at: [12, 17.5], tilt: -2, show: 0.7, enter: ['scale', 0.96], label: 'yt-dlp', isTool: true },
  { id: 'instaloader', at: [88, 17.5], tilt: 2, show: 0.7, enter: ['scale', 0.96], label: 'instaloader', isTool: true },
  { id: 'ffmpeg', at: [8.8, 50], tilt: 1.5, show: 0.73, enter: ['blur'], label: 'FFmpeg', isTool: true },
  { id: 'whisper', at: [91.2, 50], tilt: -1.5, show: 0.745, enter: ['scale', 0.96], label: 'whisper.cpp', isTool: true },
  { id: 'resume', at: [13, 82.5], tilt: 2, show: 0.77, enter: ['scale', 0.62], label: 'Pause and resume' },
  { id: 'transcripts', at: [87, 82.5], tilt: -2, show: 0.77, enter: ['scale', 0.96], label: 'Transcripts' },
  { id: 'folder', at: [38.5, 92.5], tilt: -1, show: 0.795, enter: ['blur'], label: 'Your download folder' },
  { id: 'computer', at: [61.5, 92.5], tilt: 1, show: 0.8, enter: ['scale', 0.86], label: 'Your computer' },
];

// in the order they grow: out from the platforms, down both sides, meeting along the bottom
export const WIRES: WireSpec[] = [
  { from: 'platforms', to: 'ytdlp', kind: 'top', draw: [0.655, 0.7] },
  { from: 'platforms', to: 'instaloader', kind: 'top', draw: [0.655, 0.7] },
  { from: 'ytdlp', to: 'ffmpeg', kind: 'down', draw: [0.685, 0.745], isAccent: true },
  { from: 'instaloader', to: 'whisper', kind: 'down', draw: [0.685, 0.745], isAccent: true },
  { from: 'ffmpeg', to: 'resume', kind: 'down', draw: [0.72, 0.765] },
  { from: 'whisper', to: 'transcripts', kind: 'down', draw: [0.72, 0.765] },
  { from: 'resume', to: 'folder', kind: 'across', draw: [0.745, 0.8] },
  { from: 'transcripts', to: 'computer', kind: 'across', draw: [0.745, 0.8] },
  { from: 'folder', to: 'computer', kind: 'straight', draw: [0.795, 0.84] },
];

const GAP = 6;
const RADIUS = 16;

// a path through right-angled points, each corner rounded
export function roundedPath(points: Point[]): string {
  const [first, ...rest] = points;
  if (!first) return '';
  let d = `M ${first[0]} ${first[1]}`;
  rest.forEach((corner, index) => {
    const previous = points[index] ?? first;
    const next = rest[index + 1];
    if (!next) {
      d += ` L ${corner[0]} ${corner[1]}`;
      return;
    }
    const r = Math.min(RADIUS, Math.hypot(corner[0] - previous[0], corner[1] - previous[1]) / 2, Math.hypot(next[0] - corner[0], next[1] - corner[1]) / 2);
    const inX = corner[0] - Math.sign(corner[0] - previous[0]) * r;
    const inY = corner[1] - Math.sign(corner[1] - previous[1]) * r;
    const outX = corner[0] + Math.sign(next[0] - corner[0]) * r;
    const outY = corner[1] + Math.sign(next[1] - corner[1]) * r;
    d += ` L ${inX} ${inY} Q ${corner[0]} ${corner[1]} ${outX} ${outY}`;
  });
  return d;
}

// the points for one wire, from the measured boxes of the two nodes it joins
export function routeWire(kind: WireKind, a: Box, b: Box, width: number): Point[] {
  const toRight = b.cx > a.cx;
  const side = (box: Box, isRight: boolean) => (isRight ? box.x + box.w + GAP : box.x - GAP);
  if (kind === 'top') {
    const bend = toRight ? width * 0.668 : width * 0.332;
    return [[side(a, toRight), a.cy], [bend, a.cy], [bend, b.cy], [side(b, !toRight), b.cy]];
  }
  if (kind === 'down') {
    const start: Point = [a.cx, a.y + a.h + GAP];
    const end: Point = [b.cx, b.y - GAP];
    const middle = (start[1] + end[1]) / 2;
    return [start, [a.cx, middle], [b.cx, middle], end];
  }
  if (kind === 'across') {
    const start: Point = [side(a, toRight), a.cy];
    const end: Point = [side(b, !toRight), b.cy];
    const middle = (start[0] + end[0]) / 2;
    return [start, [middle, a.cy], [middle, b.cy], end];
  }
  return [[side(a, toRight), a.cy], [side(b, !toRight), b.cy]];
}
