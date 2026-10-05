type Point = readonly [number, number];

const round = (value: number) => Math.round(value * 10) / 10;

/** An SVG path through the points as one smooth curve (Catmull-Rom turned into cubic Béziers). */
export function smoothPath(points: readonly Point[], closed = false): string {
  const at = (index: number): Point =>
    closed
      ? points[(index + points.length) % points.length]!
      : points[Math.min(Math.max(index, 0), points.length - 1)]!;
  const segments = closed ? points.length : points.length - 1;
  let d = `M${round(points[0]![0])} ${round(points[0]![1])}`;
  for (let i = 0; i < segments; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    d += ` C${round(p1[0] + (p2[0] - p0[0]) / 6)} ${round(p1[1] + (p2[1] - p0[1]) / 6)} ${round(
      p2[0] - (p3[0] - p1[0]) / 6,
    )} ${round(p2[1] - (p3[1] - p1[1]) / 6)} ${round(p2[0])} ${round(p2[1])}`;
  }
  return closed ? `${d} Z` : d;
}

/**
 * Contour lines around a summit, like a topographic map: `rings` loops, each wobbling a little differently.
 * `stretch` widens them sideways.
 */
export function contourRings(cx: number, cy: number, rings: number, gap: number, stretch = 1.5, seed = 0) {
  return Array.from({ length: rings }, (_, ring) => {
    const radius = (ring + 1) * gap;
    const points = Array.from({ length: 18 }, (_, step): Point => {
      const angle = (step / 18) * Math.PI * 2;
      const wobble =
        1 +
        0.13 * Math.sin(3 * angle + seed + ring * 0.35) +
        0.07 * Math.cos(5 * angle + seed * 1.7 - ring * 0.2);
      return [cx + Math.cos(angle) * radius * wobble * stretch, cy + Math.sin(angle) * radius * wobble];
    });
    return smoothPath(points, true);
  });
}
