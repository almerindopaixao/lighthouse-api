import _ from 'lodash';
import * as geolib from 'geolib';
import { Controller, Get } from "@overnightjs/core";
import { Request, Response } from "express";
import { injectable, inject } from 'tsyringe';

import { Database } from '@src/infra/database';
import { Logger } from '@src/utils/logger';
import { BaseController } from '@src/controllers/base.controller';


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
            return this.handlerResponseErrorFromSupabase(res, error);
        }


        return this.handlerResponseSuccess(res, data);
    }

    @Get(':gtin')
    private async getWithSupermarkets(req: Request<{ gtin?: string }, {}, {}, { lat: string, lng: string }>, res: Response) {
        const { gtin } = req.params;
        const { lat, lng } = req.query;

        if (!lat || !lng) return this.handlerResponseErrorFromPathParams(res, ['lat', 'lng']);

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
            return this.handlerResponseErrorFromSupabase(res, error);
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
            const distancia_metros = geolib.getDistance(
                { latitude: lat, longitude: lng }, 
                { latitude:  item.supermercado.latitude, longitude: item.supermercado.longitude}
            )

            return {
                cnpj: item.supermercado.cnpj,
                descricao: item.supermercado.descricao,
                distancia: distancia_metros / 1000,
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
}