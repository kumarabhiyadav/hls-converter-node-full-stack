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
exports.history = exports.uploadVideo = exports.createWebSocketForFile = void 0;
const ulid_1 = require("ulid");
const tryCatch_1 = require("../helpers/tryCatch");
const db_service_1 = __importDefault(require("../service/db.service"));
const mysqldb_service_1 = __importDefault(require("../service/mysqldb.service"));
exports.createWebSocketForFile = (0, tryCatch_1.tryCatchFn)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let path = "/" + (0, ulid_1.ulid)();
    let db = db_service_1.default.getInstance();
    db.insert({ ulid: path, state: 'initiate', filename: req.body.filename });
    mysqldb_service_1.default.query('INSERT INTO hls_videos_status (video_name,ulid) VALUES (?,?)', [req.body.filename, path]).then((result) => {
        console.log(result);
    });
    return res.status(200).json({ path });
}));
exports.uploadVideo = (0, tryCatch_1.tryCatchFn)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
}));
exports.history = (0, tryCatch_1.tryCatchFn)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let db = db_service_1.default.getInstance();
    db.find({})
        .sort({ createdAt: -1 })
        .exec((err, docs) => {
        if (err) {
            res.status(500).send(err);
        }
        else {
            res.status(200).send(docs);
        }
    });
}));
