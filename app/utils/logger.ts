export const logger = {
  error: (
    message: string,
    options?: { [key: string]: string | number | boolean | undefined },
  ) => {
    console.error(message, options);
  },
  info: (
    message: string,
    options?: { [key: string]: string | number | boolean | undefined },
  ) => {
    console.info(message, options);
  },
  warn: (
    message: string,
    options?: { [key: string]: string | number | boolean | undefined },
  ) => {
    console.warn(message, options);
  },
  debug: (
    message: string,
    options?: { [key: string]: string | number | boolean | undefined },
  ) => {
    console.debug(message, options);
  },
};
