export function captureLogStream(
  stream: NodeJS.WritableStream,
  passThrough = false
) {
  const oldWrite = stream.write;
  let buf = '';

  stream.write = (
    chunk: Buffer | string,
    encoding?: string | Function, // tslint:disable-line
    callback?: Function // tslint:disable-line
  ) => {
    buf += chunk.toString();
    // chunk is a String or Buffer
    if (passThrough) {
      oldWrite.apply(stream, [chunk, encoding, callback]);
    }
    return true;
  };

  return {
    unhook: function unhook() {
      stream.write = oldWrite;
    },
    captured() {
      return buf;
    }
  };
}
