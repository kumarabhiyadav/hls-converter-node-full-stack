import axios from 'axios';
import React, { useState, useRef } from 'react';
import { domain, endpoint, wsdomain } from '../api';

const CHUNK_SIZE = 1024 * 1024; // 1MB

const FileUpload: React.FC = () => {
  const [uploadStatuses, setUploadStatuses] = useState<{ [filename: string]: string }>({});
  const [progresses, setProgresses] = useState<{ [filename: string]: number }>({});
  const [converting, setConverting] = useState<{ [filename: string]: string }>({});
  const [uploading, setUploading] = useState<{ [filename: string]: string }>({});
  const [selectedOption, setSelectedOption] = useState('');

  let keys = [
    "bebu", "abethu", "bhoju", "chorchuri", "cineuns", "kannadaflix", "keeflix",
    "kidullan", "kooku", "olaple", "rokkt", "sonadoll", "ubeetu"
  ];

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOption(event.target.value);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async () => {
    const fileInput = fileInputRef.current;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0 || selectedOption === '') {
      alert('Please select files to upload and choose a platform.');
      return;
    }

    const files = Array.from(fileInput.files);

    files.forEach(async (file) => {
      try {
        const response = await axios.post(`${domain}${endpoint.createWebSocketForFile}`, {
          filename: file.name,
          platform: selectedOption
        });
        const path = response.data.uniqId;

        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        let currentChunk = 0;

        const ws = new WebSocket(`${wsdomain}${path}`);

        ws.onopen = () => {
          console.log(`WebSocket connection opened for ${file.name}`);
          sendChunk();
          setUploadStatuses(prev => ({ ...prev, [file.name]: 'Uploading...' }));
        };

        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);

          if (message.status === 'converting') {
            setUploadStatuses(prev => ({ ...prev, [file.name]: 'Converting' }));
            setConverting(prev => ({ ...prev, [file.name]: message.message }));
          }

          if (message.status === 'fileupload') {
            setUploadStatuses(prev => ({ ...prev, [file.name]: 'Converting' }));
            setUploading(prev => ({ ...prev, [file.name]: message.message }));
          }
          
          if (message.status === 'progress') {
            setProgresses(prev => ({ ...prev, [file.name]: Math.floor((currentChunk / totalChunks) * 100) }));
          } else if (message.status === 'completed') {
            setUploadStatuses(prev => ({ ...prev, [file.name]: 'Upload completed successfully.' }));
            setProgresses(prev => ({ ...prev, [file.name]: 100 }));
          } else if (message.status === 'error') {
            setUploadStatuses(prev => ({ ...prev, [file.name]: `Upload error: ${message.message}` }));
          }

          if (currentChunk < totalChunks) {
            sendChunk();
          }
        };

        ws.onerror = (error) => {
          console.error(`WebSocket error for ${file.name}:`, error);
          setUploadStatuses(prev => ({ ...prev, [file.name]: 'Upload error' }));
        };

        ws.onclose = () => {
          console.log(`WebSocket connection closed for ${file.name}`);
        };

        const sendChunk = () => {
          const start = currentChunk * CHUNK_SIZE;
          const end = Math.min(file.size, start + CHUNK_SIZE);
          const chunk = file.slice(start, end);

          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result && reader.result instanceof ArrayBuffer) {
              ws.send(reader.result);
              currentChunk++;
            }
          };
          reader.readAsArrayBuffer(chunk);
        };
      } catch (error) {
        console.error(`Error initiating WebSocket connection for ${file.name}:`, error);
        setUploadStatuses(prev => ({ ...prev, [file.name]: 'Failed to initiate upload' }));
      }
    });
  };

  return (
    <div>
      <h2>Convert To HLS</h2>
      <div>
        <select value={selectedOption} onChange={handleChange}>
          <option value="" disabled>Select Platform</option>
          {keys.map((key) => (
            <option key={key} value={key}>{key}</option>
          ))}
        </select>
      </div>
      <br />
      <input type="file" ref={fileInputRef} accept=".mp4" multiple />
      <button onClick={handleFileUpload}>Upload</button>
      {Object.entries(uploadStatuses).map(([filename, status]) => (
        <div key={filename}>
          <p>{filename}: {status}</p>
          {progresses[filename] > 0 && <p>Progress: {progresses[filename]}%</p>}
          {converting[filename] && <p>{converting[filename]}</p>}
          {uploading[filename] && <p>{uploading[filename]}</p>}
        </div>
      ))}
    </div>
  );
};

export default FileUpload;