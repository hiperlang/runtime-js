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
