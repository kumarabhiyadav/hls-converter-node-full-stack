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
exports.updateStatus = exports.convertToMultipleResolutions = exports.generatePlaylist = exports.convertVideo = exports.processQueue = exports.isProcessing = exports.uploadQueue = exports.converted = exports.uploadsDir = void 0;
const path_1 = __importDefault(require("path"));
const Queue_model_1 = require("./Queue.model");
const state_1 = require("./state");
const s3Upload_1 = require("../helpers/s3Upload");
const fs_1 = __importDefault(require("fs"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const mysqlbHLS_service_1 = __importDefault(require("../service/mysqlbHLS.service"));
const mysqldb_service_1 = __importDefault(require("../service/mysqldb.service"));
const constant_1 = require("./constant");
exports.uploadsDir = path_1.default.join(__dirname, "..", "..", "uploads");
exports.converted = path_1.default.join(__dirname, "..", "..", "converted");
exports.uploadQueue = new Queue_model_1.Queue();
exports.isProcessing = false;
function processQueue() {
    return __awaiter(this, void 0, void 0, function* () {
        if (exports.isProcessing || exports.uploadQueue.isEmpty()) {
            return;
        }
        exports.isProcessing = true;
        const item = exports.uploadQueue.dequeue();
        if (!item) {
            exports.isProcessing = false;
            return;
        }
        const { uniqId, ws } = item;
        const currentFile = state_1.globalCurrentFiles.find((e) => e.uniqId == uniqId);
        if (!currentFile) {
            exports.isProcessing = false;
            processQueue();
            return;
        }
        const filePath = path_1.default.join(exports.uploadsDir, currentFile.file.replace(' ', ''));
        const outputdir = path_1.default.join(exports.converted, currentFile.file.split('.').slice(0, -1).join('.'));
        try {
            yield updateStatus('upload completed yet to start conversion', uniqId);
            if (ws) {
                ws.send(JSON.stringify({
                    status: 'processing',
                    message: `Processing started for file ${currentFile.file}`,
                    uniqId: uniqId
                }));
            }
            yield updateStatus('converting streaming file', uniqId);
            yield convertVideo(filePath, outputdir, uniqId);
            yield updateStatus('creating playlist.m3u8', uniqId);
            yield generatePlaylist(outputdir);
            yield updateStatus('converting download files', uniqId);
            yield convertToMultipleResolutions(filePath, `${outputdir}/download/`, uniqId);
            yield (0, s3Upload_1.uploadFolderToS3)(outputdir, uniqId);
            yield (0, s3Upload_1.uploadFolderToS3)(`${outputdir}/download/`, uniqId);
            if (ws) {
                ws.send(JSON.stringify({
                    status: 'processingCompleted',
                    message: `Processing completed for file ${currentFile.file}`,
                    uniqId: uniqId
                }));
            }
        }
        catch (error) {
            if (ws) {
                ws.send(JSON.stringify({
                    status: 'error',
                    message: `Video conversion failed for file ${currentFile.file}`,
                    uniqId: uniqId
                }));
            }
        }
        finally {
            let index = state_1.globalCurrentFiles.findIndex((e) => e.uniqId == uniqId);
            if (index != -1) {
                state_1.globalCurrentFiles.splice(index, 1);
            }
            exports.isProcessing = false;
            processQueue();
        }
    });
}
exports.processQueue = processQueue;
function convertVideo(inputFilePath, outputDir, id) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("input: " + inputFilePath);
        console.log("output: " + outputDir);
        fs_1.default.mkdir(outputDir, { recursive: true }, (err) => {
            if (err) {
                return console.error(`Error creating directory: ${err.message}`);
            }
            console.log("Directory created successfully!");
        });
        const resolutions = [
            {
                size: "640x?",
                bitrate: "800k",
                maxrate: "856k",
                bufsize: "1200k",
                audioBitrate: "96k",
                segmentFilename: `${outputDir}/360p_%03d.ts`,
                output: `${outputDir}/360p.m3u8`,
            },
            {
                size: "842x?",
                bitrate: "1400k",
                maxrate: "1498k",
                bufsize: "2100k",
                audioBitrate: "128k",
                segmentFilename: `${outputDir}/480p_%03d.ts`,
                output: `${outputDir}/480p.m3u8`,
            },
            {
                size: "1280x?",
                bitrate: "2800k",
                maxrate: "2996k",
                bufsize: "4200k",
                audioBitrate: "128k",
                segmentFilename: `${outputDir}/720p_%03d.ts`,
                output: `${outputDir}/720p.m3u8`,
            },
            {
                size: "1920x?",
                bitrate: "5000k",
                maxrate: "5350k",
                bufsize: "7500k",
                audioBitrate: "192k",
                segmentFilename: `${outputDir}/1080p_%03d.ts`,
                output: `${outputDir}/1080p.m3u8`,
            },
        ];
        yield Promise.all(resolutions.map((resolution) => {
            return new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(inputFilePath)
                    .inputOptions("-v debug")
                    .videoCodec("libx264")
                    .audioCodec("aac")
                    .audioFrequency(48000)
                    .size(resolution.size)
                    .aspect("16:9")
                    .outputOptions([
                    "-crf 20",
                    "-sc_threshold 0",
                    "-g 48",
                    "-keyint_min 48",
                    "-hls_time 4",
                    "-hls_playlist_type vod",
                    `-b:v ${resolution.bitrate}`,
                    `-maxrate ${resolution.maxrate}`,
                    `-bufsize ${resolution.bufsize}`,
                    `-b:a ${resolution.audioBitrate}`,
                    `-hls_segment_filename ${resolution.segmentFilename}`,
                ])
                    .output(resolution.output)
                    .on("end", () => resolve())
                    .on("progress", (progress) => { })
                    .on("error", (err) => {
                    console.error(err);
                })
                    .run();
            });
        }));
    });
}
exports.convertVideo = convertVideo;
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
            fs_1.default.writeFile(path_1.default.join(outputDir, "playlist.m3u8"), playlistContent.trim(), (err) => {
                if (err) {
                    console.error("Error writing playlist.m3u8:", err);
                    reject(err);
                }
                else {
                    console.log("playlist.m3u8 created successfully");
                    resolve("Done");
                }
            });
        });
    });
}
exports.generatePlaylist = generatePlaylist;
function convertToMultipleResolutions(inputFile, outputDir, id) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("input: " + inputFile);
        console.log("output: " + outputDir);
        fs_1.default.mkdir(outputDir, { recursive: true }, (err) => {
            if (err) {
                return console.error(`Error creating directory: ${err.message}`);
            }
            console.log("Directory for download created successfully!");
        });
        const resolutions = [
            { width: 320, outputFile: "low.mp4", bitrate: "1000k" },
            { width: 840, outputFile: "med.mp4", bitrate: "3000k" },
            { width: 1280, outputFile: "high.mp4", bitrate: "5000k" },
        ];
        const conversionPromises = resolutions.map((resolution) => {
            return new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(inputFile)
                    .outputOptions("-vf", `scale=w=${resolution.width}:h=-2`)
                    .outputOptions("-c:v", "h264")
                    .outputOptions("-profile:v", "main")
                    .outputOptions("-b:v", resolution.bitrate)
                    .output(path_1.default.join(outputDir, resolution.outputFile))
                    .on("end", () => {
                    resolve();
                })
                    .on("progress", (progress) => {
                })
                    .on("error", (err) => { })
                    .run();
            });
        });
        try {
            yield Promise.all(conversionPromises);
            yield updateStatus("converted Download files", id);
        }
        catch (err) {
            console.warn("Failed to Upload");
            yield updateStatus("failed to convert" + err.message, id);
        }
    });
}
exports.convertToMultipleResolutions = convertToMultipleResolutions;
function updateStatus(status, id) {
    return __awaiter(this, void 0, void 0, function* () {
        mysqlbHLS_service_1.default.query("SELECT platform FROM table WHERE uniqid=?", [id]).then((result) => {
            mysqldb_service_1.default
                .getInstance((0, constant_1.getDBName)(result[0]["platform"]))
                .query(`UPDATE  ${state_1.tableName} SET status = ? WHERE uniqid = ?`, [
                status,
                id,
            ])
                .then((result) => {
                console.log(status + id);
            });
        });
        mysqlbHLS_service_1.default.query("UPDATE table SET status =? WHERE uniqid =?", [
            status,
            id,
        ]).then((result) => {
            console.warn("Updated Status" + status);
        });
    });
}
exports.updateStatus = updateStatus;
