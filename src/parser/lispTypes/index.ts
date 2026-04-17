import type { RegisterLispTypesDeps } from './shared';
import { registerConditionalLispTypes } from './conditionals';
import { registerControlLispTypes } from './control';
import { registerDeclarationLispTypes } from './declarations';
import { registerOperatorLispTypes } from './operators';
import { registerStructureLispTypes } from './structures';
import { registerValueLispTypes } from './values';

export function registerLispTypes(deps: RegisterLispTypesDeps) {
  registerStructureLispTypes(deps);
  registerOperatorLispTypes(deps);
  registerConditionalLispTypes(deps);
  registerValueLispTypes(deps);
  registerDeclarationLispTypes(deps);
  registerControlLispTypes(deps);
}

export type { RegisterLispTypesDeps } from './shared';
