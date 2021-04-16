import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";
import './App.css';
import SocketContainer from './components/SocketContainer';
import PostComment from './components/PostComment';

function App() {
  return (
    <Router>
      <Route path='/post'>
        <PostComment />
      </Route>
      <Route exact={true} path='/'>
        <SocketContainer />
      </Route>
    </Router>
  );
}

export default App;
