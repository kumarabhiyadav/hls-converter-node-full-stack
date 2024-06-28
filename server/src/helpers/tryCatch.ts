import { NextFunction, Request, Response } from "express";

export const tryCatchFn = (controller: Function) => async (req: Request, res: Response, next: NextFunction) => {

    try {
        await controller(req, res);

    } catch (error) {

       return next(error);

    }

}