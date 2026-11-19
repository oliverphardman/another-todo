import { fireEvent, render, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContainerProvider, useContainer } from "../src/ui/container-context";
import { PressableSurface, surfaceStyle } from "../src/ui/pressable-surface";
import { createTestContainer } from "./support/test-container";

describe("PressableSurface", () => {
	it("renders pressable content and reports presses", () => {
		let presses = 0;
		render(
			<PressableSurface
				accessibilityLabel="press me"
				hoverColor="#111111"
				activeColor="#222222"
				onPress={() => {
					presses += 1;
				}}
			/>,
		);
		const element = screen.getByLabelText("press me");
		fireEvent.mouseEnter(element);
		fireEvent.mouseDown(element);
		fireEvent.mouseUp(element);
		fireEvent.mouseLeave(element);
		fireEvent.click(element);
		expect(presses).toBe(1);
	});

	it("works without interaction colors", () => {
		render(<PressableSurface accessibilityLabel="plain" />);
		fireEvent.mouseDown(screen.getByLabelText("plain"));
		expect(screen.getByLabelText("plain")).toBeTruthy();
	});
});

describe("surfaceStyle", () => {
	it("prefers the pressed color, then the hover color, then nothing", () => {
		const base = { padding: 4 };
		expect(surfaceStyle({ pressed: true, hovered: true }, base, "#h", "#a")).toEqual([
			base,
			{ backgroundColor: "#a" },
		]);
		expect(surfaceStyle({ pressed: false, hovered: true }, base, "#h", "#a")).toEqual([
			base,
			{ backgroundColor: "#h" },
		]);
		expect(surfaceStyle({ pressed: false }, base, "#h", "#a")).toEqual([base, undefined]);
		expect(surfaceStyle({ pressed: true }, undefined, "#h", undefined)).toEqual([
			undefined,
			undefined,
		]);
	});
});

describe("useContainer", () => {
	it("requires a provider", () => {
		expect(() => renderHook(() => useContainer())).toThrow("ContainerProvider is missing");
	});

	it("returns the provided container", () => {
		const { container } = createTestContainer();
		const { result } = renderHook(() => useContainer(), {
			wrapper: ({ children }) => (
				<ContainerProvider container={container}>{children}</ContainerProvider>
			),
		});
		expect(result.current).toBe(container);
	});
});
