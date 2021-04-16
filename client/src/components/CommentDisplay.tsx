import React, { useState, useEffect } from 'react';

interface Comment {
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
      <div key={comment._id}>{comment.comment}</div>
    )
  })

  return (
    <div>
    {displayComments}
    </div>
  )
}

export default CommentDisplay;
