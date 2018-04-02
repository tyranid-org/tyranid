import Tyr from './tyr';

class Timer {
  timers = {};

  constructor(name) {
    this.start();
    if (name) {
      this.start(name);
    }
    this.last = this.timers.TOTAL.start;
  }

  data(name) {
    name = name || 'TOTAL';
    let data = this.timers[name];
    if (!data) {
      data = this.timers[name] = { name, elapsed: 0 };
    }
    return data;
  }

  lap(name) {
    const data = this.data(name),
      now = Date.now();

    const last = data.start || this.last;

    data.elapsed += now - last;
    data.start = null;
    this.last = now;
  }

  start(name) {
    const data = this.data(name);
    if (data.start) {
      throw new Error(`Cannot start() timer "${data.name}" -- already running`);
    }

    data.start = Date.now();
  }

  stop(name) {
    const data = this.data(name);
    const now = Date.now();

    if (!data.start) {
      throw new Error(
        `Cannot stop() timer "${data.name}" -- it is not running`
      );
    }

    data.elapsed += now - data.start;
    data.start = null;
  }

  elapsed(name) {
    const data = this.data(name);

    let elapsed = data.elapsed;
    const start = data.start;
    if (start) {
      elapsed += Date.now() - start;
    }

    return elapsed;
  }

  toString() {
    let s = '';

    const keys = _.keys(this.timers);

    if (keys.length > 1) {
      s += 'Timers:';
    }

    for (const name of keys) {
      const timer = this.timers[name];

      if (s) {
        s += '\n';
      }

      if (keys.length > 1) {
        s += '  ';
      }

      s += `${name}: ${this.elapsed(name)}ms`;
    }

    return s;
  }

  log() {
    console.log(this.toString());
  }
}

Tyr.Timer = Timer;

export default Timer;
