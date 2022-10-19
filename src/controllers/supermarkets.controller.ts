import { Controller, Get } from "@overnightjs/core";
import { Request, Response } from "express";
import { injectable, inject } from 'tsyringe';

import { Database } from '@src/infra/database';
import { Logger } from '@src/utils/logger';
import { BaseController } from '@src/controllers/base.controller';

@injectable()
@Controller('supermercados')
export class SupermarketsController extends BaseController {
    private selectFieldsFromSupermarket: string[] = [
        'descricao', 
        'cidade', 
        'bairro', 
        'logradouro', 
        'uf', 
        'cep', 
        'latitude', 
        'longitude', 
        'imagem_url', 
        'numero'
    ]

    constructor(
        @inject('Database')
        private readonly database: Database,
        @inject('Logger')
        private readonly logger: Logger,
    ) {
        super();
    }

    @Get('')
    private async getAll(_: Request, res: Response) {
        const { data, error } = await this.database
            .from('supermercados')
            .select(this.selectFieldsFromSupermarket.join(','));

        if (error) { 
            this.logger.error(error);
            return this.handlerResponseErrorFromSupabase(res, error);
        }

        return this.handlerResponseSuccess(res, data)
    }

    @Get(':cnpj')
    private async get(req: Request<{ cnpj: string }>, res: Response) {
        const { cnpj } = req.params;

        if (!cnpj) return this.handlerResponseErrorFromPathParams(res, ['cnpj']);

        const { data, error } = await this.database.from('supermercados')
            .select(this.selectFieldsFromSupermarket.join(','))
            .eq('cnpj', cnpj);

        if (error) { 
            this.logger.error(error);
            return this.handlerResponseErrorFromSupabase(res, error);
        }

        return this.handlerResponseSuccess(res, data)
    }
}