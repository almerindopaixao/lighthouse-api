import bodyParser from "body-parser";
import cors from "cors";
import { Server } from "@overnightjs/core";
import { container } from 'tsyringe';

import { Database } from '@src/infra/database';
import { Logger } from '@src/utils/logger';

import { HealthCheckController } from '@src/controllers/health-check.controller';
import { ProductsController } from '@src/controllers/products.controller';
import { SupermarketsController } from '@src/controllers/supermarkets.controller';

export class SetupServer extends Server {
    constructor(private port = 3000) {
        super();
        this.setupExpress();
        this.setupLogger();
        this.setupDatabase();
        this.setupController();
    }

    private setupExpress(): void {
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(cors({
            origin: '*'
        }));
    }

    private setupController(): void {
        const healthCheckController = container.resolve(HealthCheckController);
        const productsController = container.resolve(ProductsController);
        const supermarketsController = container.resolve(SupermarketsController);

        this.addControllers([
            healthCheckController, 
            productsController,
            supermarketsController
        ]);
    }

    private setupLogger(): void {
        container.register('Logger', {
            useValue: Logger,
        });
    }

    private setupDatabase(): void {
        container.register('Database', {
            useValue: Database,
        });
    }

    public start(): void {
        this.app.listen(this.port, () => {
            Logger.info(`🚀 Server listening in: http://localhost:${this.port}`);
        })
    }
}