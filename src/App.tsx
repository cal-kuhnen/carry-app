import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";
import './App.css';
import QRDisplay from './components/QRDisplay';
import PostComment from './components/PostComment';
import socketIOClient from 'socket.io-client';

const ENDPOINT = 'http://localhost:3002';
export const socket = socketIOClient(ENDPOINT);

function App() {
  return (
    <Router>
      <Route path='/post'>
        <PostComment />
      </Route>
      <Route exact={true} path='/'>
        <QRDisplay />
      </Route>
    </Router>
  );
}

export default App;
