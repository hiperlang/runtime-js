import { Test, Compiler, Printer, TestRunner, Errors, Cursor } from "./runtime";

const tester = new TestRunner();

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
      return new Cursor(stream).lineAroundString(i);
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
      return new Cursor(stream).linesBeforeString(i, n);
    },
  })
);

/**
 * ***************************
 * linesAfterArray
 * ***************************
 */
tester.focus(
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
      return new Cursor(stream).linesAfterArray(i, n);
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
        expectErr: Errors.Generic.IndexOutOfBounds(-1, -1),
      },
      {
        name: "Negative out of bounds test",
        input: [` `, -1, 1],
        expectErr: Errors.Generic.IndexOutOfBounds(-1, -1),
      },
    ],
    func: (stream: string, i: number, n: number) => {
      return new Cursor(stream).linesAfterString(i, n);
    },
  })
);

/**
 * ***************************
 * Line printer
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
      const printer = new Printer(4, `+`);
      printer.newline();
      printer.add("line");
      printer.add("0");
      printer.newline();
      printer.line("line1");
      printer.tab();
      printer.line("line2");
      printer.add("line3");
      printer.newline();
      printer.addTab(2);
      printer.add("line4");
      printer.newline();
      printer.untab();
      printer.untab();
      printer.line("line4");
      return printer.buffer;
    },
  })
);

tester.run({ showCaseListAnyway: true });

// TODO: test
// const printer = new LinePrinter(4, ` `);
// printer.add("line");
// printer.add("0");
// printer.nl();
// printer.line("line1");
// printer.tab();
// printer.line("line2");
// printer.add("line");
// printer.add("3");
// printer.nl();
// printer.untab();
// printer.untab();
// printer.line("line4");
// printer.print();
// assert printer.buffer == '...';
