import React, { useState, useEffect } from 'react';
import '../css/comments.css';

export interface Comment {
  _id: string;
  link: string;
  comment: string;
  time: string;
}

interface CommentProps {
  comments: Array<Comment>;
}

const CommentDisplay = (props: CommentProps) => {

  let displayComments = props.comments.map((comment) => {
    return (
      <div className='comment' key={comment._id}>
        <div className='main'>{comment.comment}</div>
        <div className='comment-time'>{comment.time}</div>
      </div>
    )
  })

  return (
    <div className='comment-container'>
      <h3 className='title'>Comments</h3>
      <div className='comment-tray'>
        {displayComments}
      </div>
    </div>
  )
}

export default CommentDisplay;
