import { Test } from "./runtime";

/**
 * ***************************
 * Testing
 * ***************************
 */

new Test({
  name: "Test addition",
  cases: [
    {
      input: [1, 2],
      expect: 3,
    },
    {
      input: [1, 2],
      expectErr: new Error("MyErrorName"),
    },

    // {
    //   input: [1, 2],
    //   expectErr: Errors.Tests.ErrEqualFunctionBadArgs,
    // },

    // {
    //   input: [1, 2],
    //   expectErr: () => 10,
    // },

    // {
    //   input: [1, 2],
    //   expectErr: { asd: 1, fds: 2 },
    // },

    // {
    //   input: [1, 2],
    //   expectErr: 9,
    // },

    // {
    //   input: [1, 2],
    //   expectErr: null,
    // },

    // {
    //   input: [1, 2],
    //   expect: 4,
    // },
  ],
  func: (a: number, b: number) => {
    throw new Error("MyErrorName");
    return a + b;
  },
  // equalFunc: (a, b) => {
  //   return false;
  // },
})
  .run()
  .printStats();

// 1 succeeded
// 2 succeeded but error expected (no matter which)
// 3 failed as expected but error mismatch
// 4 failed as expected and errors match

// const tester = new TestRunner();
// tester.add(new Test({
//   name: "getLineAroundI",
//   cases: [
//     {
//       name: "Single empty line test",
//       input: [`\n`, 0],
//       expect: [`\n`, 0],
//       // focus: true,
//     },
//     {
//       name: "Double empty line test",
//       input: [`\n\n`, 1],
//       expect: [`\n`, 0],
//     },
//     {
//       name: "Single empty space test",
//       input: [` `, 0],
//       expect: [` `, 0],
//     },
//     {
//       name: "Single line test (no shift)",
//       input: [`abc\n`, 0],
//       expect: [`abc\n`, 0],
//     },
//     {
//       name: "Single line test (positive shift)",
//       input: [`abc\n`, 1],
//       expect: [`abc\n`, 1],
//     },
//     {
//       name: "Get line test (full shift)",
//       input: [`abc\nX`, 3],
//       expect: [`abc\n`, 3],
//     },
//     {
//       name: "Get line in the middle test",
//       input: [`abc\ndef\nX`, 4],
//       expect: [`def\n`, 0],
//     },
//   ],
//   function: (input: [string, number]) => {
//     const stream = input[0];
//     const i = input[1];
//     return new StreamProcessor(stream).setI(i).getLineAroundI();
//   }
// });

// new TestRunner(
//   "getLinesBeforeI",
//   [
//     // input: stream, number of lines, i
//     {
//       name: "Single empty line test",
//       input: [`\n`, 1, 0],
//       expect: ``,
//     },
//     {
//       name: "Double empty line test",
//       input: [`\n\n`, 1, 1],
//       expect: ``,
//     },
//     {
//       name: "Single line test (no shift)",
//       input: [`abc\n`, 1, 0],
//       expect: ``,
//     },
//     {
//       name: "Single line test (positive shift)",
//       input: [`abc\n`, 1, 1],
//       expect: `a`,
//     },

//     {
//       name: "Single line test (positive shift)",
//       input: [`abc\n`, 1, 3],
//       expect: `abc`,
//     },
//     {
//       name: "Get line in the middle test",
//       input: [`abc\ndef\n`, 1, 7],
//       expect: `def`,
//     },
//     {
//       name: "Get two lines from the end test",
//       input: [`abc\ndef\n`, 2, 7],
//       expect: `abc\ndef`,
//     },
//   ],
//   (input: [string, number, number]) => {
//     const stream = input[0];
//     const n = input[1]; // number of lines
//     const i = input[2];
//     return new StreamProcessor(stream).getLinesBeforeI(n, i);
//   }
// ).run();

// new TestRunner(
//   "getLinesAfterI",
//   [
//     // input: stream, number of lines, i
//     {
//       name: "Single empty line test",
//       input: [`\n`, 0, 1],
//       expect: `\n`,
//     },
//     {
//       name: "Double empty line test",
//       input: [`\n\n`, 0, 1],
//       expect: `\n`,
//     },
//     {
//       name: "Single line test 1 (no shift)",
//       input: [`abc\n`, 0, 1],
//       expect: `abc\n`,
//     },
//     {
//       name: "Single line test 2 (positive shift)",
//       input: [`abc\n`, 1, 1],
//       expect: `bc\n`,
//     },
//     {
//       name: "Single line test 3 (full shift)",
//       input: [`abc\n`, 3, 1],
//       expect: `\n`,
//     },
//     {
//       name: "Get line in the middle test",
//       input: [`abc\ndef\nX`, 4, 1],
//       expect: `def\n`,
//     },
//   ],
//   (input: [string, number, number]) => {
//     const stream = input[0];
//     const i = input[1];
//     const n = input[2];
//     return new StreamProcessor(stream).setI(i).getLinesAfterI(n);
//   }
// ).run();

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
// printer.line("line4");
// printer.print();
// assert printer.buffer == '...';
