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
app.use(require('express-status-monitor')());
app.use((0, express_fileupload_1.default)());
const conversion_controller_1 = require("./controllers/conversion.controller");
const ws_1 = require("ws");
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const port = process.env.PORT;
app.use((0, cors_1.default)({ origin: "*" }));
const state_1 = require("./service/state");
const converter_service_1 = require("./service/converter.service");
app.use(express_1.default.json({ limit: "5000mb" }));
app.post("/create-web-socket-for-file", conversion_controller_1.createWebSocketForFile);
app.get("/history", conversion_controller_1.history);
app.post("/retry", conversion_controller_1.retry);
app.delete("/clear", conversion_controller_1.clear);
app.get("/", (req, res) => {
    res.send("Serving on port" + port);
});
let server = app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
const wss = new ws_1.WebSocketServer({ server });
wss.on('connection', (ws, req) => {
    console.log('New client connected');
    let fileWriteStreams = new Map();
    let totalLengths = new Map();
    let currentFiles = new Map();
    ws.on('message', (message) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        if (Buffer.isBuffer(message)) {
            const reqPath = req.url;
            if (!reqPath) {
                ws.close();
                return;
            }
            const uniqId = reqPath.replace('/', '');
            if (!currentFiles.has(uniqId)) {
                const currentFile = state_1.globalCurrentFiles.find(e => e.uniqId === uniqId);
                if (!currentFile) {
                    ws.close();
                    return;
                }
                currentFiles.set(uniqId, currentFile);
                const filePath = path_1.default.join(converter_service_1.uploadsDir, currentFile.file.replace(' ', ''));
                console.log('File path:', filePath);
                if (fs_1.default.existsSync(filePath) && fs_1.default.lstatSync(filePath).isDirectory()) {
                    console.error('Path is a directory, not a file:', filePath);
                    ws.close();
                    return;
                }
                fileWriteStreams.set(uniqId, fs_1.default.createWriteStream(filePath));
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
                    message: `File ${(_a = currentFiles.get(uniqId)) === null || _a === void 0 ? void 0 : _a.file} received completely`,
                    uniqId: uniqId
                }));
                ws.send(JSON.stringify({
                    status: 'queued',
                    message: `File ${(_b = currentFiles.get(uniqId)) === null || _b === void 0 ? void 0 : _b.file} upload is completed, Queued for processing...`,
                    uniqId: uniqId
                }));
                converter_service_1.uploadQueue.enqueue({ uniqId, ws });
                (0, converter_service_1.processQueue)();
                fileWriteStreams.delete(uniqId);
                totalLengths.delete(uniqId);
            }
            else {
                ws.send(JSON.stringify({
                    status: 'progress',
                    message: 'Chunk received',
                    uniqId: uniqId
                }));
            }
        }
        else {
            console.log('Received text message:', message);
            ws.send('Echo: ' + message);
        }
    }));
    ws.on('close', () => {
        console.log('Client disconnected');
        for (const stream of fileWriteStreams.values()) {
            stream.end();
        }
    });
});
