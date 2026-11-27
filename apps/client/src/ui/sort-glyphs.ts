import type { SortKey } from "../domain/view-settings";
import type { IconGlyph } from "./icon-artwork";

export const SORT_GLYPHS: Readonly<Record<SortKey, IconGlyph>> = {
	importance: "star",
	alphabetical: "arrowsUpDown",
	due: "dueDate",
	created: "createdDate",
	myDay: "sun",
};
