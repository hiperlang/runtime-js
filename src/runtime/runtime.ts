/*!
 * Hyper Runtime v0.1
 * (c) 2023 Timur Fayzrakhmanov
 * MIT License
 * https://github.com/timfayz/hyper
 */

/**
 * ***************************
 * Script Initialization
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
  // if [skip] set, don't do anything
  if (SELF_SCRIPT?.hasAttribute("skip")) return;

  // avoid loading runtime multiple times
  if (SELF_SCRIPT?.hasAttribute("src")) {
    const url = SELF_SCRIPT.getAttribute("src");
    let counter = 0;
    Array.from(document.getElementsByTagName("script")).forEach((script) => {
      if (script.getAttribute("src") === url!) counter++;
    });
    assert(counter == 1, RuntimeError.LoadedMultipleTimes(url!));
  }

  // set default target
  let targets = [document.body];

  // however
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
    // special case
    if (i == 0 && this.stream.length == 0) return [``, 0];

    assert(
      i >= 0 && i < this.stream.length,
      RuntimeError.IndexOutOfBounds(i, this.stream.length)
    );

    // add before/after the current position trackers
    let ib = i;
    let ia = i;

    // if current position is new line, relate it to the previous line
    if (this.stream[i] == "\n") ib -= 1;

    // init resulting line
    let line = "";

    // track the part before the current position
    for (; ib >= 0 && this.stream[ib] != "\n"; ib--) {}

    // set position before to the beginning of the line
    ib = ib < 0 ? 0 : ib + 1;

    // track the part after the current position
    for (; ia < this.stream.length && this.stream[ia] != "\n"; ia++) {}

    // form the line
    line = this.stream.slice(ib, ia) + line;

    // shift i relative to the beginning of the line
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

function isScriptLoadedAlready(url: string) {
  return Array.from(document.getElementsByTagName("script")).some(
    (script) => script.src === url
  );
}

/**
 * ***************************
 * Error Types
 * ***************************
 */
type ErrorType = { code: Function; message: string };

const RuntimeError = {
  // remove
  TODO: (msg: string): ErrorType => ({
    code: RuntimeError.TODO,
    message: `This is mock ${msg}.`,
  }),

  LoadedMultipleTimes: (url: string): ErrorType => ({
    code: RuntimeError.LoadedMultipleTimes,
    message: `To prevent unexpected behavior, ensure Hyper runtime is loaded once. Consider using a single <script src="${url}"></script> in your project's file.`,
  }),

  LoadedScopeEmpty: (): ErrorType => ({
    code: RuntimeError.LoadedScopeEmpty,
    message: `<script> loading hyper runtime has attribute \`scope\` set to "" (empty). It means no matching elements could be found to operate on. To temporarily disable the runtime, use \`skip\` instead.`,
  }),

  LoadedScopeNotFound: (query: string): ErrorType => ({
    code: RuntimeError.LoadedScopeNotFound,
    message: `<script> loading hyper runtime has \`scope\` attribute set to "${query}", but no matching elements were found.`,
  }),

  IndexOutOfBounds: (i: number, length: number): ErrorType => ({
    code: RuntimeError.IndexOutOfBounds,
    message: `Index (${i}) is out of stream boundaries ${
      length == 0
        ? `(stream is empty \`\`)`
        : `[0..${length - 1}] (stream length is ${length}).`
    }`,
  }),
};

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
    testsObtained: {}[] = [];
    testsSucceeded: number[] = [];
    testsFailed: number[] = [];
    testsFailedErrMsg = new Map<number, string>();

    constructor(
      public testName: string,
      public testCases: { input: any; expect: any }[],
      public testFunction: (input: any) => any,
      public equalityFunction?: (expected: any, obtained: any) => boolean
    ) {}

    run() {
      this.testCases.forEach((testCase, testIndex) => {
        let obtained;
        try {
          obtained = this.testFunction(testCase.input);
          const succeeded = this.equalityFunction
            ? this.equalityFunction(testCase.expect, obtained)
            : this.isEqual(testCase.expect, obtained);
          if (succeeded) {
            this.testsSucceeded.push(testIndex);
          } else {
            this.testsFailed.push(testIndex);
          }
        } catch (err: any) {
          this.testsFailed.push(testIndex);
          this.testsFailedErrMsg.set(testIndex, err.message || err.toString());
        }
        this.testsObtained.push(obtained);
      });

      this.stats();
    }

    stats() {
      // print buffer
      let output = ``;

      // add test status
      output +=
        this.testsSucceeded.length == this.testCases.length ? `🟢` : `🔴`;
      // add test name
      output += ` ${this.testName}\n`;
      output += `----\n`;
      // if at least one case failed
      if (this.testsSucceeded.length != this.testCases.length) {
        // add full stats
        output += `total:  ${this.testCases.length}\n`;
        output += `passed: ${this.testsSucceeded.length}\n`;
        output += `failed: ${this.testsFailed.length}\n`;
        output += `----\n`;
        // per each case
        this.testCases.forEach((testCase, testIndex) => {
          // if succeeded, add only status
          if (this.testsSucceeded.includes(testIndex)) {
            output += `🟢 ${testIndex + 1}/${this.testCases.length} passed\n`;
          }
          // if failed, add status and details
          else {
            output += `🔴 ${testIndex + 1}/${this.testCases.length} failed\n`;
            output += `   ----\n`;
            output += `   input:    ${JSON.stringify(testCase.input)}\n`;
            output += `   expected: ${JSON.stringify(testCase.expect)}\n`;
            output += `   obtained: `;
            output += this.testsFailedErrMsg.get(testIndex)
              ? `[Error] ${this.testsFailedErrMsg.get(testIndex)}\n`
              : `${JSON.stringify(this.testsObtained[testIndex])}`;
            output += `   ----\n`;
          }
        });

        // flash
        console.log(output);
      }
    }

    isEqual(expected: any, obtained: any): boolean {
      return JSON.stringify(expected) === JSON.stringify(obtained);
    }
  }

  /**
   * ***************************
   * Testing
   * ***************************
   */
  new Test(
    "getLineAroundI",
    [
      {
        input: [`\n`, 0],
        expect: [`\\n`, 0],
      },
      {
        input: [` \n`, 0],
        expect: [` `, 0],
      },
      {
        input: [``, 1],
        expect: [``, 1],
      },
      {
        input: [` `, 0],
        expect: [` `, 0],
      },
      // (cursor outside the stream)
      {
        input: [` `, 1],
        expect: [` `, 0],
      },
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
