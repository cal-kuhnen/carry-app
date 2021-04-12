import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import socketIOClient from 'socket.io-client';

const ENDPOINT = 'http://localhost:3001';
const baseURL = 'https://instagram.com/';

const generateQR = async (text:string) => {
  try {
    console.log(await QRCode.toDataURL(text));
  }
  catch (err) {
    console.error(err);
  }
}

const QRDisplay = () => {
  const [uName, setUname] = useState('no data');

  useEffect(() => {
    const socket = socketIOClient(ENDPOINT);
    socket.on('change', async data => {
      setUname(data);
      console.log(baseURL + data);
      await generateQR(baseURL + data);
    });
    return () => {
      console.log('cleanup');
      socket.off('change');
      socket.disconnect();
    }
  });

  return (
    <div className='QRCode'>
      {uName}
    </div>
  )
}

export default QRDisplay;
