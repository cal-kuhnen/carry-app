import React, { useState, useEffect } from 'react';

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
      <div className='comment' key={comment._id}>{comment.comment}</div>
    )
  })

  return (
    <div className='comment-container'>
      <div className='comment-tray'>
        {displayComments}
      </div>
    </div>
  )
}

export default CommentDisplay;
