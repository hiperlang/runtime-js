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
  lineProcessor: StreamProcessor;

  constructor(stream: string) {
    this.stream = stream;
    this.lineProcessor = new StreamProcessor(stream, this.i);
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
          throw Errors.TODO("Indentation is not aligned");
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
      throw Errors.TODO(
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

class StreamProcessor {
  constructor(public stream: string, public i: number = 0) {}

  setI(i: number) {
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

  commonAsserts(i: number) {
    // i must be within stream boundaries
    assert(
      i >= 0 && i < this.stream.length,
      Errors.Generic.IndexOutOfBounds(this.i, this.stream.length)
    );
  }

  getLineAroundI(i: number = this.i): [string, number] {
    this.setI(i);
    const partBefore = this.getLinesBeforeI();
    const partAfter = this.getLinesAfterI();
    return [partBefore + partAfter, partBefore.length];
  }

  getLinesBeforeI(n: number = 1, i: number = this.i): string {
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

  getLinesAfterI(n: number = 1, i: number = this.i): string {
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

  getPrettyCharAtI() {
    if (this.i == this.stream.length) return "EOF";
    return this.getNonPrintCharName(this.getCharAtI());
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

/**
 * ***************************
 * Error Types
 * ***************************
 */

type ErrorType = { code: Function; message: string };

const Errors = {
  // remove
  TODO: (msg: string): ErrorType => ({
    code: Errors.TODO,
    message: `This is mock ${msg}.`,
  }),

  Runtime: {
    LoadedMultipleTimes: (url: string): ErrorType => ({
      code: Errors.Runtime.LoadedMultipleTimes,
      message: `To prevent unexpected behavior, ensure Hyper runtime is loaded once. Consider using a single <script src="${url}"></script> in your project's file.`,
    }),

    LoadedScopeEmpty: (): ErrorType => ({
      code: Errors.Runtime.LoadedScopeEmpty,
      message: `<script> loading hyper runtime has attribute \`scope\` set to "" (empty). It means no matching elements could be found to operate on. To temporarily disable the runtime, use \`skip\` instead.`,
    }),

    LoadedScopeNotFound: (query: string): ErrorType => ({
      code: Errors.Runtime.LoadedScopeNotFound,
      message: `<script> loading hyper runtime has \`scope\` attribute set to "${query}", but no matching elements were found.`,
    }),
  },

  Generic: {
    IndexOutOfBounds: (i: number, length: number): ErrorType => ({
      code: Errors.Generic.IndexOutOfBounds,
      message: `Index (${i}) is out of stream boundaries. ${
        length == 0
          ? `The stream is empty.`
          : `For a stream of length ${length}, valid indices are within [0..${
              length - 1
            }].`
      }`,
    }),

    StreamIsEmpty: (): ErrorType => ({
      code: Errors.Generic.StreamIsEmpty,
      message: `The stream is empty.`,
    }),
  },
};

/**
 * ***************************
 * Tester
 * ***************************
 */

class TestRunner {
  testCaseResults: any[] = [];
  testsFailed = new Map<number, number>();

  constructor(
    public testsName: string,
    public testCases: (
      | { focus?: boolean; name?: string; input: any; expect: any }
      | { focus?: boolean; name?: string; input: any; expectErr: any }
    )[],
    public testFunction: (input: any) => any,
    public equalFunction: (
      expected: any,
      obtained: any
    ) => boolean = TestRunner.isEqual,
    public errEqualFunction: (
      expectedErr: any,
      obtainedErr: any
    ) => boolean = TestRunner.errIsEqual
  ) {}

  add() {}
  pass() {}

  run() {
    // if at least one test case has the "focus" field set
    if (this.testCases.some((testCase) => "focus" in testCase)) {
      // filter out those who doesn't
      this.testCases = this.testCases.filter(
        (testCase) => testCase.focus == true
      );
    }

    this.testCases.forEach((testCase, testIndex) => {
      // 4 possible reasons a test case can fail:
      try {
        // If the test function went well
        const obtained = this.testFunction(testCase.input);
        this.testCaseResults.push(obtained);

        // But an error was expected
        if ("expectErr" in testCase) {
          this.testsFailed.set(testIndex, 1);
        } else {
          // Or the obtained result doesn't match the expected result
          if (!this.equalFunction(testCase.expect, obtained)) {
            this.testsFailed.set(testIndex, 0);
          }
        }
      } catch (err) {
        // TODO: we can't cast the caught error blindly
        // if (err instanceof ErrorType) proceed
        // else throw error Tester failed with internal error
        // console.log(err);

        // If the test function threw an exception
        const error = err as ErrorType; // cast

        this.testCaseResults.push(error);

        // Check if an error was expected
        if ("expectErr" in testCase) {
          // Check if the obtained error code matches the expected error code
          if (!this.equalFunction(testCase.expectErr, error.code)) {
            this.testsFailed.set(testIndex, 2);
          }
        } else {
          // Handle unexpected errors
          this.testsFailed.set(testIndex, 3);
        }
      }
    });
    this.stats();
  }

  static failCodeToString(code: number): string {
    switch (code) {
      case 0:
        return `Function result does not match the expected result.`;
      case 1:
        return `Expected an error, but the function succeeded.`;
      case 2:
        return `Function error does not match the expected error.`;
      case 3:
        return `Expected a normal result, but the function threw an error.`;
      default:
        return `Unknown error code: ${code}.`;
    }
  }

  stats(options = { listCases: true }) {
    // Initialize output buffer
    let output = "";

    // Display overall test status
    if (this.testsFailed.size === 0) {
      output += "🟢"; // All tests passed
    } else {
      output += "🔴"; // At least one test failed
    }

    // Display test name
    output += ` ${this.testsName}`;

    // Display short stats if all tests passed
    if (this.testsFailed.size === 0 && !options.listCases) {
      output += ` (${this.testCases.length - this.testsFailed.size}/${
        this.testCases.length
      })\n`;
    } else {
      // Display full stats if at least one test failed
      output += "\n";
      output += "----\n";
      output += `total:  ${this.testCases.length}\n`;
      output += `passed: ${this.testCases.length - this.testsFailed.size}\n`;
      output += `failed: ${this.testsFailed.size}\n`;
      output += `----\n`;

      // For each test case
      this.testCases.forEach((testCase, testIndex) => {
        if (this.testsFailed.has(testIndex)) {
          // Display status
          output += `🔴 ${testIndex + 1}/${this.testCases.length} failed`;

          // Display case name if available
          if ("name" in testCase) {
            output += ` (${testCase.name})`;
          }
          output += `\n`;

          output += `   ----\n`;

          // Display fail reason
          const failCode = this.testsFailed.get(testIndex);
          output += `   reason:      `;
          output += `${TestRunner.failCodeToString(failCode!)}\n`;

          // Display function input
          output += `   input:       ${JSON.stringify(testCase.input)}\n`;

          // Display what function was expected to return
          if (`expectErr` in testCase) {
            output += `   expectedErr: ${testCase.expectErr.name}\n`;
          } else {
            output += `   expectedRes: ${JSON.stringify(testCase.expect)}\n`;
          }

          // Display what function returned
          const obtained = this.testCaseResults[testIndex];
          if (failCode == 2 || failCode == 3) {
            output += `   obtainedErr: `;
            output += `${(obtained as ErrorType).code.name}\n`;
            output += `   errMessage:  `;
            output += `${(obtained as ErrorType).message}\n`;
          } else {
            output += `   obtainedRes: `;
            output += `${JSON.stringify(obtained)}\n`;
          }
          output += `   ----\n`;
        } else {
          // Display just status for succeeded cases
          output += `🟢 ${testIndex + 1}/${this.testCases.length} passed`;
          // Display case name if available
          if ("name" in testCase) {
            output += ` (${testCase.name})`;
          }
          output += `\n`;
        }
      });
    }

    // Flash the output
    console.log(output);
  }

  static errIsEqual(expectedErr: any, obtainedErr: ErrorType): boolean {
    return TestRunner.isEqual(expectedErr, obtainedErr.code);
  }

  static isEqual(expected: any, obtained: any): boolean {
    // try direct comparison
    if (expected === obtained) {
      return true;
    }

    // try recursive array comparison
    if (Array.isArray(expected) && Array.isArray(obtained)) {
      if (expected.length !== obtained.length) return false;
      for (let i = 0; i < expected.length; i++) {
        if (!TestRunner.isEqual(expected[i], obtained[i])) return false;
      }
      return true;
    }

    // try Function comparison
    if (expected instanceof Function && obtained instanceof Function) {
      return expected === obtained;
    }

    // try JSON serialization comparison
    if (JSON.stringify(expected) === JSON.stringify(obtained)) {
      return true;
    }

    // no luck
    return false;
  }
}

/**
 * ***************************
 * Testing
 * ***************************
 */

// 1 succeeded
// 2 succeeded but error expected (no matter which)
// 3 failed as expected but error mismatch
// 4 failed as expected and errors match

new TestRunner(
  "getLineAroundI",
  [
    {
      name: "Single empty line test",
      input: [`\n`, 0],
      expect: [`\n`, 0],
      // focus: true,
    },
    {
      name: "Double empty line test",
      input: [`\n\n`, 1],
      expect: [`\n`, 0],
    },
    {
      name: "Single empty space test",
      input: [` `, 0],
      expect: [` `, 0],
    },
    {
      name: "Single line test (no shift)",
      input: [`abc\n`, 0],
      expect: [`abc\n`, 0],
    },
    {
      name: "Single line test (positive shift)",
      input: [`abc\n`, 1],
      expect: [`abc\n`, 1],
    },
    {
      name: "Get line test (full shift)",
      input: [`abc\nX`, 3],
      expect: [`abc\n`, 3],
    },
    {
      name: "Get line in the middle test",
      input: [`abc\ndef\nX`, 4],
      expect: [`def\n`, 0],
    },
  ],
  (input: [string, number]) => {
    const stream = input[0];
    const i = input[1];
    return new StreamProcessor(stream).setI(i).getLineAroundI();
  }
).run();

new TestRunner(
  "getLinesBeforeI",
  [
    // input: stream, number of lines, i
    {
      name: "Single empty line test",
      input: [`\n`, 1, 0],
      expect: ``,
    },
    {
      name: "Double empty line test",
      input: [`\n\n`, 1, 1],
      expect: ``,
    },
    {
      name: "Single line test (no shift)",
      input: [`abc\n`, 1, 0],
      expect: ``,
    },
    {
      name: "Single line test (positive shift)",
      input: [`abc\n`, 1, 1],
      expect: `a`,
    },

    {
      name: "Single line test (positive shift)",
      input: [`abc\n`, 1, 3],
      expect: `abc`,
    },
    {
      name: "Get line in the middle test",
      input: [`abc\ndef\n`, 1, 7],
      expect: `def`,
    },
    {
      name: "Get two lines from the end test",
      input: [`abc\ndef\n`, 2, 7],
      expect: `abc\ndef`,
    },
  ],
  (input: [string, number, number]) => {
    const stream = input[0];
    const n = input[1]; // number of lines
    const i = input[2];
    return new StreamProcessor(stream).getLinesBeforeI(n, i);
  }
).run();

new TestRunner(
  "getLinesAfterI",
  [
    // input: stream, number of lines, i
    {
      name: "Single empty line test",
      input: [`\n`, 0, 1],
      expect: `\n`,
    },
    {
      name: "Double empty line test",
      input: [`\n\n`, 0, 1],
      expect: `\n`,
    },
    {
      name: "Single line test 1 (no shift)",
      input: [`abc\n`, 0, 1],
      expect: `abc\n`,
    },
    {
      name: "Single line test 2 (positive shift)",
      input: [`abc\n`, 1, 1],
      expect: `bc\n`,
    },
    {
      name: "Single line test 3 (full shift)",
      input: [`abc\n`, 3, 1],
      expect: `\n`,
    },
    {
      name: "Get line in the middle test",
      input: [`abc\ndef\nX`, 4, 1],
      expect: `def\n`,
    },
  ],
  (input: [string, number, number]) => {
    const stream = input[0];
    const i = input[1];
    const n = input[2];
    return new StreamProcessor(stream).setI(i).getLinesAfterI(n);
  }
).run();

// {
//   name: "Single empty space test",
//   input: [` `, 0],
//   expect: ``,
// },
// {
//   name: "Empty stream test",
//   input: [``, 0],
//   expectErr: Errors.Generic.StreamIsEmpty,
// },
// {
//   name: "Positive out of bound test",
//   input: [` `, 1],
//   expectErr: Errors.Generic.IndexOutOfBounds,
// },
// {
//   name: "Negative out of bound test",
//   input: [` `, -1],
//   expectErr: Errors.Generic.IndexOutOfBounds,
// },
