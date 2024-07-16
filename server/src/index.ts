import express from "express";
import dotenv from "dotenv";
import FileUpload from "express-fileupload";
import cors from "cors";
import fs, { mkdir } from "fs";
const app = express();
app.use(require('express-status-monitor')());
app.use(FileUpload());
import {
  createWebSocketForFile,
  history,
  uploadVideo,
} from "./controllers/conversion.controller";
import { WebSocketServer } from "ws";
import path from "path";
dotenv.config();
const port = process.env.PORT;
import DatabaseHLS from "./service/mysqlbHLS.service";

console.log(port);

app.use(cors({ origin: "*" }));
import ffmpeg from "fluent-ffmpeg";
import { uploadFolderToS3 } from "./helpers/s3Upload";
import { globalCurrentFiles, tableName } from "./service/state";
import { log } from "console";
import mysqldbService from "./service/mysqldb.service";
import { getDBName } from "./service/constant";
import { Queue } from "./service/Queue.model";

app.use(express.json({ limit: "5000mb" }));

const uploadsDir = path.join(__dirname, "..", "uploads");
const converted = path.join(__dirname, "..", "converted");

app.post("/upload-file", uploadVideo);
app.post("/create-web-socket-for-file", createWebSocketForFile);
app.get("/history", history);

app.get("/", (req, res) => {
  res.send("Serving on port" + port);
});

let server = app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

const wss = new WebSocketServer({ server });

const uploadQueue = new Queue<{ uniqId: string, ws: any }>();
let isProcessing = false;

wss.on('connection', (ws, req) => {
  console.log('New client connected');
  let fileWriteStreams = new Map<string, fs.WriteStream>();
  let totalLengths = new Map<string, number>();
  let currentFiles = new Map<string, any>();

  ws.on('message', async (message) => {
    if (Buffer.isBuffer(message)) {
      const reqPath = req.url;
      if (!reqPath) {
        ws.close();
        return;
      }
      const uniqId = reqPath.replace('/', '');

      if (!currentFiles.has(uniqId)) {
        const currentFile = globalCurrentFiles.find(e => e.uniqId === uniqId);
        if (!currentFile) {
          ws.close();
          return;
        }
        currentFiles.set(uniqId, currentFile);
        const filePath = path.join(uploadsDir, currentFile.file);
        fileWriteStreams.set(uniqId, fs.createWriteStream(filePath));
        totalLengths.set(uniqId, 0);
      }
      const fileWriteStream = fileWriteStreams.get(uniqId);
      if (!fileWriteStream) {
        ws.close();
        return;
      }

      totalLengths.set(uniqId, (totalLengths.get(uniqId) || 0) + message.length);
      fileWriteStream.write(message);
      if (message.length < 1048576) {
        fileWriteStream.end();
        ws.send(JSON.stringify({
          status: 'completed',
          message: `File ${currentFiles.get(uniqId)?.file} received completely`,
          uniqId: uniqId
        }));
        ws.send(JSON.stringify({
          status: 'queued',
          message: `File ${currentFiles.get(uniqId)?.file} upload is completed, Queued for processing...`,
          uniqId: uniqId
        }));

        // Add to queue
        uploadQueue.enqueue({ uniqId, ws });
        processQueue();

        // Clean up
        fileWriteStreams.delete(uniqId);
        totalLengths.delete(uniqId);
      } else {
        ws.send(JSON.stringify({
          status: 'progress',
          message: 'Chunk received',
          uniqId: uniqId
        }));
      }
    } else {
      console.log('Received text message:', message);
      ws.send('Echo: ' + message); // Example echo response
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    for (const stream of fileWriteStreams.values()) {
      stream.end();
    }
  });
});

async function processQueue() {
  if (isProcessing || uploadQueue.isEmpty()) {
    return;
  }

  isProcessing = true;
  const item = uploadQueue.dequeue();
  if (!item) {
    isProcessing = false;
    return;
  }

  const { uniqId, ws } = item;
  const currentFile = globalCurrentFiles.find((e) => e.uniqId == uniqId);
  if (!currentFile) {
    isProcessing = false;
    processQueue();
    return;
  }

  const filePath = path.join(uploadsDir, currentFile.file);
  const outputdir = path.join(converted, currentFile.file.split('.').slice(0, -1).join('.'));

  try {

    await updateStatus('upload completed yet to start conversion', uniqId);
    ws.send(JSON.stringify({
      status: 'processing',
      message: `Processing started for file ${currentFile.file}`,
      uniqId: uniqId
    }));

    await updateStatus('converting streaming file', uniqId);
    await convertVideo(filePath, outputdir, uniqId);
    await updateStatus('creating playlist.m3u8', uniqId);
    await generatePlaylist(outputdir);
    await updateStatus('converting download files', uniqId);
    await convertToMultipleResolutions(filePath, `${outputdir}/download/`, uniqId);
    await uploadFolderToS3(outputdir, uniqId);
    await uploadFolderToS3(`${outputdir}/download/`, uniqId);

    ws.send(JSON.stringify({
      status: 'processingCompleted',
      message: `Processing completed for file ${currentFile.file}`,
      uniqId: uniqId
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      status: 'error',
      message: `Video conversion failed for file ${currentFile.file}`,
      uniqId: uniqId
    }));
  } finally {
    let index = globalCurrentFiles.findIndex((e) => e.uniqId == uniqId);

    if (index != -1) {
      globalCurrentFiles.splice(index, 1)
    }
    isProcessing = false;
    processQueue(); // Process next item in the queue
  }
}
async function convertVideo(
  inputFilePath: string,
  outputDir: string,
  id: string
): Promise<void> {
  console.log("input: " + inputFilePath);
  console.log("output: " + outputDir);
  fs.mkdir(outputDir, { recursive: true }, (err) => {
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

  await Promise.all(
    resolutions.map((resolution) => {
      return new Promise<void>((resolve, reject) => {
        ffmpeg(inputFilePath)
          .inputOptions("-v debug") // Enable verbose logging
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
          .on("error", (err: any) => {
            console.error(err);
          })
          .run();
      });
    })
  );
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
    fs.writeFile(
      path.join(outputDir, "playlist.m3u8"),
      playlistContent.trim(),
      (err) => {
        if (err) {
          console.error("Error writing playlist.m3u8:", err);
          reject(err);
        } else {
          console.log("playlist.m3u8 created successfully");
          resolve("Done");
        }
      }
    );
  });
}

async function convertToMultipleResolutions(
  inputFile: string,
  outputDir: string,
  id: string
): Promise<void> {
  console.log("input: " + inputFile);
  console.log("output: " + outputDir);
  fs.mkdir(outputDir, { recursive: true }, (err) => {
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

  // Create an array of promises for each resolution conversion
  const conversionPromises = resolutions.map((resolution) => {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(inputFile)
        .outputOptions("-vf", `scale=w=${resolution.width}:h=-2`)
        .outputOptions("-c:v", "h264")
        .outputOptions("-profile:v", "main")
        .outputOptions("-b:v", resolution.bitrate)
        .output(path.join(outputDir, resolution.outputFile))
        .on("end", () => {
          resolve();
        })
        .on("progress", (progress) => {
          // console.log("Converting download");
        })
        .on("error", (err) => { })
        .run();
    });
  });

  // Run all the conversions in parallel and wait for them to complete
  try {
    await Promise.all(conversionPromises);

    await updateStatus("converted Download files", id);
  } catch (err) {
    console.warn("Failed to Upload");

    await updateStatus("failed to convert" + err.message, id);
  }
}

export async function updateStatus(status: string, id: string) {
  DatabaseHLS.query("SELECT platform FROM table WHERE uniqid=?", [id]).then(
    (result: any) => {
      mysqldbService
        .getInstance(getDBName(result[0]["platform"]))
        .query(`UPDATE  ${tableName} SET status = ? WHERE uniqid = ?`, [
          status,
          id,
        ])
        .then((result: any) => {
          console.log(status + id);
        });
    }
  );

  DatabaseHLS.query("UPDATE table SET status =? WHERE uniqid =?", [
    status,
    id,
  ]).then((result: any) => {
    console.warn("Updated Status" + status);
  });
}
