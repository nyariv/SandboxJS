import { reservedWords, VarType } from './types.js';
import { Prop, hasOwnProperty } from './Prop.js';
import { SandboxError } from './errors.js';
import type { IScope } from './types.js';

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
    if (isThis) {
      if (this.functionThis !== undefined) {
        return this;
      } else {
        return this.parent?.getWhereValScope(key, isThis, internal) || null;
      }
    }
    if (
      internal &&
      key in this.internalVars &&
      !(key in {} && !hasOwnProperty(this.internalVars, key))
    ) {
      return this;
    }
    if (key in this.allVars && !(key in {} && !hasOwnProperty(this.allVars, key))) {
      return this;
    }
    return this.parent?.getWhereValScope(key, isThis, internal) || null;
  }

  getWhereVarScope(key: string, localScope: boolean, internal: boolean): Scope {
    if (key in this.internalVars && !(key in {} && !hasOwnProperty(this.internalVars, key))) {
      return this;
    }
    if (key in this.allVars && !(key in {} && !hasOwnProperty(this.allVars, key))) {
      return this;
    }
    if (this.parent === null || localScope || this.functionThis !== undefined) {
      return this;
    }
    return this.parent.getWhereVarScope(key, localScope, internal);
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
