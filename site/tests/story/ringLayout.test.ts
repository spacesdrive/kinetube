import { describe, expect, it } from 'vitest';

import { NODES, roundedPath, routeWire, WIRES } from '@/components/sections/story/ringLayout';
import type { Box } from '@/components/sections/story/ringLayout';

const box = (cx: number, cy: number, w = 100, h = 40): Box => ({ x: cx - w / 2, y: cy - h / 2, w, h, cx, cy });

describe('the story ring', () => {
  it('only wires nodes that exist', () => {
    const ids = new Set(NODES.map((node) => node.id));
    for (const wire of WIRES) {
      expect(ids.has(wire.from) && ids.has(wire.to), `${wire.from} to ${wire.to}`).toBe(true);
    }
  });

  it('runs a downward wire from under one node to above the next', () => {
    const points = routeWire('down', box(100, 100), box(80, 300), 1000);
    expect(points[0]).toEqual([100, 126]);
    expect(points[points.length - 1]).toEqual([80, 274]);
  });

  it('starts a path at the first point and ends it on the last', () => {
    const d = roundedPath([[0, 0], [100, 0], [100, 80]]);
    expect(d.startsWith('M 0 0')).toBe(true);
    expect(d.endsWith('L 100 80')).toBe(true);
    expect(d).toContain('Q 100 0');
  });

  it('draws nothing for no points', () => {
    expect(roundedPath([])).toBe('');
  });
});
