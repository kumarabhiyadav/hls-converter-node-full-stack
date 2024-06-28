"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nedb_1 = __importDefault(require("nedb"));
class DataStore {
    static getInstance() {
        if (this.instance) {
            return this.instance;
        }
        this.instance = new nedb_1.default({ filename: 'datastore.db', autoload: true, timestampData: true });
        return this.instance;
    }
}
DataStore.instance = null;
exports.default = DataStore;
