import { ulid } from "ulid";
import { tryCatchFn } from "../helpers/tryCatch";
import { Request, Response } from "express";
import mysqldbService from "../service/mysqldb.service";
import { currentFiles, tableName } from "../service/state";


export const createWebSocketForFile = tryCatchFn(async (req: Request, res: Response) => {
  let uniqId = ulid();
  mysqldbService.query(`INSERT INTO ${tableName} (filename,uniqid) VALUES (?,?)`, [req.body.filename, uniqId]).then((result: any) => {
    console.log(result);
  });
  currentFiles.push({'file':req.body.filename,uniqId:uniqId})
  return res.status(200).json({ uniqId:"/"+uniqId });
});

export const uploadVideo = tryCatchFn(async (req: Request, res: Response) => {





});



export const history = tryCatchFn(async (req: Request, res: Response) => {


  mysqldbService.query(`SELECT * FROM ${tableName} ORDER BY created_at DESC`, []).then((result: any) => {

    res.status(200).send(result);

  }).catch((error: any) => {

    res.status(500).send(error);
  });

});