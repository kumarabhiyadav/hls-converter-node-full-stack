import { ulid } from "ulid";
import { tryCatchFn } from "../helpers/tryCatch";
import { Request, Response } from "express";
import mysqldbService from "../service/mysqldb.service";
import DatabaseHLS from "../service/mysqlbHLS.service";

import { currentFiles, tableName } from "../service/state";
import {  getDBName } from "../service/constant";


export const createWebSocketForFile = tryCatchFn(async (req: Request, res: Response) => {
  let uniqId = ulid();
   mysqldbService.getInstance(getDBName(req.body.platform)).query(`INSERT INTO ${tableName} (filename,uniqid) VALUES (?,?)`, [req.body.filename, uniqId]).then((result: any) => {
    console.log(result);
  }).catch((err:any)=>{
    console.warn(err)
  });
  DatabaseHLS.query('INSERT INTO table (filename,uniqid,platform) VALUES (?,?,?)',[req.body.filename,uniqId,req.body.platform]).then((result:any)=>{
    console.log(result);
  }).catch((err:any)=>{
    console.warn(err)
  });;

  currentFiles.push({'file':req.body.filename,uniqId:uniqId})
  return res.status(200).json({ uniqId:"/"+uniqId });
});

export const uploadVideo = tryCatchFn(async (req: Request, res: Response) => {





});



export const history = tryCatchFn(async (req: Request, res: Response) => {


  
  DatabaseHLS.query(`SELECT * FROM table ORDER BY created_at DESC`, []).then((result: any) => {

    res.status(200).send(result);

  }).catch((error: any) => {

    res.status(500).send(error);
  });

});