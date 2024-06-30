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
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
app.use((0, express_fileupload_1.default)());
const conversion_controller_1 = require("./controllers/conversion.controller");
const ws_1 = require("ws");
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const port = process.env.PORT;
console.log(port);
app.use((0, cors_1.default)({ origin: '*' }));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const s3Upload_1 = require("./helpers/s3Upload");
const state_1 = require("./service/state");
const mysqldb_service_1 = __importDefault(require("./service/mysqldb.service"));
app.use(express_1.default.json({ limit: "5000mb" }));
const uploadsDir = path_1.default.join(__dirname, '..', 'uploads');
const converted = path_1.default.join(__dirname, '..', 'converted');
app.post('/upload-file', conversion_controller_1.uploadVideo);
app.post('/create-web-socket-for-file', conversion_controller_1.createWebSocketForFile);
app.get('/history', conversion_controller_1.history);
app.get("/", (req, res) => {
    res.send("Serving on port" + port);
});
let server = app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
const wss = new ws_1.WebSocketServer({ server });
wss.on('connection', (ws, req) => {
    console.log('New client connected');
    let fileBuffer = [];
    let totalLength = 0;
    ws.on('message', (message) => {
        if (Buffer.isBuffer(message)) {
            let reqPath = req.url;
            let currentFile = state_1.currentFiles.find((e) => e.uniqId === (reqPath === null || reqPath === void 0 ? void 0 : reqPath.replace('/', '')));
            if (!currentFile) {
                ws.close();
                return;
            }
            fileBuffer.push(message);
            totalLength += message.length;
            const filePath = path_1.default.join(uploadsDir, currentFile.file);
            if (message.length < 1048576) {
                const combinedBuffer = Buffer.concat(fileBuffer, totalLength);
                fs_1.default.writeFile(filePath, combinedBuffer, (err) => __awaiter(void 0, void 0, void 0, function* () {
                    var _a, _b;
                    if (err) {
                        console.error('Error writing file:', err);
                        ws.send('Error writing file');
                    }
                    else {
                        ws.send(JSON.stringify({ status: 'completed', message: 'File received completely' }));
                        ws.send(JSON.stringify({ status: 'converting', message: 'File Upload is completed, Converting file...' }));
                        if (currentFile) {
                            ws.close();
                            currentFile = state_1.currentFiles.find((e) => e.uniqId === (reqPath === null || reqPath === void 0 ? void 0 : reqPath.replace('/', '')));
                            if (currentFile) {
                                let outputdir = converted + '/' + currentFile.file.split('.').slice(0, -1).join('.');
                                console.log(outputdir);
                                mysqldb_service_1.default.query(`UPDATE  ${state_1.tableName} SET status = ? WHERE uniqid = ?`, ['converting HLS', currentFile.uniqId]);
                                yield convertVideo(filePath, outputdir, currentFile.uniqId);
                                mysqldb_service_1.default.query(`UPDATE  ${state_1.tableName} SET status = ? WHERE uniqid = ?`, ['creating playlist.m3u8', currentFile.uniqId]);
                                yield generatePlaylist(outputdir);
                                mysqldb_service_1.default.query(`UPDATE  ${state_1.tableName} SET status = ? WHERE uniqid = ?`, ['converting download files', currentFile.uniqId]);
                                yield convertToMultipleResolutions(filePath, outputdir + '/download/', currentFile.uniqId);
                                console.log("Uploading...");
                                mysqldb_service_1.default.query(`UPDATE  ${state_1.tableName} SET status = ? WHERE uniqid = ?`, ['Uploading HLS to s3', currentFile.uniqId]);
                                yield (0, s3Upload_1.uploadFolderToS3)(outputdir, (_a = process.env.S3_BUCKET) !== null && _a !== void 0 ? _a : '', currentFile.uniqId);
                                mysqldb_service_1.default.query(`UPDATE  ${state_1.tableName} SET status = ? WHERE uniqid = ?`, ['Uploading Downloadfile to s3', currentFile.uniqId]);
                                yield (0, s3Upload_1.uploadFolderToS3)(outputdir + '/download/', (_b = process.env.S3_BUCKET) !== null && _b !== void 0 ? _b : '', currentFile.uniqId);
                                mysqldb_service_1.default.query(`UPDATE  ${state_1.tableName} SET status = ? WHERE uniqid = ?`, ['uploaded to S3', currentFile.uniqId]);
                                return;
                            }
                        }
                        try {
                        }
                        catch (error) {
                            ws.send(JSON.stringify({ status: 'error', message: 'Video conversion failed' }));
                        }
                    }
                }));
            }
            else {
                ws.send(JSON.stringify({ status: 'progress', message: 'Chunk received' }));
            }
        }
        else {
            console.log('Received text message:', message);
            ws.send('Echo: ' + message);
        }
    });
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});
function convertVideo(inputFilePath, outputDir, id) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("input: " + inputFilePath);
        console.log("output: " + outputDir);
        fs_1.default.mkdir(outputDir, { recursive: true }, (err) => {
            if (err) {
                return console.error(`Error creating directory: ${err.message}`);
            }
            console.log('Directory created successfully!');
        });
        const resolutions = [
            {
                size: '640x?',
                bitrate: '800k',
                maxrate: '856k',
                bufsize: '1200k',
                audioBitrate: '96k',
                segmentFilename: `${outputDir}/360p_%03d.ts`,
                output: `${outputDir}/360p.m3u8`
            },
            {
                size: '842x?',
                bitrate: '1400k',
                maxrate: '1498k',
                bufsize: '2100k',
                audioBitrate: '128k',
                segmentFilename: `${outputDir}/480p_%03d.ts`,
                output: `${outputDir}/480p.m3u8`
            },
            {
                size: '1280x?',
                bitrate: '2800k',
                maxrate: '2996k',
                bufsize: '4200k',
                audioBitrate: '128k',
                segmentFilename: `${outputDir}/720p_%03d.ts`,
                output: `${outputDir}/720p.m3u8`
            },
            {
                size: '1920x?',
                bitrate: '5000k',
                maxrate: '5350k',
                bufsize: '7500k',
                audioBitrate: '192k',
                segmentFilename: `${outputDir}/1080p_%03d.ts`,
                output: `${outputDir}/1080p.m3u8`
            }
        ];
        yield Promise.all(resolutions.map(resolution => {
            return new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(inputFilePath)
                    .inputOptions('-v debug')
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .audioFrequency(48000)
                    .size(resolution.size)
                    .aspect('16:9')
                    .outputOptions([
                    '-crf 20',
                    '-sc_threshold 0',
                    '-g 48',
                    '-keyint_min 48',
                    '-hls_time 4',
                    '-hls_playlist_type vod',
                    `-b:v ${resolution.bitrate}`,
                    `-maxrate ${resolution.maxrate}`,
                    `-bufsize ${resolution.bufsize}`,
                    `-b:a ${resolution.audioBitrate}`,
                    `-hls_segment_filename ${resolution.segmentFilename}`
                ])
                    .output(resolution.output)
                    .on('end', () => resolve())
                    .on('progress', (progress) => {
                })
                    .on('error', (err) => {
                    console.error(err);
                })
                    .run();
            });
        }));
    });
}
function generatePlaylist(outputDir) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const playlistContent = `
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=842x480
480p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p.m3u8`;
            fs_1.default.writeFile(path_1.default.join(outputDir, 'playlist.m3u8'), playlistContent.trim(), (err) => {
                if (err) {
                    console.error('Error writing playlist.m3u8:', err);
                    reject(err);
                }
                else {
                    console.log('playlist.m3u8 created successfully');
                    resolve('Done');
                }
            });
        });
    });
}
function convertToMultipleResolutions(inputFile, outputDir, id) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("input: " + inputFile);
        console.log("output: " + outputDir);
        fs_1.default.mkdir(outputDir, { recursive: true }, (err) => {
            if (err) {
                return console.error(`Error creating directory: ${err.message}`);
            }
            console.log('Directory for download created successfully!');
        });
        const resolutions = [
            { width: 320, outputFile: 'low.mp4', bitrate: '1000k' },
            { width: 840, outputFile: 'med.mp4', bitrate: '3000k' },
            { width: 1280, outputFile: 'high.mp4', bitrate: '5000k' }
        ];
        const conversionPromises = resolutions.map(resolution => {
            return new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(inputFile)
                    .outputOptions('-vf', `scale=w=${resolution.width}:h=-2`)
                    .outputOptions('-c:v', 'h264')
                    .outputOptions('-profile:v', 'main')
                    .outputOptions('-b:v', resolution.bitrate)
                    .output(path_1.default.join(outputDir, resolution.outputFile))
                    .on('end', () => {
                    resolve();
                })
                    .on('progress', (progress) => {
                })
                    .on('error', (err) => {
                })
                    .run();
            });
        });
        try {
            yield Promise.all(conversionPromises);
            mysqldb_service_1.default.query(`UPDATE  ${state_1.tableName} SET status = ? WHERE uniqid = ?`, ['converted Download files', id]);
        }
        catch (err) {
            mysqldb_service_1.default.query(`UPDATE  ${state_1.tableName} SET status = ? WHERE uniqid = ?`, ['failed to convert' + err.message, id]);
            console.error('One or more conversions failed:', err);
        }
    });
}
