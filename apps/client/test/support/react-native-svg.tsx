import type { ReactNode } from "react";

export default function Svg({ children }: { children?: ReactNode }) {
	return <svg>{children}</svg>;
}

export function Path({ d }: { d: string }) {
	return <path d={d} />;
}

export function Defs({ children }: { children?: ReactNode }) {
	return <defs>{children}</defs>;
}

export function LinearGradient({ id, children }: { id: string; children?: ReactNode }) {
	return <linearGradient id={id}>{children}</linearGradient>;
}

export function Stop({ offset }: { offset: string }) {
	return <stop offset={offset} />;
}

export function Rect({ fill }: { fill: string }) {
	return <rect fill={fill} />;
}
