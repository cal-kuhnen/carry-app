import React, { useState, useEffect } from 'react';
import socketIOClient from 'socket.io-client';
import QRDisplay from './QRDisplay';
import CommentDisplay from './CommentDisplay';
import PostComment from './PostComment';

//const ENDPOINT = 'http://localhost:3002';
export const socket = socketIOClient();
const emptyComments = [{_id:'', link:'', comment:'', time:''}];

const SocketContainer = () => {
  const [uName, setUname] = useState('');
  const [commentList, setCommentList] = useState(emptyComments);

  useEffect(() => {
    if (uName === '') {
      socket.emit('give-qr');
    }
    if (commentList === emptyComments) {
      socket.emit('give-comments');
    }
    socket.on('change', data => {
      setUname(data);
    });
    socket.on('cList', comments => {
      setCommentList(comments);
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
      <CommentDisplay comments={commentList}/>
    </>
  )
}

export default SocketContainer;
