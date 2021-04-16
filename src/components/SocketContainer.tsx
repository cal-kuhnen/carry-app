import React, { useState, useEffect } from 'react';
import socketIOClient from 'socket.io-client';
import QRDisplay from './QRDisplay';
import CommentDisplay from './CommentDisplay';

const ENDPOINT = 'http://localhost:3002';
export const socket = socketIOClient(ENDPOINT);

const SocketContainer = () => {
  const [uName, setUname] = useState('');

  useEffect(() => {
    if (uName === '') {
      socket.emit('give-qr');
    }
    socket.on('change', data => {
      setUname(data);
    });
    socket.on('cList', () => {
      console.log('why is this happening');
    });
    return () => {
      console.log('cleanup');
      socket.off('change');
      socket.off('cList');
    }
  }, [uName]);

  return (
    <>
      <QRDisplay username={uName} />
      <CommentDisplay />
    </>
  )
}

export default SocketContainer;
