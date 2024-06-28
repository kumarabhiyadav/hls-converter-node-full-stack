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
const db_service_1 = __importDefault(require("../service/db.service"));
const mysqldb_service_1 = __importDefault(require("../service/mysqldb.service"));
aws_sdk_1.default.config.update({
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
    region: process.env.S3_REGION,
});
const s3 = new aws_sdk_1.default.S3();
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
                Body: fileStream
            };
            s3.upload(uploadParams, (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        })
            .then((data) => {
            console.log(data.Location);
            let url = data.Location;
            if (url.includes('playlist.m3u8')) {
                let db = db_service_1.default.getInstance();
                db.update({
                    _id: id
                }, { $set: { 'mainurl': url, state: 'converted' } });
                db.find({ _id: id }).exec((err, docs) => {
                    let video = docs[0];
                    mysqldb_service_1.default.query('UPDATE hls_videos_status SET mainurl = ? WHERE ulid = ?', [url, video.ulid]).then((result) => {
                        console.log("UPDATED IN MYSQL DB");
                    });
                });
            }
            if (url.includes('high.mp4')) {
                let db = db_service_1.default.getInstance();
                db.update({
                    _id: id
                }, { $set: { 'high': url } });
                db.find({ _id: id }).exec((err, docs) => {
                    let video = docs[0];
                    mysqldb_service_1.default.query('UPDATE hls_videos_status SET high = ? WHERE ulid = ?', [url, video.ulid]).then((result) => {
                        console.log("UPDATED IN MYSQL DB HIGH");
                    });
                });
            }
            if (url.includes('low.mp4')) {
                let db = db_service_1.default.getInstance();
                db.update({
                    _id: id
                }, { $set: { 'low': url } });
                db.find({ _id: id }).exec((err, docs) => {
                    let video = docs[0];
                    mysqldb_service_1.default.query('UPDATE hls_videos_status SET low = ?, status = ? WHERE ulid = ?', [url, 'converted', video.ulid]).then((result) => {
                        console.log("UPDATED IN MYSQL DB LOW");
                    });
                });
            }
            if (url.includes('med.mp4')) {
                let db = db_service_1.default.getInstance();
                db.update({
                    _id: id
                }, { $set: { 'med': url } });
                db.find({ _id: id }).exec((err, docs) => {
                    let video = docs[0];
                    mysqldb_service_1.default.query('UPDATE hls_videos_status SET low = ? WHERE ulid = ?', [url, video.ulid]).then((result) => {
                        console.log("UPDATED IN MYSQL DB LOW");
                    });
                });
            }
        });
    });
}
function uploadFolderToS3(folderPath, bucketName, ws, id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let db = db_service_1.default.getInstance();
            const files = fs_1.default.readdirSync(folderPath);
            let length = files.length;
            for (let i = 0; i < length; i++) {
                const file = files[i];
                const filePath = path_1.default.join(folderPath, file);
                const stats = fs_1.default.statSync(filePath);
                if (stats.isFile()) {
                    let path = 'videos/';
                    if (filePath.includes('.ts') || filePath.includes('.m3u8')) {
                        let index = filePath.split('/').indexOf('converted');
                        path += filePath.split('/')[index + 1] + '/' + filePath.split('/')[index + 2];
                    }
                    if (filePath.includes('download')) {
                        let index = filePath.split('/').indexOf('converted');
                        path += filePath.split('/')[index + 1] + '/' + filePath.split('/')[index + 2] + '/' + filePath.split('/')[index + 3];
                    }
                    db.update({
                        _id: id
                    }, { $set: { 'status': 'uploadedtos3' } });
                    yield uploadFileToS3(filePath, bucketName, path, id);
                    ws.send(JSON.stringify({ status: 'fileupload', message: `uploading files to s3 ${i}/${length}` }));
                }
            }
            ws.send(JSON.stringify({ status: 'fileupload', message: `File Upload Completed` }));
        }
        catch (err) {
            console.error('Error reading folder or uploading files:', err);
        }
    });
}
exports.uploadFolderToS3 = uploadFolderToS3;
