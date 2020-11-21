import { Scope, sandboxFunction, sandboxedEval, sandboxedSetTimeout, sandboxedSetInterval, executeTree, executeTreeAsync } from "./executor.js";
import { parse } from "./parser.js";
export class SandboxGlobal {
    constructor(globals) {
        if (globals === globalThis)
            return globalThis;
        for (let i in globals) {
            this[i] = globals[i];
        }
    }
}
export default class Sandbox {
    constructor(options) {
        options = Object.assign({
            audit: false,
            forbidMethodCalls: false,
            globals: Sandbox.SAFE_GLOBALS,
            prototypeWhitelist: Sandbox.SAFE_PROTOTYPES,
            prototypeReplacements: new Map(),
            executionPause: Promise.resolve()
        }, options || {});
        const sandboxGlobal = new SandboxGlobal(options.globals);
        this.context = {
            sandbox: this,
            globalsWhitelist: new Set(Object.values(options.globals)),
            options,
            globalScope: new Scope(null, options.globals, sandboxGlobal),
            sandboxGlobal,
            evals: new Map(),
            getSubscriptions: new Set(),
            setSubscriptions: new WeakMap(),
            changeSubscriptions: new WeakMap()
        };
        const func = sandboxFunction(this.context);
        this.context.evals.set(Function, func);
        this.context.evals.set(eval, sandboxedEval(func));
        this.context.evals.set(setTimeout, sandboxedSetTimeout(func));
        this.context.evals.set(setInterval, sandboxedSetInterval(func));
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
            RegExp
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
            RegExp
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
        const globals = {};
        for (let i of Object.getOwnPropertyNames(globalThis)) {
            globals[i] = globalThis[i];
        }
        return new Sandbox({
            globals,
            audit: true,
        }).executeTree(parse(code), scopes);
    }
    static parse(code) {
        return parse(code);
    }
    executeTree(executionTree, scopes = [], maxExecutionTicks = BigInt(0)) {
        return executeTree({
            ticks: BigInt(0),
        }, {
            ctx: this.context,
            constants: executionTree.constants
        }, executionTree.tree, scopes);
    }
    executeTreeAsync(executionTree, scopes = [], maxExecutionTicks = BigInt(0)) {
        return executeTreeAsync({
            ticks: BigInt(0),
        }, {
            ctx: this.context,
            constants: executionTree.constants,
        }, executionTree.tree, scopes);
    }
    compile(code, optimize = false) {
        const executionTree = parse(code, optimize);
        return (...scopes) => {
            return this.executeTree(executionTree, scopes).result;
        };
    }
    ;
    compileAsync(code, optimize = false) {
        const executionTree = parse(code, optimize);
        return async (...scopes) => {
            return (await this.executeTreeAsync(executionTree, scopes)).result;
        };
    }
    ;
}
