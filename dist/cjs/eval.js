const require_utils = require("./utils.js");
const require_executor = require("./executor.js");
const require_parser = require("./parser.js");
//#region src/eval.ts
function createEvalContext() {
	return {
		sandboxFunction,
		sandboxAsyncFunction,
		sandboxGeneratorFunction,
		sandboxAsyncGeneratorFunction,
		sandboxedSymbol,
		sandboxedEval,
		sandboxedSetTimeout,
		sandboxedSetInterval,
		sandboxedClearTimeout,
		sandboxedClearInterval,
		lispifyFunction: require_parser.lispifyFunction
	};
}
function sandboxedSymbol(context) {
	return require_utils.getSandboxSymbolCtor(context.ctx.sandboxSymbols);
}
function SB() {}
function sandboxFunction(context) {
	SandboxFunction.prototype = SB.prototype;
	return SandboxFunction;
	function SandboxFunction(...params) {
		const parsed = require_parser.default(params.pop() || "", false, false, context.ctx.options.maxParserRecursionDepth);
		return require_executor.createFunction(params, parsed.tree, context.ctx.ticks, {
			...context,
			constants: parsed.constants,
			tree: parsed.tree
		}, void 0, "anonymous");
	}
}
function SAF() {}
function sandboxAsyncFunction(context) {
	SandboxAsyncFunction.prototype = SAF.prototype;
	return SandboxAsyncFunction;
	function SandboxAsyncFunction(...params) {
		const parsed = require_parser.default(params.pop() || "", false, false, context.ctx.options.maxParserRecursionDepth);
		return require_executor.createFunctionAsync(params, parsed.tree, context.ctx.ticks, {
			...context,
			constants: parsed.constants,
			tree: parsed.tree
		}, void 0, "anonymous");
	}
}
function SGF() {}
function sandboxGeneratorFunction(context) {
	SandboxGeneratorFunction.prototype = SGF.prototype;
	return SandboxGeneratorFunction;
	function SandboxGeneratorFunction(...params) {
		const parsed = require_parser.default(params.pop() || "", false, false, context.ctx.options.maxParserRecursionDepth);
		return require_executor.createGeneratorFunction(params, parsed.tree, context.ctx.ticks, {
			...context,
			constants: parsed.constants,
			tree: parsed.tree
		}, void 0, "anonymous");
	}
}
function SAGF() {}
function sandboxAsyncGeneratorFunction(context) {
	SandboxAsyncGeneratorFunction.prototype = SAGF.prototype;
	return SandboxAsyncGeneratorFunction;
	function SandboxAsyncGeneratorFunction(...params) {
		const parsed = require_parser.default(params.pop() || "", false, false, context.ctx.options.maxParserRecursionDepth);
		return require_executor.createAsyncGeneratorFunction(params, parsed.tree, context.ctx.ticks, {
			...context,
			constants: parsed.constants,
			tree: parsed.tree
		}, void 0, "anonymous");
	}
}
function SE() {}
function sandboxedEval(func, context) {
	sandboxEval.prototype = SE.prototype;
	return sandboxEval;
	function sandboxEval(code) {
		const parsed = require_parser.default(code, false, false, context.ctx.options.maxParserRecursionDepth);
		const tree = wrapLastStatementInReturn(parsed.tree);
		return require_executor.createFunction([], tree, context.ctx.ticks, {
			...context,
			constants: parsed.constants,
			tree
		}, void 0, "anonymous")();
	}
}
function wrapLastStatementInReturn(tree) {
	if (tree.length === 0) return tree;
	const newTree = [...tree];
	const lastIndex = newTree.length - 1;
	const lastStmt = newTree[lastIndex];
	if (Array.isArray(lastStmt) && lastStmt.length >= 1) {
		const op = lastStmt[0];
		if (op === require_utils.LispType.Return || op === require_utils.LispType.Throw) return newTree;
		if ([
			require_utils.LispType.Let,
			require_utils.LispType.Const,
			require_utils.LispType.Var,
			require_utils.LispType.Function,
			require_utils.LispType.If,
			require_utils.LispType.Loop,
			require_utils.LispType.Try,
			require_utils.LispType.Switch,
			require_utils.LispType.InternalBlock,
			require_utils.LispType.Expression
		].includes(op)) return newTree;
		newTree[lastIndex] = [
			require_utils.LispType.Return,
			require_utils.LispType.None,
			lastStmt
		];
	}
	return newTree;
}
function sST() {}
function sandboxedSetTimeout(func, context) {
	sandboxSetTimeout.prototype = sST.prototype;
	return sandboxSetTimeout;
	function sandboxSetTimeout(handler, timeout, ...args) {
		const sandbox = context.ctx.sandbox;
		const exec = (...a) => {
			const h = typeof handler === "string" ? func(handler) : handler;
			haltsub.unsubscribe();
			contsub.unsubscribe();
			sandbox.setTimeoutHandles.delete(sandBoxhandle);
			return h(...a);
		};
		const sandBoxhandle = ++sandbox.timeoutHandleCounter;
		let start = Date.now();
		let handle = setTimeout(exec, timeout, ...args);
		let elapsed = 0;
		const haltsub = sandbox.subscribeHalt(() => {
			elapsed = Date.now() - start + elapsed;
			clearTimeout(handle);
		});
		const contsub = sandbox.subscribeResume(() => {
			start = Date.now();
			const remaining = Math.floor((timeout || 0) - elapsed);
			handle = setTimeout(exec, remaining, ...args);
			sandbox.setTimeoutHandles.set(sandBoxhandle, {
				handle,
				haltsub,
				contsub
			});
		});
		sandbox.setTimeoutHandles.set(sandBoxhandle, {
			handle,
			haltsub,
			contsub
		});
		return sandBoxhandle;
	}
}
function sCT() {}
function sandboxedClearTimeout(context) {
	sandboxClearTimeout.prototype = sCT.prototype;
	return sandboxClearTimeout;
	function sandboxClearTimeout(handle) {
		const sandbox = context.ctx.sandbox;
		const timeoutHandle = sandbox.setTimeoutHandles.get(handle);
		if (timeoutHandle) {
			clearTimeout(timeoutHandle.handle);
			timeoutHandle.haltsub.unsubscribe();
			timeoutHandle.contsub.unsubscribe();
			sandbox.setTimeoutHandles.delete(handle);
		}
	}
}
function sCI() {}
function sandboxedClearInterval(context) {
	sandboxClearInterval.prototype = sCI.prototype;
	return sandboxClearInterval;
	function sandboxClearInterval(handle) {
		const sandbox = context.ctx.sandbox;
		const intervalHandle = sandbox.setIntervalHandles.get(handle);
		if (intervalHandle) {
			clearInterval(intervalHandle.handle);
			clearTimeout(intervalHandle.handle);
			intervalHandle.haltsub.unsubscribe();
			intervalHandle.contsub.unsubscribe();
			sandbox.setIntervalHandles.delete(handle);
		}
	}
}
function sSI() {}
function sandboxedSetInterval(func, context) {
	sandboxSetInterval.prototype = sSI.prototype;
	return sandboxSetInterval;
	function sandboxSetInterval(handler, timeout, ...args) {
		const sandbox = context.ctx.sandbox;
		const h = typeof handler === "string" ? func(handler) : handler;
		const exec = (...a) => {
			start = Date.now();
			elapsed = 0;
			return h(...a);
		};
		const sandBoxhandle = ++sandbox.timeoutHandleCounter;
		let start = Date.now();
		let handle = setInterval(exec, timeout, ...args);
		let elapsed = 0;
		const haltsub = sandbox.subscribeHalt(() => {
			elapsed = Date.now() - start + elapsed;
			clearInterval(handle);
			clearTimeout(handle);
		});
		const contsub = sandbox.subscribeResume(() => {
			start = Date.now();
			handle = setTimeout(() => {
				start = Date.now();
				elapsed = 0;
				handle = setInterval(exec, timeout, ...args);
				handlObj.handle = handle;
				exec(...args);
			}, Math.floor((timeout || 0) - elapsed), ...args);
			handlObj.handle = handle;
		});
		const handlObj = {
			handle,
			haltsub,
			contsub
		};
		sandbox.setIntervalHandles.set(sandBoxhandle, handlObj);
		return sandBoxhandle;
	}
}
//#endregion
exports.createEvalContext = createEvalContext;
