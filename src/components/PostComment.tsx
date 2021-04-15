import React, { useState } from 'react';
import { socket } from '../App';

interface Comment {
  link: string;
  comment: string;
}

const PostComment = () => {
  const [comment, setComment] = useState('');
  const [link, setLink] = useState('');

  const comChange = (event: any) => {
    setComment(event.target.value);
  };

  const linkChange = (event: any) => {
    setLink(event.target.value);
  };

  const onSubmit = (event: any) => {
    let toPost: Comment = {
      link: link,
      comment: comment
    };
    console.log(toPost);
    socket.emit('post-comment', toPost);
    event.preventDefault();
  };

  return (
    <form onSubmit={onSubmit}>
      <label>
        Comment:
        <input value={comment} onChange={comChange} />
      </label>
      <label>
        Link:
        <input value={link} onChange={linkChange} />
      </label>
      <input type='submit' value='Post' />
    </form>
  )
}

export default PostComment;
