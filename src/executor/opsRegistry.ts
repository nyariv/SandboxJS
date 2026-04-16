/**
 * Ops registry — kept separate from executorUtils.ts so that ops/*.ts files
 * can import addOps without creating a circular initialization problem.
 *
 * executorUtils.ts imports from here; ops/*.ts imports from here too.
 * No imports from executorUtils.ts allowed in this file.
 */
import { LispType } from '../utils';
import type { LispItem } from '../parser';
import type { IExecContext, Ticks } from '../utils';
import type { Scope } from '../utils';
import type { YieldValue, Done } from './executorUtils';

export type ControlFlowAction = 'break' | 'continue';

export interface ControlFlowTarget {
  label?: string;
  acceptsBreak: boolean;
  acceptsContinue: boolean;
  acceptsUnlabeledBreak: boolean;
  acceptsUnlabeledContinue: boolean;
}

export type ControlFlowTargets = readonly ControlFlowTarget[] | undefined;

export type Execution = <T = any>(
  ticks: Ticks,
  tree: LispItem,
  scope: Scope,
  context: IExecContext,
  done: Done<T>,
  statementLabels: ControlFlowTargets,
  internal: boolean,
  generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined,
) => void;

export type OpsCallbackParams<a, b, obj, bobj> = {
  op: LispType;
  exec: Execution;
  a: a;
  b: b;
  obj: obj;
  bobj: bobj;
  ticks: Ticks;
  tree: LispItem;
  scope: Scope;
  context: IExecContext;
  done: Done;
  statementLabels: ControlFlowTargets;
  internal: boolean;
  generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined;
};

type OpCallback<a, b, obj, bobj> = (params: OpsCallbackParams<a, b, obj, bobj>) => void;

export const ops = new Map<LispType, OpCallback<any, any, any, any>>();

export function addOps<a = unknown, b = unknown, obj = unknown, bobj = unknown>(
  type: LispType,
  cb: OpCallback<a, b, obj, bobj>,
) {
  ops.set(type, cb);
}
