import vm from "node:vm";
import { isDeepStrictEqual } from "node:util";

// ─── Supported language IDs ───────────────────────────────────────────────────
// JavaScript (Node.js) → 63
// Python 3             → 71
// Java                 → 62
export const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  java: 62,
};

// ─── Judge0 config (set in server/.env) ──────────────────────────────────────
const JUDGE0_BASE = "https://judge0-ce.p.rapidapi.com";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? "";
const RAPIDAPI_HOST = "judge0-ce.p.rapidapi.com";

const POLL_INTERVAL_MS = 500;
const MAX_RETRIES = 10;

// ─── Helper: sleep ────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Helper: shared RapidAPI headers ─────────────────────────────────────────
function rapidApiHeaders() {
  return {
    "Content-Type": "application/json",
    "X-RapidAPI-Key": RAPIDAPI_KEY,
    "X-RapidAPI-Host": RAPIDAPI_HOST,
  };
}

/**
 * Submit code to Judge0, poll until a result is available, and return a
 * structured pass/fail result.
 *
 * @param {string} sourceCode      - The user's source code
 * @param {number} languageId      - Judge0 language ID (63 = JS, 71 = Python, 62 = Java)
 * @param {string} stdin           - Standard input for the test case
 * @param {string} expectedOutput  - The expected stdout (trimmed for comparison)
 * @returns {Promise<{
 *   passed: boolean,
 *   stdout: string,
 *   stderr: string,
 *   time_ms: number,
 *   status: string
 * }>}
 */
export async function executeCode(sourceCode, languageId, stdin, expectedOutput) {
  // 1. Submit the code
  const submitRes = await fetch(`${JUDGE0_BASE}/submissions?base64_encoded=false&wait=false`, {
    method: "POST",
    headers: rapidApiHeaders(),
    body: JSON.stringify({
      source_code: sourceCode,
      language_id: languageId,
      stdin: stdin ?? "",
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => "");
    throw new Error(`Judge0 submission failed (${submitRes.status}): ${errText}`);
  }

  const { token } = await submitRes.json();
  if (!token) throw new Error("Judge0 did not return a submission token");

  // 2. Poll until status.id > 2 (1 = In Queue, 2 = Processing)
  let retries = 0;
  let result = null;

  while (retries < MAX_RETRIES) {
    await sleep(POLL_INTERVAL_MS);

    const pollRes = await fetch(
      `${JUDGE0_BASE}/submissions/${token}?base64_encoded=false&fields=status,stdout,stderr,time,memory,compile_output`,
      { headers: rapidApiHeaders() }
    );

    if (!pollRes.ok) {
      retries++;
      continue;
    }

    const data = await pollRes.json();

    // status.id: 1 = In Queue, 2 = Processing, 3+ = finished
    if (data.status && data.status.id > 2) {
      result = data;
      break;
    }

    retries++;
  }

  if (!result) {
    throw new Error(`Judge0 timed out after ${MAX_RETRIES} retries for token ${token}`);
  }

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? result.compile_output ?? "";
  // Judge0 returns time as a string like "0.042" (seconds)
  const time_ms = result.time ? Math.round(parseFloat(result.time) * 1000) : 0;
  const statusDesc = result.status?.description ?? "Unknown";

  const passed =
    result.status?.id === 3 && // 3 = Accepted
    stdout.trim() === String(expectedOutput ?? "").trim();

  return { passed, stdout, stderr, time_ms, status: statusDesc };
}

/**
 * Run a level's full test-case suite against the submitted code.
 *
 * @param {string} code        - The user's source code
 * @param {number} languageId  - Judge0 language ID
 * @param {{ testCases: Array<{ input: string, expectedOutput: string }> }} level
 * @returns {Promise<{
 *   allPassed: boolean,
 *   results: Array<{ testCase: number, passed: boolean, stdout: string, stderr: string, time_ms: number, status: string }>,
 *   totalTimeMs: number
 * }>}
 */
export async function judgeLevel(code, languageId, level) {
  const testCases = Array.isArray(level?.testCases) ? level.testCases : [];

  if (testCases.length === 0) {
    return { allPassed: false, results: [], totalTimeMs: 0 };
  }

  const results = [];
  let totalTimeMs = 0;

  for (let i = 0; i < testCases.length; i++) {
    const { input, expectedOutput } = testCases[i];

    let result;
    try {
      result = await executeCode(code, languageId, input, expectedOutput);
    } catch (err) {
      result = {
        passed: false,
        stdout: "",
        stderr: err?.message ?? "Unknown error",
        time_ms: 0,
        status: "Error",
      };
    }

    results.push({ testCase: i + 1, ...result });
    totalTimeMs += result.time_ms;
  }

  const allPassed = results.every((r) => r.passed);
  return { allPassed, results, totalTimeMs };
}

// ─── Legacy: VM-based JS-only judge (kept for backward compatibility) ─────────

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
