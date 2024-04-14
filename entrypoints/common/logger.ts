export const logger = import.meta.env.PROD
  ? () => {}
  : (...args: any[]) => console.log(...args);
