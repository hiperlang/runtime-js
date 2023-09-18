/*!
 * Hyper Runtime v0.1
 * (c) 2023 Timur Fayzrakhmanov
 * MIT License
 * https://github.com/timfayz/hyper
 */

/**
 * ***************************
 * Runtime Initialization
 * ***************************
 */

/**
 * Save currentScript as soon as possible to have access to the runtime
 * loading <script> later on.
 */
const SELF_SCRIPT = document.currentScript;

/**
 * Start Hyper runtime when the document is fully loaded and run it on each
 * target separately.
 */
document.addEventListener("DOMContentLoaded", () => {
  // If `skip` set, don't do anything
  if (SELF_SCRIPT?.hasAttribute("skipped")) return;

  // Check if runtime loaded multiple times
  if (SELF_SCRIPT?.hasAttribute("src")) {
    const url = SELF_SCRIPT.getAttribute("src");
    let counter = 0;
    Array.from(document.getElementsByTagName("script")).forEach((script) => {
      if (script.getAttribute("src") === url!) counter++;
    });
    assert(counter == 1, Errors.Runtime.LoadedMultipleTimes(url!));
  }

  // Set default target
  let targets = [document.body];

  // However
  if (SELF_SCRIPT?.hasAttribute("scope")) {
    const query = SELF_SCRIPT.getAttribute("scope");
    assert(query != "", Errors.Runtime.LoadedScopeEmpty());
    // override defaults
    targets = Array.from(document.querySelectorAll(query!));
    assert(targets.length > 0, Errors.Runtime.LoadedScopeNotFound(query!));
  }

  // Start runtime if `defer` is not set
  if (!SELF_SCRIPT?.hasAttribute("defer")) {
  const runtime = new Runtime(targets);
  runtime.runOnTargets();
  }
});

/**
 * ***************************
 * Runtime
 * ***************************
 */

class Runtime {
  targets: Element[] = [];

  runOnTargets() {
    this.targets.forEach((target) => {
      const compiler = new Compiler(target.innerHTML);
      compiler.compile();
    });
  }

  constructor(targets: Element[]) {
    this.targets = targets;
  }
}

/**
 * ***************************
 * Compiler
 * ***************************
 */

class Compiler {
  c_line: number = 1;
  c_lvl: number = 0; // current indent level
  c_tabsize: number = 0; // current indent size
  trim_size: number = -1; // leading indent size for every line
  ast: Map<string, string>[] = [new Map()];
  stream: string = "";
  i: number = 0;
  lineProcessor: Cursor;

  constructor(stream: string) {
    this.stream = stream;
    this.lineProcessor = new Cursor(stream, this.i);
  }

  // TODO
  // scanning naming convention:
  // trySpace -- move i forward
  // expectSpace -- move i forward to check and rewind it back
  // mustSpace -- expect+scan

  scanSpace(): number {
    let lead_space = 0;
    while (true) {
      switch (this.stream[this.i]) {
        case " ":
          lead_space++;
          break;
        case "\n":
          this.c_line++;
          lead_space = 0;
          break;
        default:
          return lead_space;
      }
      this.i++;
    }
  }

  compile() {
    if (this.stream == "") return;
    this.scanNext();
  }

  scanNext() {
    // enterLevel
    while (this.i < this.stream.length) {
      let lead_space_size = this.scanSpace();

      // detect trim size (once)
      if (this.trim_size < 0) {
        this.trim_size = lead_space_size;
      }

      // remove trimming space
      lead_space_size -= this.trim_size;

      // if (trimmed) leading space > 0 then
      if (lead_space_size > 0) {
        // set indentation size (once)
        if (this.c_tabsize < 0) {
          this.c_tabsize = lead_space_size;
        }
        // if but not aligned with tab size
        if (lead_space_size != this.c_lvl * this.c_tabsize) {
          throw Errors.MockError("Indentation is not aligned");
        } else {
          this.c_lvl++;
          this.ast.push(new Map());
        }
      }

      this.syntaxErr(52);

      break;
      this.i++;
    }
  }

  syntaxErr(
    shift: number = 0,
    linesBefore: number = 2,
    linesAfter: number = 2
  ) {
    if (linesBefore < 0 || linesAfter < 0)
      throw Errors.MockError(
        "linesBefore and linesAfter cannot be negative numbers"
      );

    // add shift to i
    const this_i = this.addInRange(this.i, shift, 0, this.stream.length - 1);
  }

  logSelf() {
    console.log("this.stream:\n", this.stream);
    console.log("this.i: " + this.i);
    console.log("this.c_line: " + this.c_line);
    console.log("this.c_lvl: " + this.c_lvl);
    console.log("this.tree: " + (this.ast.length == 0 ? "[empty]" : this.ast));
  }

  addInRange(a: number, b: number, min: number, max: number) {
    const sum = a + b;
    // overflow/underflow check
    if (sum > max) return max;
    if (sum < min) return min;
    return sum;
  }
}

/**
 * ***************************
 * Cursor
 * ***************************
 */

export class Cursor {
  constructor(public stream: string, public i: number = 0) {}

  commonAsserts(i: number) {
    // i must be within stream boundaries
    assert(
      i >= 0 && i < this.stream.length,
      Errors.Generic.IndexOutOfBounds(this.i, this.stream.length)
    );
  }

  update(i: number) {
    this.i = i;
    return this;
  }

  getCharAtI(i: number = this.i) {
    return this.stream[i];
  }

  getStreamAfterI() {
    return this.stream.slice(this.i, this.stream.length);
  }

  getStreamBeforeI() {
    return this.stream.slice(0, this.i);
  }

  getLineAround(i: number = this.i): [string, number] {
    this.update(i);
    const partBefore = this.getLinesBefore();
    const partAfter = this.getLinesAfter();
    return [partBefore + partAfter, partBefore.length];
  }

  getLinesBefore(i: number = this.i, n: number = 1): string {
    if (n == 0) return "";

    this.commonAsserts(i);

    // step back
    let ib = i - 1;

    // set line counter
    let lineCount = 0;

    // consume n number of lines backwards
    do {
      if (this.stream[ib] == "\n") lineCount++;
      if (lineCount == n || ib <= 0) break;
      ib--;
    } while (true);

    // check if we ended up at the end of the previous line
    if (this.stream[ib] == "\n") ib++;

    return this.stream.slice(ib, i);
  }

  getLinesAfter(i: number = this.i, n: number = 1): string {
    if (n == 0) return "";

    this.commonAsserts(i);

    let ia = i;

    // set line counter
    let lineCount = 0;

    // consume n number of lines forward
    do {
      if (this.stream[ia] == "\n") lineCount++;
      if (lineCount == n || ia >= this.stream.length) break;
      ia++;
    } while (true);

    if (this.stream[ia] == "\n") ia++;
    // if (this.stream[i] == "\n") i++;

    return this.stream.slice(i, ia);
  }

  getNonPrintCharName(char: string) {
    switch (char) {
      case " ":
        return "SPACE";
      case "\n":
        return "NEW LINE";
      case "\t":
        return "TAB";
    }
  }

  getPrettyCharAt() {
    if (this.i == this.stream.length) return "EOF";
    return this.getNonPrintCharName(this.getCharAtI());
  }
}

/**
 * ***************************
 * Printer
 * ***************************
 */

class Printer {
  buffer: string = "";
  level: number = 0; // current tab level
  constructor(public tabSize: number = 2, public tabChar: string = ` `) {}

  prepend(part: string) {
    this.buffer = part + this.buffer;
    return this;
  }

  // TODO
  prependLine(line: string) {
    this.buffer =
      this.tabChar.repeat(this.tabSize).repeat(this.level) +
      line +
      "\n" +
      this.buffer;
    return this;
  }

  // add tab
  addTab(level: number = this.level) {
    this.buffer += this.tabChar.repeat(this.tabSize).repeat(level);
    return this;
  }

  // add part of a line
  add(part: string) {
    this.buffer += part;
    return this;
  }

  // add new line
  newline() {
    this.buffer += "\n";
    return this;
  }

  // increase the level of indentation
  tab(level: number = 1) {
    this.level += level;
    return this;
  }

  // decrease the level of indentation
  untab(level: number = 1) {
    this.level = this.level == 0 ? 0 : this.level - 1;
    return this;
  }

  // add line
  line(line: string) {
    this.buffer +=
      this.tabChar.repeat(this.tabSize).repeat(this.level) + line + "\n";
    return this;
  }

  print() {
    console.log(this.buffer);
    return this.buffer;
  }
}

/**
 * ***************************
 * Utilities
 * ***************************
 */

function assert(cond: boolean, error: ErrorType) {
  if (!cond) throw error;
}

function execFn(fn: Function) {
  const numArgs = fn.length;
  const args = new Array(numArgs).fill(undefined);
  return fn.call(null, args);
}

function isIterable(input: any) {
  try {
    for (const _ of input) {
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * ***************************
 * Errors
 * ***************************
 */

type ErrorType = { code: Function; message: string };

// 1xxx for syntactic errors
// 2xxx for semantic errors
// 3xxx for type errors
// 4xxx for compiler options errors
// 5xxx for command line errors
export const Errors = {
  Generic: {
    IndexOutOfBounds: (i: number, length: number) => ({
      code: Errors.Generic.IndexOutOfBounds,
      message: `Index (${i}) is out of stream boundaries. ${
        length === 0
          ? `The stream is empty.`
          : `For a stream of length ${length}, valid indices are within [0..${
              length - 1
            }].`
      }`,
    }),

    StreamIsEmpty: () => ({
      code: Errors.Generic.StreamIsEmpty,
      message: `The stream is empty.`,
    }),
  },

  MockError: (msg: string) => ({
    code: Errors.MockError,
    message: msg,
  }),
};

/**
 * ***************************
 * Test
 * ***************************
 */

type TestEqualFunc = (expected: any, result: any) => boolean;
type TestFunc = (...input: any) => any;
type TestData = {
  name?: string;
  cases: {
    input: any[];
    name?: string;
    expect?: any;
    expectErr?: any;
    details?: boolean;
    focus?: boolean;
    skip?: boolean;
    equalFunc?: TestEqualFunc;
    errEqualFunc?: TestEqualFunc;
  }[];
  testFunc: TestFunc;
  options?: TestStatsOptions;
  equalFunc?: TestEqualFunc;
  errEqualFunc?: TestEqualFunc;
};

type TestStatsOptions = {
  showSummaryIfFailed?: boolean;
  showSummaryAnyway?: boolean;
  showCaseListIfFailed?: boolean;
  showCaseListAnyway?: boolean;
  showCaseDetailsIfFailed?: boolean;
  showCaseDetailsAnyway?: boolean;
};

export class Test {
  data: TestData;
  testsRes = new Map<
    number,
    {
      status: string;
      reason?: { code: number; message: any };
      result?: any;
      resultErr?: any;
    }
  >();
  static statsOptions: TestStatsOptions = {
    showSummaryIfFailed: false,
    showSummaryAnyway: false,
    showCaseListIfFailed: true,
    showCaseListAnyway: false,
    showCaseDetailsIfFailed: true,
    showCaseDetailsAnyway: false,
  };

  constructor(test: TestData) {
    // Set default stats options if nothing provided or override
    test.options =
      test.options === undefined
        ? Test.statsOptions
        : Test.overrideOptions(Test.statsOptions, test.options);

    test.equalFunc =
      test.equalFunc === undefined ? Test.equalFunc : test.equalFunc;

    // Set default `errEqualFunc` if nothing provided
    test.errEqualFunc =
      test.errEqualFunc === undefined ? Test.errEqualFunc : test.errEqualFunc;

    // Set a default test name if nothing provided
    if (test.name === undefined) {
      // Get function name from the `testFunc` if it is not an arrow one
      test.name =
        test.testFunc.name !== "testFunc" ? test.testFunc.name : "Unnamed test";
    }

    this.data = {
      name: test.name,
      cases: test.cases,
      testFunc: test.testFunc,
      options: test.options,
      equalFunc: test.equalFunc,
      errEqualFunc: test.errEqualFunc,
    };
  }

  run(options: TestStatsOptions = {}) {
    // Override options given in Test({...}) by ones passed in this function
    if (this.data.options) {
      options = Test.overrideOptions(this.data.options, options);
    }
    this.execute();
    const stats = this.getStatsString(options);
    console.log(stats);
  }

  execute() {
    const test = this.data; // shorthand
    let equalFunc = test.equalFunc; // expect/result comparing function

    // (preprocess step)
    // If test cases are missing, no reason to continue
    if (test.cases.length == 0) return;

    // (preprocess step)
    // If at least one test case has `focus` field set
    if (test.cases.some((testCase) => "focus" in testCase)) {
      // filter out those who doesn't
      test.cases = test.cases.filter((testCase) => testCase.focus == true);
    }

    // (start for each test case)
    test.cases.forEach((testCase, testIndex) => {
      // Exclude from processing if a test case has `skip` set
      if (testCase.skip) {
        this.testsRes.set(testIndex, { status: "skipped" });
        return;
      }

      // Get equalFunc from a field if available
      if ("equalFunc" in testCase) {
        equalFunc = testCase.equalFunc;
      }

      // Now, there are several reasons for a test case to fail:

      // (x) Ill-formed test case
      if (
        !("expect" in testCase || "expectErr" in testCase) ||
        ("expect" in testCase && "expectErr" in testCase)
      ) {
        this.testsRes.set(testIndex, {
          status: "failed",
          reason: Test.failReason.MissingExpectedOrExpectedErrField,
        });
        return;
      }

      // (x) Provided test input doesn't match the testFunc signature
      if (testCase.input.length !== test.testFunc.length) {
        this.testsRes.set(testIndex, {
          status: "failed",
          reason: Test.failReason.InputDoesNotMatchFuncSignature(
            testCase.input.length,
            test.testFunc.length
          ),
        });
        return;
      }

      try {
        const result = test.testFunc(...testCase.input);

        // (x) Testing function was expected to throw error
        if ("expectErr" in testCase) {
          this.testsRes.set(testIndex, {
            status: "failed",
            reason: Test.failReason.ExpectedErrorButFuncSucceeded,
            result: result,
          });
        } else {
          try {
            // (x) Testing function result doesn't match the expected one
            if (!equalFunc!(testCase.expect, result)) {
              this.testsRes.set(testIndex, {
                status: "failed",
                reason: Test.failReason.ExpectedResultDoesNotMatch,
                result: result,
              });
            } else {
              // (OK) Testing function result passed the matching test
              this.testsRes.set(testIndex, {
                status: "passed",
                result: result,
              });
            }
          } catch (err) {
            // (x) There was an internal error in matching behavior
            this.testsRes.set(testIndex, {
              status: "failed",
              reason: Test.failReason.EqualFuncFailed(err),
              resultErr: err,
            });
          }
        }
      } catch (resultErr) {
        // (x) Testing function was expected to succeed
        if ("expect" in testCase) {
          this.testsRes.set(testIndex, {
            status: "failed",
            reason: Test.failReason.FuncFailedWithError,
            resultErr: resultErr,
          });
        } else {
          try {
            // (x) Testing function error doesn't match the expected one
            if (!test.errEqualFunc!(testCase.expectErr, resultErr)) {
              this.testsRes.set(testIndex, {
                status: "failed",
                reason: Test.failReason.ExpectedErrorDoesNotMatch,
                resultErr: resultErr,
              });
            } else {
              // (OK) Testing function error passed the matching test
              this.testsRes.set(testIndex, {
                status: "passed",
                resultErr: resultErr,
              });
            }
          } catch (err) {
            console.log(err);

            // (x) There was an internal error in matching behavior
            this.testsRes.set(testIndex, {
              status: "failed",
              reason: Test.failReason.ErrEqualFuncFailed(err),
              resultErr: resultErr,
            });
          }
        }
      }
    });
    return this;
  }

  countFailedCases() {
    let count = 0;
    for (const value of this.testsRes.values()) {
      if (value.status === "failed") {
        count++;
      }
    }
    return count;
  }

  countSkippedCases() {
    let count = 0;
    for (const value of this.testsRes.values()) {
      if (value.status === "skipped") {
        count++;
      }
    }
    return count;
  }

  getStatsString(options: TestStatsOptions = {}): string {
    // Override options given in Test({...}) by ones passed in this function
    if (this.data.options) {
      options = Test.overrideOptions(this.data.options, options);
    }

    // Shorthands
    const test = this.data;
    const testName = test.name;

    // Test stats
    const totalCases = this.testsRes.size;
    const failedCases = this.countFailedCases();
    const skippedCases = this.countSkippedCases();
    const passedCases = totalCases - (failedCases + skippedCases);
    const testCoverage =
      totalCases == 0 ? 0 : ((passedCases / totalCases) * 100).toFixed(2);
    const testFailed = failedCases > 0;
    const testSkipped = skippedCases == totalCases;
    const testEmpty = totalCases == 0;

    // Initialize output buffer
    let out = new Printer(3, ` `);

    // Show test status icon
    // out.add(testFailed ? `🔴 ` : `🟢 `);
    if (!testEmpty && testFailed) {
      out.add(`🔴 `);
    } else if (!testEmpty && testSkipped) {
      out.add(`🟡 `);
    } else {
      out.add(`🟢 `);
    }

    // Show test name
    out.add(testName + ` `);

    // Show test short stats
    out.add(`(${passedCases}/${totalCases} passed; ${testCoverage}%)`);

    // No reason to proceed
    if (testEmpty) {
      return out.buffer;
    }

    // Otherwise
    out.newline();
    out.tab();

    // Show a test summary (if failed or enabled)
    if (
      (testFailed && options.showSummaryIfFailed) ||
      options.showSummaryAnyway
    ) {
      out.line(`----`);
      out.line(`total:   ${totalCases}`);
      out.line(`passed:  ${passedCases}`);
      out.line(`failed:  ${failedCases}`);
      if (skippedCases > 0) {
        out.line(`skipped: ${skippedCases}`);
      }
      out.line(`covers:  ${testCoverage}%`);
    }

    // Begin listing test cases (if failed or enabled)
    if (
      !(
        (testFailed && options.showCaseListIfFailed) ||
        options.showCaseListAnyway ||
        options.showCaseDetailsAnyway
      )
    ) {
      return out.buffer; // Otherwise, stop here
    }

    out.line(`----`);

    // For each test case
    let testOrder = 1;
    for (const [caseIndex, caseResult] of this.testsRes) {
      // Test case stats
      const caseData = this.data.cases[caseIndex];
      const caseName = `name` in caseData ? ` (${caseData.name})` : ``;
      const caseStatus = caseResult.status;
      const caseFailed = caseStatus === "failed";
      const caseSkipped = caseStatus === "skipped";

      out.addTab();

      // Show case status icon
      if (caseFailed) {
        out.add(`🔴 `);
      } else if (caseSkipped) {
        out.add(`🟡 `);
      } else {
        out.add(`🟢 `);
      }

      // Show case ordinal number
      out.add(`${testOrder}/${totalCases} `);

      // Show case failed/passed status
      if (caseFailed) {
        out.add(`failed`);
      } else if (caseSkipped) {
        out.add(`skipped`);
      } else {
        out.add(`passed`);
      }

      // Show case name (if available)
      out.add(caseName);
      out.newline();

      // Show case details (if failed or allowed or forced)
      if (
        (caseFailed && options.showCaseDetailsIfFailed) ||
        options.showCaseDetailsAnyway ||
        caseData.details
      ) {
        // out.tab(); // start case details list
        out.line(`----`);

        // Show test case fail reason
        if (caseFailed) {
          out.line(`reason:      ${caseResult.reason!.message}`);
        }

        // Show function input (regardless)
        out.line(`input:       ${Test.getDataString(caseData.input)}`);

        // Show function's expected (error) result
        if ("expectErr" in caseData) {
          out.line(`expectedErr: ${Test.getDataString(caseData.expectErr)}`);
        }
        if ("expect" in caseData) {
          out.line(`expected:    ${Test.getDataString(caseData.expect)}`);
        }

        // Show function's obtained (error) result (if not skipped)
        if (!caseSkipped) {
          if ("resultErr" in caseResult) {
            out.line(
              `resultErr:   ${Test.getDataString(caseResult.resultErr)}`
            );
          } else if ("result" in caseResult) {
            out.line(`result:      ${Test.getDataString(caseResult.result)}`);
          }
        }

        out.line(`----`);
        // out.untab(); // end case details list
      }
      testOrder++;
    }

    // add a trailing line if cases exist and listed
    if (!out.buffer.endsWith(`----\n`)) {
      out.line(`----`);
    }

    out.untab(); // end the list of cases

    return out.buffer;
  }

  static overrideOptions(
    oldOptions: TestStatsOptions,
    newOptions: TestStatsOptions
  ) {
    return { ...oldOptions, ...newOptions };
  }

  static failReason = {
    ExpectedResultDoesNotMatch: {
      code: 0,
      message: `Function result does not match the expected result.`,
    },
    ExpectedErrorButFuncSucceeded: {
      code: 1,
      message: `Expected an error, but the function succeeded.`,
    },
    ExpectedErrorDoesNotMatch: {
      code: 2,
      message: `Function error does not match the expected error.`,
    },
    FuncFailedWithError: {
      code: 3,
      message: `Expected a normal result, but the function threw an error.`,
    },
    MissingExpectedOrExpectedErrField: {
      code: 4,
      message: `Please provide an \`expect\` or \`expectErr\` field (but not both).`,
    },
    EqualFuncFailed: (err: any) => ({
      code: 5,
      message: `Comparison of expected and obtained results (\`equalFunc\`) failed with the following error: \`${JSON.stringify(
        err
      )}\`.`,
    }),
    ErrEqualFuncFailed: (err: any) => ({
      code: 6,
      message: `Comparison of expected and obtained errors (\`errEqualFunc\`) failed with the following error: \`${JSON.stringify(
        err
      )}\`.`,
    }),
    InputDoesNotMatchFuncSignature: (a: number, b: number) => ({
      code: 7,
      message: `The number of arguments in the input does not match the expected signature of \`testFunc\`: ${a} provided, but ${b} expected.`,
    }),
  };

  static getDataString(unknown: any): string {
    if (typeof unknown === "function") {
      return `[function] ${Test.flattenString(unknown.toString())}`;
    }

    if (unknown instanceof Error) {
      return `[${unknown.name}] "${Test.flattenString(unknown.message)}"`;
    }

    if (typeof unknown == "undefined") {
      return `[undefined]`;
    }

    return `[${typeof unknown}] ${JSON.stringify(unknown)}`;
  }

  static errEqualFunc(expectedErr: any, resultErr: any): boolean {
    // Try default matching behavior
    if (Test.equalFunc(expectedErr, resultErr)) {
      return true;
    }

    // Try matching behavior based on `code` or `name` field in
    // error objects
    if (
      expectedErr !== null &&
      resultErr !== null &&
      typeof expectedErr === "object" &&
      typeof resultErr === "object"
    ) {
      if ("code" in expectedErr && "code" in resultErr) {
        return Test.equalFunc(expectedErr.code, resultErr.code);
      } else if ("name" in expectedErr && "name" in resultErr) {
        return Test.equalFunc(expectedErr.name, resultErr.name);
      }
    }

    // Otherwise no luck: provide a custom error comparison function
    // using the `errEqualFunc` property
    return false;
  }

  static equalFunc(expected: any, result: any): boolean {
    // Try direct comparison
    if (expected === result) {
      return true;
    }

    // Try recursive array comparison
    if (Array.isArray(expected) && Array.isArray(result)) {
      if (expected.length !== result.length) return false;
      for (let i = 0; i < expected.length; i++) {
        if (!Test.equalFunc(expected[i], result[i])) return false;
      }
      return true;
    }

    // Try Function comparison
    if (expected instanceof Function && result instanceof Function) {
      return expected === result;
    }

    // Try JSON serialization comparison
    if (JSON.stringify(expected) === JSON.stringify(result)) {
      return true;
    }

    // No luck
    return false;
  }

  static flattenString(
    str: string,
    limit: number = 70,
    endWith: string = `...`
  ): string {
    let result = str.toString().replace(/\n/g, "").replace(/\s+/g, " ");
    if (limit > 0 && result.length > limit) {
      result = result.slice(0, limit - endWith.length) + endWith;
    }
    return result;
  }
}

/**
 * ***************************
 * TestsRunner
 * ***************************
 */

export class TestRunner {
  tests: Map<Test, boolean> = new Map();
  testsOnFocus: Set<Test> = new Set();

  add(...tests: Test[]) {
    tests.forEach((test) => {
      this.tests.set(test, true);
    });
    return this;
  }

  skip(...tests: Test[]) {
    tests.forEach((test) => {
      this.tests.set(test, false);
    });
    return this;
  }

  focus(...tests: Test[]) {
    tests.forEach((test) => {
      this.tests.set(test, true);
      this.testsOnFocus.add(test);
    });
    return this;
  }

  focusOnLast() {
    this.testsOnFocus.clear();
    this.testsOnFocus.add([...this.tests.keys()][this.tests.size - 1]);
    return this;
  }

  run(options: TestStatsOptions = {}) {
    if (this.tests.size == 0 || this.testsOnFocus.size == 0) return;

    let stats = "";
    if (this.testsOnFocus.size > 0) {
      for (const test of this.testsOnFocus) {
      test.execute();
        stats += test.genStatsString(options);
      }
    } else {
      for (const [test, skip] of this.tests) {
        if (skip) return;
        test.execute();
        stats += test.genStatsString(options);
      }
    }
    console.log(stats);

    return this;
  }
}
