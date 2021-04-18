import React from 'react';

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
        <img src={follower.img}></img>
        <div key={follower._id}>{follower.username}</div>
      </div>
    )
  });

  return (
    <div>
    Followers: {props.numFollowers}
    {displayFollowers}
    </div>
  )
}

export default FollowInfo;
