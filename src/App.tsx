import React from 'react';
import './App.css';
import QRDisplay from './components/QRDisplay';
import PostComment from './components/PostComment';
import socketIOClient from 'socket.io-client';

const ENDPOINT = 'http://localhost:3002';
export const socket = socketIOClient(ENDPOINT);

function App() {
  return (
    <>
      <QRDisplay />
      <PostComment />
    </>
  );
}

export default App;
