import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { easeOut, motion, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';

import { InstagramIcon, YouTubeIcon } from '@/components/marks';
import { cn } from '@/lib/cn';

import { NODE_ICONS } from './nodeIcons';
import { NODES, roundedPath, routeWire, WIRES } from './ringLayout';
import type { Box, Point, RingNodeSpec, WireSpec } from './ringLayout';

interface WireLayout extends WireSpec {
  d: string;
  ends: [Point, Point];
}

interface RingLayout {
  width: number;
  height: number;
  wires: WireLayout[];
}

function useRing(boxRef: RefObject<HTMLDivElement | null>, nodeRefs: RefObject<Record<string, HTMLDivElement | null>>): RingLayout | null {
  const [layout, setLayout] = useState<RingLayout | null>(null);
  const measure = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    const boxes: Record<string, Box> = {};
    for (const node of NODES) {
      const element = nodeRefs.current[node.id];
      if (!element) return;
      // offsets, not bounding boxes: nodes are scaled and tilted while they enter, and wires must meet where they rest
      const w = element.offsetWidth;
      const h = element.offsetHeight;
      const cx = (node.at[0] / 100) * box.offsetWidth;
      const cy = (node.at[1] / 100) * box.offsetHeight;
      boxes[node.id] = { x: cx - w / 2, y: cy - h / 2, w, h, cx, cy };
    }
    const wires: WireLayout[] = [];
    for (const wire of WIRES) {
      const from = boxes[wire.from];
      const to = boxes[wire.to];
      if (!from || !to) continue;
      const points = routeWire(wire.kind, from, to, box.offsetWidth);
      const first = points[0];
      const last = points[points.length - 1];
      if (first && last) wires.push({ ...wire, d: roundedPath(points), ends: [first, last] });
    }
    setLayout({ width: box.offsetWidth, height: box.offsetHeight, wires });
  }, [boxRef, nodeRefs]);

  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (boxRef.current) observer.observe(boxRef.current);
    // the label font can change a node's width once it loads
    void document.fonts.ready.then(measure);
    return () => observer.disconnect();
  }, [boxRef, measure]);

  return layout;
}

function Wire({ wire, progress }: { wire: WireLayout; progress: MotionValue<number> }) {
  const [start, end] = wire.draw;
  const length = useTransform(progress, [start, end], [0, 1]);
  // a round cap draws a dot even at no length, so the wire stays hidden until it starts to grow
  const shown = useTransform(progress, [start, start + 0.001], [0, 1]);
  const startDot = useTransform(progress, [start, start + 0.005], [0, 1]);
  const endDot = useTransform(progress, [end - 0.005, end], [0, 1]);
  return (
    <>
      <motion.path d={wire.d} fill="none" strokeWidth="1.5" strokeLinecap="round" className={wire.isAccent ? 'stroke-spin' : 'stroke-line-strong'} style={{ pathLength: length, opacity: shown }} />
      <motion.circle cx={wire.ends[0][0]} cy={wire.ends[0][1]} r="3" className="fill-ink" style={{ opacity: startDot }} />
      <motion.circle cx={wire.ends[1][0]} cy={wire.ends[1][1]} r="3" className="fill-ink" style={{ opacity: endDot }} />
    </>
  );
}

export function NodeCard({ node }: { node: RingNodeSpec }) {
  if (node.id === 'platforms') {
    return (
      <div className="flex">
        <span className="flex size-12 items-center justify-center rounded-full border border-line bg-surface-elevated shadow-popover"><YouTubeIcon className="size-5 text-youtube" /></span>
        <span className="-ml-1.5 flex size-12 items-center justify-center rounded-full border border-line bg-surface-elevated shadow-popover"><InstagramIcon className="size-5 text-instagram" /></span>
      </div>
    );
  }
  const Icon = NODE_ICONS[node.id];
  return (
    <div className="flex items-center gap-2.5 rounded-control border border-line bg-surface-elevated px-4 py-3 whitespace-nowrap shadow-popover">
      {Icon && <Icon className="size-5 shrink-0 text-spin-text" />}
      <span className={cn('leading-none text-ink', node.isTool ? 'font-mono text-[15px]' : 'text-[17px]')}>{node.label}</span>
    </div>
  );
}

function RingNode({ node, progress, nodeRef }: { node: RingNodeSpec; progress: MotionValue<number>; nodeRef: (element: HTMLDivElement | null) => void }) {
  const during = [node.show, node.show + 0.035];
  const isBlur = node.enter[0] === 'blur';
  const opacity = useTransform(progress, during, [0, 1]);
  const scale = useTransform(progress, during, [node.enter[0] === 'scale' ? node.enter[1] : 1, 1], { ease: easeOut });
  const y = useTransform(progress, during, [isBlur ? 20 : 0, 0], { ease: easeOut });
  const filter = useTransform(progress, during, [isBlur ? 'blur(4px)' : 'blur(0px)', 'blur(0px)']);
  return (
    <motion.div className="absolute size-0" style={{ left: `${node.at[0]}%`, top: `${node.at[1]}%`, opacity, scale, y, filter, rotate: node.tilt }}>
      <div ref={nodeRef} className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2">
        <NodeCard node={node} />
      </div>
    </motion.div>
  );
}

// the resolution's ring: every node measured, then wired with right-angled, rounded paths that draw on as you scroll
export function Ring({ progress }: { progress: MotionValue<number> }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const layout = useRing(boxRef, nodeRefs);
  return (
    <div ref={boxRef} aria-hidden="true" className="absolute inset-x-0 top-[14%] bottom-[4.5%] z-[2] hidden lg:block">
      {layout && (
        <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="absolute inset-0 size-full overflow-visible">
          {layout.wires.map((wire) => <Wire key={`${wire.from}-${wire.to}`} wire={wire} progress={progress} />)}
        </svg>
      )}
      {NODES.map((node) => (
        <RingNode
          key={node.id}
          node={node}
          progress={progress}
          nodeRef={(element) => {
            nodeRefs.current[node.id] = element;
          }}
        />
      ))}
    </div>
  );
}
