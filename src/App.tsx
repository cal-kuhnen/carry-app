import React from 'react';
import './App.css';
import QRDisplay from './components/QRDisplay';
import socketIOClient from 'socket.io-client';

const ENDPOINT = 'http://localhost:3001';
export const socket = socketIOClient(ENDPOINT);

function App() {
  return (
    <QRDisplay />
  );
}

export default App;
