import {
  addOps,
  findControlFlowTarget,
  ExecReturn,
  normalizeStatementLabel,
} from '../executorUtils';
import type { ControlFlowAction } from '../executorUtils';
import type { LispItem, StatementLabel } from '../../parser';
import { LispType, Prop, VarType, SandboxCapabilityError } from '../../utils';

addOps<string, unknown, unknown, Prop>(
  LispType.Internal,
  ({ done, a, b, scope, bobj, internal }) => {
    if (!internal) {
      throw new SandboxCapabilityError('Internal variables are not accessible');
    }
    done(undefined, scope.declare(a, VarType.internal, b, bobj?.isGlobal || false, internal));
  },
);

addOps<LispItem, StatementLabel>(
  LispType.LoopAction,
  ({ done, a, b, context, statementLabels }) => {
    const label = normalizeStatementLabel(b);
    const target = findControlFlowTarget(statementLabels, a as ControlFlowAction, label);
    if (target === null) {
      throw new TypeError('Illegal continue statement');
    }
    if (!target) {
      throw new TypeError(label ? `Undefined label '${label}'` : 'Illegal ' + a + ' statement');
    }
    done(
      undefined,
      new ExecReturn(context.ctx.auditReport, undefined, false, {
        type: a as ControlFlowAction,
        label,
      }),
    );
  },
);

addOps(LispType.Throw, ({ done, b }) => {
  done(b);
});

addOps(LispType.None, ({ done }) => done());
