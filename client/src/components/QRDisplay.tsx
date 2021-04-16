import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

const baseURL = 'https://instagram.com/';

interface QRProps {
  username: string;
}

// Create QR code for the link to the instagram page
const generateQR = async (text:string) => {
  try {
    let qrURL = await QRCode.toDataURL(text);
    return qrURL;
  }
  catch (err) {
    console.error(err);
    return ('error');
  }
}

const QRDisplay = (props: QRProps) => {
  const [qr, setQR] = useState('');

  let createQR = async () => setQR(await generateQR(baseURL + props.username));

  useEffect(() => {
    createQR();
  });

  return (
    <div className='QRCode'>
      {props.username}
      <img src={qr} alt='QR code for instagram link'></img>
    </div>
  )
}

export default QRDisplay;
