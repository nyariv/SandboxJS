### ⏳ `delaySynchronousResult` — Async-backed synchronous host functions (`208b3a0`)

Allows host-provided functions to deliver their result asynchronously (e.g. after a `setTimeout`) without requiring the sandbox code to use `async`/`await`.

**What's supported:**
- A host function wraps its body in `delaySynchronousResult(async () => { ... })` and returns it synchronously
- The sandbox executor detects the `DelayedSynchronousResult` wrapper and awaits the inner promise before continuing execution
- Sandbox code calls the function as if it were synchronous — no `await` needed at the call site
- Rejections (thrown errors inside the async callback) propagate correctly and can be caught with `try/catch` inside the sandbox
- Works for both plain function calls and method calls on objects

**How it works:** After a call resolves to a `DelayedSynchronousResult`, the executor calls `Promise.resolve(ret.result).then(done, done)` instead of invoking `done` immediately. This suspends the execution tree at that call site until the promise settles, analogous to how `nonBlocking` mode inserts `setTimeout(0)` yield points. No changes to sandbox code or parser are required — the feature is entirely host-side.

New export: `delaySynchronousResult(cb: () => unknown): DelayedSynchronousResult`

New test file: `test/delaySynchronousResult.spec.ts`
