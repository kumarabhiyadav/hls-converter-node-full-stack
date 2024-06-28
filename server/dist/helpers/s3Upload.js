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
const console_1 = require("console");
aws_sdk_1.default.config.update({
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
    region: process.env.S3_REGION,
});
const s3 = new aws_sdk_1.default.S3();
function uploadFileToS3(filePath, bucketName) {
    return new Promise((resolve, reject) => {
        const fileStream = fs_1.default.createReadStream(filePath);
        let splitedArray = filePath.split('/');
        let splitedLength = filePath.split('/').length;
        let destination = process.env.S3_PATH + '/' + splitedArray[splitedLength - 2] + '/' + splitedArray[splitedLength - 1];
        const uploadParams = {
            Bucket: bucketName,
            Key: destination,
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
    });
}
function uploadFolderToS3(folderPath, bucketName, ws) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const files = fs_1.default.readdirSync(folderPath);
            let length = files.length;
            for (let i = 0; i < length; i++) {
                const file = files[i];
                const filePath = path_1.default.join(folderPath, file);
                const stats = fs_1.default.statSync(filePath);
                if (stats.isDirectory()) {
                    (0, console_1.log)("Directory");
                    (0, console_1.log)(filePath);
                    yield uploadFolderToS3(filePath, (_a = process.env.S3_BUCKET) !== null && _a !== void 0 ? _a : '', ws);
                }
                else {
                    try {
                        yield uploadFileToS3(filePath, bucketName);
                        console.log(`Uploaded ${file} to ${bucketName}`);
                        if (ws) {
                            ws.send(JSON.stringify({ status: 'fileupload', message: `uploading files to s3 ${i}/${length}` }));
                        }
                    }
                    catch (uploadErr) {
                        console.error(`Error uploading file ${file} to S3:`, uploadErr);
                    }
                }
            }
            console.log('Upload complete.');
        }
        catch (err) {
            console.error('Error reading folder or uploading files:', err);
        }
    });
}
exports.uploadFolderToS3 = uploadFolderToS3;
