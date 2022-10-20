import StatusCodes from 'http-status-codes';

export class ResponseHelper {
    static makeResponseError(status: number, message: string | string[]) {
        return {
            statusText: StatusCodes.getStatusText(status),
            message: message
        }
    }

    static makeResponseSuccess(data: any) {
        return { data }
    }
}