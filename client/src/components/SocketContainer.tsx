import React, { useState, useEffect } from 'react';
import socketIOClient from 'socket.io-client';
import QRDisplay from './QRDisplay';
import CommentDisplay, { Comment } from './CommentDisplay';
import FollowInfo, { InstaUser } from './FollowInfo';
import '../css/container.css';

const ENDPOINT = 'http://localhost:3002';
export const socket = socketIOClient(ENDPOINT);
const emptyComments: Array<Comment> = [{_id:'', link:'', comment:'', time:''}];
const emptyFollow: Array<InstaUser> = [{_id:'', username:'', img:''}];

const SocketContainer = () => {
  const [uName, setUname] = useState('');
  const [commentList, setCommentList] = useState(emptyComments);
  const [followerList, setFollowerList] = useState(emptyFollow);
  const [followingList, setFollowingList] = useState(emptyFollow);
  const [followerNum, setFollowerNum] = useState(-1);
  const [followingNum, setFollowingNum] = useState(-1);

  useEffect(() => {
    if (uName === '') {
      socket.emit('give-qr');
    }
    if (commentList === emptyComments) {
      socket.emit('give-comments');
    }
    if (followerList === emptyFollow) {
      socket.emit('give-followers');
    }
    if (followingList === emptyFollow) {
      socket.emit('give-following');
    }
    if (followerNum === -1) {
      socket.emit('give-follower-num');
    }
    if (followingNum === -1) {
      socket.emit('give-following-num');
    }

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
      for (let i = 0; i < increase; i++) {
        audio.play();
        await new Promise(r => setTimeout(r, (Math.random() * (300 - 100) + 100)));
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
      socket.off('followers');
      socket.off('following');
      socket.off('num-follower');
      socket.off('num-following');
      socket.off('follower-loss');
      socket.off('100-posts');
      socket.off('1000-posts');
    }
  }, [uName, commentList, followerList, followingList, followerNum, followingNum]);

  return (
    <div className='container'>
      <QRDisplay username={uName} />
      <CommentDisplay comments={commentList}/>
      <FollowInfo followers={followerList} following={followingList} numFollowers={followerNum} numFollowing={followingNum} />
    </div>
  )
}

export default SocketContainer;
