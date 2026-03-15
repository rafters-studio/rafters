/**
 * Inline OKLCH gamut classification
 * Pure math: oklch -> oklab -> LMS cubed -> linear-RGB -> in-gamut check
 * Zero dependencies, zero side effects
 */

const RAD = Math.PI / 180;

/** Floating-point tolerance for gamut boundary checks */
const EPS = 0.001;

// Module-level LMS values reused across calls to avoid per-pixel allocation
let _L = 0;
let _M = 0;
let _S = 0;

/** Compute cubed LMS values from OKLCH into module-level variables */
function computeLms(l: number, c: number, h: number): void {
  // Polar (LCH) to cartesian (Lab)
  const a = c * Math.cos(h * RAD);
  const b = c * Math.sin(h * RAD);

  // Oklab to LMS (prime form -- spec notation: l', m', s')
  const lp = l + 0.3963377774 * a + 0.2158037573 * b;
  const mp = l - 0.1055613458 * a - 0.0638541728 * b;
  const sp = l - 0.0894841775 * a - 1.291485548 * b;

  _L = lp * lp * lp;
  _M = mp * mp * mp;
  _S = sp * sp * sp;
}

function inRange(v: number): boolean {
  return v >= -EPS && v <= 1 + EPS;
}

/** Check whether an OKLCH color is within the sRGB gamut */
export function inSrgb(l: number, c: number, h: number): boolean {
  computeLms(l, c, h);
  return (
    inRange(+4.0767416621 * _L - 3.3077115913 * _M + 0.2309699292 * _S) &&
    inRange(-1.2684380046 * _L + 2.6097574011 * _M - 0.3413193965 * _S) &&
    inRange(-0.0041960863 * _L - 0.7034186147 * _M + 1.707614701 * _S)
  );
}

/** Check whether an OKLCH color is within the Display P3 gamut */
export function inP3(l: number, c: number, h: number): boolean {
  computeLms(l, c, h);
  return (
    inRange(+3.127714737 * _L - 2.257130353 * _M + 0.129415616 * _S) &&
    inRange(-1.091089834 * _L + 2.41331741 * _M - 0.322227576 * _S) &&
    inRange(-0.026073181 * _L - 0.703486028 * _M + 1.729559209 * _S)
  );
}

/**
 * Binary-search for the maximum chroma at a given lightness and hue
 * that remains within the sRGB or P3 gamut.
 * Returns 0 when no chroma is displayable (e.g. L=0 or L=1).
 */
export function findMaxChroma(l: number, h: number, ceiling = 0.4, steps = 16): number {
  let lo = 0;
  let hi = ceiling;
  for (let i = 0; i < steps; i++) {
    const mid = (lo + hi) / 2;
    if (inSrgb(l, mid, h) || inP3(l, mid, h)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return lo;
}

// -- Perceptual hue warp --
// Sine warp gives reds/oranges (H~0-60) more bar space,
// compresses cyans (H~180). Derivative at t=0 is 0.1 (10x density).
const HUE_WARP_A = 0.9;
const TWO_PI = 2 * Math.PI;

/**
 * Convert a normalized bar position (0-1) to a hue angle (0-360).
 * Uses sine warp: g(t) = t - a * sin(2*pi*t) / (2*pi)
 */
export function hueFromBarPos(t: number): number {
  return (t - (HUE_WARP_A * Math.sin(TWO_PI * t)) / TWO_PI) * 360;
}

/**
 * Convert a hue angle (0-360) to a normalized bar position (0-1).
 * Newton's method inverse of hueFromBarPos, 10 iterations.
 */
export function barPosFromHue(h: number): number {
  const target = h / 360;
  let t = target;
  for (let i = 0; i < 10; i++) {
    const g = t - (HUE_WARP_A * Math.sin(TWO_PI * t)) / TWO_PI;
    const gp = 1 - HUE_WARP_A * Math.cos(TWO_PI * t);
    t = t - (g - target) / gp;
  }
  return Math.max(0, Math.min(1, t));
}
