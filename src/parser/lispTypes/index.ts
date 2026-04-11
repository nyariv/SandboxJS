import type { RegisterLispTypesDeps } from './shared.js';
import { registerConditionalLispTypes } from './conditionals.js';
import { registerControlLispTypes } from './control.js';
import { registerDeclarationLispTypes } from './declarations.js';
import { registerOperatorLispTypes } from './operators.js';
import { registerStructureLispTypes } from './structures.js';
import { registerValueLispTypes } from './values.js';

export function registerLispTypes(deps: RegisterLispTypesDeps) {
  registerStructureLispTypes(deps);
  registerOperatorLispTypes(deps);
  registerConditionalLispTypes(deps);
  registerValueLispTypes(deps);
  registerDeclarationLispTypes(deps);
  registerControlLispTypes(deps);
}

export type { RegisterLispTypesDeps } from './shared.js';
