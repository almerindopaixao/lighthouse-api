import pino, { Logger as PinoLogger } from 'pino';
import config from 'config';

export type Logger = PinoLogger<{
  enabled: true,
  level: string,
}>

export const Logger = pino({
  enabled: config.get<boolean>('app.logger.enabled'),
  level: config.get<string>('app.logger.level')
});