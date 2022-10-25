import _ from 'lodash';
import * as geolib from 'geolib';
import { StatusCodes } from 'http-status-codes';
import { Controller, Get, Post } from "@overnightjs/core";
import { Request, Response } from "express";
import { injectable, inject } from 'tsyringe';

import { Database } from '@src/infra/database';
import { Logger } from '@src/utils/logger';
import { BaseController } from '@src/controllers/base.controller';
import { ResponseHelper } from '@src/helpers/reponse.helper';


@injectable()
@Controller('produtos')
export class ProductsController extends BaseController {
    constructor(
        @inject('Database')
        private readonly database: Database,
        @inject('Logger')
        private readonly logger: Logger,
    ) {
        super();
    }

    @Get('')
    private async getAll(req: Request<{}, {}, {}, { search?: string }>, res: Response) {
        const filterSearch = req.query.search;

        let query = this.database
            .from('produtos')
            .select('gtin, descricao, imagem_url');

        if (filterSearch) query = query
            .or(`descricao.ilike.%${filterSearch}%, gtin.ilike.%${filterSearch}%`)

        const { data, error } = await query;

        if (error) { 
            this.logger.error(error);
            return this.handlerResponseErrorFromSupabase(res);
        }


        return this.handlerResponseSuccess(res, data);
    }

    @Get('supermercados')
    private async getAllWithSupermarket(req: Request<{}, {}, {}, { lat: string, lng: string }>, res: Response) {
        const { lat, lng } = req.query;

        if (!lat || !lng) return this.handlerResponseErrorFromUser(res, 'Parâmetros (lat, lng) são obrigatórios');

        // encontrar no mínimo 10 produtos em um raio de 1km
        const products: any[] = [];

        let from = 0;
        let to = 10;

        // Distância máxima de 1000 metros ou 1km
        const maxDistance = 1000; 
        const startTimeSearch = Date.now();
        let durationSearch = 0;

        do {
            const { data, error } = await this.database
                .from('produtos_supermercados')
                .select(`
                    supermercado:cnpj(latitude, longitude),
                    produto:gtin(gtin, descricao),
                    preco
                `,)
                .range(from, to);

            if (error) { 
                this.logger.error(error);
                return this.handlerResponseErrorFromSupabase(res);
            }
            
            // Sair do laço de repetição pois não existem mais dados
            if (!data?.length) break;

            const availableProducts = (data as any[]).reduce<any[]>((acc, value) => {
                const distancia = geolib.getDistance(
                    { latitude: lat, longitude: lng }, 
                    { latitude:  value.supermercado?.latitude, longitude: value.supermercado?.longitude }
                )

                if (distancia > maxDistance) return acc;

                acc.push({
                    descricao: value.produto?.descricao,
                    gtin: value.produto?.gtin,
                    preco: value.preco,
                    distancia
                });

                return acc; 
            }, []);

            products.push(...availableProducts);

            from += to + 1;
            to += to + 1;
            
            durationSearch = Date.now() - startTimeSearch;
            // Enquanto não achar 15 produtos próximos ou tempo ultrapassar 1 minutos
        } while(products.length < 10 || durationSearch < 60000);

        return this.handlerResponseSuccess(res, products);
    }

    @Post('')
    private async create(req: Request, res: Response) {
        const errors = await this.validateFieldsToCreateProduct(req.body);

        if (errors.length) return this.handlerResponseErrorFromUser(res, errors);

        const { data: result } = await this.database
            .from('produtos_supermercados')
            .select('count')
            .eq('cnpj', req.body.cnpj)
            .eq('gtin', req.body.gtin);

            
        if ((result || [])[0]?.count > 0) return res
            .status(StatusCodes.CONFLICT)
            .json(ResponseHelper.makeResponseError(
                    StatusCodes.CONFLICT, 
                    'O produto informado já estar associado ao supermercado'
                )
            )

        const { data, error } = await this.database.from('produtos_supermercados').insert({
            gtin: req.body.gtin,
            cnpj: req.body.cnpj,
            preco: req.body.preco,
            promocao: req.body.promocao,
            disponivel: req.body.disponivel,
        });

        if (error) { 
            this.logger.error(error);
            return this.handlerResponseErrorFromSupabase(res);
        }

        
        return res.status(StatusCodes.CREATED).send();
    }

    @Get(':gtin/supermercados')
    private async getWithSupermarkets(req: Request<{ gtin?: string }, {}, {}, { lat: string, lng: string }>, res: Response) {
        const { gtin } = req.params;
        const { lat, lng } = req.query;

        if (!lat || !lng) return this.handlerResponseErrorFromUser(res, 'Parâmetros (lat, lng) são obrigatórios');

        const { data, error } = await this.database
            .from('produtos')
            .select(`
                gtin,
                descricao,
                imagem_url,
                itens:produtos_supermercados(
                    preco,
                    promocao,
                    disponivel,
                    supermercado:supermercados(
                        cnpj,
                        descricao,
                        latitude,
                        longitude
                    )
                )
            `)
            .eq('gtin', gtin);

        if (error) { 
            this.logger.error(error);
            return this.handlerResponseErrorFromSupabase(res);
        }

        if (!data?.length) return this.handlerResponseSuccess(res, {});

        const detalhes_produto = {
            gtin: data[0].gtin,
            descricao: data[0].descricao,
            imagem_url: data[0].imagem_url,
        }

        const itens_supermarkets = data[0].itens as Array<any>;

        if (!itens_supermarkets.length) return this.handlerResponseSuccess(res, { detalhes_produto });

        const escala_preco_produto = this.calculate_escala_preco_produto(itens_supermarkets);
        const supermercados_regiao = this.calculate_supermercados_regiao(itens_supermarkets, lat, lng);


        return this.handlerResponseSuccess(res, { detalhes_produto, escala_preco_produto, supermercados_regiao });
    }

    private calculate_supermercados_regiao(itens: any[], lat: string, lng: string) {
        return itens.map((item) => {
            const distanciaMetros = geolib.getDistance(
                { latitude: lat, longitude: lng }, 
                { latitude:  item.supermercado.latitude, longitude: item.supermercado.longitude}
            )

            return {
                cnpj: item.supermercado.cnpj,
                descricao: item.supermercado.descricao,
                distancia: distanciaMetros / 1000,
                produto_preco: item.preco,
                produto_promocao: item.promocao,
                produto_disponivel: item.disponivel
            }
        });
    }

    private calculate_escala_preco_produto(itens: any[]) {
        return {
            preco_minimo: _.minBy(itens, (o) => o.preco).preco,
            preco_maximo:_.maxBy(itens, (o) => o.preco).preco,
            preco_medio: _.meanBy(itens, (o) => o.preco)
        }
    }

    private async validateFieldsToCreateProduct(body: any = {}) {
        const errors = [];

        const requiredFields = ['cnpj', 'gtin', 'preco'];

        const receivedFields = Object.keys(body);
        const missingFields = requiredFields.filter(field =>!receivedFields.includes(field));

        if (missingFields.length) errors.push(`Campos (${missingFields.join(', ')}) são obrigatórios`);

        const numberFields = ['cnpj', 'gtin', 'preco'];

        const invalidTypeNumberFields = numberFields.filter(field => !_.isNil(body[field]) && isNaN(body[field]));

        if (invalidTypeNumberFields.length) errors.push(`Campos (${invalidTypeNumberFields.join(', ')}) devem conter apenas números`);

        return errors;
    }
}