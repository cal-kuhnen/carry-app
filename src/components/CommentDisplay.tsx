import React, { useState, useEffect } from 'react';

const CommentDisplay = () => {
  const [commentList, setCommentList] = useState([{_id:0, comment:""}]);

  let displayComments = commentList.map((comment) => {
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
