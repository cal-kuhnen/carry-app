import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Socket } from 'socket.io-client';

interface qrProps {
  socket: Socket;
}
const baseURL = 'https://instagram.com/';

const generateQR = async (text:string) => {
  try {
    let qrURL = await QRCode.toDataURL(text);
    return qrURL;
  }
  catch (err) {
    console.error(err);
    return 'error';
  }
}

const QRDisplay = (qrProps: qrProps) => {
  const [uName, setUname] = useState('no data');
  const [qr, setQR] = useState('');


  useEffect(() => {
    qrProps.socket.emit('give-qr');
    qrProps.socket.on('change', async data => {
      setUname(data);
      console.log(baseURL + data);
      setQR(await generateQR(baseURL + data));
    });
    return () => {
      console.log('cleanup');
      
    }
  });

  return (
    <div className='QRCode'>
      {uName}
      <img src={qr} alt='QR code for instagram link'></img>
    </div>
  )
}

export default QRDisplay;
