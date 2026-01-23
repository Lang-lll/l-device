export interface LoggerInterface {
  setLevel: (level: string) => void
  debug: (...args: any[]) => void
  info: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
}

const logger: LoggerInterface = console as any as LoggerInterface

export { logger }
