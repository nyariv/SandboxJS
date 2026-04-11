//#region src/executor/opsRegistry.ts
var ops = /* @__PURE__ */ new Map();
function addOps(type, cb) {
	ops.set(type, cb);
}
//#endregion
export { addOps, ops };

//# sourceMappingURL=opsRegistry.js.map