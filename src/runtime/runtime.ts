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
 * Save currentScript as soon as possible to have an access to the runtime
 * loading <script> later on.
 */
const SELF_SCRIPT = document.currentScript;

/**
 * Start Hyper runtime when the document is fully loaded and run it on each
 * target separately.
 */
document.addEventListener("DOMContentLoaded", () => {
  // If `skip` set, don't do anything
  if (SELF_SCRIPT?.hasAttribute("skip")) return;

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

  // start runtime
  const runtime = new Runtime(targets);
  runtime.runOnTargets();
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
 * LineProcessor
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
 * Liner
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

function createError(code: Function, message: string): ErrorType {
  return { code, message };
}

// 1xxx for syntactic errors
// 2xxx for semantic errors
// 3xxx for type errors
// 4xxx for compiler options errors
// 5xxx for command line errors
export const Errors = {
  Runtime: {
    LoadedMultipleTimes: (url: string) =>
      createError(
        Errors.Runtime.LoadedMultipleTimes,
        `To prevent unexpected behavior, ensure Hyper runtime is loaded once. Consider using a single <script src="${url}"></script> in your project's file.`
      ),

    LoadedScopeEmpty: () =>
      createError(
        Errors.Runtime.LoadedScopeEmpty,
        `<script> loading hyper runtime has attribute \`scope\` set to "" (empty). It means no matching elements could be found to operate on. To temporarily disable the runtime, use \`skip\` instead.`
      ),

    LoadedScopeNotFound: (query: string) =>
      createError(
        Errors.Runtime.LoadedScopeNotFound,
        `<script> loading hyper runtime has \`scope\` attribute set to "${query}", but no matching elements were found.`
      ),
  },

  Tests: {
    ErrEqualFunctionBadArgs: () =>
      createError(
        Errors.Tests.ErrEqualFunctionBadArgs,
        "The standard error matching behavior expects errors in the `expectErr` property of the test cases and those thrown by the testing function to be objects with a `code` or `name` field. Otherwise, provide a custom error comparison function using the `errEqualFunc` property."
      ),
  },

  Generic: {
    IndexOutOfBounds: (i: number, length: number) =>
      createError(
        Errors.Generic.IndexOutOfBounds,
        `Index (${i}) is out of stream boundaries. ${
          length === 0
            ? `The stream is empty.`
            : `For a stream of length ${length}, valid indices are within [0..${
                length - 1
              }].`
        }`
      ),

    StreamIsEmpty: () =>
      createError(Errors.Generic.StreamIsEmpty, `The stream is empty.`),
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
    name?: string;
    input: any[];
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
  showCaseListIfFailed?: boolean;
  showCaseDetailsIfFailed?: boolean;
  showCaseDetailsAnyway?: boolean;
};

export class Test {
  data: TestData;
  testsResults = new Map<number, any>();
  testsFailed = new Map<number, { code: number; message: any }>();
  static statsOptions: TestStatsOptions = {
    showSummaryIfFailed: false,
    showCaseListIfFailed: true,
    showCaseDetailsIfFailed: true,
    showCaseDetailsAnyway: false,
  };

  constructor({
    name,
    cases,
    testFunc,
    options = Test.statsOptions,
    equalFunc = Test.isEqual,
    errEqualFunc = Test.errIsEqual,
  }: TestData) {
    if (name === undefined) {
      name = `${testFunc.name}`;
    }
    this.data = {
      name,
      cases,
      options,
      testFunc,
      equalFunc,
      errEqualFunc,
    };
  }

  run(options: TestStatsOptions = {}) {
    if (this.data.options) {
      options = Test.overrideOptions(this.data.options, options);
    }
    this.execute();
    const stats = this.getStatsString(options);
    console.log(stats);
  }

  execute() {
    const test = this.data; // shorthand

    // If test cases are missing, no reason to continue
    if (test.cases.length == 0) return;

    // If at least one test case has `focus` field set
    if (test.cases.some((testCase) => "focus" in testCase)) {
      // filter out those who doesn't
      test.cases = test.cases.filter((testCase) => testCase.focus == true);
    }

    test.cases.forEach((testCase, testIndex) => {
      // Exclude from processing if test case has `skip` set
      if (testCase.skip) {
        return;
      }

      // Get per-case equalFunc if available
      const equalFunc = testCase.equalFunc
        ? testCase.equalFunc
        : test.equalFunc;

      // Start testing...
      // There are several reasons for a test case to fail:

      // (x) An ill-formed test case
      if (!("expect" in testCase || "expectErr" in testCase)) {
        this.testsFailed.set(
          testIndex,
          Test.failReason.MissingExpectedResultField
        );
        this.testsResults.set(testIndex, undefined);
        return;
      }

      // (x) The provided input doesn't match testFunc signature
      if (testCase.input.length !== test.testFunc.length) {
        this.testsFailed.set(
          testIndex,
          Test.failReason.InputDoesNotMatchFuncSignature(
            testCase.input.length,
            test.testFunc.length
          )
        );
        this.testsResults.set(testIndex, undefined);
        return;
      }

      // Or
      try {
        // The testing function succeeded
        const result = test.testFunc(...testCase.input);
        this.testsResults.set(testIndex, result);

        if ("expectErr" in testCase) {
          // (x) But an error was expected
          this.testsFailed.set(
            testIndex,
            Test.failReason.ExpectedErrorButFuncSucceeded
          );
        } else {
          try {
            // (x) Or the result doesn't match the expected one
            if (!equalFunc!(testCase.expect, result)) {
              this.testsFailed.set(
                testIndex,
                Test.failReason.ExpectedResultDoesNotMatch
              );
            }
          } catch (err) {
            // (x) Or there is an internal error in matching behavior
            this.testsFailed.set(testIndex, Test.failReason.EqualFuncFailed);
            this.testsResults.set(testIndex, undefined);
          }
        }
      } catch (resultErr) {
        // The testing function threw an error
        this.testsResults.set(testIndex, resultErr);

        if ("expect" in testCase) {
          // (x) But the function was expected to succeed
          this.testsFailed.set(testIndex, Test.failReason.FuncFailedWithError);
        } else {
          try {
            // (x) Or the resulting error doesn't match the expected one
            if (!test.errEqualFunc!(testCase.expectErr, resultErr)) {
              this.testsFailed.set(
                testIndex,
                Test.failReason.ExpectedErrorDoesNotMatch
              );
            }
          } catch (err) {
            // (x) Or there is an internal error in matching behavior
            this.testsFailed.set(testIndex, Test.failReason.ErrEqualFuncFailed);
            this.testsResults.set(testIndex, undefined);
          }
        }
      }
    });
    return this;
  }

  getStatsString(options: TestStatsOptions = {}): string {
    options = Test.overrideOptions(Test.statsOptions, options);

    const test = this.data; // shorthand
    const testName = test.name;
    const totalCases = this.testsResults.size;
    const failedCases = this.testsFailed.size;
    const testFailed = this.testsFailed.size > 0 || totalCases == 0;
    const passedCases = totalCases - failedCases;
    const coverage =
      totalCases == 0
        ? 0
        : (((totalCases - failedCases) / totalCases) * 100).toFixed(2);

    // Initialize output buffer
    let out = new Printer(3, ` `);

    // Show test status icon
    out.add(testFailed ? `🔴 ` : `🟢 `);

    // Show test name
    out.add(testName + ` `);

    // Show test short stats
    out.add(`(${passedCases}/${totalCases} passed; ${coverage}%)`);

    if (totalCases === 0) {
      return out.buffer;
    }

    out.newline();

    out.tab(); // start the list of cases

    // Show test summary
    if (testFailed && options.showSummaryIfFailed) {
      out.line(`----`);
      out.line(`total:  ${totalCases}`);
      out.line(`passed: ${passedCases}`);
      out.line(`failed: ${failedCases}`);
      out.line(`covers: ${coverage}%`);
    }

    // Show list of test cases
    if (testFailed && !options.showCaseListIfFailed) {
      return out.buffer;
    }

    out.line(`----`);

    // For each test case result
    let testOrder = 1;
    for (const [testIndex, testResult] of this.testsResults) {
      const testCase = this.data.cases[testIndex];
      const caseFailed = this.testsFailed.has(testIndex);
      const failReason = this.testsFailed.get(testIndex);

      out.addTab();

      // Show case status icon
      out.add(caseFailed ? `🔴 ` : `🟢 `);

      // Show case ordinal number
      out.add(`${testOrder}/${totalCases} `);

      // Show case failed/passed status
      out.add(caseFailed ? `failed` : `passed`);

      // Show case name (if available)
      out.add(`name` in testCase ? `  (${testCase.name})` : ``);
      out.newline();

      // Show case details (if failed and display not suppressed)
      if (
        (caseFailed && options.showCaseDetailsIfFailed) ||
        options.showCaseDetailsAnyway ||
        testCase.details
      ) {
        // out.tab(); // start case details list
        out.line(`----`);

        // Show case fail reason
        if (caseFailed) {
          out.line(`reason:      ${failReason!.message}`);
          // Do not proceed if the test case is not well-formed
          if (
            failReason!.code == Test.failReason.MissingExpectedResultField.code
          )
            return out.buffer;
        }

        // Show function input (regardless)
        out.line(`input:       ${Test.getDataString(testCase.input)}`);

        // Show function's expected and obtained result
        if ("expectErr" in testCase) {
          out.line(`expectedErr: ${Test.getDataString(testCase.expectErr)}`);
          out.line(`resultErr:   ${Test.getDataString(testResult)}`);
        } else {
          out.line(`expected:    ${Test.getDataString(testCase.expect)}`);
          out.line(`result:      ${Test.getDataString(testResult)}`);
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
    MissingExpectedResultField: {
      code: 4,
      message: `Ill-formed test case. Please provide an \`expect\` or \`expectErr\` field.`,
    },
    EqualFuncFailed: {
      code: 5,
      message: (err: any) =>
        `The provided function for comparing expected and obtained results (\`equalFunc\`) failed with the following error: \`${err}\`.`,
    },
    ErrEqualFuncFailed: {
      code: 6,
      message: (err: any) =>
        `The provided function for comparing expected and obtained errors (\`errEqualFunc\`) failed with the following error: \`${err}\`.`,
    },
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

  static errIsEqual(expectedErr: any, resultErr: any): boolean {
    // The default errors comparison is based on `code` or `name` fields
    assert(
      typeof expectedErr == "object" &&
        typeof resultErr == "object" &&
        (("code" in expectedErr && "code" in resultErr) ||
          ("name" in expectedErr && "name" in resultErr)),
      Errors.Tests.ErrEqualFunctionBadArgs()
    );
    // return false;
    // given the assert above, we can simplify conditions
    if ("code" in expectedErr) {
      return Test.isEqual(expectedErr.code, resultErr.code);
    } else {
      return Test.isEqual(expectedErr.name, resultErr.name);
    }
  }

  static isEqual(expected: any, result: any): boolean {
    // try direct comparison
    if (expected === result) {
      return true;
    }

    // try recursive array comparison
    if (Array.isArray(expected) && Array.isArray(result)) {
      if (expected.length !== result.length) return false;
      for (let i = 0; i < expected.length; i++) {
        if (!Test.isEqual(expected[i], result[i])) return false;
      }
      return true;
    }

    // try Function comparison
    if (expected instanceof Function && result instanceof Function) {
      return expected === result;
    }

    // try JSON serialization comparison
    if (JSON.stringify(expected) === JSON.stringify(result)) {
      return true;
    }

    // no luck
    return false;
  }

  static flattenString(
    str: string,
    limit: number = 70,
    endIfExceeds: string = `...`
  ): string {
    let result = str.toString().replace(/\n/g, "").replace(/\s+/g, " ");
    if (limit > 0 && result.length > limit) {
      result = result.slice(0, limit - endIfExceeds.length) + endIfExceeds;
    }
    return result;
  }
}

/**
 * ***************************
 * Tester
 * ***************************
 */

export class Tester {
  tests: Test[] = [];

  add(...tests: Test[]) {
    this.tests.push(...tests);
    return this;
  }

  skip(...tests: Test[]) {
    return this;
  }

  focus(...tests: Test[]) {
    this.tests = tests;
  }

  skipOn(...testsIndices: number[]) {
    this.tests = this.tests.filter((_, i) => !testsIndices.includes(i));
    return this;
  }

  focusOn(...testsIndices: number[]) {
    this.tests = testsIndices.map((i) => this.tests[i]);
    return this;
  }

  setForAll({
    ErrIsEqual,
  }: {
    ErrIsEqual?: (expectedErr: any, resultErr: any) => boolean;
  }) {
    if (ErrIsEqual)
      this.tests.forEach((test) => {
        test.data.errEqualFunc = ErrIsEqual;
      });
  }

  run(options: TestStatsOptions = {}) {
    if (this.tests.length == 0) return;

    let stats = "";
    this.tests.forEach((test) => {
      test.execute();
      stats += test.getStatsString(options);
    });
    console.log(stats);

    return this;
  }
}
