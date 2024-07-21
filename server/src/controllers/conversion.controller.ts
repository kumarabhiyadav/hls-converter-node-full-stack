import { ulid } from "ulid";
import { tryCatchFn } from "../helpers/tryCatch";
import { Request, Response } from "express";
import mysqldbService from "../service/mysqldb.service";
import DatabaseHLS from "../service/mysqlbHLS.service";

import { globalCurrentFiles, tableName } from "../service/state";
import { getDBName } from "../service/constant";
import { processQueue, uploadQueue } from "../service/converter.service";


export const createWebSocketForFile = tryCatchFn(async (req: Request, res: Response) => {
  let uniqId = ulid();
  mysqldbService.getInstance(getDBName(req.body.platform)).query(`INSERT INTO ${tableName} (filename,uniqid) VALUES (?,?)`, [req.body.filename, uniqId]).then((result: any) => {
    console.log(result);
  }).catch((err: any) => {
    console.warn(err)
  });
  DatabaseHLS.query('INSERT INTO table (filename,uniqid,platform) VALUES (?,?,?)', [req.body.filename, uniqId, req.body.platform]).then((result: any) => {
    console.log(result);
  }).catch((err: any) => {
    console.warn(err)
  });;

  globalCurrentFiles.push({ 'file': req.body.filename, uniqId: uniqId })
  return res.status(200).json({ uniqId: "/" + uniqId });
});





export const history = tryCatchFn(async (req: Request, res: Response) => {

  DatabaseHLS.query(`SELECT * FROM table WHERE is_deleted =0 ORDER BY created_at DESC`, []).then((result: any) => {

    res.status(200).send(result);

  }).catch((error: any) => {

    res.status(500).send(error);
  });

});


export const retry = tryCatchFn(async (req: Request, res: Response) => {

  let { id, filename } = req.body


  globalCurrentFiles.push({ 'file': filename, uniqId: id })
  uploadQueue.enqueue({ uniqId: id, ws: "" });
  processQueue();




  return res.status(200).json({
    'status': true,
    'message': "Added to queue for conversion"
  })

});

export const clear = tryCatchFn(async (req: Request, res: Response) => {


  DatabaseHLS.query(`UPDATE table SET is_deleted = 1 WHERE 1`, []).then((result: any) => {

    res.status(200).json({
      status: true
    });

  }).catch((error: any) => {

    res.status(500).send(error);
  });

});