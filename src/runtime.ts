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
  // Don't do anything if `skip` is set
  if (SELF_SCRIPT?.hasAttribute("skip")) return;

  // Check if runtime loaded multiple times
  if (SELF_SCRIPT?.hasAttribute("src")) {
    const url = SELF_SCRIPT.getAttribute("src");
    let counter = 0;
    Array.from(document.getElementsByTagName("script")).forEach((script) => {
      if (script.getAttribute("src") === url!) counter++;
    });
    assert(counter == 1, Runtime.Error.LoadedMultipleTimes(url!));
  }

  // Set the default target for Hyper to operate on
  let targets = [document.body];

  // Override default target if `scope` is set
  if (SELF_SCRIPT?.hasAttribute("scope")) {
    const query = SELF_SCRIPT.getAttribute("scope");
    assert(query != "", Runtime.Error.LoadedScopeEmpty());
    targets = Array.from(document.querySelectorAll(query!));
    assert(targets.length > 0, Runtime.Error.LoadedScopeNotFound(query!));
  }

  // Start runtime if `lazy` is not set
  if (!SELF_SCRIPT?.hasAttribute("lazy")) {
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

  static Error = {
    LoadedMultipleTimes: (url: string) => ({
      code: 1,
      message: `To prevent unexpected behavior, ensure Hyper runtime is loaded once. Consider using a single <script src="${url}"></script> in your project's file.`,
    }),

    LoadedScopeEmpty: () => ({
      code: 2,
      message: `<script> loading hyper runtime has attribute \`scope\` set to "" (empty). It means no matching elements could be found to operate on. To temporarily disable the runtime, use \`skip\` instead.`,
    }),

    LoadedScopeNotFound: (query: string) => ({
      code: 3,
      message: `<script> loading hyper runtime has \`scope\` attribute set to "${query}", but no matching elements were found.`,
    }),
  };
}

/**
 * ***************************
 * Compiler
 * ***************************
 */

// TODO
// scanning naming convention:
// trySpace -- move i forward
// expectSpace -- move i forward to check and rewind it back
// mustSpace -- expect+scan

enum NodeType {
  Root,
  Undefined,
  Comment,
  String,
  Number,
  Name,
  Space,
}

type NodeAttr = {
  // address: derived?
  archetype: NodeType;
  associations: Node[];
  // arguments: Node[];
  // attributes: Node[];
  ascendant: Node;
  affinity: boolean;
  accordance: null | Node[];
  appearance: any;
};

type Node =
  | { type: NodeType.Root; next: Node[]; parent: Node; affinity: boolean }
  | { type: NodeType.Undefined }
  | { type: NodeType.Comment; comment: string }
  | { type: NodeType.String; value: string }
  | { type: NodeType.Number; number: number }
  | { type: NodeType.Name; name: string }
  | { type: NodeType.Space; spaceSize: number };

export class Compiler {
  stream: string = "";

  i: number = 0;
  li: number = 0;
  node: Node = { type: NodeType.Undefined };
  line: number = 1; // current line number

  indSize: number = -1; // indent size for every scope level
  trimSize: number = -1; // leading space size for every line

  tree: Node[][] = [[]]; // root scope is always init-ed
  scope: Node[] = this.tree[0]; // current scope
  level: number = 1; // current scope index

  constructor(stream: string, i: number = 0) {
    this.stream = stream;
    this.i = i;
  }

  enterScope() {
    this.tree.push([]);
    this.scope = this.tree[this.tree.length - 1];
    this.level++;
  }

  savePos() {
    this.li = this.i;
  }

  rewindPos() {
    this.i = this.li;
  }

  commit() {
    // Save node to AST
    // this.cScope.set('','')
  }

  compile() {
    if (this.stream == "") return;

    // Initialize trim size
    if (this.nextFirstIndent_()) {
      // If leading space for the first non-white char exists
      if (this.node.type === NodeType.Space)
        this.trimSize = this.node.spaceSize;
    } else {
      // Otherwise
      this.trimSize = 0;
    }

    // Root scope is already initialized
    // this.enterScope();

    // Proceed...
    this.next();
  }

  initIndentSize() {
    if (this.indSize < 0) {
      if (this.node.type !== NodeType.Space) return;
      this.indSize = this.node.spaceSize;
    }
  }

  // Checks if the current indent aligns with the expected level size
  assertIndentAligned() {
    if (this.node.type !== NodeType.Space) return;
    // Assert tab is aligned with the current indent level
    if (this.node.spaceSize !== this.level * this.indSize) {
      throw Compiler.Error.IndentIsNotAligned();
    }
  }

  // this.skipSpace() in every scan?
  next() {
    while (true) {
      if (this.nextIndent_()) {
        this.initIndentSize();
        this.assertIndentAligned();
        this.enterScope();
        continue;
      } else if (this.nextIs("{")) {
        // TODO
        if (!this.nextIs("}")) {
          this.syntaxErr("Scope is not closed.");
        }
      } else if (this.nextString_()) {
        this.scope.push(this.node);
        if (this.nextNewline()) {
          continue;
        }
      }

      this.logSelf();
      break;
    }
    //
    // while (this.i < this.stream.length) {
    //   let tabSize = this.scanLeadSpace();
    //   if (tabSize > 0) {
    //     // Assert tab is aligned with the current indent level
    //     if (tabSize != this.cIndentLvl * this.cTabSize) {
    //       throw Compiler.Error.IndentIsNotAligned();
    //     }
    //     this.cIndentLvl++;
    //     // Otherwise initialize new tree level
    //     this.tree.push(new Map());
    //   }
    //   // We are ready to parse entities...
    //   this.logSelf();
    //   this.syntaxErr(`Something...`, 10);
    //   break;
    //   this.i++;
    // }
  }

  nextIs(openChar: string): boolean {
    if (this.stream[this.i] === openChar) {
      this.i++;
      return true;
    }
    return false;
  }

  nextNewline() {
    if (this.stream[this.i] === "\n") {
      this.i++;
      this.line++;
      return true;
    }
    return false;
  }

  nextFirstIndent_(): boolean {
    this.savePos();

    // Scan
    let leadSize = 0;
    for (; true; this.i++) {
      const currChar = this.stream[this.i];
      if (currChar === " ") {
        leadSize++;
        continue;
      } else if (currChar === "\n") {
        leadSize = 0;
        this.line++;
        continue;
      }
      break;
    }

    // Save
    if (leadSize > 0) {
      this.node = {
        type: NodeType.Space,
        spaceSize: leadSize,
      };
      return true;
    }
    return false;
  }

  nextIndent_(): boolean {
    this.savePos();

    // Scan
    let leadSize = 0;
    for (; true; this.i++) {
      if (this.stream[this.i] === " ") {
        leadSize++;
        continue;
      }
      break;
    }

    // Save
    if (leadSize > 0) {
      this.node = {
        type: NodeType.Space,
        spaceSize: leadSize,
      };
      return true;
    }
    return false;
  }

  nextString_(): boolean {
    this.savePos();

    // Scan ` (string beginning)
    if (this.stream[this.i] !== "`") return false;
    this.i++;

    // Consume (string content)
    for (; this.i < this.stream.length; this.i++) {
      if (this.stream[this.i] === "`" || this.stream[this.i] === "\n") {
        break;
      }
    }

    // If we didn't end up with `
    if (this.stream[this.i] !== "`") {
      this.syntaxErr(`String is not closed.`);
    }

    // Save
    if (this.i > this.li) {
      this.node = {
        type: NodeType.String,
        value: this.stream.slice(this.li + 1, this.i),
      };
      // Go past `
      this.i++;
      return true;
    }

    this.rewindPos();
    return false;
  }

  //
  //
  //
  //
  //
  //
  //

  syntaxErr(message: string, shift: number = 0) {
    let out = "\n\n" + this.streamAtCurrPos(shift);
    out += `\n[SyntaxError] ` + message + "\n";
    throw out;
  }

  streamAtCurrPos(
    shift: number = 0,
    before: number = 3,
    after: number = 1
  ): string {
    // Add shift to i within stream boundaries
    const i_shifted = this.addInRange(this.i, shift, 0, this.stream.length - 1);

    // Add number of lines given the shift
    const cl_shifted =
      this.line +
      (this.stream.slice(this.i, i_shifted).match(/\n/g) || []).length;

    // Extract lines before and after the cursor
    const linesBefore = this.linesBeforeArray(
      i_shifted,
      Math.max(1, before + 1)
    );
    const linesAfter = this.linesAfterArray(i_shifted, Math.max(1, after + 1));

    // Extract current line
    const clPartBefore = linesBefore[linesBefore.length - 1];
    const clPartAfter = linesAfter[0];
    const cl = clPartBefore + clPartAfter;
    linesBefore[linesBefore.length - 1] = cl;

    // Calc max line number width
    const maxWidth = `${cl_shifted}`.length;

    // Calc starting line number to count from
    let ln = cl_shifted + 1 - linesBefore.length;
    if (ln < 0) ln = 0; // For debugging

    // Print buffer
    let out = "";

    // Print lines before the cursor
    linesBefore.forEach((line) => {
      const pad = " ".repeat(maxWidth - `${ln}`.length);
      out += `${ln}${pad} | ${line}\n`;
      ln++;
    });

    // Print cursor
    {
      // Actual ("unsafe") position in the stream
      const i_actual = this.i + shift;

      // Hint for the cursor
      let hint = ``;

      // Calc the tilde length of the arrow ~~~^
      let tildeLen = maxWidth + 3; // 3 == " | ".length

      // Cursor on a new line
      if (this.stream[i_actual] === "\n") {
        tildeLen += cl.length;
        hint = `(new line)`;
      }
      // Cursor at the end of stream
      else if (i_actual >= this.stream.length) {
        tildeLen += cl.length;
        hint = `(end of stream)`;
      }
      // Cursor at the beginning of stream
      else if (i_actual < 0) {
        tildeLen -= 1;
        hint = `(out of stream)`;
      } else {
        tildeLen += clPartBefore.length;
      }

      // Put cursor
      out += "~".repeat(tildeLen) + "^ " + hint + "\n";
    }

    // Print lines after the cursor
    linesAfter.slice(1).forEach((line) => {
      const pad = " ".repeat(maxWidth - `${ln}`.length);
      out += `${ln}${pad} | ${line}\n`;
      ln++;
    });

    return out;
  }

  logSelf() {
    console.log(this.streamAtCurrPos(0, 2, 1));
    console.log("this.i:", this.i);
    console.log("this.currLine:", this.line);
    console.log("this.currLevel:", this.level);
    console.log("this.lastNode: ", this.node);
    console.log("this.ast:", this.tree.length == 0 ? "[empty]" : this.tree);
  }

  /**
   * Get the line of text around the current pointer position.
   *
   * Example:
   * ```
   *  012345 6
   * \nabcd\n   this.stream
   *     ^      this.i = 3
   * ```
   * If `i` is 3, this function returns `['abcd', 2]`, where 'abcd' is the text
   * on the same line as the pointer (excluding the newline character '\n') and
   * 2 is the pointer relative to the returned line.
   *
   * @param i - The pointer position (default is the current 'this.i' position).
   * @returns A tuple of the line text and pointer's position relative to the
   * returned line.
   */
  linesAround(
    i: number = this.i,
    before: number = 1,
    after: number = 1
  ): [string, number] {
    const partBefore = this.linesBefore(i, before);
    const partAfter = this.linesAfter(i, after);
    return [partBefore + partAfter, partBefore.length];
  }

  linesAroundArray(
    i: number = this.i,
    before: number = 1,
    after: number = 1
  ): [string[], number, number] {
    // Extract lines before and after the cursor
    const linesBefore = this.linesBeforeArray(i, before);
    const linesAfter = this.linesAfterArray(i, after);
    // Extract current line
    const clPartBefore = linesBefore[linesBefore.length - 1];
    const clPartAfter = linesAfter[0];
    const cl = clPartBefore + clPartAfter;
    const clPos = clPartBefore.length;
    linesBefore[linesBefore.length - 1] = cl; // update
    return [
      [...linesBefore, ...linesAfter.slice(1)],
      linesBefore.length - 1,
      clPos,
    ];
  }

  linesBeforeArray(i: number = this.i, n: number = 1): string[] {
    if (n == 0 || this.stream.length == 0) return [];

    // allow
    if (i !== -1) {
      this.assertWithinBoundaries(i);
    } else {
      i = this.stream.length;
    }

    let lines: string[] = [];
    const stream = this.stream; // shorthand

    // Set n to consume all lines if -1 otherwise keep its original value
    // (length of stream + 1 >= the number of possible lines)
    n = n == -1 ? stream.length + 1 : n;

    // Set line counter
    let counter = 0;

    // Set ib (before i) to track backward
    let ib = i - 1;

    // Consume n number of lines forward
    while (true) {
      if (stream[ib] == "\n") {
        lines.push(stream.slice(ib + 1, i)); // '\n' itself stripped
        i = ib; // Start again
        counter++;
      }
      if (counter == n || ib < 0) break;
      ib--;
    }

    // Add last line only if we still need it
    if (counter < n) {
      // If the beginning of the stream was a new line
      if (stream[0] == "\n") {
        lines.push(``); // Add an empty (first) line
      } else {
        // Otherwise add the line that ...
        lines.push(stream.slice(ib + 1, i));
      }
    }

    lines.reverse();

    return lines;
  }

  linesAfterArray(i: number = this.i, n: number = 1): string[] {
    if (n == 0 || this.stream.length == 0) return [];

    this.assertWithinBoundaries(i);

    let lines: string[] = [];
    const stream = this.stream; // shorthand

    // Set n to consume all lines if -1 otherwise keep its original value
    // (length of stream + 1 >= the number of possible lines)
    n = n == -1 ? stream.length + 1 : n;

    // Set line counter
    let counter = 0;

    // Set ia (after i) to track forward
    let ia = i;

    // Consume n number of lines forward
    while (true) {
      if (stream[ia] == "\n") {
        lines.push(stream.slice(i, ia)); // '\n' itself stripped
        ia++; // Jump over '\n'
        i = ia; // Start again
        counter++;
      }
      if (counter == n || ia >= stream.length - 1) break;
      ia++;
    }

    // Add last line only if we still need it
    if (counter < n) {
      // If the end of the stream was a new line
      if (stream[stream.length - 1] == "\n") {
        lines.push(``); // Add an empty line
      } else {
        // Otherwise add the line that didn't end with '\n'
        lines.push(stream.slice(i, ia + 1));
      }
    }

    return lines;
  }

  linesBefore(i: number = this.i, n: number = 1): string {
    if (n == 0 || this.stream.length == 0) return "";

    this.assertWithinBoundaries(i);

    // Step back
    let ib = i - 1;

    // Set line counter
    let count = 0;

    // Consume n number of lines backwards
    while (true) {
      if (this.stream[ib] == "\n") count++;
      if (count == n || ib <= 0) break;
      ib--;
    }

    // Check if we ended up at the end of the previous line
    if (this.stream[ib] == "\n") ib++;

    return this.stream.slice(ib, i);
  }

  linesAfter(i: number = this.i, n: number = 1): string {
    if (n == 0 || this.stream.length == 0) return "";

    this.assertWithinBoundaries(i);

    let ia = i;

    // Set line counter
    let lineCount = 0;

    // Consume n number of lines forward
    while (true) {
      if (this.stream[ia] == "\n") lineCount++;
      if (lineCount == n || ia >= this.stream.length) break;
      ia++;
    }

    if (this.stream[ia] == "\n") ia++;
    // If (this.stream[i] == "\n") i++;

    return this.stream.slice(i, ia);
  }

  // Remove
  assertWithinBoundaries(i: number) {
    // i must be within stream boundaries
    assert(
      i >= 0 && i < this.stream.length,
      Compiler.Error.IndexOutOfBounds(i, this.stream.length)
    );
  }

  addInRange(a: number, b: number, min: number, max: number) {
    const sum = a + b;
    // overflow/underflow check
    if (sum > max) return max;
    if (sum < min) return min;
    return sum;
  }

  /**
   * ***************************
   * Errors
   * ***************************
   */

  // 1xxx for syntactic errors
  // 2xxx for semantic errors
  // 3xxx for type errors
  // 4xxx for compiler options errors
  // 5xxx for command line errors
  static Error = {
    IndentIsNotAligned: () => ({
      code: 1,
      message: `Indentation is not aligned`,
    }),
    IndexOutOfBounds: (i: number, length: number) => ({
      code: 1,
      message: `Index (${i}) is out of stream boundaries. ${
        length === 0
          ? `The stream is empty.`
          : `For a stream of length ${length}, valid indices are within [0..${
              length - 1
            }].`
      }`,
    }),

    StreamIsEmpty: () => ({
      code: 2,
      message: `The stream is empty.`,
    }),
  };
}

/**
 * ***************************
 * Logger
 * ***************************
 */
namespace LoggerTypes {
  export type Column = {
    lines?: string[];

    colWidth?: number | { min?: number; max?: number };
    colCut?: boolean;
    colCutWith?: string;
    colAlign?: "left" | "right" | "center";
    colCenterShift?: "left" | "right";
    colFiller?: string;

    colPost?: string;
    colPre?: string;

    // emptyColFill?: string; // ` `
    // emptyColPrePost?: boolean; // true

    tabSize?: number;
    tabChar?: string;
    tabDepth?: number;
  };
}

export class Logger {
  cols: LoggerTypes.Column[] = [];
  cc: LoggerTypes.Column; // current column
  cci: number = 0; // current column index
  lc: boolean = true; // a hint if a previous line was closed

  constructor(...cols: LoggerTypes.Column[]) {
    // If no columns given, provide a default one
    if (cols.length == 0) {
      this.cols.push(Logger.defaultCol);
    }
    // Otherwise, initialize given columns
    else {
      cols.forEach((col) => {
        col = Logger.mergeColWithDefault(col);
        this.cols.push(col);
      });
    }

    // One column is *always* available after the object construction
    this.cc = this.cols[this.cci];
  }

  static defaultCol: LoggerTypes.Column = {
    lines: [],

    colWidth: -1, // auto fixed width
    colCut: true,
    colCutWith: `.`,
    colAlign: `left`,
    colCenterShift: `left`,
    colFiller: ` `,

    colPost: ``,
    colPre: ``,

    tabDepth: 0,
    tabSize: 2,
    tabChar: ` `,
  };

  static overrideCol(oldCol: LoggerTypes.Column, newCol: LoggerTypes.Column) {
    return { ...oldCol, ...newCol };
  }

  static verifyCol(col: LoggerTypes.Column) {
    function assert(cond: boolean, message: string) {
      if (!cond) throw Logger.Error.IllFormedColumnOption(message);
    }

    // {lines: ...}

    // Make sure 'lines' buffer is always initialized
    if (col.lines === undefined) {
      col.lines = [];
    }

    // If a user provided a default buffer, make sure to copy it for every (new)
    // column to prevent writing to same buffer across separate columns
    if (col.lines === Logger.defaultCol.lines) {
      col.lines = Array.from(Logger.defaultCol.lines);
    }

    assert(
      Array.isArray(col.lines),
      `The 'lines' option should be an array (of strings).`
    );

    // {colLen: ...}

    assert(
      typeof col.colWidth === "number" || typeof col.colWidth === "object",
      `The 'colWidth' option should be either a positive number or an object with 'min' and/or 'max' options.`
    );

    // If length is {colLen: number}
    if (typeof col.colWidth === "number") {
      assert(
        col.colWidth >= -2,
        `The 'colWidth' option accepts only positive numbers (fixed width), -1 (fixed width derived automatically), -2 (float width), or an object with 'min'/'max' options (ranged width).`
      );
      if (col.colWidth === -2) {
        col.colWidth = { min: 0, max: Number.MAX_SAFE_INTEGER };
      } else {
        // -1 will stay for further processing
        col.colWidth = { min: col.colWidth, max: col.colWidth };
      }
    }

    // If length is {colLen: {min: number, max: number}}
    else if (typeof col.colWidth === "object") {
      let min = -1;
      let max = -1;

      if (typeof col.colWidth.min === "number") {
        assert(
          col.colWidth.min! >= 0,
          `The column length 'min' option can only accept positive numbers (>= 0).`
        );
        min = col.colWidth.min!;
      } else {
        min = 0;
      }

      if (typeof col.colWidth.max === "number") {
        assert(
          col.colWidth.max! >= 0,
          `The column length 'max' option can only accept positive numbers (>= 0).`
        );
        max = col.colWidth.max!;
      } else {
        max = Number.MAX_SAFE_INTEGER;
      }

      assert(
        min <= max,
        `The column length 'min' option should be less or equal to 'max'.`
      );

      col.colWidth = { min: min, max: max };
    }

    // {colAlign: ...}

    assert(
      typeof col.colAlign === "string" &&
        (col.colAlign === `left` ||
          col.colAlign === `right` ||
          col.colAlign === `center`),
      `The 'colAlign' option should be either 'left', 'right' or 'center'.`
    );

    // {colCenterShift: ...}

    assert(
      typeof col.colCenterShift === "string" &&
        (col.colCenterShift === `left` || col.colCenterShift === `right`),
      `The 'colCenterShift' option should be either 'left' or 'right'.`
    );

    // {colFiller: ...}

    assert(
      typeof col.colFiller === "string" && col.colFiller.length === 1,
      `The 'filler' option should be a single character.`
    );

    // {colPre/colPost: ...}

    assert(
      typeof col.colPre === "string" && typeof col.colPost === "string",
      `The 'prefix' and 'postfix' options should be strings and are part of the column (min/max) length.`
    );

    // {tabDepth: ...}

    assert(
      typeof col.tabDepth === "number" && col.tabDepth >= 0,
      `The 'tabDepth' option should be a non-negative number.`
    );

    // {tabSize: ...}

    assert(
      typeof col.tabSize === "number" && col.tabSize >= 0,
      `The 'tabSize' option should be a positive number.`
    );

    // {tabChar: ...}

    assert(
      typeof col.tabChar === "string" && col.tabChar.length === 1,
      `The 'tabChar' option should be a single character.`
    );

    // {cut: ...}

    assert(
      typeof col.colCut === "boolean",
      `The 'cut' option should be either true or false.`
    );

    // {cutWith: ...}

    assert(
      typeof col.colCutWith === "string",
      `The 'cutWith' option should be a string. If it exceeds max column length, it will be contracted.`
    );
  }

  static mergeColWithDefault(col: LoggerTypes.Column) {
    const newCol = Logger.overrideCol(Logger.defaultCol, col);
    Logger.verifyCol(newCol);
    return newCol;
  }

  assertWithinBounds(colIndex: number, colLen: number) {
    if (colLen == 0) throw Logger.Error.ColumnsEmpty();

    if (colIndex < 0 || colIndex > colLen - 1)
      throw Logger.Error.ColumnIdxOutOfBoundaries(colIndex, colLen);
  }

  // Helper method to update or reset column options
  private updateOrResetCol(
    colIndex: number,
    colOptions: LoggerTypes.Column,
    reset: boolean = false
  ) {
    // Check
    this.assertWithinBounds(colIndex, this.cols.length);

    // Create base column options
    const baseCol = reset ? Logger.defaultCol : this.cols[colIndex];

    // Override baseCol with provided colOptions
    const updatedCol = Logger.overrideCol(baseCol, colOptions);
    Logger.verifyCol(updatedCol);
    this.cols[colIndex] = updatedCol;

    // Update current column pointer if needed
    if (colIndex === this.cci) {
      this.cc = updatedCol;
    }

    return this;
  }

  // Set current column by index
  updateCurrColIdx(colIndex: number) {
    // Check
    this.assertWithinBounds(colIndex, this.cols.length);

    // Update
    this.cc = this.cols[colIndex];

    return this;
  }

  // Set column options for current column
  updateCurrCol(colOptions: LoggerTypes.Column) {
    return this.updateOrResetCol(this.cci, colOptions, false);
  }

  // Set column options for a given column
  updateColAt(colIndex: number, colOptions: LoggerTypes.Column) {
    return this.updateOrResetCol(colIndex, colOptions, false);
  }

  // Reset column options for the current column
  resetCurrCol(colOptions: LoggerTypes.Column = {}) {
    return this.updateOrResetCol(this.cci, colOptions, true);
  }

  // Reset column options for a given column
  resetColAt(colIndex: number, colOptions: LoggerTypes.Column = {}) {
    return this.updateOrResetCol(colIndex, colOptions, true);
  }

  // Move focus to the next column
  nextCol() {
    // Increment the current column index in a circular manner
    this.cci = (this.cci + 1) % this.cols.length;

    // Update pointer to the current column
    this.cc = this.cols[this.cci];

    return this;
  }

  // Insert characters directly to a line buffer
  insRaw(chars: string) {
    if (chars.length === 0) return this;

    // Assume line buffer always exists
    const colLines = this.cc.lines!;

    // If last line is closed, insert to a new one
    if (this.lc) {
      colLines.push(``);
      this.lc = false;
    }

    // Flash
    colLines[colLines.length - 1] += chars;

    return this;
  }

  // Insert a tab at the current depth
  insRawTab(depth: number = this.cc.tabDepth!) {
    return this.insRaw(this.getTab(depth));
  }

  // Terminate the line to allow next "insRaw"s to use a new one
  insRawEndLine() {
    this.lc = true;
    return this;
  }

  // Insert a full line with indentation if configured
  insLine(chars: string) {
    // Add tab if exists
    chars = this.getTab() + chars;

    // Flash resulting line (assume line buffer always exists)
    this.cc.lines!.push(chars);

    // Close current line
    this.lc = true;

    return this;
  }

  getLastLine(): string {
    return this.cc.lines![this.cc.lines!.length - 1];
  }

  // TODO
  insRow(...colChars: string[]) {}

  // Increase the level of indentation
  incTab(depth: number = 1) {
    this.cc.tabDepth! += depth;
    return this;
  }

  // Decrease the level of indentation
  decTab(depth: number = 1) {
    this.cc.tabDepth! -= depth;
    if (this.cc.tabDepth! < 0) this.cc.tabDepth! = 0;
    return this;
  }

  getTab(
    depth: number = this.cc.tabDepth!,
    size: number = this.cc.tabSize!,
    char: string = this.cc.tabChar!
  ): string {
    if (size <= 0 || depth <= 0 || char === ``) return ``;
    return char.repeat(size).repeat(depth);
  }

  dump(): string {
    // Get max number of lines among all columns
    let maxColLen = 0;
    this.cols.forEach((col) => {
      if (col.lines!.length > maxColLen) {
        maxColLen = col.lines!.length;
      }
    });

    // Check if there are cols that require deriving colWidth automatically
    this.cols.forEach((col) => {
      if (typeof col.colWidth === "object" && col.colWidth.min === -1) {
        // Derive
        let maxLineWidth = 0;
        col.lines?.forEach((line) => {
          if (line.length > maxLineWidth) {
            maxLineWidth = line.length;
          }
        });
        col.colWidth.min = maxLineWidth;
        col.colWidth.max = maxLineWidth;
      }
    });

    // Resulting string
    let out = "";

    // For every line
    for (let lineIdx = 0; lineIdx < maxColLen; lineIdx++) {
      // In every column
      this.cols.forEach((col) => {
        if (typeof col.colWidth !== "object") return; // safe due to verifyCol()
        let line = col.lines![lineIdx]; // safe due to verifyCol()

        // If column lines have ended (the column is shorter than others)
        if (line === undefined) {
          // If width is fixed, put a padding to keep horizontal alignment
          if (col.colWidth.max !== Number.MAX_SAFE_INTEGER) {
            line = col.colFiller!.repeat(col.colWidth.max!);
          } else {
            line = ``;
          }
          line = col.colPre + line;
          line = line + col.colPost;
          out += line;
          return;
        }

        const lineWidth = line.length;
        const lineMinWidth = col.colWidth.min!;
        const lineMaxWidth = col.colWidth.max!;
        // console.log(
        //   "min/max",
        //   lineMinWidth,
        //   lineMaxWidth,
        //   "\n",
        //   "lineWidth",
        //   lineWidth,
        //   "\n",
        //   "line",
        //   line
        // );

        if (lineWidth > lineMaxWidth) {
          if (col.colCut) {
            if (col.colCutWith) {
              if (col.colCutWith.length >= lineMaxWidth) {
                line = col.colCutWith.slice(0, lineMaxWidth);
              } else {
                line =
                  line.slice(0, lineMaxWidth - col.colCutWith.length) +
                  col.colCutWith;
              }
            } else {
              line = line.slice(0, lineMaxWidth);
            }
          }
        } else if (lineWidth < lineMinWidth) {
          const diff = lineMinWidth - lineWidth;
          const pad = col.colFiller!.repeat(diff);
          if (col.colAlign === `left`) {
            line = line + pad;
          } else if (col.colAlign === `right`) {
            line = pad + line;
          } else {
            // `center`
            const lPad = pad.slice(0, Math.ceil(diff / 2));
            const rPad = pad.slice(0, Math.floor(diff / 2));
            if (col.colCenterShift === "left") {
              line = rPad + line + lPad;
            } else {
              line = lPad + line + rPad;
            }
          }
        }

        // Add pre/postfix if set (do not affect min/max length)
        if (col.colPre) line = col.colPre + line;
        if (col.colPost) line = line + col.colPost;

        out += line;
      });

      // End of row
      out += "\n";
    }

    return out;
  }

  print() {
    console.log(this.dump());
  }

  /**
   * Errors
   */
  static Error = {
    IllFormedColumnOption: (message: string) => ({
      code: 2,
      message: `Ill-formed column in Logger. ` + message,
    }),

    ColumnIdxOutOfBoundaries: (i: number, length: number) => ({
      code: 1,
      message: `Column index (${i}) is out of boundaries (the number of columns is ${length}).`,
    }),

    ColumnsEmpty: () => ({
      code: 2,
      message: `Logger should have at least one column configured.`,
    }),

    ColumnContentExceeds: () => ({
      code: 3,
      message: `Column content exceeds the maximum length allowed by the 'max' option.`,
    }),
  };
}

/**
 * ***************************
 * Test
 * ***************************
 */

namespace Tester {
  export type EqualFunc = (expected: any, result: any) => boolean;
  export type TestFunc = (...input: any) => any;
  export type Case = {
    name?: string;
    cases?: Case[];
    input?: any[];
    expect?: any;
    expectErr?: any;
    skip?: boolean;
    focus?: boolean;
    func?: TestFunc;
    equalFunc?: EqualFunc;
    errEqualFunc?: EqualFunc;
    show?: {
      summaryIfFailed?: boolean;
      summaryAnyway?: boolean;
      caseListIfFailed?: boolean;
      caseListAnyway?: boolean;
      caseDetailsIfFailed?: boolean;
      caseDetailsAnyway?: boolean;
    };
    _parent?: Case;
    _finished?: {
      status: string;
      reason?: { code: number; message: any };
      result?: any;
      resultErr?: any;
    };
  };

  // [OK] 1/2 passed "linesBeforeArray" (4/4 passed; 100%)
  //    [OK] 1/4 passed "Bla bla bla"
  //    [OK] 2/4 passed
  //    [OK] 3/4 passed "Foo foo"
  //    [OK] 4/4 passed "Bar"

  class Self {
    cases: Case[] = [];

    constructor(...cases: Case[]) {
      cases.forEach((cs) => {
        Self.correctifyCase(cs);
        this.cases.push(cs);
      });
    }

    static defaultCase: Case = {
      show: {
        summaryIfFailed: false,
        summaryAnyway: false,
        caseListIfFailed: true,
        caseListAnyway: false,
        caseDetailsIfFailed: true,
        caseDetailsAnyway: false,
      },
      _parent: undefined,
    };

    // Recursive
    executeCase(cs: Case) {}

    // Once for all
    executeRoot() {
      this.cases.forEach((cs) => {
        this.executeCase(cs);
      });
    }

    static correctifyCase(cs: Case) {
      // if expect is present, expectErr should not
    }

    add(cs: Case) {
      Self.correctifyCase(cs);
      this.cases.push(cs);
      return this;
    }

    skip(cs: Case) {
      return this;
    }

    focus(cs: Case) {
      Self.correctifyCase(cs);
      cs.focus = true;
      this.cases.push(cs);
      return this;
    }
  }
}

//
//
//
//
//
//
//
//
//

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
  func: TestFunc;
  equalFunc?: TestEqualFunc;
  errEqualFunc?: TestEqualFunc;
  options?: TestStatsOptions;
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

  testResults = new Map<
    number,
    {
      status: string;
      reason?: { code: number; message: any };
      result?: any;
      resultErr?: any;
    }
  >();

  static statsOptionsDefaults: TestStatsOptions = {
    showSummaryIfFailed: false,
    showSummaryAnyway: false,
    showCaseListIfFailed: true,
    showCaseListAnyway: false,
    showCaseDetailsIfFailed: true,
    showCaseDetailsAnyway: false,
  };

  constructor(test: TestData) {
    // Set or override default stats options if nothing provided
    test.options =
      test.options === undefined
        ? Test.statsOptionsDefaults
        : Test.overrideOptions(Test.statsOptionsDefaults, test.options);

    // Set default `equalFunc` if nothing provided
    test.equalFunc =
      test.equalFunc === undefined ? Test.equalFunc : test.equalFunc;

    // Set default `errEqualFunc` if nothing provided
    test.errEqualFunc =
      test.errEqualFunc === undefined ? Test.errEqualFunc : test.errEqualFunc;

    // Set a default test name if nothing provided
    if (test.name === undefined) {
      // Get function name from the `func` if it is not an arrow one
      test.name = test.func.name !== "func" ? test.func.name : "Unnamed test";
    }

    this.data = {
      name: test.name,
      cases: test.cases,
      func: test.func,
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
    const stats = this.dumpStats(options);
    console.log(stats);
  }

  // TODO
  executeCase(testCase: any, testIndex: number) {}

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
        this.testResults.set(testIndex, { status: "skipped" });
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
        this.testResults.set(testIndex, {
          status: "failed",
          reason: Test.Error.MissingExpectedOrExpectedErrField,
        });
        return;
      }

      // (x) Provided test input doesn't match the func signature
      if (testCase.input.length !== test.func.length) {
        this.testResults.set(testIndex, {
          status: "failed",
          reason: Test.Error.InputDoesNotMatchFuncSignature(
            testCase.input.length,
            test.func.length
          ),
        });
        return;
      }

      try {
        const result = test.func(...testCase.input);

        // (x) Testing function was expected to throw error
        if ("expectErr" in testCase) {
          this.testResults.set(testIndex, {
            status: "failed",
            reason: Test.Error.ExpectedErrorButFuncSucceeded,
            result: result,
          });
        } else {
          try {
            // (x) Testing function result doesn't match the expected one
            if (!equalFunc!(testCase.expect, result)) {
              this.testResults.set(testIndex, {
                status: "failed",
                reason: Test.Error.ExpectedResultDoesNotMatch,
                result: result,
              });
            } else {
              // (OK) Testing function result passed the matching test
              this.testResults.set(testIndex, {
                status: "passed",
                result: result,
              });
            }
          } catch (err) {
            // (x) There was an internal error in matching behavior
            this.testResults.set(testIndex, {
              status: "failed",
              reason: Test.Error.EqualFuncFailed(err),
              resultErr: err,
            });
          }
        }
      } catch (resultErr) {
        // (x) Testing function was expected to succeed
        if ("expect" in testCase) {
          this.testResults.set(testIndex, {
            status: "failed",
            reason: Test.Error.FuncFailedWithError,
            resultErr: resultErr,
          });
        } else {
          try {
            // (x) Testing function error doesn't match the expected one
            if (!test.errEqualFunc!(testCase.expectErr, resultErr)) {
              this.testResults.set(testIndex, {
                status: "failed",
                reason: Test.Error.ExpectedErrorDoesNotMatch,
                resultErr: resultErr,
              });
            } else {
              // (OK) Testing function error passed the matching test
              this.testResults.set(testIndex, {
                status: "passed",
                resultErr: resultErr,
              });
            }
          } catch (err) {
            console.log(err);

            // (x) There was an internal error in matching behavior
            this.testResults.set(testIndex, {
              status: "failed",
              reason: Test.Error.ErrEqualFuncFailed(err),
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
    for (const value of this.testResults.values()) {
      if (value.status === "failed") {
        count++;
      }
    }
    return count;
  }

  countSkippedCases() {
    let count = 0;
    for (const value of this.testResults.values()) {
      if (value.status === "skipped") {
        count++;
      }
    }
    return count;
  }

  dumpStats(options: TestStatsOptions = {}): string {
    // Override options given in Test({...}) by ones passed in this function
    if (this.data.options) {
      options = Test.overrideOptions(this.data.options, options);
    }

    // Shorthands
    const test = this.data;
    const testName = test.name;

    // Test stats
    const totalCases = this.testResults.size;
    const failedCases = this.countFailedCases();
    const skippedCases = this.countSkippedCases();
    const passedCases = totalCases - (failedCases + skippedCases);
    const testCoverage =
      totalCases == 0 ? 0 : ((passedCases / totalCases) * 100).toFixed(2);
    const testFailed = failedCases > 0;
    const testSkipped = skippedCases == totalCases;
    const testEmpty = totalCases == 0;

    // Initialize output buffer
    let out = new Logger({ tabSize: 3 });

    // Show test status icon
    if (!testEmpty && testFailed) {
      out.insRaw(`🔴 `);
    } else if (!testEmpty && testSkipped) {
      out.insRaw(`🟡 `);
    } else {
      out.insRaw(`🟢 `);
    }

    // Show test name
    out.insRaw(testName + ` `);

    // Show test short stats
    out.insRaw(`(${passedCases}/${totalCases} passed; ${testCoverage}%)`);
    out.insRawEndLine();

    // No reason to proceed
    if (testEmpty) {
      return out.dump();
    }

    // Otherwise
    out.incTab();

    // Show a test summary (if failed or enabled)
    if (
      (testFailed && options.showSummaryIfFailed) ||
      options.showSummaryAnyway
    ) {
      out.insLine(`    `);
      out.insLine(`total:   ${totalCases}`);
      out.insLine(`passed:  ${passedCases}`);
      out.insLine(`failed:  ${failedCases}`);
      if (skippedCases > 0) {
        out.insLine(`skipped: ${skippedCases}`);
      }
      out.insLine(`covers:  ${testCoverage}%`);
    }

    // Begin listing test cases (if failed or enabled)
    if (
      !(
        (testFailed && options.showCaseListIfFailed) ||
        options.showCaseListAnyway ||
        options.showCaseDetailsAnyway
      )
    ) {
      return out.dump(); // Otherwise, stop here
    }

    out.insLine(`    `); // phony line

    // For each test case
    let testOrder = 1;
    for (const [caseIndex, caseResult] of this.testResults) {
      // Test case stats
      const caseData = this.data.cases[caseIndex];
      const caseName = `name` in caseData ? ` (${caseData.name})` : ``;
      const caseStatus = caseResult.status;
      const caseFailed = caseStatus === "failed";
      const caseSkipped = caseStatus === "skipped";

      out.insRawTab();

      // Show case status icon
      if (caseFailed) {
        out.insRaw(`🔴 `);
      } else if (caseSkipped) {
        out.insRaw(`🟡 `);
      } else {
        out.insRaw(`🟢 `);
      }

      // Show case ordinal number
      out.insRaw(`${testOrder}/${totalCases} `);

      // Show case failed/passed status
      if (caseFailed) {
        out.insRaw(`failed`);
      } else if (caseSkipped) {
        out.insRaw(`skipped`);
      } else {
        out.insRaw(`passed`);
      }

      // Show case name (if available)
      out.insRaw(caseName);
      out.insRawEndLine();

      // Show case details (if failed or allowed or forced)
      if (
        (caseFailed && options.showCaseDetailsIfFailed) ||
        options.showCaseDetailsAnyway ||
        caseData.details
      ) {
        // out.tab(); // start case details list
        out.insLine(`    `);

        // Show test case fail reason
        if (caseFailed) {
          out.insLine(`reason:      ${caseResult.reason!.message}`);
        }

        // Show function input (regardless)
        out.insLine(`input:       ${Test.dumpDataString(caseData.input)}`);

        // Show function's expected (error) result
        if ("expectErr" in caseData) {
          out.insLine(
            `expectedErr: ${Test.dumpDataString(caseData.expectErr)}`
          );
        }
        if ("expect" in caseData) {
          out.insLine(`expected:    ${Test.dumpDataString(caseData.expect)}`);
        }

        // Show function's obtained (error) result (if not skipped)
        if (!caseSkipped) {
          if ("resultErr" in caseResult) {
            out.insLine(
              `resultErr:   ${Test.dumpDataString(caseResult.resultErr)}`
            );
          } else if ("result" in caseResult) {
            out.insLine(
              `result:      ${Test.dumpDataString(caseResult.result)}`
            );
          }
        }

        out.insLine(`    `);
        // out.untab(); // end case details list
      }
      testOrder++;
    }

    // Add a trailing line if cases exist and listed
    if (out.getLastLine() !== `    `) {
      out.insLine(`    `);
    }

    out.decTab(); // end the list of cases

    return out.dump();
  }

  static overrideOptions(
    oldOptions: TestStatsOptions,
    newOptions: TestStatsOptions
  ) {
    return { ...oldOptions, ...newOptions };
  }

  static dumpDataString(unknown: any): string {
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

  static Error = {
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
      message: `The number of arguments in the input does not match the expected signature of \`func\`: ${a} provided, but ${b} expected.`,
    }),
  };
}

/**
 * ***************************
 * TestsRunner
 * ***************************
 */

export class TestRunner {
  // Map<test: skip?>
  tests: Map<Test, boolean> = new Map();
  testsOnFocus: Set<Test> = new Set();

  add(...tests: Test[]) {
    tests.forEach((test) => {
      this.tests.set(test, false);
    });
    return this;
  }

  skip(...tests: Test[]) {
    tests.forEach((test) => {
      this.tests.set(test, true);
    });
    return this;
  }

  focus(...tests: Test[]) {
    tests.forEach((test) => {
      this.tests.set(test, false);
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
    if (this.tests.size == 0) return;

    let stats = "";
    if (this.testsOnFocus.size > 0) {
      for (const test of this.testsOnFocus) {
        test.execute();
        stats += test.dumpStats(options);
      }
    } else {
      for (const [test, skip] of this.tests) {
        if (skip) return;
        test.execute();
        stats += test.dumpStats(options);
      }
    }
    console.log(stats);

    return this;
  }
}

/**
 * ***************************
 * Utilities
 * ***************************
 */

function assert(cond: boolean, error: { code: number; message: string }) {
  if (!cond) throw error;
}
