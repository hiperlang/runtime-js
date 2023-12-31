import { Test, Compiler, TestRunner, Logger } from "./runtime";

const tester = new TestRunner();
/*

1 | `Hello world!`
2 |   this.new
~~~~~~^ 
3 | if (bla) =>

forEach(line, index =>
  addRow(index + 1, line)
addPointLine(6, `^`, `~`)

pointPos(i, pointer, filler)
*/

/**
 * ***************************
 * lineAround
 * ***************************
 */
tester.add(
  new Test({
    name: "getLineAround",
    cases: [
      {
        name: "Single empty line test",
        input: [`\n`, 0],
        expect: [`\n`, 0],
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
    func: (stream: string, i: number) => {
      return new Compiler(stream).linesAround(i);
    },
  })
);

/**
 * ***************************
 * linesBefore
 * ***************************
 */
tester.add(
  new Test({
    name: "getLinesBeforeI",
    cases: [
      // input: stream, i, number of lines
      {
        name: "Single empty line test",
        input: [`\n`, 0, 1],
        expect: ``,
      },
      {
        name: "Double empty line test",
        input: [`\n\n`, 1, 1],
        expect: ``,
      },
      {
        name: "Single line test (no shift)",
        input: [`abc\n`, 0, 1],
        expect: ``,
      },
      {
        name: "Single line test (positive shift)",
        input: [`abc\n`, 1, 1],
        expect: `a`,
      },
      {
        name: "Single line test (positive shift)",
        input: [`abc\n`, 3, 1],
        expect: `abc`,
      },
      {
        name: "Get line in the middle test",
        input: [`abc\ndef\n`, 7, 1],
        expect: `def`,
      },
      {
        name: "Get two lines from the end test",
        input: [`abc\ndef\n`, 7, 2],
        expect: `abc\ndef`,
      },
      {
        name: "Get zero lines test",
        input: [`abc\ndef\n`, 4, 0],
        expect: ``,
      },
    ],
    func: (stream: string, i: number, n: number) => {
      return new Compiler(stream).linesBefore(i, n);
    },
  })
);

/**
 * ***************************
 * linesAfter
 * ***************************
 */
tester.add(
  new Test({
    name: "getLinesAfter",
    cases: [
      // input: stream, i, number of lines
      {
        name: "Single empty line test",
        input: [`\n`, 0, 1],
        expect: `\n`,
      },
      {
        name: "Double empty line test",
        input: [`\n\na`, 1, 1],
        expect: `\n`,
      },
      {
        name: "Single line test (no shift)",
        input: [`abc\n`, 0, 1],
        expect: `abc\n`,
      },
      {
        name: "Single line test (positive shift)",
        input: [`abc\n`, 1, 1],
        expect: `bc\n`,
      },
      {
        name: "Get line in the middle test",
        input: [`abc\ndef\ng`, 4, 1],
        expect: `def\n`,
      },
      {
        name: "Get two lines from the the beginning test",
        input: [`abc\ndef\ng`, 1, 2],
        expect: `bc\ndef\n`,
      },
      {
        name: "Get zero lines test",
        input: [`abc\ndef\n`, 4, 0],
        expect: ``,
      },
      {
        name: "Empty stream test",
        input: [``, 0, 2],
        expect: ``,
      },
      {
        name: "Positive out of bounds test",
        input: [` `, 1, 1],
        expectErr: Compiler.Error.IndexOutOfBounds(-1, -1),
      },
      {
        name: "Negative out of bounds test",
        input: [` `, -1, 1],
        expectErr: Compiler.Error.IndexOutOfBounds(-1, -1),
      },
    ],
    func: (stream: string, i: number, n: number) => {
      return new Compiler(stream).linesAfter(i, n);
    },
  })
);

/**
 * ***************************
 * linesAfterArray
 * ***************************
 */
tester.add(
  new Test({
    name: "linesAfterArray",
    cases: [
      // stream, i, n
      {
        name: "Empty line test",
        input: [``, 0, 2],
        expect: [],
      },
      {
        name: "Single empty space test",
        input: [` `, 0, 2],
        expect: [` `],
      },
      {
        name: "Single new line test",
        input: [`\n`, 0, 2],
        expect: [``, ``],
      },
      {
        name: "Single line w/o new line test",
        input: [`123`, 0, 2],
        expect: [`123`],
      },
      {
        name: "Three normal lines test",
        input: [`1\n2\n3`, 0, 3],
        expect: [`1`, `2`, `3`],
      },
      {
        name: "Three normal lines test (limit to 2)",
        input: [`1\n2\n3`, 0, 2],
        expect: [`1`, `2`],
      },
      {
        name: "Three normal lines test (limit to 0)",
        input: [`1\n2\n3`, 0, 0],
        expect: [],
      },
      {
        name: "Three normal lines test (no limit; -1)",
        input: [`1\n2\n3`, 0, -1],
        expect: [`1`, `2`, `3`],
      },
      {
        name: "End of stream test",
        input: [`1\n2\n3`, 4, -1],
        expect: [`3`],
      },
    ],
    func: (stream, i, n) => {
      return new Compiler(stream).linesAfterArray(i, n);
    },
  })
);

/**
 * ***************************
 * linesBeforeArray
 * ***************************
 */
tester.add(
  new Test({
    name: "linesBeforeArray",
    cases: [
      // stream, i, n
      {
        name: "Empty line test",
        input: [``, 0, 2],
        expect: [],
      },
      {
        name: "Single empty space test",
        input: [` `, 0, 2],
        expect: [``],
      },
      {
        name: "Single new line test",
        input: [`\n`, 0, 2],
        expect: [``],
      },
      {
        name: "Single line w/o new line at the end test",
        input: [`123`, 2, 2],
        expect: [`12`],
      },
      {
        name: "Single normal line test",
        input: [`123\n`, 3, 2],
        expect: [`123`],
      },
      {
        name: "Three normal lines test",
        input: [`1\n2\n3`, 4, 3],
        expect: [`1`, `2`, ``],
      },
      {
        name: "Three normal lines test (limit to 2)",
        input: [`1\n2\n3`, 4, 2],
        expect: [`2`, ``],
      },
      {
        name: "Three normal lines test (limit to 0)",
        input: [`1\n2\n3`, 4, 0],
        expect: [],
      },
      {
        name: "Three normal lines test (no limit; n = -1)",
        input: [`1\n2\n3`, 4, -1],
        expect: [`1`, `2`, ``],
      },
      {
        name: "All lines from the end test (i = -1)",
        input: [`1\n2\n3`, -1, -1],
        expect: [`1`, `2`, `3`],
      },
    ],
    func: (stream, i, n) => {
      return new Compiler(stream).linesBeforeArray(i, n);
    },
  })
);

/**
 * ***************************
 * Logger
 * ***************************
 */
tester.add(
  new Test({
    name: `Line printer`,
    cases: [
      {
        input: [],
        expect: `
line0
line1
++++line2
line3
++++++++line4
line4
`,
      },
    ],
    func: () => {
      const logger = new Logger({ tabSize: 4, tabChar: `+`, colWidth: -2 });
      logger.insLine("");
      logger.insRaw("line");
      logger.insRaw("0");
      logger.insLine("line1");
      logger.incTab();
      logger.insLine("line2");
      logger.insRaw("line3");
      logger.insRawEndLine();
      logger.insRawTab(2);
      logger.insRaw("line4");
      logger.insRawEndLine();
      logger.decTab();
      logger.decTab();
      logger.insLine("line4");
      return logger.dump();
    },
  })
);

/**
 * ***************************
 * Compiler
 * ***************************
 */
// ....

tester.run({ showCaseListAnyway: true });

// Logger.defaultCol.lines = ["++ "];
// const log = new Logger(
//   {
//     colPost: " + ",
//     colAlign: "center",
//     colWidth: -2,
//     colCut: true,
//   },
//   {}
// );
// log.insLine("|--|");
// log.insLine("|----|");
// log.nextCol();
// log.insLine("|----|");
// log.insLine("|--|");
// log.insLine("|----|");
// log.print();

console.log("Error printing:");
new Compiler(`
\`Hello\`
  \`World\``).compile();
