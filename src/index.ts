import config from 'config';
import { SetupServer } from './server';

const server = new SetupServer(config.get('app.port'));
server.start();