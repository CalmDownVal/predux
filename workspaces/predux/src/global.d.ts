declare function requestAnimationFrame(callback: () => void): number;
declare function cancelAnimationFrame(frameId: number): void;
declare function setTimeout(callback: () => void, delay?: number): number;
declare function clearTimeout(timeoutId: number): void;
