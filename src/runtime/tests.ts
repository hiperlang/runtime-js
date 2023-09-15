import { Test, Tester as TestsRunner, Errors, Cursor } from "./runtime";

/**
 * ***************************
 * getLineAround
 * ***************************
 */

const tester = new TestsRunner();
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
    testFunc: (stream: string, i: number) => {
      return new Cursor(stream).getLineAround(i);
    },
  })
);

/**
 * ***************************
 * getLinesBefore
 * ***************************
 */

tester.add(
  new Test({
    name: "getLinesBeforeI",
    cases: [
      // input: stream, number of lines, i
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
    testFunc: (stream: string, i: number, n: number) => {
      return new Cursor(stream).getLinesBefore(i, n);
    },
  })
);

/**
 * ***************************
 * getLinesAfter
 * ***************************
 */

tester.add(
  new Test({
    name: "getLinesAfterI",
    cases: [
      // input: stream, number of lines, i
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
        input: [``, 1, undefined],
        expectErr: Errors.Generic.IndexOutOfBounds,
        // focus: true,
      },
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
    ],
    testFunc: (stream: string, i: number, n: number) => {
      // throw 11;
      return new Cursor(stream).getLinesAfter(i, n);
    },
  })
);

tester.run();

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
