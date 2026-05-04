import vm from "node:vm";
import { spawn } from "node:child_process";

// ─── Comparison helper ────────────────────────────────────────────────────────
// isDeepStrictEqual fails for cross-realm objects (vm sandbox).
// JSON.stringify normalises both sides safely for DSA problems.
function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ─── JavaScript judge (vm sandbox) ───────────────────────────────────────────
function judgeJS(code, examples) {
  const sandbox = {};
  const ctx = vm.createContext(sandbox);

  try {
    vm.runInContext(
      `${code}\n;this.__solve = typeof solve !== "undefined" ? solve : null;`,
      ctx,
      { timeout: 3000 }
    );
  } catch (err) {
    return { correct: false, message: `Syntax / Runtime error: ${err.message}` };
  }

  const solve = ctx.__solve;
  if (typeof solve !== "function") {
    return { correct: false, message: 'Define a function named "solve" in your solution.' };
  }

  for (let i = 0; i < examples.length; i++) {
    const ex = examples[i];
    const args = Array.isArray(ex.args) ? ex.args : [ex.input];
    const expected = "expected" in ex ? ex.expected : ex.output;

    let got;
    try {
      got = solve(...args);
    } catch (err) {
      return { correct: false, message: `Runtime error on test ${i + 1}: ${err.message}` };
    }

    if (!deepEqual(got, expected)) {
      return {
        correct: false,
        message: `Wrong answer on test ${i + 1}.\nInput: ${JSON.stringify(args)}\nExpected: ${JSON.stringify(expected)}\nGot: ${JSON.stringify(got)}`,
      };
    }
  }

  return { correct: true, message: "All tests passed!" };
}

// ─── Python judge (child_process) ────────────────────────────────────────────
function judgePython(code, examples) {
  return new Promise((resolve) => {
    const harness = `
import json, sys

${code}

examples = json.loads(sys.argv[1])
for i, ex in enumerate(examples):
    args = ex.get("args", [ex.get("input")])
    expected = ex.get("expected", ex.get("output"))
    try:
        got = solve(*args)
        if json.dumps(got, sort_keys=True) != json.dumps(expected, sort_keys=True):
            print(json.dumps({"correct": False, "message": f"Wrong answer on test {i+1}. Expected {json.dumps(expected)}, got {json.dumps(got)}"}))
            sys.exit(0)
    except Exception as e:
        print(json.dumps({"correct": False, "message": f"Runtime error on test {i+1}: {str(e)}"}))
        sys.exit(0)

print(json.dumps({"correct": True, "message": "All tests passed!"}))
`;

    const proc = spawn("python3", ["-c", harness, JSON.stringify(examples)], {
      timeout: 5000,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "", stderr = "";
    proc.stdout.on("data", d => (stdout += d.toString()));
    proc.stderr.on("data", d => (stderr += d.toString()));
    proc.on("close", () => {
      try { resolve(JSON.parse(stdout.trim())); }
      catch { resolve({ correct: false, message: `Python error: ${stderr.trim() || stdout.trim()}` }); }
    });
    proc.on("error", err => {
      resolve({ correct: false, message: `Python not available: ${err.message}` });
    });
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function judgeSubmission({ code, language, levelRow }) {
  const lang = String(language || "javascript").toLowerCase();
  const examples = Array.isArray(levelRow?.examples) ? levelRow.examples : [];

  if (examples.length === 0)
    return { correct: false, message: "This level has no test cases configured." };
  if (!code || !code.trim())
    return { correct: false, message: "No code submitted." };
  if (lang === "javascript") return judgeJS(code, examples);
  if (lang === "python") return judgePython(code, examples);
  return { correct: false, message: `Language "${lang}" not supported yet. Use JavaScript or Python.` };
}

export const LANGUAGE_IDS = { javascript: 63, python: 71, java: 62 };
export async function executeCode() { throw new Error("Use judgeSubmission instead"); }
export async function judgeLevel() { throw new Error("Use judgeSubmission instead"); }
