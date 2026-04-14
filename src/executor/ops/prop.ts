import { addOps, hasPossibleProperties, isPropertyKey } from '../executorUtils';
import { LispType, Prop, SandboxAccessError, getGlobalProp, hasOwnProperty } from '../../utils';

addOps<unknown, PropertyKey>(LispType.Prop, ({ done, a, b, obj, context, scope, internal }) => {
  if (a === null) {
    throw new TypeError(`Cannot read properties of null (reading '${b?.toString()}')`);
  }

  if (!isPropertyKey(b)) {
    b = `${b}`;
  }

  if (a === undefined && obj === undefined && typeof b === 'string') {
    // is variable access
    const prop = scope.get(b, internal);
    if (prop.context === context.ctx.sandboxGlobal) {
      if (context.ctx.options.audit) {
        context.ctx.auditReport?.globalsAccess.add(b);
      }
    }
    const val = prop.context ? (prop.context as any)[prop.prop] : undefined;
    const p = getGlobalProp(val, context, prop) || prop;

    done(undefined, p);
    return;
  } else if (a === undefined) {
    throw new TypeError(`Cannot read properties of undefined (reading '${b.toString()}')`);
  }

  if (!hasPossibleProperties(a)) {
    done(undefined, new Prop(undefined, b));
    return;
  }

  const prototypeAccess = typeof a === 'function' || !hasOwnProperty(a, b);

  if (context.ctx.options.audit && prototypeAccess) {
    let prot: {} = Object.getPrototypeOf(a);
    do {
      if (hasOwnProperty(prot, b)) {
        if (
          context.ctx.auditReport &&
          !context.ctx.auditReport.prototypeAccess[prot.constructor.name]
        ) {
          context.ctx.auditReport.prototypeAccess[prot.constructor.name] = new Set();
        }
        context.ctx.auditReport?.prototypeAccess[prot.constructor.name].add(b);
      }
    } while ((prot = Object.getPrototypeOf(prot)));
  }

  if (prototypeAccess) {
    if (typeof a === 'function') {
      if (hasOwnProperty(a, b)) {
        const whitelist = context.ctx.prototypeWhitelist.get(a.prototype);
        if (
          !(whitelist && (!whitelist.size || whitelist.has(b))) &&
          !context.ctx.sandboxedFunctions.has(a)
        ) {
          throw new SandboxAccessError(
            `Static method or property access not permitted: ${a.name}.${b.toString()}`,
          );
        }
      }
    }

    let prot: {} = a;
    while ((prot = Object.getPrototypeOf(prot))) {
      if (hasOwnProperty(prot, b) || b === '__proto__') {
        const whitelist = context.ctx.prototypeWhitelist.get(prot);
        if (
          (whitelist && (!whitelist.size || whitelist.has(b))) ||
          context.ctx.sandboxedFunctions.has(prot.constructor)
        ) {
          break;
        }
        if (b === '__proto__') {
          throw new SandboxAccessError(`Access to prototype of global object is not permitted`);
        }
        throw new SandboxAccessError(
          `Method or property access not permitted: ${prot.constructor.name}.${b.toString()}`,
        );
      }
    }
  }

  const val = a[b as keyof typeof a] as unknown;
  if (typeof a === 'function') {
    if (b === 'prototype' && !context.ctx.sandboxedFunctions.has(a)) {
      throw new SandboxAccessError(`Access to prototype of global object is not permitted`);
    }
  }

  if (b === '__proto__' && !context.ctx.sandboxedFunctions.has(val?.constructor as any)) {
    throw new SandboxAccessError(`Access to prototype of global object is not permitted`);
  }

  const p = getGlobalProp(val, context, new Prop(a, b, false, false));
  if (p) {
    done(undefined, p);
    return;
  }

  const isSandboxGlobal = a === context.ctx.sandboxGlobal;
  const g =
    (!isSandboxGlobal && obj instanceof Prop && obj.isGlobal) ||
    (typeof a === 'function' && !context.ctx.sandboxedFunctions.has(a)) ||
    context.ctx.globalsWhitelist.has(a) ||
    (isSandboxGlobal && typeof b === 'string' && b in context.ctx.globalScope.globals);

  done(undefined, new Prop(a, b, false, g, false));
});

addOps<unknown, string>(LispType.StringIndex, ({ done, b, context }) =>
  done(undefined, context.constants.strings[parseInt(b)]),
);
