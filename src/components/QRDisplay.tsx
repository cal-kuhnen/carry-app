import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { socket } from '../App';

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

const QRDisplay = () => {
  const [uName, setUname] = useState('no data');
  const [qr, setQR] = useState('');

  useEffect(() => {
    socket.emit('give-qr');
    socket.on('change', async data => {
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
