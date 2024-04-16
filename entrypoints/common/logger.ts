const loggerDev = {
  log: (...args: any[]) => console.log(...args),
  time: (label: string) => console.time(label),
  timeEnd: (label: string) => console.timeEnd(label),
};

const loggerPrd = {
  log: (...args: any[]) => {},
  time: (label: string) => {},
  timeEnd: (label: string) => {},
};

const logger = import.meta.env.PROD ? loggerPrd : loggerDev;

export { logger };
