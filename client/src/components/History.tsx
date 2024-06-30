import axios from "axios";
import React, { useEffect, useState } from "react";
import { domain, endpoint } from "../api";

const History: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);

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

  const replaceString = (url: string): string => {
    return url.replace(
      "https://bebu-content-new-live.s3.eu-west-2.amazonaws.com/",
      "https://media1.bebu.app/"
    );
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(domain + endpoint.history);
        console.log(response.data);
        setHistory(response.data);
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
          {history.map((e: any, index: number) => (
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
                      let url = replaceString(e.mainurl);
                      writeToClipboard(url);
                    }
                  }}
                  href={e.mainurl ? replaceString(e.mainurl) : ""}
                >
                  {e.mainurl ? replaceString(e.mainurl) : ""}
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
                      let url = replaceString(e.high);
                      writeToClipboard(url);
                    }
                  }}
                  href={e.high ? replaceString(e.high) : ""}
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
                      let url = replaceString(e.low);
                      writeToClipboard(url);
                    }
                  }}
                  href={e.low ? replaceString(e.low) : ""}
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
                      let url = replaceString(e.med);
                      writeToClipboard(url);
                    }
                  }}
                  href={e.med ? replaceString(e.med) : ""}
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
