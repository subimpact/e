import { foregroundAnsi, rgbColor } from "@earendil-works/pi-tui";
import { theme } from "../theme/theme.ts";

const CORAL = rgbColor(228, 138, 122);
const RESET = "\x1b[0m";

/**
 * The e logo (Euler's number): traced from the tom-thumb 3x5 lowercase e, the most legible tiny
 * bitmap e in common use, scaled to a 4x4 pixel grid (half blocks, one cell = two vertical pixels):
 *
 *   .    coral coral coral
 *   coral  .     .   coral
 *   coral coral coral  .
 *     .   coral coral  .
 *
 * The stroke enters at the left spine (the lower half of the first cell), the top stroke closes
 * over the eye, the crossbar juts into the mouth, and the bottom curve curls under the bar and
 * exits bottom-right. Coral only: two-tone cells read as noise at 4x4, and half blocks carry one
 * color per cell. Brand colors stay fixed across themes; they follow the terminal's color mode.
 */
export function eLogoLines(): [string, string] {
	const mode = theme.getColorMode();
	const fg = (color: typeof CORAL) => foregroundAnsi(color, mode);
	// Line 1 (top two pixel rows): cells [▄ coral][▀ coral][▀ coral][█ coral]
	// Line 2 (bottom two pixel rows): cells [▀ coral][█ coral][█ coral][ ]
	const c = fg(CORAL);
	const top = `${c}▄▀▀█${RESET} `;
	const bottom = `${c}▀██ ${RESET}`;
	return [top, bottom];
}
