import React, { useState, useEffect } from 'react';
import '../css/comments.css';

export interface Comment {
  _id: string;
  link: string;
  comment: string;
  time: string;
  img?: string;
}

interface CommentProps {
  comments: Array<Comment>;
}

const CommentDisplay = (props: CommentProps) => {

  let displayComments = props.comments.map((comment) => {
    return (
      <div className='comment' key={comment._id}>
        <img className='post-image' src={comment.img}></img>
        <div className='comment-content'>
          <div className='main'>{comment.comment}</div>
          <div className='comment-time'>{comment.time}</div>
        </div>
      </div>
    )
  })

  // const testComment = (
  //   <div className='comment'>
  //     <div className='post-container'>
  //       <img className='post-image' src='https://scontent-ort2-2.cdninstagram.com/v/t51.2885-15/e35/65091349_2389543524443721_8763139754351050295_n.jpg?tp=1&_nc_ht=scontent-ort2-2.cdninstagram.com&_nc_cat=109&_nc_ohc=JsLWDbmvbt4AX-MGXNn&edm=AABBvjUAAAAA&ccb=7-4&oh=9e6abe8f8f6d875cf2e66dcbe3598a52&oe=60A226CC&_nc_sid=83d603'></img>
  //     </div>
  //     <div className='comment-content'>
  //       <div className='main'>Yes son we are cooking with absolute gas here oh god it is too fast no way can we make it here take this swag</div>
  //       <div className='comment-time'>April 18th, 12:57 pm</div>
  //     </div>
  //   </div>
  // );

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
