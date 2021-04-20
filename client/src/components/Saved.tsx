import React from 'react';
import '../css/profile.css';
import { Post } from './Profile';

interface SavedProps {
  posts: Array<Post>;
}

const Saved = (props: SavedProps) => {

  let displayPosts = props.posts.map((post) => {
    return (
      <div className='post' key={post._id}>
        <img className='saved' src={post.img} alt='post liked by account'></img>
      </div>
    )
  });

  return (
    <div className='profile-container'>
      <div className='profile-info'>
        <h3 className='descriptor'>Liked Posts</h3>
        <h3 className='descriptor'></h3>
      </div>
      <div className='grid-container'>
        <div className='post-grid'>
          {displayPosts}
        </div>
        <img src='./pics/image0.jpg'></img>
      </div>
    </div>
  )
}

export default Saved;
