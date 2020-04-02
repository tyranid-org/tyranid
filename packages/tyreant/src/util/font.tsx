export function stringWidth(s: string, fontSize: number) {
  const { length } = s;

  let width = 0;
  for (let i = 0; i < length; i++) {
    const ch = s.charCodeAt(i);
    width += ch < widthsLen ? widths[ch] : widthsAvg;
  }

  return width * fontSize;
}

export function wrappedStringWidth(s: string, fontSize: number) {
  const { length } = s;

  let longest = 0,
    current = 0;

  for (let i = 0; i < length; i++) {
    const ch = s.charCodeAt(i);

    if (ch < 33) {
      if (current > longest) longest = current;
      current = 0;
    } else {
      current += ch < widthsLen ? widths[ch] : widthsAvg;
    }
  }

  return (current > longest ? current : longest) * fontSize;
}

// taken from https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript
// prettier-ignore
const widths = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.28, 0.277, 0.355, 0.555, 0.555, 0.89,
  0.666, 0.191, 0.333, 0.333, 0.389, 0.583, 0.277, 0.333, 0.277, 0.302, 0.555, 0.555, 0.555, 0.555, 0.555, 0.555, 0.555, 0.555, 0.555,
  0.555, 0.277, 0.277, 0.584, 0.583, 0.584, 0.555, 1.014, 0.666, 0.666, 0.722, 0.722, 0.666, 0.609, 0.777, 0.722, 0.277, 0.5, 0.666, 0.555,
  0.833, 0.722, 0.777, 0.666, 0.777, 0.722, 0.666, 0.609, 0.722, 0.666, 0.944, 0.666, 0.666, 0.609, 0.277, 0.355, 0.277, 0.477, 0.555,
  0.333, 0.555, 0.555, 0.5, 0.555, 0.555, 0.277, 0.555, 0.555, 0.222, 0.241, 0.5, 0.222, 0.833, 0.555, 0.555, 0.555, 0.555, 0.333, 0.5,
  0.277, 0.555, 0.5, 0.722, 0.5, 0.5, 0.5, 0.355, 0.259, 0.353, 0.59
],
  widthsLen = widths.length,
  widthsAvg = 0.528;
