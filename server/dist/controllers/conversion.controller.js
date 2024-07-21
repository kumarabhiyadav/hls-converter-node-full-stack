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
exports.clear = exports.retry = exports.history = exports.createWebSocketForFile = void 0;
const ulid_1 = require("ulid");
const tryCatch_1 = require("../helpers/tryCatch");
const mysqldb_service_1 = __importDefault(require("../service/mysqldb.service"));
const mysqlbHLS_service_1 = __importDefault(require("../service/mysqlbHLS.service"));
const state_1 = require("../service/state");
const constant_1 = require("../service/constant");
const converter_service_1 = require("../service/converter.service");
exports.createWebSocketForFile = (0, tryCatch_1.tryCatchFn)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let uniqId = (0, ulid_1.ulid)();
    mysqldb_service_1.default.getInstance((0, constant_1.getDBName)(req.body.platform)).query(`INSERT INTO ${state_1.tableName} (filename,uniqid) VALUES (?,?)`, [req.body.filename, uniqId]).then((result) => {
        console.log(result);
    }).catch((err) => {
        console.warn(err);
    });
    mysqlbHLS_service_1.default.query('INSERT INTO table (filename,uniqid,platform) VALUES (?,?,?)', [req.body.filename, uniqId, req.body.platform]).then((result) => {
        console.log(result);
    }).catch((err) => {
        console.warn(err);
    });
    ;
    state_1.globalCurrentFiles.push({ 'file': req.body.filename, uniqId: uniqId });
    return res.status(200).json({ uniqId: "/" + uniqId });
}));
exports.history = (0, tryCatch_1.tryCatchFn)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    mysqlbHLS_service_1.default.query(`SELECT * FROM table WHERE is_deleted =0 ORDER BY created_at DESC`, []).then((result) => {
        res.status(200).send(result);
    }).catch((error) => {
        res.status(500).send(error);
    });
}));
exports.retry = (0, tryCatch_1.tryCatchFn)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { id, filename } = req.body;
    state_1.globalCurrentFiles.push({ 'file': filename, uniqId: id });
    converter_service_1.uploadQueue.enqueue({ uniqId: id, ws: "" });
    (0, converter_service_1.processQueue)();
    return res.status(200).json({
        'status': true,
        'message': "Added to queue for conversion"
    });
}));
exports.clear = (0, tryCatch_1.tryCatchFn)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    mysqlbHLS_service_1.default.query(`UPDATE table SET is_deleted = 1 WHERE 1`, []).then((result) => {
        res.status(200).json({
            status: true
        });
    }).catch((error) => {
        res.status(500).send(error);
    });
}));
