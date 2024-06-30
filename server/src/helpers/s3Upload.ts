import fs from 'fs';
import path from 'path';
import AWS from 'aws-sdk';
import mysqldbService from '../service/mysqldb.service';
import { tableName } from '../service/state';

// Set up AWS credentials and region
AWS.config.update({
  accessKeyId: process.env.S3_KEY,
  secretAccessKey: process.env.S3_SECRET,
  region: process.env.S3_REGION, // e.g., 'us-east-1'
});

// Create S3 instance
const s3 = new AWS.S3({
  httpOptions: {
    timeout: 600000, // Set timeout to 10 minutes (600,000 ms)
},
});

// Function to upload a file to S3
async function uploadFileToS3(filePath: string, bucketName: string, uploadPath: string, id: string): Promise<void> {
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
  })
    .then((data: any) => {
      console.log(data.Location);
      let url: string = data.Location;

      if (url.includes('playlist.m3u8')) {
  
          mysqldbService.query(`UPDATE ${tableName}  SET mainurl = ? WHERE uniqid = ?`,[url,id]).then((result:any)=>{
            console.log("playlist.m3u8 uploaded to s3"+id);
          });
  
      }

      if (url.includes('high.mp4')) {

        mysqldbService.query(`UPDATE ${tableName}  SET high = ? WHERE uniqid = ?`,[url,id]).then((result:any)=>{
          console.log("High uploaded to s3"+id);
        });

      }

      if (url.includes('low.mp4')) {
        mysqldbService.query(`UPDATE ${tableName}  SET low = ? WHERE uniqid = ?`,[url,id]).then((result:any)=>{
          console.log("LOW uploaded to s3"+id);
        });
      }

      if (url.includes('med.mp4')) {
        mysqldbService.query(`UPDATE ${tableName}  SET med = ? WHERE uniqid = ?`,[url,id]).then((result:any)=>{
          console.log("MED uploaded to s3"+id);
        });
      }

    })
}

// Function to upload a folder to S3 asynchronously
export async function uploadFolderToS3(folderPath: string, bucketName: string, id: string) {
  try {


    const files = fs.readdirSync(folderPath);

    let length = files.length;
    for (let i = 0; i < length; i++) {
      const file = files[i];
      const filePath = path.join(folderPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        let path = 'videos/';
        if (filePath.includes('.ts') || filePath.includes('.m3u8')) {
          let index = filePath.split('/').indexOf('converted');
          path += filePath.split('/')[index + 1] + '/' + filePath.split('/')[index + 2]
        }

        if (filePath.includes('download')) {
          let index = filePath.split('/').indexOf('converted');
          path += filePath.split('/')[index + 1] + '/' + filePath.split('/')[index + 2] + '/' + filePath.split('/')[index + 3]
        }
      
        await uploadFileToS3(filePath, bucketName, path, id);
        
        
      }
     


    }

    

    




  } catch (err) {
    mysqldbService.query(`UPDATE  ${tableName} SET status = ? WHERE uniqid = ?`, ['failed to upload s3', id])
    console.error('Error reading folder or uploading files:', err);
  }
}




