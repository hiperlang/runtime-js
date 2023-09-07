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
    assert(counter == 1, RuntimeError.LoadedMultipleTimes(url!));
  }

  // Set default target
  let targets = [document.body];

  // However
  if (SELF_SCRIPT?.hasAttribute("scope")) {
    const query = SELF_SCRIPT.getAttribute("scope");
    assert(query != "", RuntimeError.LoadedScopeEmpty());
    // override defaults
    targets = Array.from(document.querySelectorAll(query!));
    assert(targets.length > 0, RuntimeError.LoadedScopeNotFound(query!));
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
  i: number = 0;
  c_line: number = 1;
  c_lvl: number = 0; // indent level
  c_tabsize: number = 0; // indent length
  trim_size: number = -1; // indent length before actual payload starts for every line
  tree: Map<string, string>[] = [new Map()]; // AST
  stream: string = "";

  constructor(stream: string) {
    this.stream = stream;
  }

  // TODO
  // setStream
  // appendStream

  // scanning naming convention:
  // trySpace -- move i forward
  // expectSpace -- move i forward to check and rewind it back
  // mustSpace -- expect+scan

  currChar() {
    return this.stream[this.i];
  }

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
          throw RuntimeError.TODO("Indentation is not aligned");
        } else {
          this.c_lvl++;
          this.tree.push(new Map());
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
      throw RuntimeError.TODO(
        "linesBefore and linesAfter cannot be negative numbers"
      );

    // add shift to i
    const this_i = this.addInRange(this.i, shift, 0, this.stream.length - 1);
  }

  getPrettyLineAroundI(i: number = this.i) {
    // if (this.stream[i] == "\n")
    //   result = this.getLineAroundI(i - 1);
    //   result += "\\n";
  }

  getLineAroundI(i: number = this.i): [string, number] {
    // stream shouldn't be empty
    assert(this.stream.length != 0, RuntimeError.StreamIsEmpty());

    // i must be within stream boundaries
    assert(
      i >= 0 && i < this.stream.length,
      RuntimeError.IndexOutOfBounds(i, this.stream.length)
    );

    // Add before/after the current position trackers
    let ib = i;
    let ia = i;

    // If current position is new line, relate it to the previous line
    if (this.stream[i] == "\n") ib -= 1;

    // Init resulting line
    let line = "";

    // Track the part before the current position
    for (; ib >= 0 && this.stream[ib] != "\n"; ib--) {}

    // Set position before to the beginning of the line
    ib = ib < 0 ? 0 : ib + 1;

    // Track the part after the current position
    for (; ia < this.stream.length && this.stream[ia] != "\n"; ia++) {}

    // Form the line
    line = this.stream.slice(ib, ia) + line;

    // Shift i relative to the beginning of the line
    return [line, i - ib];
  }

  getLinesBeforeI(amount: number, i: number) {}
  getLinesAfterI(amount: number, i: number) {}

  getNonPrintCharName(char: string) {
    switch (char) {
      case undefined:
        return "eof";
      case " ":
        return "space";
      case "\n":
        return "new_line";
      case "\t":
        return "tab_char";
    }
  }

  logStreamAfterI() {
    console.log(this.stream.slice(this.i, this.stream.length));
  }

  logStreamBeforeI() {
    console.log(this.stream.slice(0, this.i + 1));
  }

  logCurrChar() {
    console.log(
      `curr char: ${this.currChar()} (${this.getNonPrintCharName(
        this.currChar()
      )})`
    );
  }

  logSelf() {
    console.log("this.stream:\n", this.stream);
    console.log("this.i: " + this.i);
    console.log("this.c_line: " + this.c_line);
    console.log("this.c_lvl: " + this.c_lvl);
    console.log(
      "this.tree: " + (this.tree.length == 0 ? "[empty]" : this.tree)
    );
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

class RuntimeError {
  // remove
  static TODO = (msg: string): ErrorType => ({
    code: RuntimeError.TODO,
    message: `This is mock ${msg}.`,
  });

  static LoadedMultipleTimes = (url: string): ErrorType => ({
    code: RuntimeError.LoadedMultipleTimes,
    message: `To prevent unexpected behavior, ensure Hyper runtime is loaded once. Consider using a single <script src="${url}"></script> in your project's file.`,
  });

  static LoadedScopeEmpty = (): ErrorType => ({
    code: RuntimeError.LoadedScopeEmpty,
    message: `<script> loading hyper runtime has attribute \`scope\` set to "" (empty). It means no matching elements could be found to operate on. To temporarily disable the runtime, use \`skip\` instead.`,
  });

  static LoadedScopeNotFound = (query: string): ErrorType => ({
    code: RuntimeError.LoadedScopeNotFound,
    message: `<script> loading hyper runtime has \`scope\` attribute set to "${query}", but no matching elements were found.`,
  });

  static IndexOutOfBounds = (i: number, length: number): ErrorType => ({
    code: RuntimeError.IndexOutOfBounds,
    message: `Index (${i}) is out of stream boundaries. ${
      length == 0
        ? `The stream is empty.`
        : `For a stream of length ${length}, valid indices are within [0..${
            length - 1
          }].`
    }`,
  });

  static StreamIsEmpty = (): ErrorType => ({
    code: RuntimeError.StreamIsEmpty,
    message: `The stream is empty.`,
  });
}

/**
 * ***************************
 * Testing
 * ***************************
 */

(function () {
  // return;

  /**
   * ***************************
   * Testing Framework
   * ***************************
   */

  class Test {
    testResults: any[] = [];
    failedTests = new Map<number, number>();

    // TODO: accept object {testName: "Name", ...} instead to initialize
    constructor(
      public testName: string,
      public testCases: (
        | { input: any; expect: any }
        | { input: any; expectErr: any }
      )[],
      public testFunction: (input: any) => any,
      public equalFunction: (
        expected: any,
        obtained: any
      ) => boolean = Test.isEqual,
      public errEqualFunction: (
        expectedErr: any,
        obtainedErr: any
      ) => boolean = Test.errIsEqual
    ) {}

    run() {
      this.testCases.forEach((testCase, testIndex) => {
        // 4 possible reasons a test case can fail:
        try {
          // If the test function went well
          const obtained = this.testFunction(testCase.input);
          this.testResults.push(obtained);

          // But an error was expected
          if ("expectErr" in testCase) {
            this.failedTests.set(testIndex, 1);
          } else {
            // Or the obtained result doesn't match the expected result
            if (!this.equalFunction(testCase.expect, obtained)) {
              this.failedTests.set(testIndex, 0);
            }
          }
        } catch (err) {
          // If the test function threw an exception
          const error = err as ErrorType; // cast
          this.testResults.push(error);

          // Check if an error was expected
          if ("expectErr" in testCase) {
            // Check if the obtained error code matches the expected error code
            if (!this.equalFunction(testCase.expectErr, error.code)) {
              this.failedTests.set(testIndex, 2);
            }
          } else {
            // Handle unexpected errors
            this.failedTests.set(testIndex, 3);
          }
        }
      });

      this.stats();
    }

    static failCodeToString(code: number): string {
      switch (code) {
        case 0:
          return `Obtained function result doesn't match the expected result.`;
        case 1:
          return `Expected an error but the function succeeded.`;
        case 2:
          return `Obtained function error doesn't match the expected error.`;
        case 3:
          return `Expected a normal result but function threw an error.`;
        default:
          return `Wrong error code.`;
      }
    }

    stats() {
      // Initialize output buffer
      let output = "";

      // Display overall test status
      if (this.failedTests.size === 0) {
        output += "🟢"; // All tests passed
      } else {
        output += "🔴"; // At least one test failed
      }

      // Display test name
      output += ` ${this.testName}`;

      // Display short stats if all tests passed
      if (this.failedTests.size === 0) {
        output += ` (${this.testCases.length - this.failedTests.size}/${
          this.testCases.length
        })\n`;
      } else {
        // Display full stats if at least one test failed
        output += "\n";
        output += "----\n";
        output += `total:  ${this.testCases.length}\n`;
        output += `passed: ${this.testCases.length - this.failedTests.size}\n`;
        output += `failed: ${this.failedTests.size}\n`;
        output += `----\n`;

        // For each test case
        this.testCases.forEach((testCase, testIndex) => {
          if (this.failedTests.has(testIndex)) {
            // Display status
            output += `🔴 ${testIndex + 1}/${this.testCases.length} failed\n`;
            output += `   ----\n`;

            // Display fail reason
            const failCode = this.failedTests.get(testIndex);
            output += `   reason:      `;
            output += `${Test.failCodeToString(failCode!)}\n`;

            // Display function input
            output += `   input:       ${JSON.stringify(testCase.input)}\n`;

            // Display what function was expected to return
            if (`expectErr` in testCase) {
              output += `   expectedErr: ${testCase.expectErr.name}\n`;
            } else {
              output += `   expectedRes: ${JSON.stringify(testCase.expect)}\n`;
            }

            // Display what function returned
            const obtained = this.testResults[testIndex];
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
            output += `🟢 ${testIndex + 1}/${this.testCases.length} passed\n`;
          }
        });
      }

      // Flash the output
      console.log(output);
    }

    static errIsEqual(expectedErr: any, obtainedErr: ErrorType): boolean {
      return Test.isEqual(expectedErr, obtainedErr.code);
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
          if (!Test.isEqual(expected[i], obtained[i])) return false;
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
  new Test(
    "getLineAroundI",
    [
      {
        input: [`\n`, 0],
        expect: [``, 0],
      },
      {
        input: [` \n`, 0],
        expect: [` `, 0],
      },
      {
        input: [``, 1],
        expectErr: RuntimeError.StreamIsEmpty,
      },
      {
        input: [` `, 1],
        expectErr: RuntimeError.IndexOutOfBounds,
      },
      {
        input: [` `, 0],
        expect: [` `, 0],
      },
      // (cursor outside the stream)
    ],
    (input: [string, number]) => {
      const stream = input[0];
      const i = input[1];
      const c = new Compiler(stream);
      // console.log(JSON.stringify(c.stream));
      return c.getLineAroundI(i);
    }
  ).run();
})();
