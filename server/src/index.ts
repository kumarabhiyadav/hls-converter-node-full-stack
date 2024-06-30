import express from "express";
import dotenv from "dotenv";
import FileUpload from "express-fileupload";
import cors from "cors";
import fs, { mkdir } from 'fs'
const app = express();
app.use(FileUpload());
import { createWebSocketForFile, history, uploadVideo } from "./controllers/conversion.controller";
import { WebSocketServer } from "ws";
import path from "path";
import DataStore from "./service/db.service";
dotenv.config();
const port = process.env.PORT;

console.log(port)

app.use(cors({ origin: '*' }));
import ffmpeg from 'fluent-ffmpeg';
import { uploadFolderToS3 } from "./helpers/s3Upload";
import { currentFiles, tableName } from "./service/state";
import { log } from "console";
import mysqldbService from "./service/mysqldb.service";

app.use(express.json({ limit: "5000mb" }));

const uploadsDir = path.join(__dirname, '..', 'uploads');
const converted = path.join(__dirname, '..', 'converted');




app.post('/upload-file', uploadVideo);
app.post('/create-web-socket-for-file', createWebSocketForFile);
app.get('/history', history);





app.get("/", (req, res) => {
    res.send("Serving on port" + port);
});



let server = app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});





const wss = new WebSocketServer({ server });


wss.on('connection', (ws, req) => {
    console.log('New client connected');

    let fileBuffer: Array<any> = [];
    let totalLength = 0;

    ws.on('message', (message) => {
        if (Buffer.isBuffer(message)) {
            let reqPath = req.url;
            let currentFile = currentFiles.find((e) => e.uniqId === reqPath?.replace('/', ''));
            if (!currentFile) {
                ws.close();
                return;
            }

            fileBuffer.push(message);
            totalLength += message.length;

            const filePath = path.join(uploadsDir, currentFile.file);

            if (message.length < 1048576) {
                const combinedBuffer = Buffer.concat(fileBuffer, totalLength);

                fs.writeFile(filePath, combinedBuffer, async (err) => {
                    if (err) {
                        console.error('Error writing file:', err);
                        ws.send('Error writing file');
                    } else {
                        ws.send(JSON.stringify({ status: 'completed', message: 'File received completely' }));
                        ws.send(JSON.stringify({ status: 'converting', message: 'File Upload is completed, Converting file...' }));
                        if (currentFile) {
                            ws.close()
                            currentFile = currentFiles.find((e) => e.uniqId === reqPath?.replace('/', ''));
                            if (currentFile) {
                                let outputdir = converted + '/' + currentFile!.file.split('.').slice(0, -1).join('.');
                                console.log(outputdir)
                                mysqldbService.query(`UPDATE  ${tableName} SET status = ? WHERE uniqid = ?`, ['converting HLS', currentFile!.uniqId])
                                await convertVideo(filePath, outputdir, currentFile!.uniqId)
                                mysqldbService.query(`UPDATE  ${tableName} SET status = ? WHERE uniqid = ?`, ['creating playlist.m3u8', currentFile!.uniqId])
                                await generatePlaylist(outputdir);
                                mysqldbService.query(`UPDATE  ${tableName} SET status = ? WHERE uniqid = ?`, ['converting download files', currentFile!.uniqId])
                                await convertToMultipleResolutions(filePath, outputdir + '/download/', currentFile!.uniqId);
                                console.log("Uploading...")
                                mysqldbService.query(`UPDATE  ${tableName} SET status = ? WHERE uniqid = ?`, ['Uploading HLS to s3', currentFile!.uniqId])
                                await uploadFolderToS3(outputdir, process.env.S3_BUCKET ?? '', currentFile!.uniqId);
                                mysqldbService.query(`UPDATE  ${tableName} SET status = ? WHERE uniqid = ?`, ['Uploading Downloadfile to s3', currentFile!.uniqId])
                                await uploadFolderToS3(outputdir+'/download/', process.env.S3_BUCKET ?? '', currentFile!.uniqId);
                                mysqldbService.query(`UPDATE  ${tableName} SET status = ? WHERE uniqid = ?`, ['uploaded to S3', currentFile!.uniqId])
                                return;
                            }
                        }

                        try {

                        } catch (error) {

                            ws.send(JSON.stringify({ status: 'error', message: 'Video conversion failed' }));
                        }
                    }
                });
            } else {

                ws.send(JSON.stringify({ status: 'progress', message: 'Chunk received' }));
            }

        } else {
            console.log('Received text message:', message);
            ws.send('Echo: ' + message); // Example echo response
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});


async function convertVideo(inputFilePath: string, outputDir: string, id: string): Promise<void> {
    console.log("input: " + inputFilePath);
    console.log("output: " + outputDir);
    fs.mkdir(outputDir, { recursive: true }, (err) => {
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

    await Promise.all(resolutions.map(resolution => {
        return new Promise<void>((resolve, reject) => {
            ffmpeg(inputFilePath)
                .inputOptions('-v debug')  // Enable verbose logging
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
                .on('error', (err: any) => {
                    console.error(err);
                })
                .run();
        });
    }));
}


async function generatePlaylist(outputDir: string) {
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
        fs.writeFile(path.join(outputDir, 'playlist.m3u8'), playlistContent.trim(), (err) => {
            if (err) {
                console.error('Error writing playlist.m3u8:', err);
                reject(err);
            } else {
                console.log('playlist.m3u8 created successfully');
                resolve('Done');
            }
        });
    });
}



async function convertToMultipleResolutions(inputFile: string, outputDir: string, id: string): Promise<void> {
    console.log("input: " + inputFile);
    console.log("output: " + outputDir);
    fs.mkdir(outputDir, { recursive: true }, (err) => {
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

    // Create an array of promises for each resolution conversion
    const conversionPromises = resolutions.map(resolution => {
        return new Promise<void>((resolve, reject) => {
            ffmpeg(inputFile)
                .outputOptions('-vf', `scale=w=${resolution.width}:h=-2`)
                .outputOptions('-c:v', 'h264')
                .outputOptions('-profile:v', 'main')
                .outputOptions('-b:v', resolution.bitrate)
                .output(path.join(outputDir, resolution.outputFile))
                .on('end', () => {

                    resolve();
                })
                .on('progress', (progress) => {

                    // console.log("Converting download");

                })
                .on('error', (err) => {

                })
                .run();
        });
    });

    // Run all the conversions in parallel and wait for them to complete
    try {
        await Promise.all(conversionPromises);
        mysqldbService.query(`UPDATE  ${tableName} SET status = ? WHERE uniqid = ?`, ['converted Download files', id]);

    } catch (err) {

        mysqldbService.query(`UPDATE  ${tableName} SET status = ? WHERE uniqid = ?`, ['failed to convert' + err.message, id]);
        console.error('One or more conversions failed:', err);
    }
}