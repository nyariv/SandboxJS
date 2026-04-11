/**
 * Ops registry — kept separate from executorUtils.ts so that ops/*.ts files
 * can import addOps without creating a circular initialization problem.
 *
 * executorUtils.ts imports from here; ops/*.ts imports from here too.
 * No imports from executorUtils.ts allowed in this file.
 */
import { LispType } from '../utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ops = new Map<LispType, (params: any) => void>();

export function addOps<a = unknown, b = unknown, obj = unknown, bobj = unknown>(
  type: LispType,
  cb: (params: any) => void,
) {
  ops.set(type, cb);
}
