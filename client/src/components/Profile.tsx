import React from 'react';
import '../css/profile.css';

export interface Post {
  _id: string;
  img: string;
}

interface ProfileProps {
  username: string;
  posts: Array<Post>;
  postNum: number;
}

const Profile = (props: ProfileProps) => {

  let displayPosts = props.posts.map((post) => {
    return (
      <div className='post' key={post._id}>
        <img className='post-content' src={post.img} alt='post from account'></img>
      </div>
    )
  });

  return (
    <div className='profile-container'>
      <div className='profile-info'>
        <h3 className='descriptor'>{props.username}</h3>
        <h3 className='descriptor'>Posts: {props.postNum}</h3>
      </div>
      <div className='grid-container'>
        <div className='post-grid'>
          {displayPosts}
        </div>
      </div>
    </div>
  )
}

export default Profile;
