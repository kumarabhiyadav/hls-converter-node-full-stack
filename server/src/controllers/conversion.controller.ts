import { ulid } from "ulid";
import { tryCatchFn } from "../helpers/tryCatch";
import { Request, Response } from "express";
import DataStore from "../service/db.service";
import mysqldbService from "../service/mysqldb.service";


export const createWebSocketForFile = tryCatchFn(async (req: Request, res: Response) => {
    let path = "/" + ulid();
    let db = DataStore.getInstance();
    db.insert({ulid:path,state:'initiate',filename:req.body.filename})
    mysqldbService.query('INSERT INTO hls_videos_status (video_name,ulid) VALUES (?,?)',[req.body.filename,path]).then((result:any)=>{
      console.log(result);
    });
    return res.status(200).json({ path });
});

export const uploadVideo = tryCatchFn(async (req: Request, res: Response) => {





});



export const history = tryCatchFn(async (req: Request, res: Response) => {


    let db = DataStore.getInstance();

    db.find({})
    .sort({ createdAt: -1 })
    .exec((err, docs) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.status(200).send(docs);
      }
    });

});