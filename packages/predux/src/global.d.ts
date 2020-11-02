// always make sure this file doesn't make it to the published package as it
// could tamper with user environments

declare function requestAnimationFrame(callback: () => void): number;
declare function cancelAnimationFrame(frameId: number): void;
declare function setTimeout(callback: () => void, delay?: number): number;
declare function clearTimeout(timeoutId: number): void;
