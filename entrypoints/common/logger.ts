const loggerDev = {
  log: console.log,
  time: console.time,
  timeEnd: console.timeEnd,
};

const loggerPrd = {
  log: (...args: any[]) => {},
  time: (label: string) => {},
  timeEnd: (label: string) => {},
};

const logger = import.meta.env.PROD ? loggerPrd : loggerDev;

export { logger };
