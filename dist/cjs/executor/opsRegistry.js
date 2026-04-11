//#region src/executor/opsRegistry.ts
var ops = /* @__PURE__ */ new Map();
function addOps(type, cb) {
	ops.set(type, cb);
}
//#endregion
exports.addOps = addOps;
exports.ops = ops;
