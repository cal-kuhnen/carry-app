import React from 'react';

export interface Post {
  _id: string;
  img: string;
}

interface ProfileProps {
  posts: Array<Post>;
}

const Profile = (props: ProfileProps) => {

  let displayPosts = props.posts.map((post) => {
    return (
      <div className='post' key={post._id}>
        <img src={post.img} alt='post from account'></img>
      </div>
    )
  });

  return (
    <div className='post-grid'>
      {displayPosts}
    </div>
  )
}

export default Profile;
