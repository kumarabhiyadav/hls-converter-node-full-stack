"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql2_1 = __importDefault(require("mysql2"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class DatabaseHLS {
    constructor() {
        this.connection = mysql2_1.default.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: 'hls_converter'
        });
        this.connection.connect((err) => {
            if (err) {
                console.error('Error connecting to the database:', err.stack);
                return;
            }
            console.log('Connected to the database as id', this.connection.threadId);
        });
    }
    static getInstance() {
        if (!DatabaseHLS.instance) {
            DatabaseHLS.instance = new DatabaseHLS();
        }
        return DatabaseHLS.instance;
    }
    query(sql, args) {
        let sqlQuery = sql.replace('table', 'master');
        return new Promise((resolve, reject) => {
            this.connection.query(sqlQuery, args, (err, results) => {
                if (err) {
                    return reject(err);
                }
                resolve(results);
            });
        });
    }
    close() {
        return new Promise((resolve, reject) => {
            this.connection.end((err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
}
exports.default = DatabaseHLS.getInstance();
