import axios from 'axios';
import React, { useState, useRef } from 'react';
import { domain, endpoint, wsdomain } from '../api';

const CHUNK_SIZE = 1024 * 1024; // 1MB

const FileUpload: React.FC = () => {
  const [uploadStatus, setUploadStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [converting, setConverting] = useState('');
  const [uploading, setUploading] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async () => {
    const fileInput = fileInputRef.current;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      alert('Please select a file to upload.');
      return;
    }

    const file = fileInput.files[0];

    try {
      const response = await axios.post(`${domain}${endpoint.createWebSocketForFile}`, {
        filename: file.name
      });
      const path = response.data.uniqId;

      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let currentChunk = 0;

      const ws = new WebSocket(`${wsdomain}${path}`);

      ws.onopen = () => {
        console.log('WebSocket connection opened');
        sendChunk();
        setUploadStatus('Uploading...');
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.status === 'converting') {
          setUploadStatus('Converting');
          setConverting(message.message);
        }

        if (message.status === 'fileupload') {
          setUploadStatus('Converting');
          setUploading(message.message);
        }
        
        if (message.status === 'progress') {
          setProgress(Math.floor((currentChunk / totalChunks) * 100));
        } else if (message.status === 'completed') {

          setUploadStatus('Upload completed successfully.');
          setProgress(100);

          setTimeout(()=>{
            window.location.reload();
          },1000)
        } else if (message.status === 'error') {
          setUploadStatus(`Upload error: ${message.message}`);
        }

        if (currentChunk < totalChunks) {
          sendChunk();
        }
      };


      

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setUploadStatus('Upload error');
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
      };

      const sendChunk = () => {
        const start = currentChunk * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunk = file.slice(start, end);

        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            ws.send(reader.result);
            currentChunk++;
          }
        };
        reader.readAsArrayBuffer(chunk);
      };
    } catch (error) {
      console.error('Error initiating WebSocket connection:', error);
      setUploadStatus('Failed to initiate upload');
    }
  };

  return (
    <div>
      <h2>Convert TO  HLS</h2>
      <input type="file" ref={fileInputRef} accept=".mp4" />

      <button onClick={handleFileUpload}>Upload</button>
      <div>
        <p>{uploadStatus}</p>
        {progress > 0 && <p>Progress: {progress}%</p>}
      </div>
       {converting > '' && <p>{converting}</p>}

       {uploading > '' && <p>{uploading}</p>}


      
      
    </div>
  );
};

export default FileUpload;
