import { executeTree, executeTreeAsync } from './executor.js';
import { createContext, SandboxGlobal } from './utils.js';

function subscribeSet(obj, name, callback, context) {
    if (!(obj instanceof Object))
        throw new Error('Invalid subscription object, got ' + (typeof obj === 'object' ? 'null' : typeof obj));
    const names = context.setSubscriptions.get(obj) || new Map();
    context.setSubscriptions.set(obj, names);
    const callbacks = names.get(name) || new Set();
    names.set(name, callbacks);
    callbacks.add(callback);
    let changeCbs;
    const val = obj[name];
    if (val instanceof Object) {
        changeCbs = context.changeSubscriptions.get(val) || new Set();
        changeCbs.add(callback);
        context.changeSubscriptions.set(val, changeCbs);
    }
    return {
        unsubscribe: () => {
            callbacks.delete(callback);
            changeCbs?.delete(callback);
        },
    };
}
class SandboxExec {
    constructor(options, evalContext) {
        this.evalContext = evalContext;
        this.setSubscriptions = new WeakMap();
        this.changeSubscriptions = new WeakMap();
        this.sandboxFunctions = new WeakMap();
        const opt = Object.assign({
            audit: false,
            forbidFunctionCalls: false,
            forbidFunctionCreation: false,
            globals: SandboxExec.SAFE_GLOBALS,
            prototypeWhitelist: SandboxExec.SAFE_PROTOTYPES,
            prototypeReplacements: new Map(),
        }, options || {});
        this.context = createContext(this, opt);
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
                warn: console.warn,
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
            BigInt,
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
            RegExp,
        };
    }
    static get SAFE_PROTOTYPES() {
        const protos = [
            SandboxGlobal,
            Function,
            Boolean,
            Number,
            BigInt,
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
            RegExp,
        ];
        const map = new Map();
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
            'values',
        ]));
        return map;
    }
    subscribeGet(callback, context) {
        context.getSubscriptions.add(callback);
        return { unsubscribe: () => context.getSubscriptions.delete(callback) };
    }
    subscribeSet(obj, name, callback, context) {
        return subscribeSet(obj, name, callback, context);
    }
    subscribeSetGlobal(obj, name, callback) {
        return subscribeSet(obj, name, callback, this);
    }
    getContext(fn) {
        return this.sandboxFunctions.get(fn);
    }
    executeTree(context, scopes = []) {
        return executeTree({
            ticks: BigInt(0),
        }, context, context.tree, scopes);
    }
    executeTreeAsync(context, scopes = []) {
        return executeTreeAsync({
            ticks: BigInt(0),
        }, context, context.tree, scopes);
    }
}

export { SandboxExec as default };
//# sourceMappingURL=SandboxExec.js.map
