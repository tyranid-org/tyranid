export class Roman {
  static romanDigits = [
    { letter: 'ↇ', value: 50000, adj: 1 },
    { letter: 'ↂ', value: 10000, adj: 2 },
    { letter: 'ↁ', value: 5000, adj: 1 },
    { letter: 'M', value: 1000, adj: 2 },
    { letter: 'D', value: 500, adj: 1 },
    { letter: 'C', value: 100, adj: 2 },
    { letter: 'L', value: 50, adj: 1 },
    { letter: 'X', value: 10, adj: 2 },
    { letter: 'V', value: 5, adj: 1 },
    { letter: 'I', value: 1, adj: 0 }
  ];

  static toRoman(number) {
    const { romanDigits } = Roman;
    const { length } = romanDigits;
    let rNumeral = '';

    for (let i = 0; i < length; i++) {
      const { letter, value, adj } = romanDigits[i];
      while (number >= value) {
        rNumeral += letter;
        number -= value;
      }

      if (adj) {
        const { letter: aLetter, value: aValue } = romanDigits[i + adj];
        const nValue = value - aValue;
        if (number >= nValue) {
          rNumeral += aLetter + letter;
          number -= nValue;
        }
      }
    }

    return rNumeral;
  }
}
