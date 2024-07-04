import axios from "axios";
import React, { useEffect, useState } from "react";
import {  domain, endpoint, getBucketName, getMediaURL } from "../api";
let platforms =[
  "bebu",
  "abethu",
  "bhoju",
  "chorchuri",
  "cineuns",
  "kannadaflix",
  "keeflix",
  "kidullan",
  "kooku",
  "olaple",
  "rokkt",
  "sonadoll",
  "ubeetu"
]
let statuses = ["converting streaming file","creating playlist.m3u8","converting download files","Uploading streaming file to s3","Uploading Download file to s3","uploaded to S3"];

const History: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [filterHistory, setfilterHistory] = useState<any[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const handlePlatformChange = (event:any) => {
    setSelectedPlatform(event.target.value);
    filterData(event.target.value,selectedStatus)

  };

  const handleStatusChange = (event:any) => {
    setSelectedStatus(event.target.value);
    filterData(selectedPlatform,event.target.value)
  };

  
function filterData(platform:string, status:string) {
 let data = history.filter(item => {
    if (platform && status) {
      return item.platform === platform && item.status === status;
    } else if (platform) {
      return item.platform === platform;
    } else if (status) {
      return item.status === status;
    }
    return true; // No filters applied, return all items
  });

  setfilterHistory(data);
}


  const writeToClipboard = async (text:string) => {
    if (navigator.clipboard && window.isSecureContext) {
      // Clipboard API available and secure context
      try {
        await navigator.clipboard.writeText(text);
        alert('Text copied to clipboard!');
      } catch (err) {
        console.error('Failed to write to clipboard: ', err);
      }
    } else {
      // Fallback method for HTTP or older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand('copy');
        alert('Text copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy text: ', err);
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  const replaceString = (platform:string,url: string): string => {


    let bucketName  = `https://${getBucketName(platform)}.s3.eu-west-2.amazonaws.com`;





    return url.replace(
      bucketName,
      getMediaURL(platform)

    );
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(domain + endpoint.history);
        console.log(response.data);
        setHistory(response.data);
        setfilterHistory(response.data);
      } catch (error) {
        console.error("Error fetching history:", error);
      }
    };

    fetchHistory();
  }, []);

  useEffect(() => {
    console.log(history);
  }, [history]);

  return (
    <div>
      <h4>History</h4>

      <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>

      <div >
        <select value={selectedPlatform} onChange={handlePlatformChange}>
          <option value="">Select Platform</option>
          {platforms.map((platform) => (
            <option key={platform} value={platform}>{platform}</option>
          ))}
        </select>
      </div>

      <div  style={{ margin: " 1rem" }}></div>

      <div >
        <select value={selectedStatus} onChange={handleStatusChange}>
          <option value="">Select Status</option>
          {statuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th
              rowSpan={2}
              style={{
                border: "1px solid black",
                padding: "8px",
                textAlign: "left",
              }}
            >
              Filename
            </th>
            <th
              rowSpan={2}
              style={{
                border: "1px solid black",
                padding: "8px",
                textAlign: "left",
              }}
            >
              Platform
            </th>
            <th
              rowSpan={2}
              style={{
                border: "1px solid black",
                padding: "8px",
                textAlign: "left",
              }}
            >
              Status
            </th>
            <th
              rowSpan={2}
              style={{
                border: "1px solid black",
                padding: "8px",
                textAlign: "left",
              }}
            >
              Main URL
            </th>
            <th
              rowSpan={2}
              style={{
                border: "1px solid black",
                padding: "8px",
                textAlign: "left",
              }}
            >
              Error
            </th>
            <th
              colSpan={3}
              style={{
                border: "1px solid black",
                padding: "8px",
                textAlign: "center",
              }}
            >
              Download
            </th>
          </tr>
          <tr>
            <th
              style={{
                border: "1px solid black",
                padding: "8px",
                textAlign: "left",
              }}
            >
              High
            </th>
            <th
              style={{
                border: "1px solid black",
                padding: "8px",
                textAlign: "left",
              }}
            >
              Low
            </th>
            <th
              style={{
                border: "1px solid black",
                padding: "8px",
                textAlign: "left",
              }}
            >
              Medium
            </th>
          </tr>
        </thead>
        <tbody>
          {filterHistory.map((e: any, index: number) => (
            <tr key={index}>
              <td
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  textAlign: "left",
                }}
              >
                {e.filename}
              </td>

              <td
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  textAlign: "left",
                }}
              >
                {e.platform}
              </td>
              <td
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  textAlign: "left",
                }}
              >
                {e.status}
              </td>
              <td
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  textAlign: "left",
                }}
              >
                <a
                  onClick={(event) => {
                    event.preventDefault();
                    if (e.mainurl) {
                      let url = replaceString(e.platform,e.mainurl);
                      writeToClipboard(url);
                    }
                  }}
                  href={e.mainurl ? replaceString(e.platform,e.mainurl) : ""}
                >
                  {e.mainurl ? replaceString(e.platform,e.mainurl) : ""}
                </a>
              </td>
              <td
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  textAlign: "left",
                }}
              >
                {e.error ? e.error : "-"}
              </td>
              <td
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  textAlign: "left",
                }}
              >
                <a
                  onClick={(event) => {
                    event.preventDefault();
                    if (e.high) {
                      let url = replaceString(e.platform,e.high);
                      writeToClipboard(url);
                    }
                  }}
                  href={e.high ? replaceString(e.platform,e.high) : ""}
                >
                  {e.high ? "High" : ""}
                </a>
              </td>
              <td
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  textAlign: "left",
                }}
              >
                <a
                  onClick={(event) => {
                    event.preventDefault();
                    if (e.low) {
                      let url = replaceString(e.platform,e.low);
                      writeToClipboard(url);
                    }
                  }}
                  href={e.low ? replaceString(e.platform,e.low) : ""}
                >
                  {e.low ? "Low" : ""}
                </a>
              </td>
              <td
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  textAlign: "left",
                }}
              >
                <a
                  onClick={(event) => {
                    event.preventDefault();
                    if (e.med) {
                      let url = replaceString(e.platform,e.med);
                      writeToClipboard(url);
                    }
                  }}
                  href={e.med ? replaceString(e.platform,e.med) : ""}
                >
                  {e.med ? "Medium" : ""}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default History;
