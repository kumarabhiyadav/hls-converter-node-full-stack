import fs from "fs";
import path from "path";
import AWS from "aws-sdk";
import mysqldbService from "../service/mysqldb.service";
import DatabaseHls from "../service/mysqlbHLS.service";
import { tableName } from "../service/state";
import { getBucketName, getDBName } from "../service/constant";
import { updateStatus } from "../index";

// Set up AWS credentials and region
AWS.config.update({
  accessKeyId: process.env.S3_KEY,
  secretAccessKey: process.env.S3_SECRET,
  region: process.env.S3_REGION, // e.g., 'us-east-1'
});

// Create S3 instance
const s3 = new AWS.S3({
  httpOptions: {
    timeout: 1800000, // Set timeout to 10 minutes (600,000 ms)
  },
});

// Function to upload a file to S3
async function uploadFileToS3(
  filePath: string,
  bucketName: string,
  uploadPath: string,
  id: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);

    fs.stat(filePath, (err, stats) => {
      if (err) {
        console.error(`Error fetching file stats: ${err.message}`);
        return;
      }

      console.log(`File size: ${stats.size} bytes`);
    });

    const uploadParams = {
      Bucket: bucketName,
      Key: uploadPath,
      Body: fileStream,
    };
    s3.upload(uploadParams, (err: any, data: AWS.S3.ManagedUpload.SendData) => {
      if (err) {
        reject(err);
      } else {
        resolve(data); // Resolve with the S3 object URL (path)
      }
    });
  }).then((data: any) => {
    console.log(data.Location);
    let url: string = data.Location;

    if (url.includes("playlist.m3u8")) {
      DatabaseHls.query("SELECT platform FROM table WHERE uniqid=?", [id]).then(
        (result: any) => {
          mysqldbService
            .getInstance(getDBName(result[0]["platform"]))
            .query(`UPDATE ${tableName}  SET mainurl = ? WHERE uniqid = ?`, [
              url,
              id,
            ])
            .then((result: any) => {
              console.log("playlist.m3u8 uploaded to s3" + id);
            });
        }
      );
      DatabaseHls.query("UPDATE table  SET mainurl = ? WHERE uniqid = ?", [
        url,
        id,
      ]);
    }

    if (url.includes("high.mp4")) {
      DatabaseHls.query("SELECT platform FROM table WHERE uniqid=?", [id]).then(
        (result: any) => {
          mysqldbService
            .getInstance(getDBName(result[0]["platform"]))
            .query(`UPDATE ${tableName}  SET high = ? WHERE uniqid = ?`, [
              url,
              id,
            ])
            .then((result: any) => {
              console.log("high uploaded to s3" + id);
            });
        }
      );
      DatabaseHls.query("UPDATE table  SET high = ? WHERE uniqid = ?", [
        url,
        id,
      ]);
    }

    if (url.includes("low.mp4")) {
      DatabaseHls.query("SELECT platform FROM table WHERE uniqid=?", [id]).then(
        (result: any) => {
          mysqldbService
            .getInstance(getDBName(result[0]["platform"]))
            .query(`UPDATE ${tableName}  SET low = ? WHERE uniqid = ?`, [
              url,
              id,
            ])
            .then((result: any) => {
              console.log("low uploaded to s3" + id);
            });
        }
      );
      DatabaseHls.query("UPDATE table  SET low = ? WHERE uniqid = ?", [
        url,
        id,
      ]);
    }

    if (url.includes("med.mp4")) {
      DatabaseHls.query("SELECT platform FROM table WHERE uniqid=?", [id]).then(
        (result: any) => {
          mysqldbService
            .getInstance(getDBName(result[0]["platform"]))
            .query(`UPDATE ${tableName}  SET med = ? WHERE uniqid = ?`, [
              url,
              id,
            ])
            .then((result: any) => {
              console.log("med uploaded to s3" + id);
            });
        }
      );
      DatabaseHls.query("UPDATE table  SET med = ? WHERE uniqid = ?", [
        url,
        id,
      ]);
    }
  });
}

// Function to upload a folder to S3 asynchronously
export async function uploadFolderToS3(folderPath: string, id: string) {
  try {
    const result = await DatabaseHls.query("SELECT platform FROM table WHERE uniqid=?", [id]);
    console.log(result[0]);
    let bucketName = getBucketName(result[0]["platform"]);
    const files = fs.readdirSync(folderPath);

    let filesToUpload: Array<Promise<any>> = [];

    for (let file of files) {
      const filePath = path.join(folderPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        let uploadPath = "videos/";
        if (filePath.includes(".ts") || filePath.includes(".m3u8")) {
          let index = filePath.split("/").indexOf("converted");
          uploadPath += filePath.split("/")[index + 1] + "/" + filePath.split("/")[index + 2];
          await updateStatus('Uploading streaming file to s3', id);
        }

        if (filePath.includes("download")) {
          let index = filePath.split("/").indexOf("converted");
          uploadPath += filePath.split("/")[index + 1] + "/" + filePath.split("/")[index + 2] + "/" + filePath.split("/")[index + 3];
          await updateStatus('Uploading Download file to s3', id);
        }

        filesToUpload.push(uploadFileToS3(filePath, bucketName, uploadPath, id));
      }
    }

    console.log(filesToUpload); 
    try {
      await Promise.all(filesToUpload);
      console.log("All files uploaded successfully");
      await updateStatus('uploaded to S3', id);
    } catch (error) {
      console.error("Error uploading files:", error);
      throw error; // Re-throw to be caught by outer catch block
    }

  } catch (err) {
    console.error("Error reading folder or uploading files:", err);
    await DatabaseHls.query("SELECT platform FROM table WHERE uniqid=?", [id]).then(
      (result: any) => {
        return mysqldbService
          .getInstance(getDBName(result[0]["platform"]))
          .query(`UPDATE  ${tableName} SET status = ? WHERE uniqid = ?`, [
            "failed to upload s3",
            id,
          ]);
      }
    );

    await DatabaseHls.query("UPDATE  table SET error = ? WHERE uniqid=?", [
      err.message,
      id,
    ]);
  }
}