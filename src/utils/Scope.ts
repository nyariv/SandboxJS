import { reservedWords, VarType } from './types';
import { Prop, getGlobalProp, hasOwnProperty } from './Prop';
import { SandboxError } from './errors';
import type { IExecContext, IScope } from './types';

function keysOnly(obj: unknown): Record<string, true> {
  const ret: Record<string, true> = Object.assign({}, obj);
  for (const key in ret) {
    ret[key] = true;
  }
  return ret;
}

export type Unknown = undefined | null | Record<string | number, unknown>;

export class Scope {
  parent: Scope | null;
  const: { [key: string]: true } = {};
  let: { [key: string]: true } = {};
  var: { [key: string]: true } = {};
  internal: { [key: string]: true } = {};
  globals: { [key: string]: true };
  allVars: { [key: string]: unknown } & object;
  internalVars: { [key: string]: unknown } = {};
  functionThis?: Unknown;
  constructor(parent: Scope | null, vars = {}, functionThis?: Unknown) {
    const isFuncScope = functionThis !== undefined || parent === null;
    this.parent = parent;
    this.allVars = vars;
    this.let = isFuncScope ? this.let : keysOnly(vars);
    this.var = isFuncScope ? keysOnly(vars) : this.var;
    this.globals = parent === null ? keysOnly(vars) : {};
    this.functionThis = functionThis;
  }

  get(key: string, internal: boolean): Prop {
    const isThis = key === 'this';
    const scope = this.getWhereValScope(key, isThis, internal);
    if (scope && isThis) {
      return new Prop({ this: scope.functionThis }, key, false, false, true);
    }
    if (!scope) {
      return new Prop(undefined, key);
    }
    if (internal && scope.internalVars[key]) {
      return new Prop(scope.internalVars, key, false, false, true, true);
    }
    return new Prop(scope.allVars, key, key in scope.const, key in scope.globals, true);
  }

  set(key: string, val: unknown, internal: boolean) {
    if (key === 'this') throw new SyntaxError('"this" cannot be assigned');
    if (reservedWords.has(key)) throw new SyntaxError("Unexepected token '" + key + "'");
    const prop = this.get(key, internal);
    if (prop.context === undefined) {
      throw new ReferenceError(`Variable '${key}' was not declared.`);
    }
    if (prop.context === null) {
      throw new TypeError(`Cannot set properties of null, (setting '${key}')`);
    }
    if (prop.isConst) {
      throw new TypeError(`Assignment to constant variable`);
    }
    if (prop.isGlobal) {
      throw new SandboxError(`Cannot override global variable '${key}'`);
    }
    (prop.context as any)[prop.prop] = val;
    return prop;
  }

  getWhereValScope(key: string, isThis: boolean, internal: boolean): Scope | null {
    let scope: Scope = this;
    if (isThis) {
      do {
        if (scope.functionThis !== undefined) return scope;
        scope = scope.parent!;
      } while (scope !== null);
      return null;
    }
    do {
      if (
        internal &&
        key in scope.internalVars &&
        !(key in {} && !hasOwnProperty(scope.internalVars, key))
      ) {
        return scope;
      }
      if (key in scope.allVars && !(key in {} && !hasOwnProperty(scope.allVars, key))) {
        return scope;
      }
      scope = scope.parent!;
    } while (scope !== null);
    return null;
  }

  getWhereVarScope(key: string, localScope: boolean, internal: boolean): Scope {
    let scope: Scope = this;
    do {
      if (
        internal &&
        key in scope.internalVars &&
        !(key in {} && !hasOwnProperty(scope.internalVars, key))
      ) {
        return scope;
      }
      if (key in scope.allVars && !(key in {} && !hasOwnProperty(scope.allVars, key))) {
        return scope;
      }
      if (scope.parent === null || localScope || scope.functionThis !== undefined) {
        return scope;
      }
      scope = scope.parent!;
    } while (scope !== null);
    return scope;
  }

  declare(key: string, type: VarType, value: unknown, isGlobal: boolean, internal: boolean): Prop {
    if (key === 'this') throw new SyntaxError('"this" cannot be declared');
    if (reservedWords.has(key)) throw new SyntaxError("Unexepected token '" + key + "'");
    const existingScope = this.getWhereVarScope(key, type !== VarType.var, internal);
    if (type === VarType.var) {
      if (existingScope.var[key]) {
        existingScope.allVars[key] = value;
        if (!isGlobal) {
          delete existingScope.globals[key];
        } else {
          existingScope.globals[key] = true;
        }
        return new Prop(existingScope.allVars, key, false, existingScope.globals[key], true);
      } else if (key in existingScope.allVars) {
        throw new SyntaxError(`Identifier '${key}' has already been declared`);
      }
    }
    if (key in existingScope.allVars || key in existingScope.internalVars) {
      throw new SyntaxError(`Identifier '${key}' has already been declared`);
    }

    if (isGlobal) {
      existingScope.globals[key] = true;
    }
    existingScope[type][key] = true;
    if (type === VarType.internal) {
      existingScope.internalVars[key] = value;
    } else {
      existingScope.allVars[key] = value;
    }

    return new Prop(
      type === VarType.internal ? this.internalVars : this.allVars,
      key,
      type === VarType.const,
      isGlobal,
      true,
      type === VarType.internal,
    );
  }
}

export class FunctionScope implements IScope {}

export class LocalScope implements IScope {}

export const optional = {};

export class DelayedSynchronousResult {
  readonly result: unknown;
  constructor(cb: () => unknown) {
    this.result = cb();
  }
}

export function delaySynchronousResult(cb: () => Promise<unknown>) {
  return new DelayedSynchronousResult(cb);
}

export function sanitizeProp(
  value: unknown,
  context: IExecContext,
  cache = new WeakSet<object>(),
): unknown {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return value;

  value = getGlobalProp(value, context) || value;

  if (value instanceof Prop) {
    value = value.get(context);
  }

  if (value === optional) {
    return undefined;
  }

  return value;
}

export function sanitizeScope(scope: IScope, context: IExecContext, cache = new WeakSet<object>()) {
  if (cache.has(scope)) return;
  cache.add(scope);
  for (const key in scope) {
    const val = scope[key];
    if (val !== null && typeof val === 'object') {
      sanitizeScope(val, context, cache);
    }
    scope[key] = sanitizeProp(val, context);
  }
}

export function sanitizeScopes(
  scopes: IScope[],
  context: IExecContext,
  cache = new WeakSet<object>(),
) {
  for (const scope of scopes) {
    sanitizeScope(scope, context, cache);
  }
}
