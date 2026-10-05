import { foregroundAnsi, rgbColor } from "@earendil-works/pi-tui";
import { theme } from "../theme/theme.ts";

const CORAL = rgbColor(228, 138, 122);
const BLUE = rgbColor(79, 142, 179);
const RESET = "\x1b[0m";

/**
 * The e logo (Euler's number): 4 cells wide and 2 lines tall, drawn as a lowercase e on a 4x4 pixel
 * grid (half blocks, one cell = two vertical pixels):
 *
 *   .    coral coral coral
 *   blue   .     .   coral
 *   coral coral coral  .
 *   blue   .     .   blue
 *
 * The top stroke opens on the left, the middle bar is the e's eye, and the blue pixels are the
 * terminals where the stroke enters and leaves the loop. Every cell carries a single fill color
 * (a half block renders one color per cell, so no cell mixes coral and blue). Brand colors stay
 * fixed across themes; they follow the terminal's color mode.
 */
export function eLogoLines(): [string, string] {
	const mode = theme.getColorMode();
	const fg = (color: typeof CORAL) => foregroundAnsi(color, mode);
	// Line 1 (top two pixel rows): cells [▄ blue][▀ coral][▀ coral][█ coral]
	// Line 2 (bottom two pixel rows): cells [█ coral][▀ coral][▀ coral][▄ blue]
	const c = fg(CORAL);
	const b = fg(BLUE);
	const top = `${b}▄${c}▀▀${c}█${RESET} `;
	const bottom = `${c}█${c}▀▀${b}▄${RESET}`;
	return [top, bottom];
}
