import { useEffect, useRef, useState } from "react";

export interface Draft {
	readonly text: string;
	readonly change: (text: string) => void;
	readonly commit: () => void;
}

export function useDraft(saved: string, save: (text: string) => void): Draft {
	const [text, setText] = useState(saved);
	const unsaved = useRef<string | null>(null);
	const latestSave = useRef(save);
	latestSave.current = save;
	useEffect(() => {
		unsaved.current = null;
		setText(saved);
	}, [saved]);
	const commit = useRef(() => {
		const pending = unsaved.current;
		if (pending !== null) {
			unsaved.current = null;
			latestSave.current(pending);
		}
	}).current;
	useEffect(() => commit, [commit]);
	const change = (next: string) => {
		unsaved.current = next;
		setText(next);
	};
	return { text, change, commit };
}
