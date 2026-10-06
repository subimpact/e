import { beforeAll, describe, expect, test } from "vitest";
import { eLogoLines } from "../src/modes/interactive/components/e-logo.ts";
import { initTheme } from "../src/modes/interactive/theme/theme.ts";

// Guard: the 4x4 pixel grid eLogoLines() renders must decode to the designed glyph
// (traced from the tom-thumb 3x5 lowercase e, the most legible tiny bitmap e).
// This is the bug class that shipped 0.99.8 as a flag and 0.99.9 as an ambiguous
// ring: code strings looked right, pixels didn't. The test decodes the rendered
// half-blocks back to pixels and asserts the silhouette.
// Row order: row1 = upper half of line 1, row2 = lower half of line 1,
// row3 = upper half of line 2, row4 = lower half of line 2.
// Half-block semantics: cell "▀" fills the cell's UPPER pixel row; "▄" fills the
// LOWER pixel row; "█" fills both; " " fills neither.
//
// Expected grid:
//   .XXX   top stroke, open top-left
//   X..X   left spine + right shoulder (upper eye)
//   XXX.   crossbar jutting into the mouth
//   .XX.   bottom curve curling under the bar, exit bottom-right

describe("e logo glyph", () => {
	let top: string;
	let bottom: string;

	beforeAll(() => {
		initTheme(undefined, false);
		[top, bottom] = eLogoLines();
	});

	const plain = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
	const up = (ch: string) => (ch === "▀" || ch === "█" ? "1" : "0");
	const dn = (ch: string) => (ch === "▄" || ch === "█" ? "1" : "0");

	test("cell strings match the designed glyph", () => {
		expect(plain(top)).toBe("▄▀▀█ ");
		expect(plain(bottom)).toBe("▀██ ");
	});

	test("decodes to a true lowercase e silhouette", () => {
		const t = plain(top);
		const b = plain(bottom);
		const rows = [
			[up(t[0]), up(t[1]), up(t[2]), up(t[3])],
			[dn(t[0]), dn(t[1]), dn(t[2]), dn(t[3])],
			[up(b[0]), up(b[1]), up(b[2]), up(b[3])],
			[dn(b[0]), dn(b[1]), dn(b[2]), dn(b[3])],
		].map((r) => r.join(""));

		expect(rows).toEqual(["0111", "1001", "1110", "0110"]);
	});
});
