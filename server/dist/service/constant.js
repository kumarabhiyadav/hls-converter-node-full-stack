"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBucketName = exports.getDBName = exports.dbnames = exports.bucketNames = void 0;
exports.bucketNames = {
    bebu: "bebu-content-new-live",
    abethu: "abethu-content",
    bhoju: "bhoju-content",
    chorchuri: "chorchuri-content",
    cineuns: "cineuns-content",
    kannadaflix: "kannadflix-content",
    keeflix: "keeflix-content",
    kidullan: "kidullan-content",
    kooku: "kooku-content",
    olaple: "olaple-content",
    rokkt: "rokkt-content-new-live",
    sonadoll: "sonadoll-content",
    ubeetu: "ubeetu-content",
};
exports.dbnames = {
    bebu: "bebu_admin",
    abethu: "abethu_admin",
    bhoju: "bhoju_admin",
    chorchuri: "chorchuri_admin",
    cineuns: "cineuns_admin",
    kannadaflix: "kannadaflix_admin",
    keeflix: "keeflix_admin",
    kidullan: "kidullan_admin",
    kooku: "kooku_admin",
    olaple: "olaple_admin",
    rokkt: "rokkt_admin",
    sonadoll: "sonadoll_admin",
    ubeetu: "ubeetu_admin",
};
const getDBName = (key) => {
    switch (key) {
        case 'bebu':
            return exports.dbnames.bebu;
        case 'abethu':
            return exports.dbnames.abethu;
        case 'bhoju':
            return exports.dbnames.bhoju;
        case 'chorchuri':
            return exports.dbnames.chorchuri;
        case 'cineuns':
            return exports.dbnames.cineuns;
        case 'kannadaflix':
            return exports.dbnames.kannadaflix;
        case 'keeflix':
            return exports.dbnames.keeflix;
        case 'kidullan':
            return exports.dbnames.kidullan;
        case 'kooku':
            return exports.dbnames.kooku;
        case 'olaple':
            return exports.dbnames.olaple;
        case 'rokkt':
            return exports.dbnames.rokkt;
        case 'sonadoll':
            return exports.dbnames.sonadoll;
        case 'ubeetu':
            return exports.dbnames.ubeetu;
        default:
            throw new Error(`Database name not found for key: ${key}`);
    }
};
exports.getDBName = getDBName;
const getBucketName = (key) => {
    switch (key) {
        case 'bebu':
            return exports.bucketNames.bebu;
        case 'abethu':
            return exports.bucketNames.abethu;
        case 'bhoju':
            return exports.bucketNames.bhoju;
        case 'chorchuri':
            return exports.bucketNames.chorchuri;
        case 'cineuns':
            return exports.bucketNames.cineuns;
        case 'kannadaflix':
            return exports.bucketNames.kannadaflix;
        case 'keeflix':
            return exports.bucketNames.keeflix;
        case 'kidullan':
            return exports.bucketNames.kidullan;
        case 'kooku':
            return exports.bucketNames.kooku;
        case 'olaple':
            return exports.bucketNames.olaple;
        case 'rokkt':
            return exports.bucketNames.rokkt;
        case 'sonadoll':
            return exports.bucketNames.sonadoll;
        case 'ubeetu':
            return exports.bucketNames.ubeetu;
        default:
            throw new Error(`Bucket name not found for key: ${key}`);
    }
};
exports.getBucketName = getBucketName;
