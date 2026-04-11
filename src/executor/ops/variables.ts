import { addOps } from '../executorUtils';
import { LispType, Prop, VarType } from '../../utils';

addOps(LispType.Return, ({ done, b }) => done(undefined, b));

addOps<string, unknown, unknown, Prop>(LispType.Var, ({ done, a, b, scope, bobj, internal }) => {
  done(undefined, scope.declare(a, VarType.var, b, bobj?.isGlobal || false, internal));
});

addOps<string, unknown, unknown, Prop>(LispType.Let, ({ done, a, b, scope, bobj, internal }) => {
  done(undefined, scope.declare(a, VarType.let, b, bobj?.isGlobal || false, internal));
});

addOps<string, unknown, unknown, Prop>(LispType.Const, ({ done, a, b, scope, bobj, internal }) => {
  done(undefined, scope.declare(a, VarType.const, b, bobj?.isGlobal || false, internal));
});
