import type { ReactNode } from "react";

export default function Svg({ children }: { children?: ReactNode }) {
	return <svg>{children}</svg>;
}

export function Path({ d }: { d: string }) {
	return <path d={d} />;
}
