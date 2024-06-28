import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

class Database {
  private static instance: Database;
  private connection: mysql.Connection;

  private constructor() {
    this.connection = mysql.createConnection({
      host: process.env.DB_HOST ,
      user: process.env.DB_USER ,
      password: process.env.DB_PASSWORD ,
      database: process.env.DB_NAME 
    });

    this.connection.connect((err) => {
      if (err) {
        console.error('Error connecting to the database:', err.stack);
        return;
      }
      console.log('Connected to the database as id', this.connection.threadId);
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public query(sql: string, args?: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, args, (err, results) => {
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

export default Database.getInstance();
