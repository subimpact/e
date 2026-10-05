import { beforeAll, describe, expect, test } from "vitest";
import { eLogoLines } from "../src/modes/interactive/components/e-logo.ts";
import { initTheme } from "../src/modes/interactive/theme/theme.ts";

// Guard: the 4x4 pixel grid eLogoLines() renders must decode to a true lowercase e
// (top stroke open on the left, bowl closed, middle eye bar). This is the exact bug
// class that shipped 0.99.8 as a flag: code strings looked right, pixels didn't.
// Row order: row1 = upper half of line 1, row2 = lower half of line 1,
// row3 = upper half of line 2, row4 = lower half of line 2.
// Half-block semantics: cell "▀" fills the cell's UPPER pixel row; "▄" fills the
// LOWER pixel row; "█" fills both; " " fills neither.

describe("e logo glyph", () => {
	let top: string;
	let bottom: string;

	beforeAll(() => {
		initTheme(undefined, false);
		[top, bottom] = eLogoLines();
	});

	const plain = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
	const up = (ch: string) => (ch === "▀" || ch === "█" ? 1 : 0);
	const dn = (ch: string) => (ch === "▄" || ch === "█" ? 1 : 0);

	test("cell strings match the designed glyph", () => {
		expect(plain(top)).toBe("▄▀▀█ ");
		expect(plain(bottom)).toBe("█▀▀▄");
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

		// Structural checks that catch every wrong-glyph regression, independent of
		// which exact e design is current:
		// 1. Top stroke is OPEN on the left (row1 col1 empty) or the glyph grows a
		//    solid top banner and reads as a flag.
		expect(rows[0][0]).toBe("0");
		expect(rows[0]).toContain("1");
		// 2. Left column has a filled terminal at the stroke entry (row2 col1) and
		//    the bowl return (row4 col1).
		expect(rows[1][0]).toBe("1");
		expect(rows[3][0]).toBe("1");
		// 3. The eye bar spans the bowl without touching the outer right edge
		//    (an e's crossbar stops before the open curve).
		expect(rows[2]).toBe("1110");
		// 4. The glyph spans exactly 4 pixel rows.
		expect(rows).toHaveLength(4);
	});
});
