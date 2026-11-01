import { describe, expect, it } from "vitest";

import { apply, name } from "../src/host/index.ts";

/** Minimal Host context: records effects and runs them once. */
function fakeContext() {
  const effects: string[] = [];
  return {
    effects,
    effect(run: () => void, label: string) {
      effects.push(label);
      run();
      return () => {};
    },
    logger: { info: () => {} },
  };
}

describe("host half", () => {
  it("declares the package name", () => {
    expect(name).toBe("__PKG__");
  });

  it("registers its effect on apply", () => {
    const ctx = fakeContext();
    apply(ctx);
    expect(ctx.effects).toContain("__PKG__: host");
  });
});
