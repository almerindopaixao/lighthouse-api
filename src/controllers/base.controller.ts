import StatusCodes from 'http-status-codes';
import { Response } from "express";

import { ResponseHelper } from '@src/helpers/reponse.helper';

export abstract class BaseController {
    protected handlerResponseErrorFromSupabase(res: Response, error: any) {
        const responseStatus = StatusCodes.INTERNAL_SERVER_ERROR
        const responseBody = ResponseHelper.makeResponseError(
            responseStatus, 
            'Erro ao acessar banco de dados'
        )

        return res.status(responseStatus).json(responseBody);
    }

    protected handlerResponseErrorFromPathParams(res: Response, params: string[]) {
        const responseStatus = StatusCodes.BAD_REQUEST
        const messageBody = params.length === 1 ? 
            `Parâmetro ${params.join('')} é obrigatório` :
            `Parâmetros ${params.join(', ')} são obritatórios`;

        const responseBody = ResponseHelper.makeResponseError(
            responseStatus, 
            messageBody,
        )

        return res
            .status(responseStatus)
            .json(responseBody);
    }

    protected handlerResponseSuccess(res: Response, data: any) {
        return res
            .status(StatusCodes.OK)
            .json(ResponseHelper.makeResponseSuccess(data));
    }
}