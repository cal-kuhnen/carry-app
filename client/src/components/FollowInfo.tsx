import React from 'react';
import '../css/follow.css';

export interface InstaUser {
  _id: string;
  img: string;
  username: string;
}

interface FollowProps {
  followers: Array<InstaUser>;
  following: Array<InstaUser>;
  numFollowers: number;
  numFollowing: number;
}

const FollowInfo = (props: FollowProps) => {

  let displayFollowers = props.followers.map((follower) => {
    return (
      <div className='insta-user' key={follower._id}>
        <img className='user-icon' src={follower.img} alt='follower profile pic'></img>
        <div className='username'>{follower.username}</div>
      </div>
    )
  });

  let displayFollowing = props.following.map((follow) => {
    return (
      <div className='insta-user' key={follow._id}>
        <img className='user-icon' src={follow.img} alt='following profile pic'></img>
        <div className='username'>{follow.username}</div>
      </div>
    )
  });

  return (
    <div className='follow-container'>
      <h3 className='title'>Followers: {props.numFollowers}</h3>
      <div className='follow'>
        {displayFollowers}
      </div>
      <h3 className='title'>Following: {props.numFollowing}</h3>
      <div className='follow'>
        {displayFollowing}
      </div>
    </div>
  )
}

export default FollowInfo;
