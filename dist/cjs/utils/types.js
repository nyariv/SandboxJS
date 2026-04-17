//#region src/utils/types.ts
var AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
var GeneratorFunction = Object.getPrototypeOf(function* () {}).constructor;
var AsyncGeneratorFunction = Object.getPrototypeOf(async function* () {}).constructor;
var NON_BLOCKING_THRESHOLD = 50000n;
var reservedWords = new Set([
	"await",
	"break",
	"case",
	"catch",
	"class",
	"const",
	"continue",
	"debugger",
	"default",
	"delete",
	"do",
	"else",
	"enum",
	"export",
	"extends",
	"false",
	"finally",
	"for",
	"function",
	"if",
	"implements",
	"import",
	"in",
	"instanceof",
	"let",
	"new",
	"null",
	"return",
	"super",
	"switch",
	"this",
	"throw",
	"true",
	"try",
	"typeof",
	"var",
	"void",
	"while",
	"with"
]);
var VarType = /* @__PURE__ */ function(VarType) {
	VarType["let"] = "let";
	VarType["const"] = "const";
	VarType["var"] = "var";
	VarType["internal"] = "internal";
	return VarType;
}({});
var LispType = /* @__PURE__ */ function(LispType) {
	LispType[LispType["None"] = 0] = "None";
	LispType[LispType["Prop"] = 1] = "Prop";
	LispType[LispType["StringIndex"] = 2] = "StringIndex";
	LispType[LispType["Let"] = 3] = "Let";
	LispType[LispType["Const"] = 4] = "Const";
	LispType[LispType["Call"] = 5] = "Call";
	LispType[LispType["KeyVal"] = 6] = "KeyVal";
	LispType[LispType["Number"] = 7] = "Number";
	LispType[LispType["Return"] = 8] = "Return";
	LispType[LispType["Assign"] = 9] = "Assign";
	LispType[LispType["InlineFunction"] = 10] = "InlineFunction";
	LispType[LispType["ArrowFunction"] = 11] = "ArrowFunction";
	LispType[LispType["CreateArray"] = 12] = "CreateArray";
	LispType[LispType["If"] = 13] = "If";
	LispType[LispType["IfCase"] = 14] = "IfCase";
	LispType[LispType["InlineIf"] = 15] = "InlineIf";
	LispType[LispType["InlineIfCase"] = 16] = "InlineIfCase";
	LispType[LispType["SpreadObject"] = 17] = "SpreadObject";
	LispType[LispType["SpreadArray"] = 18] = "SpreadArray";
	LispType[LispType["ArrayProp"] = 19] = "ArrayProp";
	LispType[LispType["PropOptional"] = 20] = "PropOptional";
	LispType[LispType["CallOptional"] = 21] = "CallOptional";
	LispType[LispType["CreateObject"] = 22] = "CreateObject";
	LispType[LispType["Group"] = 23] = "Group";
	LispType[LispType["Not"] = 24] = "Not";
	LispType[LispType["IncrementBefore"] = 25] = "IncrementBefore";
	LispType[LispType["IncrementAfter"] = 26] = "IncrementAfter";
	LispType[LispType["DecrementBefore"] = 27] = "DecrementBefore";
	LispType[LispType["DecrementAfter"] = 28] = "DecrementAfter";
	LispType[LispType["And"] = 29] = "And";
	LispType[LispType["Or"] = 30] = "Or";
	LispType[LispType["StrictNotEqual"] = 31] = "StrictNotEqual";
	LispType[LispType["StrictEqual"] = 32] = "StrictEqual";
	LispType[LispType["Plus"] = 33] = "Plus";
	LispType[LispType["Var"] = 34] = "Var";
	LispType[LispType["GlobalSymbol"] = 35] = "GlobalSymbol";
	LispType[LispType["Literal"] = 36] = "Literal";
	LispType[LispType["Function"] = 37] = "Function";
	LispType[LispType["Loop"] = 38] = "Loop";
	LispType[LispType["Try"] = 39] = "Try";
	LispType[LispType["Switch"] = 40] = "Switch";
	LispType[LispType["SwitchCase"] = 41] = "SwitchCase";
	LispType[LispType["InternalBlock"] = 42] = "InternalBlock";
	LispType[LispType["Expression"] = 43] = "Expression";
	LispType[LispType["Await"] = 44] = "Await";
	LispType[LispType["New"] = 45] = "New";
	LispType[LispType["Throw"] = 46] = "Throw";
	LispType[LispType["Minus"] = 47] = "Minus";
	LispType[LispType["Divide"] = 48] = "Divide";
	LispType[LispType["Power"] = 49] = "Power";
	LispType[LispType["Multiply"] = 50] = "Multiply";
	LispType[LispType["Modulus"] = 51] = "Modulus";
	LispType[LispType["Equal"] = 52] = "Equal";
	LispType[LispType["NotEqual"] = 53] = "NotEqual";
	LispType[LispType["SmallerEqualThan"] = 54] = "SmallerEqualThan";
	LispType[LispType["LargerEqualThan"] = 55] = "LargerEqualThan";
	LispType[LispType["SmallerThan"] = 56] = "SmallerThan";
	LispType[LispType["LargerThan"] = 57] = "LargerThan";
	LispType[LispType["Negative"] = 58] = "Negative";
	LispType[LispType["Positive"] = 59] = "Positive";
	LispType[LispType["Typeof"] = 60] = "Typeof";
	LispType[LispType["Delete"] = 61] = "Delete";
	LispType[LispType["Instanceof"] = 62] = "Instanceof";
	LispType[LispType["In"] = 63] = "In";
	LispType[LispType["Inverse"] = 64] = "Inverse";
	LispType[LispType["SubractEquals"] = 65] = "SubractEquals";
	LispType[LispType["AddEquals"] = 66] = "AddEquals";
	LispType[LispType["DivideEquals"] = 67] = "DivideEquals";
	LispType[LispType["PowerEquals"] = 68] = "PowerEquals";
	LispType[LispType["MultiplyEquals"] = 69] = "MultiplyEquals";
	LispType[LispType["ModulusEquals"] = 70] = "ModulusEquals";
	LispType[LispType["BitNegateEquals"] = 71] = "BitNegateEquals";
	LispType[LispType["BitAndEquals"] = 72] = "BitAndEquals";
	LispType[LispType["BitOrEquals"] = 73] = "BitOrEquals";
	LispType[LispType["UnsignedShiftRightEquals"] = 74] = "UnsignedShiftRightEquals";
	LispType[LispType["ShiftRightEquals"] = 75] = "ShiftRightEquals";
	LispType[LispType["ShiftLeftEquals"] = 76] = "ShiftLeftEquals";
	LispType[LispType["BitAnd"] = 77] = "BitAnd";
	LispType[LispType["BitOr"] = 78] = "BitOr";
	LispType[LispType["BitNegate"] = 79] = "BitNegate";
	LispType[LispType["BitShiftLeft"] = 80] = "BitShiftLeft";
	LispType[LispType["BitShiftRight"] = 81] = "BitShiftRight";
	LispType[LispType["BitUnsignedShiftRight"] = 82] = "BitUnsignedShiftRight";
	LispType[LispType["BigInt"] = 83] = "BigInt";
	LispType[LispType["LiteralIndex"] = 84] = "LiteralIndex";
	LispType[LispType["RegexIndex"] = 85] = "RegexIndex";
	LispType[LispType["LoopAction"] = 86] = "LoopAction";
	LispType[LispType["Void"] = 87] = "Void";
	LispType[LispType["True"] = 88] = "True";
	LispType[LispType["NullishCoalescing"] = 89] = "NullishCoalescing";
	LispType[LispType["AndEquals"] = 90] = "AndEquals";
	LispType[LispType["OrEquals"] = 91] = "OrEquals";
	LispType[LispType["NullishCoalescingEquals"] = 92] = "NullishCoalescingEquals";
	LispType[LispType["Block"] = 93] = "Block";
	LispType[LispType["Labeled"] = 94] = "Labeled";
	LispType[LispType["Internal"] = 95] = "Internal";
	LispType[LispType["Yield"] = 96] = "Yield";
	LispType[LispType["YieldDelegate"] = 97] = "YieldDelegate";
	LispType[LispType["Hole"] = 98] = "Hole";
	LispType[LispType["LispEnumSize"] = 99] = "LispEnumSize";
	return LispType;
}({});
//#endregion
exports.AsyncFunction = AsyncFunction;
exports.AsyncGeneratorFunction = AsyncGeneratorFunction;
exports.GeneratorFunction = GeneratorFunction;
exports.LispType = LispType;
exports.NON_BLOCKING_THRESHOLD = NON_BLOCKING_THRESHOLD;
exports.VarType = VarType;
exports.reservedWords = reservedWords;
