import React, { useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');
const baseURL = 'https://instagram.com/';

const QRDisplay = () => {
  const [uName, setUname] = useState('no data');

  socket.on('change', data => {
    setUname(data);
  });
  return (
    <div className='QRCode'>
      {uName}
    </div>
  )
}

export default QRDisplay;
