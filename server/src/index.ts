import express from "express";
import dotenv from "dotenv";
import FileUpload from "express-fileupload";
import cors from "cors";
import fs, { mkdir } from "fs";
const app = express();
app.use(require('express-status-monitor')());
app.use(FileUpload());
import {
  clear,
  createWebSocketForFile,
  history,
  retry,
} from "./controllers/conversion.controller";
import { WebSocketServer } from "ws";
import path from "path";
dotenv.config();
const port = process.env.PORT;
// import DatabaseHLS from './service/mysqlbHLS.service'

// console.log(DatabaseHLS)


app.use(cors({ origin: "*" }));
import { globalCurrentFiles, } from "./service/state";


import { processQueue, uploadQueue, uploadsDir } from "./service/converter.service";

app.use(express.json({ limit: "5000mb" }));


// app.post("/start-conversion", startConversion);
app.post("/create-web-socket-for-file", createWebSocketForFile);
app.get("/history", history);
app.post("/retry", retry);
app.delete("/clear", clear);



app.get("/", (req, res) => {
  res.send("Serving on port" + port);
});

let server = app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

const wss = new WebSocketServer({ server });



wss.on('connection', (ws, req) => {
  console.log('New client connected');
  let fileWriteStreams = new Map();
  let totalLengths = new Map();
  let currentFiles = new Map();

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
        const filePath = path.join(uploadsDir, currentFile.file.replace(' ',''));
        console.log('File path:', filePath);

        // Check if filePath points to a directory
        if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
          console.error('Path is a directory, not a file:', filePath);
          ws.close();
          return;
        }

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
      if (message.length < 1048576) {  // Less than 1 MB
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
      ws.send('Echo: ' + message);  // Example echo response
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    for (const stream of fileWriteStreams.values()) {
      stream.end();
    }
  });
});