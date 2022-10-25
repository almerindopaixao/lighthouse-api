import StatusCodes from 'http-status-codes';
import { Response } from "express";

import { ResponseHelper } from '../helpers/reponse.helper';

export abstract class BaseController {
    protected handlerResponseErrorFromSupabase(res: Response) {
        const responseStatus = StatusCodes.INTERNAL_SERVER_ERROR
        const responseBody = ResponseHelper.makeResponseError(
            responseStatus, 
            'Erro ao acessar banco de dados'
        )

        return res.status(responseStatus).json(responseBody);
    }

    protected handlerResponseErrorFromUser(res: Response, messageBody: string | string[]) {
        const responseStatus = StatusCodes.BAD_REQUEST

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