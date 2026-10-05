import { foregroundAnsi, rgbColor } from "@earendil-works/pi-tui";
import { theme } from "../theme/theme.ts";

const CORAL = rgbColor(228, 138, 122);
const BLUE = rgbColor(79, 142, 179);
const RESET = "\x1b[0m";

/**
 * The e logo (Euler's number): 4 cells wide and 2 lines tall. Each cell shows two square pixels with
 * half blocks:
 *
 *   coral .      .    coral
 *   blue  coral  blue .
 *
 * The glyph reads as a lowercase e: the top stroke opens, the body closes the loop the same way the
 * constant turns up everywhere in calculus. Brand colors stay fixed across themes; they follow the
 * terminal's color mode.
 */
export function eLogoLines(): [string, string] {
	const mode = theme.getColorMode();
	const fg = (color: typeof CORAL) => foregroundAnsi(color, mode);
	// Four cells per line, two half-block rows per cell. Top line: the open e-curve (coral); bottom
	// line: the closed body (blue) with the coral bar that gives the glyph its eye.
	const top = `${fg(CORAL)}▀ ${fg(CORAL)}▀▀${RESET} `;
	const bottom = `${fg(BLUE)}█▀${fg(CORAL)}▀${fg(BLUE)}█ ${RESET}`;
	return [top, bottom];
}
