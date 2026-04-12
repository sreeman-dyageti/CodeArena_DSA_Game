import vm from "node:vm";
import { isDeepStrictEqual } from "node:util";

/**
 * Runs user code in an isolated context and checks `solve` against level.examples.
 * Expected example shape: `{ args: [...], expected: ... }` or `{ input: ..., output: ... }`
 * (single-arg problems can use `args: [x]` or `input` as a single value).
 *
 * @param {{ code: string, language: string, levelRow: Record<string, unknown> }} params
 * @returns {{ correct: boolean, message?: string }}
 */
export async function judgeSubmission({ code, language, levelRow }) {
  const lang = String(language || "javascript").toLowerCase();
  if (lang !== "javascript") {
    return { correct: false, message: "Judging is only implemented for JavaScript" };
  }

  const rawExamples = levelRow.examples;
  const examples = Array.isArray(rawExamples) ? rawExamples : [];
  if (examples.length === 0) {
    return {
      correct: false,
      message: "This level has no public tests configured yet",
    };
  }

  const sandbox = {};
  const ctx = vm.createContext(sandbox);

  try {
    vm.runInContext(
      `${String(code || "")}\n;this.__ca_solve = typeof solve !== "undefined" ? solve : null;`,
      ctx,
      { timeout: 3000 }
    );
  } catch (err) {
    return { correct: false, message: err?.message || "Runtime error while loading your solution" };
  }

  const solve = ctx.__ca_solve;
  if (typeof solve !== "function") {
    return { correct: false, message: "Define a top-level function named `solve`" };
  }

  for (let i = 0; i < examples.length; i++) {
    const ex = examples[i];
    const args =
      ex && Array.isArray(ex.args)
        ? ex.args
        : ex && "args" in ex && ex.args !== undefined && !Array.isArray(ex.args)
          ? [ex.args]
          : ex && "input" in ex
            ? [ex.input]
            : [];
    const expected = ex && ("expected" in ex ? ex.expected : "output" in ex ? ex.output : undefined);

    let got;
    try {
      got = solve(...args);
    } catch (err) {
      return { correct: false, message: `Test ${i + 1}: ${err?.message || "Runtime error"}` };
    }

    if (!isDeepStrictEqual(got, expected)) {
      return { correct: false, message: `Wrong answer on example ${i + 1}` };
    }
  }

  return { correct: true };
}
