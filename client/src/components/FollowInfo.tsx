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
      <div className='insta-user'>
        <img className='user-icon' src={follower.img}></img>
        <div className='username' key={follower._id}>{follower.username}</div>
      </div>
    )
  });

  let displayFollowing = props.following.map((follow) => {
    return (
      <div className='insta-user'>
        <img className='user-icon' src={follow.img}></img>
        <div className='username' key={follow._id}>{follow.username}</div>
      </div>
    )
  });

  return (
    <div className='follow-container'>
      <h3 className='follow-title'>Followers: {props.numFollowers}</h3>
      <div className='follow'>
        {displayFollowers}
      </div>
      <h3 className='follow-title'>Following: {props.numFollowing}</h3>
      <div className='follow'>
        {displayFollowing}
      </div>
    </div>
  )
}

export default FollowInfo;
