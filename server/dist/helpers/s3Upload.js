"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFolderToS3 = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const mysqldb_service_1 = __importDefault(require("../service/mysqldb.service"));
const mysqlbHLS_service_1 = __importDefault(require("../service/mysqlbHLS.service"));
const state_1 = require("../service/state");
const constant_1 = require("../service/constant");
const index_1 = require("../index");
aws_sdk_1.default.config.update({
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
    region: process.env.S3_REGION,
});
const s3 = new aws_sdk_1.default.S3({
    httpOptions: {
        timeout: 1800000,
    },
});
function uploadFileToS3(filePath, bucketName, uploadPath, id) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const fileStream = fs_1.default.createReadStream(filePath);
            fs_1.default.stat(filePath, (err, stats) => {
                if (err) {
                    console.error(`Error fetching file stats: ${err.message}`);
                    return;
                }
                console.log(`File size: ${stats.size} bytes`);
            });
            const uploadParams = {
                Bucket: bucketName,
                Key: uploadPath,
                Body: fileStream,
            };
            s3.upload(uploadParams, (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        }).then((data) => {
            console.log(data.Location);
            let url = data.Location;
            if (url.includes("playlist.m3u8")) {
                mysqlbHLS_service_1.default.query("SELECT platform FROM table WHERE uniqid=?", [id]).then((result) => {
                    mysqldb_service_1.default
                        .getInstance((0, constant_1.getDBName)(result[0]["platform"]))
                        .query(`UPDATE ${state_1.tableName}  SET mainurl = ? WHERE uniqid = ?`, [
                        url,
                        id,
                    ])
                        .then((result) => {
                        console.log("playlist.m3u8 uploaded to s3" + id);
                    });
                });
                mysqlbHLS_service_1.default.query("UPDATE table  SET mainurl = ? WHERE uniqid = ?", [
                    url,
                    id,
                ]);
            }
            if (url.includes("high.mp4")) {
                mysqlbHLS_service_1.default.query("SELECT platform FROM table WHERE uniqid=?", [id]).then((result) => {
                    mysqldb_service_1.default
                        .getInstance((0, constant_1.getDBName)(result[0]["platform"]))
                        .query(`UPDATE ${state_1.tableName}  SET high = ? WHERE uniqid = ?`, [
                        url,
                        id,
                    ])
                        .then((result) => {
                        console.log("high uploaded to s3" + id);
                    });
                });
                mysqlbHLS_service_1.default.query("UPDATE table  SET high = ? WHERE uniqid = ?", [
                    url,
                    id,
                ]);
            }
            if (url.includes("low.mp4")) {
                mysqlbHLS_service_1.default.query("SELECT platform FROM table WHERE uniqid=?", [id]).then((result) => {
                    mysqldb_service_1.default
                        .getInstance((0, constant_1.getDBName)(result[0]["platform"]))
                        .query(`UPDATE ${state_1.tableName}  SET low = ? WHERE uniqid = ?`, [
                        url,
                        id,
                    ])
                        .then((result) => {
                        console.log("low uploaded to s3" + id);
                    });
                });
                mysqlbHLS_service_1.default.query("UPDATE table  SET low = ? WHERE uniqid = ?", [
                    url,
                    id,
                ]);
            }
            if (url.includes("med.mp4")) {
                mysqlbHLS_service_1.default.query("SELECT platform FROM table WHERE uniqid=?", [id]).then((result) => {
                    mysqldb_service_1.default
                        .getInstance((0, constant_1.getDBName)(result[0]["platform"]))
                        .query(`UPDATE ${state_1.tableName}  SET med = ? WHERE uniqid = ?`, [
                        url,
                        id,
                    ])
                        .then((result) => {
                        console.log("med uploaded to s3" + id);
                    });
                });
                mysqlbHLS_service_1.default.query("UPDATE table  SET med = ? WHERE uniqid = ?", [
                    url,
                    id,
                ]);
            }
        });
    });
}
function uploadFolderToS3(folderPath, id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            mysqlbHLS_service_1.default.query("SELECT platform FROM table WHERE uniqid=?", [id]).then((result) => __awaiter(this, void 0, void 0, function* () {
                console.log(result[0]);
                let bucketName = (0, constant_1.getBucketName)(result[0]["platform"]);
                const files = fs_1.default.readdirSync(folderPath);
                let length = files.length;
                for (let i = 0; i < length; i++) {
                    const file = files[i];
                    const filePath = path_1.default.join(folderPath, file);
                    const stats = fs_1.default.statSync(filePath);
                    if (stats.isFile()) {
                        let path = "videos/";
                        if (filePath.includes(".ts") || filePath.includes(".m3u8")) {
                            let index = filePath.split("/").indexOf("converted");
                            path +=
                                filePath.split("/")[index + 1] +
                                    "/" +
                                    filePath.split("/")[index + 2];
                            (0, index_1.updateStatus)('Uploading streaming file to s3', id);
                        }
                        if (filePath.includes("download")) {
                            let index = filePath.split("/").indexOf("converted");
                            path +=
                                filePath.split("/")[index + 1] +
                                    "/" +
                                    filePath.split("/")[index + 2] +
                                    "/" +
                                    filePath.split("/")[index + 3];
                            (0, index_1.updateStatus)('Uploading Download file to s3', id);
                        }
                        yield uploadFileToS3(filePath, bucketName, path, id);
                    }
                }
            }));
            (0, index_1.updateStatus)('uploaded to S3', id);
        }
        catch (err) {
            mysqlbHLS_service_1.default.query("SELECT platform FROM table WHERE uniqid=?", [id]).then((result) => {
                mysqldb_service_1.default
                    .getInstance((0, constant_1.getDBName)(result[0]["platform"]))
                    .query(`UPDATE  ${state_1.tableName} SET status = ? WHERE uniqid = ?`, [
                    "failed to upload s3",
                    id,
                ])
                    .then((result) => {
                    console.log(folderPath + "uploaded to s3" + id);
                });
            });
            mysqlbHLS_service_1.default.query("UPDATE  table SET error = ? WHERE uniqid=?", [
                ,
                err.message,
                id,
            ]).then((result) => { });
            console.error("Error reading folder or uploading files:", err);
        }
    });
}
exports.uploadFolderToS3 = uploadFolderToS3;
