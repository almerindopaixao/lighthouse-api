import './utils/module-alias';
import config from 'config';
import { SetupServer } from '@src/server';

const server = new SetupServer(config.get('app.port'));
server.start();