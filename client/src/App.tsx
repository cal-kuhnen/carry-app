import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";
import socketIOClient from 'socket.io-client';
import QRDisplay from './components/QRDisplay';
import CommentDisplay, { Comment } from './components/CommentDisplay';
import FollowInfo, { InstaUser } from './components/FollowInfo';
import PostComment from './components/PostComment';
import Profile, { Post } from './components/Profile';
import Saved from './components/Saved';
import './reset.css';
import './css/container.css';

//const ENDPOINT = 'http://localhost:3002';
export const socket = socketIOClient();
const emptyComments: Array<Comment> = [{_id:'', link:'', comment:'', time:''}];
const emptyFollow: Array<InstaUser> = [{_id:'', username:'', img:''}];
const emptyPosts: Array<Post> = [{_id:'', img:''}];

const App = () => {
  const [uName, setUname] = useState('');
  const [commentList, setCommentList] = useState(emptyComments);
  const [postsList, setPostsList] = useState(emptyPosts);
  const [savedList, setSavedList] = useState(emptyPosts);
  const [postNum, setPostNum] = useState(0);
  const [followerList, setFollowerList] = useState(emptyFollow);
  const [followingList, setFollowingList] = useState(emptyFollow);
  const [followerNum, setFollowerNum] = useState(0);
  const [followingNum, setFollowingNum] = useState(0);

  useEffect(() => {
    socket.on('change', data => {
      setUname(data);
      let audio = new Audio('../audio/UsernameChange.mp3');
      audio.play();
    });
    socket.on('cList', comments => {
      setCommentList(comments);
      let audio = new Audio('../audio/comment.mp3');
      audio.play();
    });
    socket.on('posts', posts => {
      setPostsList(posts);
    })
    socket.on('num-posts', num => {
      setPostNum(num);
    })
    socket.on('saved', saved => {
      setSavedList(saved);
    })
    socket.on('followers', followers => {
      setFollowerList(followers);
    });
    socket.on('following', following => {
      setFollowingList(following);
    });

    // plays the new follower sound for each new follower with random delay
    socket.on('num-follower', async num => {
      let increase = num - followerNum;
      setFollowerNum(num);
      let audio = new Audio('../audio/everynewfollower.mp3');
      for (let i = 0; (i < increase) && (i < 10); i++) {
        audio.play();
        await new Promise(r => setTimeout(r, (Math.random() * (300 - 20) + 20)));
      }
    });

    socket.on('follower-loss', num => {
      setFollowerNum(num);
      let audio = new Audio('../audio/everylostfollower.mp3');
      audio.play();
    });

    socket.on('num-following', num => {
      setFollowingNum(num);
    })

    socket.on('100-followers', () => {
      let audio = new Audio('../audio/every100followers.mp3');
      audio.play();
    })

    socket.on('100-posts', () => {
      let audio = new Audio('../audio/every1000posts.mp3');
      audio.play();
    })

    socket.on('1000-posts', () => {
      let audio = new Audio('../audio/every100posts.mp3');
      audio.play();
    })

    return () => {
      console.log('cleanup');
      socket.off('change');
      socket.off('cList');
      socket.off('posts');
      socket.off('post-num');
      socket.off('followers');
      socket.off('following');
      socket.off('num-follower');
      socket.off('num-following');
      socket.off('follower-loss');
      socket.off('100-followers');
      socket.off('100-posts');
      socket.off('1000-posts');
    }
  }, [uName, commentList, postsList, followerList, followingList, followerNum, followingNum]);

  return (
    <Router>
      <Route path='/post'>
        <PostComment />
      </Route>
      <Route path='/profile'>
        <Profile username={uName} posts={postsList} postNum={postNum} />
      </Route>
      <Route path='/saved'>
        <Saved posts={savedList} />
      </Route>
      <Route exact={true} path='/'>
        <div className='container'>
          <QRDisplay username={uName} />
          <CommentDisplay comments={commentList} />
          <FollowInfo followers={followerList} following={followingList} numFollowers={followerNum} numFollowing={followingNum} />
        </div>
      </Route>
    </Router>
  );
}

export default App;
