import StatusCodes from 'http-status-codes';
import { Controller, Get } from "@overnightjs/core";
import { Request, Response } from "express";
import { injectable } from 'tsyringe';

@injectable()
@Controller('health-check')
export class HealthCheckController {
    @Get('')
    private ping(_: Request, res: Response) {
        return res.status(StatusCodes.OK).send('OK');
    }
}