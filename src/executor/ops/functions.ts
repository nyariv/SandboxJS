import {
  addOps,
  createAsyncGeneratorFunction,
  createFunction,
  createFunctionAsync,
  createGeneratorFunction,
} from '../executorUtils';
import type { Lisp } from '../../parser';
import { LispType, SandboxCapabilityError, CodeString, Scope, VarType } from '../../utils';

addOps<string[], Lisp[], Lisp>(
  LispType.ArrowFunction,
  ({ done, ticks, a, b, obj, context, scope, internal }) => {
    if (typeof obj[2] === 'string' || obj[2] instanceof CodeString) {
      if (context.allowJit && context.evalContext) {
        obj[2] = b = context.evalContext.lispifyFunction(new CodeString(obj[2]), context.constants);
      } else {
        throw new SandboxCapabilityError('Unevaluated code detected, JIT not allowed');
      }
    }
    const argNames = a.slice(1);
    if (a[0]) {
      done(undefined, createFunctionAsync(argNames, b, ticks, context, scope, undefined, internal));
    } else {
      done(undefined, createFunction(argNames, b, ticks, context, scope, undefined, internal));
    }
  },
);

addOps<(string | LispType)[], Lisp[], Lisp>(
  LispType.Function,
  ({ done, ticks, a, b, obj, context, scope, internal }) => {
    if (typeof obj[2] === 'string' || obj[2] instanceof CodeString) {
      if (context.allowJit && context.evalContext) {
        obj[2] = b = context.evalContext.lispifyFunction(
          new CodeString(obj[2]),
          context.constants,
          false,
          {
            generatorDepth: a[1] === LispType.True ? 1 : 0,
            asyncDepth: a[0] === LispType.True ? 1 : 0,
            lispDepth: 0,
          },
        );
      } else {
        throw new SandboxCapabilityError('Unevaluated code detected, JIT not allowed');
      }
    }
    const isAsync = a[0];
    const isGenerator = a[1];
    const name = a[2] as string;
    const argNames = a.slice(3) as string[];
    let func;
    if (isAsync === LispType.True && isGenerator === LispType.True) {
      func = createAsyncGeneratorFunction(argNames, b, ticks, context, scope, name, internal);
    } else if (isGenerator === LispType.True) {
      func = createGeneratorFunction(argNames, b, ticks, context, scope, name, internal);
    } else if (isAsync === LispType.True) {
      func = createFunctionAsync(argNames, b, ticks, context, scope, name, internal);
    } else {
      func = createFunction(argNames, b, ticks, context, scope, name, internal);
    }
    if (name) {
      scope.declare(name, VarType.var, func, false, internal);
    }
    done(undefined, func);
  },
);

addOps<(string | LispType)[], Lisp[], Lisp>(
  LispType.InlineFunction,
  ({ done, ticks, a, b, obj, context, scope, internal }) => {
    if (typeof obj[2] === 'string' || obj[2] instanceof CodeString) {
      if (context.allowJit && context.evalContext) {
        obj[2] = b = context.evalContext.lispifyFunction(
          new CodeString(obj[2]),
          context.constants,
          false,
          {
            generatorDepth: a[1] === LispType.True ? 1 : 0,
            asyncDepth: a[0] === LispType.True ? 1 : 0,
            lispDepth: 0,
          },
        );
      } else {
        throw new SandboxCapabilityError('Unevaluated code detected, JIT not allowed');
      }
    }
    const isAsync = a[0];
    const isGenerator = a[1];
    const name = a[2] as string;
    const argNames = a.slice(3) as string[];
    if (name) {
      scope = new Scope(scope, {});
    }
    let func;
    if (isAsync === LispType.True && isGenerator === LispType.True) {
      func = createAsyncGeneratorFunction(argNames, b, ticks, context, scope, name, internal);
    } else if (isGenerator === LispType.True) {
      func = createGeneratorFunction(argNames, b, ticks, context, scope, name, internal);
    } else if (isAsync === LispType.True) {
      func = createFunctionAsync(argNames, b, ticks, context, scope, name, internal);
    } else {
      func = createFunction(argNames, b, ticks, context, scope, name, internal);
    }
    if (name) {
      scope.declare(name, VarType.let, func, false, internal);
    }
    done(undefined, func);
  },
);
