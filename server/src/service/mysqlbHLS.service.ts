import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

class DatabaseHLS {
  private static instance: DatabaseHLS;
  private connection: mysql.Connection;

  private constructor() {
    this.connection = mysql.createConnection({
      host: process.env.DB_HOST ,
      user: process.env.DB_USER ,
      password: process.env.DB_PASSWORD ,
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

  public static getInstance(): DatabaseHLS {
    if (!DatabaseHLS.instance) {
        DatabaseHLS.instance = new DatabaseHLS();
    }
    return DatabaseHLS.instance;
  }

  public query(sql: string, args?: any[]): Promise<any> {
    let sqlQuery = sql.replace('table','master')
    return new Promise((resolve, reject) => {
      this.connection.query(sqlQuery, args, (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
  }

  public close(): Promise<void> {
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

export default DatabaseHLS.getInstance();