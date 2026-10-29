// ─── In-app page stack for the Back button ──────────────────────────
// Only real page navigations are recorded (no query strings: tabs and steps use replace).
// Back goes to the last page opened in the app; a deep-linked page falls back to its
// logical parent so Back never leaves the app or lands on a stale step.

export const MAX_STACK = 30;

/** Top-level homes: no Back button there. */
export const ROOT_PAGES = ['/w', '/a'] as const;

/** Record arriving on `path`. Arriving on the previous page is treated as going back. */
export function recordVisit(stack: readonly string[], path: string): string[] {
  if (stack[stack.length - 1] === path) return [...stack];
  if (stack[stack.length - 2] === path) return stack.slice(0, -1);
  return [...stack, path].slice(-MAX_STACK);
}

/** The page above this one: '/w/report/abc' → '/w/report', '/w/pay' → '/w', '/w' → null. */
export function logicalParent(path: string): string | null {
  if ((ROOT_PAGES as readonly string[]).includes(path)) return null;
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 1) return '/';
  return `/${parts.slice(0, -1).join('/')}`;
}

export type BackTarget = { kind: 'history'; path: string } | { kind: 'parent'; path: string } | null;

/** Where Back should go from `current`, given the recorded stack. */
export function backTarget(stack: readonly string[], current: string): BackTarget {
  const top = stack[stack.length - 1] === current ? stack.length - 1 : stack.length;
  const previous = stack[top - 1];
  if (previous && previous !== current) return { kind: 'history', path: previous };
  const parent = logicalParent(current);
  return parent ? { kind: 'parent', path: parent } : null;
}
