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

  return (
    <form>
      <label>
        Comment: {comment}
        <input value={comment} onChange={comChange} />
      </label>
      <label>
        Link: {link}
        <input value={link} onChange={linkChange} />
      </label>
      <input type='submit' value='Post' />
    </form>
  )
}

export default PostComment;
