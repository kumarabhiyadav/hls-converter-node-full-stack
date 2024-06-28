import fs from 'fs';
import path from 'path';
import AWS from 'aws-sdk';
import DataStore from '../service/db.service';
import mysqldbService from '../service/mysqldb.service';

// Set up AWS credentials and region
AWS.config.update({
  accessKeyId: process.env.S3_KEY,
  secretAccessKey: process.env.S3_SECRET,
  region: process.env.S3_REGION, // e.g., 'us-east-1'
});

// Create S3 instance
const s3 = new AWS.S3();

// Function to upload a file to S3
async function uploadFileToS3(filePath: string, bucketName: string, uploadPath: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);

    const uploadParams = {
      Bucket: bucketName,
      Key: uploadPath,
      Body: fileStream
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
        let db = DataStore.getInstance();
        db.update({
          _id: id
        }, { $set: { 'mainurl': url,state: 'converted' } })

        db.find({ _id: id }).exec((err, docs) => {
         let video =  docs[0];
          mysqldbService.query('UPDATE hls_videos_status SET mainurl = ? WHERE ulid = ?',[url,video.ulid]).then((result:any)=>{
            console.log("UPDATED IN MYSQL DB");
          });
  
        })
      }

      if (url.includes('high.mp4')) {
        let db = DataStore.getInstance();
        db.update({
          _id: id
        }, { $set: { 'high': url } })

        db.find({ _id: id }).exec((err, docs) => {
          let video =  docs[0];
           mysqldbService.query('UPDATE hls_videos_status SET high = ? WHERE ulid = ?',[url,video.ulid]).then((result:any)=>{
             console.log("UPDATED IN MYSQL DB HIGH");
           });
   
         })
      }

      if (url.includes('low.mp4')) {
        let db = DataStore.getInstance();
        db.update({
          _id: id
        }, { $set: { 'low': url } })
        db.find({ _id: id }).exec((err, docs) => {
          let video =  docs[0];
           mysqldbService.query(  'UPDATE hls_videos_status SET low = ?, status = ? WHERE ulid = ?',
            [url, 'converted', video.ulid],).then((result:any)=>{
             console.log("UPDATED IN MYSQL DB LOW");
           });
   
         })
      }

      if (url.includes('med.mp4')) {
        let db = DataStore.getInstance();
        db.update({
          _id: id
        }, { $set: { 'med': url } })

        db.find({ _id: id }).exec((err, docs) => {
          let video =  docs[0];
           mysqldbService.query(  'UPDATE hls_videos_status SET low = ? WHERE ulid = ?',
            [url, video.ulid],).then((result:any)=>{
             console.log("UPDATED IN MYSQL DB LOW");
           });
   
         })
      }

    })
}

// Function to upload a folder to S3 asynchronously
export async function uploadFolderToS3(folderPath: string, bucketName: string, ws: any, id: string) {
  try {
    let db = DataStore.getInstance();


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
        db.update({
          _id: id
        }, { $set: { 'status': 'uploadedtos3' } })
        await uploadFileToS3(filePath, bucketName, path, id);
        ws.send(JSON.stringify({ status: 'fileupload', message: `uploading files to s3 ${i}/${length}` }));
      }

    }

    



    ws.send(JSON.stringify({ status: 'fileupload', message: `File Upload Completed` }));

  } catch (err) {
    console.error('Error reading folder or uploading files:', err);
  }
}




