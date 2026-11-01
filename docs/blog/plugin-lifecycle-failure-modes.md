---
title: 'Plugin lifecycle failure modes'
description: 'Seven failure modes that appear when a desktop agent separates profile, host, client and app lifecycles.'
date: 2026-11-01
---

# Plugin lifecycle failure modes

> **Desktop agent lifecycle · Part 2 of 2**  
> Start with [Part 1: Desktop agents are not web apps in a window](/blog/desktop-agents-not-web-apps).

The first article in this series described four layers: profile, host, client and app. This one is a field guide to
what goes wrong between them.

The useful question is rarely "does reload work". It is "which layer is stale, and what does the user see while it is
stale?"

## A small model: desired state and observed state

A plugin has a desired state:

```text
installed: true | false
enabled:   true | false
```

It also has an observed state in each layer:

```text
profile: installed | missing
host:    loaded | unloaded | failed
client:  mounted | unmounted | stale
app:     current | restart-required
```

Most lifecycle bugs are not arithmetic errors in the package manager. They are disagreements between these states,
or a UI that only exposes one of them.

## Seven failure modes

### 1. Removed from the profile, still mounted in the client

**Symptom:** the plugin card disappears, but its sidebar entry or composer button remains.

**Why:** the dependency and patch were removed; the renderer still has the old module graph. A page reload may fix
it; an app restart definitely will.

**Design response:** return `client-reload-required`, not `ok`. Offer a production-safe client reload. Do not claim
the feature has disappeared until the client layer agrees.

### 2. Updated in place, but the host still runs the old package

**Symptom:** a new version is installed, but tools or routes behave like the previous one.

**Why:** the host resolved the package at boot. Replacing files does not replace the loaded module, and a package
that moved to a different path may not be reloadable at all.

**Design response:** distinguish `package-updated` from `host-applied`. If the package moved, require an app restart
rather than pretending HMR can follow it.

### 3. Disabled while a tool call is in flight

**Symptom:** the UI says disabled, but a running task still uses the tool; or the tool disappears mid-turn.

**Why:** the host has active calls and the client has an old tool list. Disabling is not a point-in-time event.

**Design response:** decide whether disable is graceful or immediate. If graceful, report `pending` and drain calls
before unloading. If immediate, cancel explicitly and show the cancellation.

### 4. Installed while the app is running

**Symptom:** the package is on disk, but nothing appears until restart.

**Why:** the profile changed, but the boot composition and client graph were already built.

**Design response:** do not describe installation as complete when only the profile layer changed. Say "installed;
restart required" or provide a controlled reload path.

### 5. Reload fails halfway

**Symptom:** the plugin is gone from the list but still running; or running but absent from the list.

**Why:** a multi-step operation (unload, remove, rewrite patch, reload) failed between steps. The system is now in a
state that no button describes.

**Design response:** make the operation observable and recoverable. Keep the previous state until the transaction
commits. Write a receipt with the layer reached and the error. Never make the user guess which half succeeded.

### 6. Two lifecycle actions overlap

**Symptom:** double-clicking uninstall, or installing while a restart is pending, produces an undefined result.

**Why:** lifecycle operations are not necessarily idempotent, and a second operation may observe the first one
half-applied.

**Design response:** serialize per plugin. Return `busy` or a queued result. Make the action idempotent where
possible, and show the current operation in the UI.

### 7. Restart without draining sessions

**Symptom:** a restart fixes the plugin but loses a running turn or leaves a session log incomplete.

**Why:** app restart is a process lifecycle event, not a plugin reload. The host may be killed before it flushes.

**Design response:** use a graceful shutdown path. Refuse or confirm while tasks are running. After relaunch, report
the restart result and reconnect the page.

## The contract that prevents most of these

A small number of rules removes a surprising amount of ambiguity:

1. **One owner per profile.** The desktop shell owns the profile lock; CLI operations coordinate with it.
2. **Every action returns a layer.** `saved`, `host-applied`, `client-reload-required`, `app-restart-required`,
   `failed`.
3. **Never report success before the user-visible layer agrees.** A profile write is not an uninstall.
4. **Keep a receipt.** The last operation, its target, its layer and its error should survive a page reload.
5. **Make restart explicit.** Restart is allowed to be expensive; it should not be surprising.
6. **Test the states, not only the commands.** The matrix matters more than the exit code.

## A test table

| Scenario | Profile | Host | Client | Expected user-facing state |
| --- | --- | --- | --- | --- |
| Install, app running | updated | old | old | restart required |
| Install, HMR capable | updated | reloaded | reloaded | applied |
| Remove, client mounted | removed | unloaded | stale | client reload required |
| Remove, app restart | removed | unloaded | unmounted | applied after restart |
| Disable during a call | unchanged | draining | stale | pending |
| Update, package moved | updated | old | old | app restart required |
| Second action during first | unchanged | busy | unchanged | busy |

The table is deliberately boring. The point is that every row has a name.

## What this means for plugin authors

A plugin author cannot solve the shell's lifecycle by adding a `dispose()` function. But a plugin can make the
contract easier:

- avoid background resources that outlive unload;
- keep host and client state in separate modules;
- register tools and UI through the documented lifecycle;
- do not assume that "file replaced" means "code reloaded";
- document the minimum reload the plugin needs.

The shell still owns the lifecycle. The plugin should not pretend otherwise.

## Closing

A desktop agent does not need one universal reload mechanism. It needs a vocabulary for saying which layer changed,
which one is stale, and what the user can do next.

The first article described the layers. This one describes the ways they disagree. The next step is to make the
disagreement visible in the interface.

## References

- [Desktop agents are not web apps in a window](/blog/desktop-agents-not-web-apps)
- [VS Code extension host](https://code.visualstudio.com/api/advanced-topics/extension-host)
- [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model)
