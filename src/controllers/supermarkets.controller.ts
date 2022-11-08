import _ from "lodash";
import { Controller, Get, Post } from "@overnightjs/core";
import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";
import { injectable, inject } from 'tsyringe';

import { Database } from '../infra/database';
import { Logger } from '../utils/logger';
import { BaseController } from './base.controller';
import { ResponseHelper } from "../helpers/reponse.helper";

@injectable()
@Controller('supermercados')
export class SupermarketsController extends BaseController {
    private selectFieldsFromSupermarket: string[] = [
        'cnpj',
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
    private async getAll(req: Request, res: Response) {
        const filterSearch = req.query.search;

        let query = this.database
            .from('supermercados')
            .select(this.selectFieldsFromSupermarket.join(','));

        if (filterSearch) query = query
            .or(`descricao.ilike.%${filterSearch}%, cnpj.ilike.%${filterSearch}%`);

        const { data, error } = await query;

        if (error) { 
            this.logger.error(error);
            return this.handlerResponseErrorFromSupabase(res);
        }

        return this.handlerResponseSuccess(res, data)
    }

    @Get(':cnpj')
    private async get(req: Request<{ cnpj: string }>, res: Response) {
        const { cnpj } = req.params;

        if (!cnpj) return this.handlerResponseErrorFromUser(res, 'Parâmetros (cnpj) são obrigatórios');

        const { data, error } = await this.database.from('supermercados')
            .select(this.selectFieldsFromSupermarket.join(','))
            .eq('cnpj', cnpj);

        if (error) { 
            this.logger.error(error);
            return this.handlerResponseErrorFromSupabase(res);
        }

        return this.handlerResponseSuccess(res, data)
    }


    @Post('')
    private async create(req: Request, res: Response) {
        const errors = this.validateFieldsToCreateSupermarket(req.body);

        if (errors.length) return this.handlerResponseErrorFromUser(res, errors);

        // if (!req.file) return res
        //     .status(StatusCodes.NOT_FOUND)
        //     .json(ResponseHelper.makeResponseError(
        //         StatusCodes.NOT_FOUND, 
        //         'A imagem não foi enviada')
        //     )

        const { data: result } = await this.database
            .from('supermercados')
            .select('count')
            .eq('cnpj', req.body.cnpj);

            
        if ((result || [])[0]?.count > 0) return res
            .status(StatusCodes.CONFLICT)
            .json(ResponseHelper.makeResponseError(
                StatusCodes.CONFLICT, 
                'O cnpj informado já está cadastrado'
                )
            )
                
        // const { url: imagem_url } = await cloudinary.uploader.upload(req.file.path);

        const { data, error } = await this.database
            .from('supermercados')
            .insert({ 
                cnpj: req.body.cnpj,
                descricao: req.body.descricao,
                cidade: req.body.cidade,
                bairro: req.body.bairro,
                logradouro: req.body.logradouro,
                uf: req.body.uf,
                cep: req.body.cep,
                latitude: req.body.latitude,
                longitude: req.body.longitude,
                numero: req.body.numero
            })

        if (error) { 
            this.logger.error(error);
            return this.handlerResponseErrorFromSupabase(res);
        }

        return res.status(StatusCodes.CREATED).send();
    }

    private validateFieldsToCreateSupermarket(body: any = {}) {
        const errors = []

        const requiredFields = [
            'cnpj', 
            'cep', 
            'cidade',
            'logradouro',
            'uf',
            'latitude',
            'longitude',
            'bairro',
            'descricao'
        ]

        const receivedFields = Object.keys(body);
        const missingFields = requiredFields.filter(field =>!receivedFields.includes(field));

        if (missingFields.length) errors.push(`Campos (${missingFields.join(', ')}) são obrigatórios`);

        const numberFields = ['latitude', 'longitude', 'cnpj'];

        const invalidTypeNumberFields = numberFields.filter(field => !_.isNil(body[field]) && isNaN(body[field]));

        if (invalidTypeNumberFields.length) errors.push(`Campos (${invalidTypeNumberFields.join(', ')}) devem conter apenas números`);

        return errors;
    }
}