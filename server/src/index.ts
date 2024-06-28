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

            fileBuffer.push(message);
            totalLength += message.length;

            let db = DataStore.getInstance();

            db.find({ ulid: reqPath }).exec((err, docs) => {
                if (err) {
                    console.error('Error querying database:', err);
                    ws.send('Error querying database');
                    return;
                }

                if (docs.length === 0) {
                    console.error('Document with ulid not found:', reqPath);
                    ws.send('Document not found');
                    return;
                }

                const filename = docs[0].filename;

                const filePath = path.join(uploadsDir, filename);

                if (message.length < 1048576) {
                    const combinedBuffer = Buffer.concat(fileBuffer, totalLength);

                    fs.writeFile(filePath, combinedBuffer, async (err) => {
                        if (err) {
                            console.error('Error writing file:', err);
                            ws.send('Error writing file');
                        } else {
                            // console.log('File saved successfully:', filePath);

                            db.update({ ulid: reqPath }, { $set: { state: 'uploaded' } }, {});

                            ws.send(JSON.stringify({ status: 'completed', message: 'File received completely' }));

                            try {
                                let outputdir = converted + '/' + docs[0].filename.split('.').slice(0, -1).join('.');

                                fs.mkdir(outputdir, { recursive: true }, (err) => {
                                    if (err) {
                                        return console.error(`Error creating directory: ${err.message}`);
                                    }
                                    // console.log('Directory created successfully!');
                                });
                                await convertVideo(filePath, outputdir, ws, docs[0]._id);

                                db.update({ ulid: reqPath }, { $set: { state: 'converting' } }, {});

                                ws.send(JSON.stringify({ status: 'converting', message: 'Video conversion completed' }));
                                fs.mkdir(outputdir + '/download/', { recursive: true }, (err) => {
                                    if (err) {
                                        return console.error(`Error creating directory: ${err.message}`);
                                    }
                                    // console.log('Directory created successfully!');
                                });
                                await generatePlaylist(outputdir);
                                await convertToMultipleResolutions(filePath, outputdir + '/download/', ws, docs[0]._id);

                                db.update({ _id: docs[0]._id }, { $set: { 'status': 'converted' } })


                                await uploadFolderToS3(outputdir, process.env.S3_BUCKET ?? '', ws, docs[0]['_id']);
                                await uploadFolderToS3(outputdir + '/download/', process.env.S3_BUCKET ?? '', ws, docs[0]['_id']);
                            } catch (error) {
                                console.error('Error converting video:', error);
                                db.update({ _id: docs[0]._id }, { $set: { 'error': error.message } })

                                ws.send(JSON.stringify({ status: 'error', message: 'Video conversion failed' }));
                            }
                        }
                    });
                } else {
                    // Send progress update for chunk received
                    ws.send(JSON.stringify({ status: 'progress', message: 'Chunk received' }));
                }
            });
        } else {
            // Handle text message (if any)
            console.log('Received text message:', message);
            ws.send('Echo: ' + message); // Example echo response
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});



async function convertVideo(inputFilePath: string, outputDir: string, ws: any, id: string): Promise<void> {
    console.log("input :" + inputFilePath);
    console.log("out :" + outputDir);

    return new Promise((resolve, reject) => {
        ffmpeg(inputFilePath)
            .inputOptions('-v debug')  // Enable verbose logging
            // 360p
            .videoCodec('libx264')
            .audioCodec('aac')
            .audioFrequency(48000)
            .size('640x?')
            .aspect('16:9')
            .outputOptions([
                '-crf 20',
                '-sc_threshold 0',
                '-g 48',
                '-keyint_min 48',
                '-hls_time 4',
                '-hls_playlist_type vod',
                '-b:v 800k',
                '-maxrate 856k',
                '-bufsize 1200k',
                '-b:a 96k',
                `-hls_segment_filename ${outputDir}/360p_%03d.ts`
            ])
            .output(`${outputDir}/360p.m3u8`)
            // 480p
            .videoCodec('libx264')
            .audioCodec('aac')
            .audioFrequency(48000)
            .size('842x?')
            .aspect('16:9')
            .outputOptions([
                '-crf 20',
                '-sc_threshold 0',
                '-g 48',
                '-keyint_min 48',
                '-hls_time 4',
                '-hls_playlist_type vod',
                '-b:v 1400k',
                '-maxrate 1498k',
                '-bufsize 2100k',
                '-b:a 128k',
                `-hls_segment_filename ${outputDir}/480p_%03d.ts`
            ])
            .output(`${outputDir}/480p.m3u8`)
            // 720p
            .videoCodec('libx264')
            .audioCodec('aac')
            .audioFrequency(48000)
            .size('1280x?')
            .aspect('16:9')
            .outputOptions([
                '-crf 20',
                '-sc_threshold 0',
                '-g 48',
                '-keyint_min 48',
                '-hls_time 4',
                '-hls_playlist_type vod',
                '-b:v 2800k',
                '-maxrate 2996k',
                '-bufsize 4200k',
                '-b:a 128k',
                `-hls_segment_filename ${outputDir}/720p_%03d.ts`
            ])
            .output(`${outputDir}/720p.m3u8`)
            // 1080p
            .videoCodec('libx264')
            .audioCodec('aac')
            .audioFrequency(48000)
            .size('1920x?')
            .aspect('16:9')
            .outputOptions([
                '-crf 20',
                '-sc_threshold 0',
                '-g 48',
                '-keyint_min 48',
                '-hls_time 4',
                '-hls_playlist_type vod',
                '-b:v 5000k',
                '-maxrate 5350k',
                '-bufsize 7500k',
                '-b:a 192k',
                `-hls_segment_filename ${outputDir}/1080p_%03d.ts`
            ])
            .output(`${outputDir}/1080p.m3u8`)
            .on('end', () => resolve())
            .on('progress', (progress) => {
                ws.send(JSON.stringify({
                    status: 'converting',
                    message: `Converting to HLS : ${progress.percent.toFixed(2)}% done`
                }));
            })
            .on('error', (err: any) => {
                let db = DataStore.getInstance();
                db.update({ _id: id }, { $set: { 'error': err.message } })
                console.error('ffmpeg error:', err);
                reject(err);
            })
            .run();
    });
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



async function convertToMultipleResolutions(inputFile: string, outputDir: string, ws: any, id: string) {
    // Define the resolutions and their corresponding output file names
    const resolutions = [
        { width: 320, outputFile: 'low.mp4', bitrate: '1000k' },
        { width: 840, outputFile: 'med.mp4', bitrate: '3000k' },
        { width: 1280, outputFile: 'high.mp4', bitrate: '5000k' }
    ];

    // Iterate through each resolution and convert the video
    resolutions.forEach(resolution => {
        ffmpeg(inputFile)
            .outputOptions(`-vf`, `scale=w=${resolution.width}:h=-2`)
            .outputOptions(`-c:v`, `h264`)
            .outputOptions(`-profile:v`, `main`)
            .outputOptions(`-b:v`, resolution.bitrate)
            .output(path.join(outputDir, resolution.outputFile))
            .on('end', () => {
                ws.send(JSON.stringify({
                    status: 'converting',
                    message: `Download file has been Converted`
                }));
            }).on('progress', (progress) => {
                ws.send(JSON.stringify({
                    status: 'converting',
                    message: `Converting to for downloadfile ${resolution.outputFile} : ${progress.percent.toFixed(2)}% done`
                }));
            })
            .on('error', (err) => {

                let db = DataStore.getInstance();

                db.update({ _id: id }, { $set: { 'error': err.message } })


                console.error(`Error converting ${resolution.outputFile}:`, err);
            })
            .run();
    });
}