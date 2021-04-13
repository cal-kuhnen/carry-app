import React from 'react';
import './App.css';
import QRDisplay from './components/QRDisplay';
import socketIOClient, { Socket } from 'socket.io-client';

const ENDPOINT = 'http://localhost:3001';
const socket = socketIOClient(ENDPOINT);

function App() {
  return (
    <QRDisplay socket={socket}/>
  );
}

export default App;
