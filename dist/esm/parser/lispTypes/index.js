import { registerConditionalLispTypes } from "./conditionals.js";
import { registerControlLispTypes } from "./control.js";
import { registerDeclarationLispTypes } from "./declarations.js";
import { registerOperatorLispTypes } from "./operators.js";
import { registerStructureLispTypes } from "./structures.js";
import { registerValueLispTypes } from "./values.js";
//#region src/parser/lispTypes/index.ts
function registerLispTypes(deps) {
	registerStructureLispTypes(deps);
	registerOperatorLispTypes(deps);
	registerConditionalLispTypes(deps);
	registerValueLispTypes(deps);
	registerDeclarationLispTypes(deps);
	registerControlLispTypes(deps);
}
//#endregion
export { registerLispTypes };

//# sourceMappingURL=index.js.map