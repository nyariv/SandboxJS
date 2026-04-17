// @ts-nocheck
import Sandbox, { LocalScope, SandboxExecutionQuotaExceededError } from '../../dist/esm/Sandbox.js';
import { EditorState } from 'https://esm.sh/@codemirror/state@6';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from 'https://esm.sh/@codemirror/view@6';
import { defaultKeymap, history, historyKeymap, indentWithTab } from 'https://esm.sh/@codemirror/commands@6';
import { javascript } from 'https://esm.sh/@codemirror/lang-javascript@6';
import { oneDark } from 'https://esm.sh/@codemirror/theme-one-dark@6';
import { bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from 'https://esm.sh/@codemirror/language@6';
import { closeBrackets, closeBracketsKeymap } from 'https://esm.sh/@codemirror/autocomplete@6';
window['Sandbox'] = Sandbox;

const testsPromise = fetch('test/eval/tests.json').then((res) => res.json());
const SANDBOX_HASH_KEY = 'sandbox';
const SANDBOX_SETTINGS_HASH_KEY = 'settings';

const runtimeTypeEl = document.getElementById('runtime-type');
const jitParsingEl = document.getElementById('jit-parsing');
const runBtnEl = document.getElementById('run-btn');
const openSandboxModalBtnEl = document.getElementById('open-sandbox-modal-btn');
const sandboxModalEl = document.getElementById('sandbox-modal');
const sandboxEditorEl = document.getElementById('sandbox-editor');
const sandboxConsoleOutputEl = document.getElementById('sandbox-console-output');
const sandboxReturnOutputEl = document.getElementById('sandbox-return-output');
const sandboxStatusEl = document.getElementById('sandbox-status');
const sandboxBypassNoticeEl = document.getElementById('sandbox-bypass-notice');
const sandboxBypassIconEl = document.getElementById('sandbox-bypass-icon');
const sandboxBypassTextEl = document.getElementById('sandbox-bypass-text');
const sandboxTicksOutputEl = document.getElementById('sandbox-ticks-output');
const sandboxExecBtnEl = document.getElementById('sandbox-exec-btn');
const sandboxCloseBtnEl = document.getElementById('sandbox-close-btn');
const sandboxClearBtnEl = document.getElementById('sandbox-clear-btn');
const sandboxSettingsBtnEl = document.getElementById('sandbox-settings-btn');
const sandboxSettingsPanelEl = document.getElementById('sandbox-settings-panel');
const sandboxSettingsBadgeEl = document.getElementById('sandbox-settings-badge');
const sandboxSettingsResetBtnEl = document.getElementById('sandbox-settings-reset-btn');
const settingForbidCallsEl = document.getElementById('setting-forbid-calls');
const settingForbidCreationEl = document.getElementById('setting-forbid-creation');
const settingHaltOnErrorEl = document.getElementById('setting-halt-on-error');
const settingQuotaEl = document.getElementById('setting-quota');
const settingScopeEl = document.getElementById('setting-scope');
const settingAsyncEl = document.getElementById('setting-async');

// ── CodeMirror editor ────────────────────────────────────────
const editorView = new EditorView({
  state: EditorState.create({
    doc: '',
    extensions: [
      history(),
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      drawSelection(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([{ key: 'Mod-Enter', run: () => { runSandboxCode(); return true; } }, ...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
      javascript(),
      oneDark,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          setSandboxHashCode(editorView.state.doc.toString());
          setBypassNotice(false);
          setSandboxStatus('Idle');
        }
      }),
      EditorView.theme({
        '&': { borderRadius: '12px', overflow: 'hidden' },
        '.cm-scroller': { minHeight: '240px', fontFamily: "'Fira Code', 'Cascadia Code', monospace", fontSize: '0.84rem', lineHeight: '1.6' },
        '.cm-focused': { outline: 'none' },
      }),
    ],
  }),
  parent: sandboxEditorEl,
});

const getEditorValue = () => editorView.state.doc.toString();
const setEditorValue = (value) => {
  editorView.dispatch({
    changes: { from: 0, to: editorView.state.doc.length, insert: value },
  });
};
// ─────────────────────────────────────────────────────────────

// ── Settings ─────────────────────────────────────────────────
const getSandboxSettings = () => {
  const quotaRaw = settingQuotaEl.value.trim();
  let executionQuota;
  if (quotaRaw) {
    const n = Number(quotaRaw);
    executionQuota = Number.isInteger(n) && n >= 0 ? BigInt(n) : undefined;
  }
  return {
    forbidFunctionCalls: settingForbidCallsEl.checked,
    forbidFunctionCreation: settingForbidCreationEl.checked,
    haltOnSandboxError: settingHaltOnErrorEl.checked,
    async: settingAsyncEl.checked,
    executionQuota,
    scopeJson: settingScopeEl.value.trim(),
  };
};

const validateSettings = () => {
  const errors = [];
  const quotaRaw = settingQuotaEl.value.trim();
  if (quotaRaw) {
    const n = Number(quotaRaw);
    if (!Number.isInteger(n) || n < 0) {
      errors.push('Execution quota must be a non-negative integer.');
    }
    setFieldError(settingQuotaEl, !Number.isInteger(n) || n < 0);
  } else {
    setFieldError(settingQuotaEl, false);
  }
  const scopeRaw = settingScopeEl.value.trim();
  if (scopeRaw) {
    let parsed;
    try { parsed = JSON.parse(scopeRaw); } catch { parsed = null; }
    const bad = parsed === null || typeof parsed !== 'object' || Array.isArray(parsed);
    if (bad) errors.push('Scope must be a valid JSON object (e.g. {"x": 1}).');
    setFieldError(settingScopeEl, bad);
  } else {
    setFieldError(settingScopeEl, false);
  }
  return errors;
};

const setFieldError = (el, hasError) => {
  el.classList.toggle('settings-field-error', hasError);
};

const countNonDefaultSettings = () => {
  let n = 0;
  if (settingForbidCallsEl.checked) n++;
  if (settingForbidCreationEl.checked) n++;
  if (settingHaltOnErrorEl.checked) n++;
  if (settingAsyncEl.checked) n++;
  if (settingQuotaEl.value.trim()) n++;
  if (settingScopeEl.value.trim()) n++;
  return n;
};

const updateSettingsBadge = () => {
  const n = countNonDefaultSettings();
  if (n > 0) {
    sandboxSettingsBadgeEl.textContent = n;
    sandboxSettingsBadgeEl.classList.remove('hidden');
  } else {
    sandboxSettingsBadgeEl.classList.add('hidden');
  }
};

const resetSettings = () => {
  settingForbidCallsEl.checked = false;
  settingForbidCreationEl.checked = false;
  settingHaltOnErrorEl.checked = false;
  settingAsyncEl.checked = false;
  settingQuotaEl.value = '';
  settingScopeEl.value = '';
  setFieldError(settingQuotaEl, false);
  setFieldError(settingScopeEl, false);
  updateSettingsHashAndBadge();
};

const applySettingsFromObject = (settings) => {
  settingForbidCallsEl.checked = Boolean(settings.forbidFunctionCalls);
  settingForbidCreationEl.checked = Boolean(settings.forbidFunctionCreation);
  settingHaltOnErrorEl.checked = Boolean(settings.haltOnSandboxError);
  settingAsyncEl.checked = Boolean(settings.async);
  settingQuotaEl.value = settings.executionQuota != null ? String(settings.executionQuota) : '';
  settingScopeEl.value = settings.scopeJson || '';
  setFieldError(settingQuotaEl, false);
  setFieldError(settingScopeEl, false);
  updateSettingsBadge();
};

const parseScopeJson = (json) => {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
};

const updateSettingsHashAndBadge = () => {
  updateSettingsBadge();
  const code = getEditorValue();
  setSandboxHashCode(code);
};

[settingForbidCallsEl, settingForbidCreationEl, settingHaltOnErrorEl, settingAsyncEl].forEach(el => {
  el.addEventListener('change', updateSettingsHashAndBadge);
});
settingQuotaEl.addEventListener('input', () => { updateSettingsHashAndBadge(); validateSettings(); });
settingScopeEl.addEventListener('input', () => { updateSettingsHashAndBadge(); validateSettings(); });
settingScopeEl.addEventListener('keydown', (e) => {
  const el = settingScopeEl;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const val = el.value;

  const pairs = { '{': '}', '[': ']', '"': '"' };
  const closers = new Set(['}', ']', '"']);

  if (e.key in pairs) {
    const close = pairs[e.key];
    // For quotes: skip if next char is already a closing quote
    if (e.key === '"' && val[start] === '"') {
      e.preventDefault();
      el.setSelectionRange(start + 1, start + 1);
      return;
    }
    e.preventDefault();
    const selected = val.slice(start, end);
    const insert = e.key + selected + close;
    el.value = val.slice(0, start) + insert + val.slice(end);
    el.setSelectionRange(start + 1, start + 1);
    updateSettingsHashAndBadge();
    validateSettings();
    return;
  }

  if (e.key === 'Backspace' && start === end) {
    const before = val[start - 1];
    const after = val[start];
    if (before in pairs && pairs[before] === after) {
      e.preventDefault();
      el.value = val.slice(0, start - 1) + val.slice(start + 1);
      el.setSelectionRange(start - 1, start - 1);
      updateSettingsHashAndBadge();
      validateSettings();
      return;
    }
  }

  // Skip over a closing char if already present
  if (closers.has(e.key) && val[start] === e.key) {
    e.preventDefault();
    el.setSelectionRange(start + 1, start + 1);
    return;
  }

  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) return;
  if (e.key === 'Enter') {
    e.preventDefault();
    // Smart indent: match current line's indentation, add extra level inside { or [
    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
    const currentLine = val.slice(lineStart, start);
    const indent = currentLine.match(/^(\s*)/)[1];
    const charBefore = val[start - 1];
    const charAfter = val[end];
    let insert, cursorOffset;
    if ((charBefore === '{' && charAfter === '}') || (charBefore === '[' && charAfter === ']')) {
      const newIndent = indent + '  ';
      insert = '\n' + newIndent + '\n' + indent;
      cursorOffset = 1 + newIndent.length;
    } else {
      insert = '\n' + indent;
      cursorOffset = insert.length;
    }
    el.value = val.slice(0, start) + insert + val.slice(end);
    el.setSelectionRange(start + cursorOffset, start + cursorOffset);
    updateSettingsHashAndBadge();
    validateSettings();
  }
});

sandboxSettingsBtnEl.addEventListener('click', () => {
  const isOpen = !sandboxSettingsPanelEl.classList.contains('hidden');
  sandboxSettingsPanelEl.classList.toggle('hidden', isOpen);
  sandboxSettingsBtnEl.classList.toggle('active', !isOpen);
});

sandboxSettingsResetBtnEl.addEventListener('click', resetSettings);
// ─────────────────────────────────────────────────────────────

const clonePrototypeWhitelist = () => {
  const prototypeWhitelist = new Map();
  for (const [key, value] of Sandbox.SAFE_PROTOTYPES.entries()) {
    prototypeWhitelist.set(key, new Set(value));
  }
  return prototypeWhitelist;
};

const freeze = Object.freeze;
const Function = globalThis.Function;

const createSandboxInstance = (extraGlobals = {}, sandboxOptions = {}) => {
  const prototypeWhitelist = clonePrototypeWhitelist();
  const globals = { ...Sandbox.SAFE_GLOBALS, setTimeout, ...extraGlobals };
  const functionReplacements = new Map();
  functionReplacements.set([].filter, () => [].filter)
  const sandbox = new Sandbox({ prototypeWhitelist, globals, functionReplacements, ...sandboxOptions });
  return { sandbox };
};

const encodeBase64Url = (value) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + padding);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const getHashParams = () => new URLSearchParams(window.location.hash.replace(/^#/, ''));

const getSandboxHashCode = () => {
  const encoded = getHashParams().get(SANDBOX_HASH_KEY);
  if (!encoded) return '';
  try {
    return decodeBase64Url(encoded);
  } catch {
    return '';
  }
};

const serializeSettings = (settings) => {
  const obj = {};
  if (settings.forbidFunctionCalls) obj.forbidFunctionCalls = true;
  if (settings.forbidFunctionCreation) obj.forbidFunctionCreation = true;
  if (settings.haltOnSandboxError) obj.haltOnSandboxError = true;
  if (settings.async) obj.async = true;
  if (settings.executionQuota != null) obj.executionQuota = String(settings.executionQuota);
  if (settings.scopeJson) obj.scopeJson = settings.scopeJson;
  return Object.keys(obj).length ? JSON.stringify(obj) : null;
};

const deserializeSettings = (str) => {
  try {
    const obj = JSON.parse(str);
    return {
      forbidFunctionCalls: Boolean(obj.forbidFunctionCalls),
      forbidFunctionCreation: Boolean(obj.forbidFunctionCreation),
      haltOnSandboxError: Boolean(obj.haltOnSandboxError),
      async: Boolean(obj.async),
      executionQuota: obj.executionQuota != null ? BigInt(obj.executionQuota) : undefined,
      scopeJson: obj.scopeJson || '',
    };
  } catch { return null; }
};

const getSandboxHashSettings = () => {
  const encoded = getHashParams().get(SANDBOX_SETTINGS_HASH_KEY);
  if (!encoded) return null;
  try { return deserializeSettings(decodeBase64Url(encoded)); } catch { return null; }
};

const setSandboxHashCode = (value) => {
  const params = getHashParams();
  if (value) params.set(SANDBOX_HASH_KEY, encodeBase64Url(value));
  else params.delete(SANDBOX_HASH_KEY);
  const settingsStr = serializeSettings(getSandboxSettings());
  if (settingsStr) params.set(SANDBOX_SETTINGS_HASH_KEY, encodeBase64Url(settingsStr));
  else params.delete(SANDBOX_SETTINGS_HASH_KEY);
  const nextHash = params.toString();
  const nextUrl = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ''}`;
  window.history.replaceState(null, '', nextUrl);
};

const buildSandboxHashHref = (value, settings = null) => {
  const params = new URLSearchParams();
  if (value) params.set(SANDBOX_HASH_KEY, encodeBase64Url(value));
  if (settings) {
    const str = serializeSettings(settings);
    if (str) params.set(SANDBOX_SETTINGS_HASH_KEY, encodeBase64Url(str));
  }
  return `${window.location.pathname}${window.location.search}#${params.toString()}`;
};

const getRunnableCode = (code) => {
  const needsReturn = !code.includes(';') && !code.startsWith('throw');
  return `${needsReturn ? 'return ' : ''}${code}`;
};

const resetSandboxOutput = () => {
  sandboxConsoleOutputEl.textContent = 'No logs yet.';
  sandboxReturnOutputEl.textContent = 'Run code to inspect the result.';
  sandboxTicksOutputEl.textContent = '—';
};

const setBypassNotice = (isBypassed) => {
  sandboxBypassNoticeEl.classList.remove('sandbox-notice-safe', 'sandbox-notice-critical');
  if (isBypassed) {
    sandboxBypassNoticeEl.classList.add('sandbox-notice-critical');
    sandboxBypassIconEl.textContent = '!';
    sandboxBypassTextEl.textContent = '`globalThis.bypassed` is truthy. Critical notice: the sandbox protections were bypassed.';
    return;
  }

  sandboxBypassNoticeEl.classList.add('sandbox-notice-safe');
  sandboxBypassIconEl.textContent = '✓';
  sandboxBypassTextEl.textContent = '`globalThis.bypassed` is falsy.';
};

const setSandboxStatus = (text, type = '') => {
  sandboxStatusEl.textContent = text;
  sandboxStatusEl.classList.remove('status-running', 'status-success', 'status-error', 'status-halted');
  if (type) sandboxStatusEl.classList.add(`status-${type}`);
};

const openSandboxModal = () => {
  sandboxModalEl.classList.remove('hidden');
  sandboxModalEl.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  editorView.focus();
};

const openSandboxModalWithCode = (code, settings = null) => {
  setEditorValue(code);
  resetSandboxOutput();
  setBypassNotice(false);
  setSandboxStatus('Idle');
  if (settings) applySettingsFromObject(settings);
  setSandboxHashCode(code);
  openSandboxModal();
};

const closeSandboxModal = () => {
  sandboxModalEl.classList.add('hidden');
  sandboxModalEl.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  const params = getHashParams();
  params.delete(SANDBOX_HASH_KEY);
  params.delete(SANDBOX_SETTINGS_HASH_KEY);
  const nextHash = params.toString();
  const nextUrl = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ''}`;
  window.history.replaceState(null, '', nextUrl);
};

const formatValue = (value) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'undefined') return 'undefined';
  if (typeof value === 'function') return value.toString();
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'bigint') return `${value}n`;
  if (value instanceof Error) return `${value.name}: ${value.message}`;

  const seen = new WeakSet();
  try {
    return JSON.stringify(value, (_key, item) => {
      if (typeof item === 'bigint') return `${item}n`;
      if (typeof item === 'function') return item.toString();
      if (typeof item === 'symbol') return item.toString();
      if (!item || typeof item !== 'object') return item;
      if (seen.has(item)) return '[Circular]';
      seen.add(item);
      return item;
    }, 2);
  } catch {
    return String(value);
  }
};

const createUserRunner = (sandbox, code, isAsync, optimize) => {
  return isAsync ? sandbox.compileAsync(code, optimize) : sandbox.compile(code, optimize);
};

const createSandboxRunnerScope = (extraScope = {}) => {
  const scope = {
    type: 'Sandbox',
    test: [(a, b) => 1],
    test2: 1,
    a: { b: { c: 2 } },
    ...extraScope,
  };
  Object.setPrototypeOf(scope, LocalScope.prototype);
  return scope;
};

const runSandboxCode = async () => {
  const code = getEditorValue();
  if (!code.trim()) {
    resetSandboxOutput();
    setSandboxStatus('Idle');
    return;
  }

  const settingsErrors = validateSettings();
  if (settingsErrors.length) {
    setSandboxStatus('Invalid settings', 'error');
    sandboxConsoleOutputEl.textContent = settingsErrors.join('\n');
    sandboxReturnOutputEl.textContent = '—';
    sandboxSettingsPanelEl.classList.remove('hidden');
    sandboxSettingsBtnEl.classList.add('active');
    return;
  }

  setSandboxHashCode(code);
  setSandboxStatus('Running', 'running');
  sandboxConsoleOutputEl.textContent = 'Running...';
  sandboxReturnOutputEl.textContent = 'Running...';
  setBypassNotice(false);
  globalThis.bypassed = false;

  const logs = [];
  const pushLog = (level, args) => {
    const prefix = level === 'log' ? '' : `[${level}] `;
    logs.push(prefix + args.map((arg) => formatValue(arg)).join(' '));
  };

  const sandboxConsole = {
    log: (...args) => pushLog('log', args),
    info: (...args) => pushLog('info', args),
    warn: (...args) => pushLog('warn', args),
    error: (...args) => pushLog('error', args),
    debug: (...args) => pushLog('debug', args),
  };

  const settings = getSandboxSettings();
  const sandboxOptions = {};
  if (settings.forbidFunctionCalls) sandboxOptions.forbidFunctionCalls = true;
  if (settings.forbidFunctionCreation) sandboxOptions.forbidFunctionCreation = true;
  if (settings.haltOnSandboxError) sandboxOptions.haltOnSandboxError = true;
  if (settings.executionQuota != null) sandboxOptions.executionQuota = settings.executionQuota;

  const { sandbox } = createSandboxInstance({}, sandboxOptions);
  window.sandbox = sandbox;

  sandbox.subscribeHalt((haltContext) => {
    const ticks = runner?.context?.ctx?.ticks?.ticks;
    sandboxConsoleOutputEl.textContent = logs.length ? logs.join('\n') : 'No logs.';
    sandboxTicksOutputEl.textContent = ticks != null ? ticks.toLocaleString() : '—';
    setBypassNotice(Boolean(globalThis.bypassed));
    if (haltContext.type === 'error') {
      const isQuota = haltContext.error instanceof SandboxExecutionQuotaExceededError;
      const label = 'Halted';
      const reason = haltContext.error?.message || String(haltContext.error);
      sandboxReturnOutputEl.textContent = reason;
      setSandboxStatus(`${label}: ${reason}`, 'halted');
    } else {
      sandboxReturnOutputEl.textContent = haltContext.type;
      setSandboxStatus(`Halted: ${haltContext.type}`, 'halted');
    }
  });

  const extraScope = parseScopeJson(settings.scopeJson);
  const scope = createSandboxRunnerScope({ console: sandboxConsole, cheat: () => {
    globalThis.bypassed = true;
    sandboxConsole.error("cheat() was called!")
  }, ...extraScope });

  let runner;
  try {
    const execFn = createUserRunner(
      sandbox,
      code,
      settings.async || runtimeTypeEl.value === 'async',
      jitParsingEl.checked,
    );
    runner = execFn(scope, new LocalScope());
    const result = await runner.run();
    if (sandbox.halted) return;
    sandboxConsoleOutputEl.textContent = logs.length ? logs.join('\n') : 'No logs.';
    sandboxReturnOutputEl.textContent = formatValue(result);
    sandboxTicksOutputEl.textContent = runner.context.ctx.ticks.ticks.toLocaleString();
    setBypassNotice(Boolean(globalThis.bypassed));
    setSandboxStatus('Success', 'success');
  } catch (error) {
    if (sandbox.halted) return;
    console.error(error);
    sandboxConsoleOutputEl.textContent = logs.length ? logs.join('\n') : 'No logs.';
    sandboxReturnOutputEl.textContent = formatValue(error);
    sandboxTicksOutputEl.textContent = runner ? String(runner.context.ctx.ticks.ticks.toLocaleString()) : '—';
    setBypassNotice(Boolean(globalThis.bypassed));
    setSandboxStatus('Error', 'error');
  }
};

const exec = async () => {
  const tests = await testsPromise;
  delete Object.anything;
  delete {}.constructor.anything1;

  window.bypassed = false;
  const isAsync = runtimeTypeEl.value === 'async';
  const jit = jitParsingEl.checked;
  const { sandbox } = createSandboxInstance();
  window.sandbox = sandbox;

  class TestError {
    constructor(error) { this.error = error; }
  }

  const validate = (value, compare) => {
    if (compare === 'error') return value instanceof TestError;
    if (typeof compare === 'string' && compare.startsWith('/') && compare.endsWith('/')) {
      const reg = new RegExp(compare.substring(1, compare.length - 1));
      return Boolean(value?.error?.message) && reg.test(value.error.message);
    }
    if (compare === null) return compare === value;
    if (compare === 'NaN') return isNaN(value) && typeof value === 'number';
    if (typeof compare !== 'object') return value === compare;
    let res = value?.length === compare?.length;
    for (let i in compare) res = res && validate(value?.[i], compare[i]);
    return res;
  };

  // Group tests by category
  const categories = [];
  const categoryMap = new Map();
  for (const test of tests) {
    const cat = test.category || 'Uncategorized';
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, []);
      categories.push(cat);
    }
    categoryMap.get(cat).push(test);
  }

  // Clear main
  const main = document.getElementById('tests-main');
  const summaryBar = document.getElementById('summary-bar');
  main.querySelectorAll('.test-section').forEach(el => el.remove());
  summaryBar.innerHTML = '';

  // Build category nav
  const catList = document.getElementById('category-list');
  catList.innerHTML = '';

  // Perf counters
  let totalCompileNative = 0, totalCompileSandbox = 0;
  let totalExecuteNative = 0, totalExecuteSandbox = 0;
  let grandTotal = 0, grandPass = 0;

  // Results per section (fill in after running)
  const sectionResults = new Map();

  // Run all tests and build DOM
  for (const cat of categories) {
    const catTests = categoryMap.get(cat);
    const section = document.createElement('div');
    section.className = 'test-section';
    section.id = 'section-' + cat.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    const headerEl = document.createElement('div');
    headerEl.className = 'section-header';

    const titleEl = document.createElement('span');
    titleEl.className = 'section-title';
    titleEl.textContent = cat;

    const countEl = document.createElement('span');
    countEl.className = 'section-count';
    countEl.textContent = catTests.length;

    const rateEl = document.createElement('span');
    rateEl.className = 'section-pass-rate';

    const toggleEl = document.createElement('span');
    toggleEl.className = 'section-toggle';
    toggleEl.textContent = '▾';

    headerEl.append(titleEl, countEl, rateEl, toggleEl);
    headerEl.addEventListener('click', () => {
      section.classList.toggle('collapsed');
    });

    const body = document.createElement('div');
    body.className = 'section-body';

    const table = document.createElement('table');
    table.className = 'test-table';
    table.innerHTML = `<colgroup>
      <col class="col-code">
      <col class="col-eval">
      <col class="col-sandbox">
      <col class="col-verdict">
    </colgroup><thead><tr>
      <th>Code</th>
      <th>eval</th>
      <th>Sandbox.js</th>
      <th>Result</th>
    </tr></thead>`;
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    body.appendChild(table);
    section.append(headerEl, body);
    main.appendChild(section);

    let catPass = 0;
    for (const test of catTests) {
      let sandbox = createSandboxInstance().sandbox;
      const state = {
        type: 'eval', test: [(a, b) => 1], test2: 1,
        a: { b: { c: 2 } }, Object, Math, Date, Array, undefined, NaN, Error
      };
      const state2 = createSandboxRunnerScope();
      sandbox.context.ticks.ticks = 0n;
      bypassed = false;

      const tr = document.createElement('tr');
      const runnableCode = getRunnableCode(test.code);

      // Sandbox.js column
      const sbResultTd = document.createElement('td');
      sbResultTd.className = 'td-result';
      let emsg = '';
      let time = performance.now();
      let ret;
      try {
        const fn = isAsync ? sandbox.compileAsync(runnableCode) : sandbox.compile(runnableCode);
        totalCompileSandbox += performance.now() - time;
        time = performance.now();
        ret = await fn(state2, new LocalScope()).run();
        totalExecuteSandbox += performance.now() - time;
      } catch (e) {
        emsg = e?.message;
        sbResultTd.classList.add('error');
        ret = new TestError(e);
      }
      let res;
      try {
        res = ret instanceof TestError ? ret : await ret;
      } catch (e) {
        emsg = e?.message;
        sbResultTd.classList.add('error');
        res = new TestError(e);
      }
      sbResultTd.title = emsg;
      sbResultTd.textContent = bypassed
        ? 'bypassed'
        : res instanceof TestError ? 'Error'
        : isNaN(res) && typeof res === 'number' ? 'NaN'
        : JSON.stringify(res) + (ret instanceof Promise ? ' (Promise)' : '');

      // Verdict column
      const verdictTd = document.createElement('td');
      verdictTd.className = 'td-verdict';
      const valid = validate(res, test.safeExpect);
      const passed = valid && !bypassed;
      if (passed) catPass++;
      verdictTd.textContent = bypassed ? 'BYPASSED' : valid ? 'PASS' : 'FAIL';
      verdictTd.classList.add(passed ? 'positive' : 'negative');

      // eval column
      const evalTd = document.createElement('td');
      evalTd.className = 'td-result';
      let evalEmsg = '';
      const evall = () => {
        if (isAsync) {
          return new Function('sandbox', `return (async () => {with (sandbox) {\n${runnableCode}\n}})()`);
        }
        return new Function('sandbox', `with (sandbox) {\n${runnableCode}\n}`);
      };
      const proxy = new Proxy(state, {
        has(target, key, context) {
          if (key in state) return Reflect.has(target, key, context);
          if (key === 'x') return false;
          throw new Error('Not allowed: ' + key);
        },
      });
      bypassed = false;
      time = performance.now();
      try {
        const fn = evall();
        totalCompileNative += performance.now() - time;
        time = performance.now();
        const evalRet = test.code.includes('__proto__') ? undefined : await fn(proxy);
        totalExecuteNative += performance.now() - time;
        const evalRes = await evalRet;
        evalTd.textContent = bypassed ? 'bypassed'
          : isNaN(evalRet) && typeof evalRes === 'number' ? 'NaN'
          : JSON.stringify(evalRes) + (evalRet instanceof Promise ? ' (Promise)' : '');
      } catch (e) {
        evalEmsg = e?.message;
        evalTd.classList.add('error');
        evalTd.textContent = 'Error';
      }
      evalTd.title = evalEmsg;
      evalTd.classList.toggle('negative', bypassed);

      // Code column
      const codeTd = document.createElement('td');
      codeTd.className = 'td-code';
      codeTd.title = test.code;
      const codeWrap = document.createElement('div');
      codeWrap.className = 'td-code-wrap';
      const codeText = document.createElement('span');
      codeText.className = 'td-code-text';
      codeText.textContent = test.code.length > 60 ? test.code.substring(0, 60) + '…' : test.code;
      const runnerLink = document.createElement('a');
      runnerLink.className = 'runner-link';
      const testSettings = { forbidFunctionCalls: false, forbidFunctionCreation: false, haltOnSandboxError: false, async: isAsync, executionQuota: undefined, scopeJson: '' };
      runnerLink.href = buildSandboxHashHref(runnableCode, testSettings);
      runnerLink.title = 'Open this test in the Sandbox Runner';
      runnerLink.setAttribute('aria-label', 'Open this test in the Sandbox Runner');
      runnerLink.innerHTML = `
        <svg class="runner-link-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path d="M6.7 6.1 3.6 10l3.1 3.9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
          <path d="M13.3 6.1 16.4 10l-3.1 3.9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
          <path d="M11.2 5.1 8.8 14.9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
        </svg>`;
      runnerLink.addEventListener('click', (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        openSandboxModalWithCode(runnableCode, testSettings);
      });
      codeWrap.append(codeText, runnerLink);
      codeTd.appendChild(codeWrap);

      tr.append(codeTd, evalTd, sbResultTd, verdictTd);
      tbody.appendChild(tr);

      Object.freeze = freeze;
      globalThis.Function = Function;
    }

    grandTotal += catTests.length;
    grandPass += catPass;

    // Update pass-rate badge
    const pct = Math.round((catPass / catTests.length) * 100);
    rateEl.textContent = `${catPass}/${catTests.length}`;
    rateEl.classList.add(pct === 100 ? 'rate-good' : 'rate-bad');

    sectionResults.set(cat, { pass: catPass, total: catTests.length });

    // Category nav item
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'category-link';
    button.dataset.sectionId = section.id;
    button.innerHTML = `<span>${cat}</span><span class="cat-badge ${catPass === catTests.length ? 'cat-pass' : 'cat-fail'}">${catPass}/${catTests.length}</span>`;
    button.addEventListener('click', () => {
      const header = document.querySelector('.site-header');
      const offset = header ? header.offsetHeight : 0;
      const top = section.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
    li.appendChild(button);
    catList.appendChild(li);
  }

  // Summary chips
  const failCount = grandTotal - grandPass;
  summaryBar.innerHTML = `
    <div class="summary-chip">
      <span class="chip-val">${grandTotal}</span>
      <span class="chip-label">Total Tests</span>
    </div>
    <div class="summary-chip chip-pass">
      <span class="chip-val">${grandPass}</span>
      <span class="chip-label">Passing</span>
    </div>
    <div class="summary-chip chip-fail">
      <span class="chip-val">${failCount}</span>
      <span class="chip-label">Failing</span>
    </div>
    <div class="summary-chip">
      <span class="chip-val">${Math.round((grandPass / grandTotal) * 100)}%</span>
      <span class="chip-label">Pass Rate</span>
    </div>
  `;

  // Performance table
  renderPerf(totalCompileNative, totalCompileSandbox, totalExecuteNative, totalExecuteSandbox);

  // Lodash benchmark (background)
  ;(async () => {
    const code = await (await fetch('https://cdn.jsdelivr.net/npm/lodash@4.17.20/lodash.min.js')).text();
    let start = performance.now();
    let error = '';
    try {
      new Sandbox().compile(code, !jit);
    } catch (e) {
      error = e.message;
    }
    const slodash = performance.now() - start;
    start = performance.now();
    new Function(code);
    const elodash = performance.now() - start;

    const timesBody = document.querySelector('#times tbody');
    const tr = document.createElement('tr');
    const td1 = document.createElement('td'); td1.textContent = 'Lodash compile';
    const td2 = document.createElement('td'); td2.textContent = Math.round(elodash * 10) / 10 + 'ms';
    const td3 = document.createElement('td');
    td3.title = error;
    td3.textContent = Math.round(slodash * 10) / 10 + 'ms';
    tr.append(td1, td2, td3);
    timesBody.appendChild(tr);
  })();
};

function renderPerf(cn, cs, en, es) {
  const body = document.querySelector('#times tbody');
  body.innerHTML = '';
  const rows = [
    ['', 'eval', 'Sandbox'],
    ['Compile', Math.round(cn * 10) / 10 + 'ms', Math.round(cs * 10) / 10 + 'ms'],
    ['Execute', Math.round(en * 10) / 10 + 'ms', Math.round(es * 10) / 10 + 'ms'],
    ['Total',   Math.round((cn + en) * 10) / 10 + 'ms', Math.round((cs + es) * 10) / 10 + 'ms'],
  ];
  for (const [label, evalVal, sbVal] of rows) {
    const tr = document.createElement('tr');
    const makeCell = (text, tag = 'td') => {
      const el = document.createElement(tag);
      el.textContent = text;
      return el;
    };
    tr.append(makeCell(label, 'th'), makeCell(evalVal), makeCell(sbVal));
    body.appendChild(tr);
  }
}

// Active section highlight in nav
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const id = entry.target.id;
    const link = document.querySelector(`#category-list .category-link[data-section-id="${id}"]`);
    if (link) link.classList.toggle('active', entry.isIntersecting);
  }
}, { threshold: 0.1 });

const observeSections = () => {
  observer.disconnect();
  document.querySelectorAll('.test-section').forEach(s => observer.observe(s));
};

exec().then(observeSections);
runBtnEl.addEventListener('click', () => exec().then(observeSections));
runtimeTypeEl.addEventListener('change', () => exec().then(observeSections));
jitParsingEl.addEventListener('change', () => exec().then(observeSections));

openSandboxModalBtnEl.addEventListener('click', openSandboxModal);
sandboxExecBtnEl.addEventListener('click', runSandboxCode);
sandboxCloseBtnEl.addEventListener('click', closeSandboxModal);
sandboxClearBtnEl.addEventListener('click', () => {
  resetSettings();
  setEditorValue('');
  resetSandboxOutput();
  setBypassNotice(false);
  setSandboxStatus('Idle');
});
sandboxModalEl.addEventListener('click', (event) => {
  if (event.target.dataset.closeModal === 'true') closeSandboxModal();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !sandboxModalEl.classList.contains('hidden')) closeSandboxModal();
});
window.addEventListener('hashchange', () => {
  const code = getSandboxHashCode();
  if (!code) return;
  const settings = getSandboxHashSettings();
  if (settings) applySettingsFromObject(settings);
  setEditorValue(code);
  openSandboxModal();
  setSandboxStatus('Idle');
});

const initialSandboxCode = getSandboxHashCode();
if (initialSandboxCode) {
  const initialSettings = getSandboxHashSettings();
  if (initialSettings) applySettingsFromObject(initialSettings);
  setEditorValue(initialSandboxCode);
  openSandboxModal();
}

setBypassNotice(false);
