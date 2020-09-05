"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxGlobal = void 0;
const executor_js_1 = require("./executor.js");
const parser_js_1 = require("./parser.js");
class SandboxGlobal {
    constructor(globals) {
        if (globals === globalThis)
            return globalThis;
        for (let i in globals) {
            this[i] = globals[i];
        }
    }
}
exports.SandboxGlobal = SandboxGlobal;
class Sandbox {
    constructor(globals = Sandbox.SAFE_GLOBALS, prototypeWhitelist = Sandbox.SAFE_PROTOTYPES, prototypeReplacements = new Map(), options = { audit: false }) {
        const sandboxGlobal = new SandboxGlobal(globals);
        this.context = {
            sandbox: this,
            globals,
            prototypeWhitelist,
            prototypeReplacements,
            globalsWhitelist: new Set(Object.values(globals)),
            options,
            globalScope: new executor_js_1.Scope(null, globals, sandboxGlobal),
            sandboxGlobal,
            evals: new Map(),
            getSubscriptions: new Set(),
            setSubscriptions: new WeakMap(),
            changeSubscriptions: new WeakMap(),
            inLoopOrSwitch: ""
        };
        const func = executor_js_1.sandboxFunction(this.context);
        this.context.evals.set(Function, func);
        this.context.evals.set(eval, executor_js_1.sandboxedEval(func));
        this.context.evals.set(setTimeout, executor_js_1.sandboxedSetTimeout(func));
        this.context.evals.set(setInterval, executor_js_1.sandboxedSetInterval(func));
    }
    static get SAFE_GLOBALS() {
        return {
            Function,
            console: {
                debug: console.debug,
                error: console.error,
                info: console.info,
                log: console.log,
                table: console.table,
                warn: console.warn
            },
            isFinite,
            isNaN,
            parseFloat,
            parseInt,
            decodeURI,
            decodeURIComponent,
            encodeURI,
            encodeURIComponent,
            escape,
            unescape,
            Boolean,
            Number,
            String,
            Object,
            Array,
            Symbol,
            Error,
            EvalError,
            RangeError,
            ReferenceError,
            SyntaxError,
            TypeError,
            URIError,
            Int8Array,
            Uint8Array,
            Uint8ClampedArray,
            Int16Array,
            Uint16Array,
            Int32Array,
            Uint32Array,
            Float32Array,
            Float64Array,
            Map,
            Set,
            WeakMap,
            WeakSet,
            Promise,
            Intl,
            JSON,
            Math,
            Date,
        };
    }
    static get SAFE_PROTOTYPES() {
        let protos = [
            SandboxGlobal,
            Function,
            Boolean,
            Number,
            String,
            Date,
            Error,
            Array,
            Int8Array,
            Uint8Array,
            Uint8ClampedArray,
            Int16Array,
            Uint16Array,
            Int32Array,
            Uint32Array,
            Float32Array,
            Float64Array,
            Map,
            Set,
            WeakMap,
            WeakSet,
            Promise,
            Symbol,
            Date,
        ];
        let map = new Map();
        protos.forEach((proto) => {
            map.set(proto, new Set());
        });
        map.set(Object, new Set([
            'entries',
            'fromEntries',
            'getOwnPropertyNames',
            'is',
            'keys',
            'hasOwnProperty',
            'isPrototypeOf',
            'propertyIsEnumerable',
            'toLocaleString',
            'toString',
            'valueOf',
            'values'
        ]));
        return map;
    }
    subscribeGet(callback) {
        this.context.getSubscriptions.add(callback);
        return { unsubscribe: () => this.context.getSubscriptions.delete(callback) };
    }
    subscribeSet(obj, name, callback) {
        const names = this.context.setSubscriptions.get(obj) || new Map();
        this.context.setSubscriptions.set(obj, names);
        const callbacks = names.get(name) || new Set();
        names.set(name, callbacks);
        callbacks.add(callback);
        let changeCbs;
        if (obj && obj[name] && typeof obj[name] === "object") {
            changeCbs = this.context.changeSubscriptions.get(obj[name]) || new Set();
            changeCbs.add(callback);
            this.context.changeSubscriptions.set(obj[name], changeCbs);
        }
        return { unsubscribe: () => {
                callbacks.delete(callback);
                if (changeCbs)
                    changeCbs.delete(callback);
            } };
    }
    static audit(code, scopes = []) {
        return new Sandbox(globalThis, new Map(), new Map(), {
            audit: true,
        }).executeTree(parser_js_1.parse(code), scopes);
    }
    static parse(code) {
        return parser_js_1.parse(code);
    }
    executeTree(executionTree, scopes = []) {
        return executor_js_1.executeTree(this.context, executionTree, scopes);
    }
    executeTreeAsync(executionTree, scopes = []) {
        return executor_js_1.executeTreeAsync(this.context, executionTree, scopes);
    }
    compile(code) {
        const executionTree = parser_js_1.parse(code);
        return (...scopes) => {
            return this.executeTree(executionTree, scopes).result;
        };
    }
    ;
    compileAsync(code) {
        const executionTree = parser_js_1.parse(code);
        return async (...scopes) => {
            return (await this.executeTreeAsync(executionTree, scopes)).result;
        };
    }
    ;
}
exports.default = Sandbox;
