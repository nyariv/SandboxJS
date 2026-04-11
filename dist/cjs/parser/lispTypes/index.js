const require_conditionals = require("./conditionals.js");
const require_control = require("./control.js");
const require_declarations = require("./declarations.js");
const require_operators = require("./operators.js");
const require_structures = require("./structures.js");
const require_values = require("./values.js");
//#region src/parser/lispTypes/index.ts
function registerLispTypes(deps) {
	require_structures.registerStructureLispTypes(deps);
	require_operators.registerOperatorLispTypes(deps);
	require_conditionals.registerConditionalLispTypes(deps);
	require_values.registerValueLispTypes(deps);
	require_declarations.registerDeclarationLispTypes(deps);
	require_control.registerControlLispTypes(deps);
}
//#endregion
exports.registerLispTypes = registerLispTypes;
