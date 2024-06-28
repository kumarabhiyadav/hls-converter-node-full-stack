import axios from "axios";
import React, { useEffect, useState } from "react";
import { domain, endpoint } from "../api";

const History: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]); // Initialize with an empty array of type 'any[]'

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(domain + endpoint.history);
        console.log(response.data);
        setHistory(response.data);
      } catch (error) {
        console.error('Error fetching history:', error);
      }
    };

    fetchHistory();
  }, []); // Empty dependency array means this runs once after initial render

  useEffect(() => {
    // This effect runs every time 'history' state changes
    console.log(history);
  }, []);


  return (
    <div>

        <h4>History</h4>
      {history.map((e: any, index: number) => (
        <div style={{border:'1px white solid',margin:'1rem',padding:'1rem'}} key={index}>
          <p>{e.filename}</p>

          <p>{e.state}</p>
          <p>Main URL: {e.mainurl ? e.mainurl.replace('https://bebu-content-new-live.s3.eu-west-2.amazonaws.com','media1.bebu.app'):''}</p>
          <p>Download high url: {e.high?e.high.replace('https://bebu-content-new-live.s3.eu-west-2.amazonaws.com','media1.bebu.app'):''}</p>
          <p>Download low url: {e.low?e.low.replace('https://bebu-content-new-live.s3.eu-west-2.amazonaws.com','media1.bebu.app'):''}</p>
          <p>Download med url: {e.med? e.med.replace('https://bebu-content-new-live.s3.eu-west-2.amazonaws.com','media1.bebu.app'):''}</p>





        </div>
      ))}
    </div>
  );
};

export default History;
