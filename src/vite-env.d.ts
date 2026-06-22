/// <reference types="vite/client" />

// Minimal TS shims for React types.
// Your project appears to be missing @types/react, so we provide the minimal declarations
// needed for the compiler to accept TSX in this repo.

declare module "react" {
  export type ReactNode = any;
  export type FC<P = {}> = (props: P) => any;
  export function useState<S>(initial: S | (() => S)): [S, (s: S) => void];
  export function useEffect(effect: any, deps?: any[]): void;
  export function useMemo<T>(factory: () => T, deps?: any[]): T;
}

declare module "react/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}


