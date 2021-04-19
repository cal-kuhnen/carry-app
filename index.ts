import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { Server, Socket } from 'socket.io';
import * as mongodb from 'mongodb';
import { config, mongoInfo } from './config';
import route from './routes/route';

interface Comment {
  link: string;
  comment: string;
  time?: string;
  img?: string;
}

interface InstaUser {
  img: string;
  username: string;
}

interface Post {
  img: string;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      INSTA_USERNAME: string;
      INSTA_PASSWORD: string;
      MONGO_PASS: string;
    }
  }
}

const query = "https://www.instagram.com/graphql/query/?query_hash=c9100bf9110dd6361671f113dd02e7d6&variables={%22user_id%22:%2247389771069%22,%22include_chaining%22:false,%22include_reel%22:true,%22include_suggested_users%22:false,%22include_logged_out_extras%22:false,%22include_highlight_reels%22:false,%22include_related_profiles%22:false}";
const cookiesFilePath = 'cookies.json';
const insta = 'https://www.instagram.com/';
const saved = '/saved/all-posts';

// Setup mongoDB connection
const MongoClient = mongodb.MongoClient;
const uri = `mongodb+srv://dbAdminCal:${process.env.MONGO_PASS || mongoInfo.password}@cluster0.1seup.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const database = 'insta_test';

const PORT = process.env.PORT || 3002;
const app = express();
app.use(express.static(path.join(__dirname, 'client/build')));
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

let response: string|null = 'none';
let instaInfo: any = {};
let currUname = '';
let pingUname: any;
let pingFollow: any;
let currPosts = 0;
let currFollowers = 0;
let currFollowing = 0;
let basePosts: Array<Post> = [{img:''}];
let baseSaved: Array<Post> = [{img:''}];

io.on("connection", (socket:Socket) => {
  console.log(`Socket connected with id: ${socket.id}`);

  checkUname(socket);
  checkProfile();
  console.log('giving qr');
  returnComments(socket);
  returnFollow('followers');
  returnFollow('following');
  //returnPosts('posts');
  socket.emit('quiet-change', currUname);
  socket.emit('num-follower', currFollowers);
  socket.emit('num-following', currFollowing);
  socket.emit('num-posts', currPosts);
  socket.emit('posts', basePosts);
  socket.emit('saved', baseSaved);

  clearInterval(pingUname);
  pingUname = setInterval(checkUname, 90000, socket);

  clearInterval(pingFollow);
  pingFollow = setInterval(checkProfile, 40000);

  socket.on('post-comment', (toPost: Comment) => {
    console.log(`must post comment ${toPost.comment}`);
    postComment(socket, toPost);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
    console.log(`clients: ${socket.client.conn.server.clientsCount}`);
    if (socket.client.conn.server.clientsCount === 0) {
      clearInterval(pingUname);
      clearInterval(pingFollow);
    }
  });
});

// Login to Instagram and save session cookies for reuse, removing the need to
// login on every new browser instance.
const instaLogin = () => {
  console.log('logging in');
  puppeteer
    .use(StealthPlugin())
    // @ts-ignore
    .launch({ args: ['--no-sandbox']})
    .then(async browser => {
      try {
        const page = await browser.newPage();
        await page.goto('https://www.instagram.com/accounts/login/');
        await page.waitForSelector('input[name="username"]');
        await page.type('input[name="username"]', process.env.INSTA_USERNAME || config.username);
        await page.type('input[name="password"]', process.env.INSTA_PASSWORD || config.password);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        // get login cookies from session
        const cookiesObject = await page.cookies();
        fs.writeFile(cookiesFilePath, JSON.stringify(cookiesObject),
          function(err) {
            if (err) {
            console.log('The file could not be written.', err)
            }
            console.log('Session has been successfully saved')
          });
        } catch (err) {
          console.error(err);
        } finally {
          await browser.close();
        }
      });
}
instaLogin(); // login on server startup

// Use puppeteer to access instagram graphql query because using axios results
// in bot detection and a redirect from instagram.
const checkUname = async (socket:Socket) => {
  console.log('check uname in progress');
  puppeteer
    .use(StealthPlugin())
    // @ts-ignore
    .launch({ args: ['--no-sandbox']})
    .then(async browser => {
      try {
        // load cookies for login info
        const page = await browser.newPage();
        const cookiesString = fs.readFileSync(cookiesFilePath);
        const parsedCookies = JSON.parse(cookiesString.toString());
        if (parsedCookies.length !== 0) {
          for (let cookie of parsedCookies) {
            await page.setCookie(cookie);
          }
        }
        await page.goto(query);
        await page.waitForTimeout(2000);
        try {
          response = await page.$eval('pre', res => res.textContent); // get JSON portion of html response
        } catch(err) {
          console.error(err);
        }
        if(response != null) {
          try {
            instaInfo = JSON.parse(response!);
            let newUname = instaInfo.data.user.reel.owner.username;
            if(newUname != currUname) {
              currUname = newUname;  // check for username update
              console.log(currUname);
              io.sockets.emit('change', currUname); // send new username to frontend
            }
          } catch (err) {
            console.error(err);
          }
        }
        page.removeAllListeners();
        await page.close();
      } catch (err) {
        console.error(err);
      } finally {
        await browser.close();
      }
    });
}

// Posts a comment to linked instagram post from the art account
const postComment = (socket: Socket, toPost: Comment) => {
  console.log('posting comment');
  puppeteer
    .use(StealthPlugin())
    // @ts-ignore
    .launch({ args: ['--no-sandbox']})
    .then(async browser => {
      try {
        // load cookies for login info
        const page = await browser.newPage();
        const cookiesString = fs.readFileSync(cookiesFilePath);
        const parsedCookies = JSON.parse(cookiesString.toString());
        if (parsedCookies.length !== 0) {
          for (let cookie of parsedCookies) {
            await page.setCookie(cookie);
          }
        }

        // Navigate to post and submitting the comment
        await page.goto(toPost.link);
        await page.waitForSelector('textarea');
        await page.type('textarea', toPost.comment);

        await page.click('button[type="submit"]');
        let image = await page.$eval('img.FFVAD', (el: any) => el.getAttribute('src'));
        toPost.img = image;
        addComment(socket, toPost);
        console.log('comment posted');
        io.sockets.emit('sound-cList');
        await page.removeAllListeners();
        await page.close();
      } catch (err) {
        console.error(err);
      } finally {
        await browser.close();
      }
    });
}

// Add new comment to database
const addComment = async (socket: Socket, newComment: Comment) => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    let collection = client.db(database).collection('comments');
    const result = await collection.insertOne(newComment);

    console.log(`Added comment with id: ${result.insertedId}`);

    await returnComments(socket);

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

// Returns last 15 comments, emits event for front end to update
const returnComments = async (socket: Socket) => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    let collection = client.db(database).collection('comments');

    // get 10 most recent comments to display on page after adding new
    let commentArray = await collection.find().sort({_id:-1}).limit(15).toArray();
    let commentList = JSON.parse(JSON.stringify(commentArray));
    io.sockets.emit('cList', commentList);
    console.log('sending comment list');

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

// Check follower and following count, and update lists accordingly
const checkProfile = () => {
  console.log('getting profile info');
  puppeteer
    .use(StealthPlugin())
    // @ts-ignore
    .launch({ args: ['--no-sandbox']})
    .then(async browser => {
      try {
        // load cookies for login info
        const page = await browser.newPage();
        const cookiesString = fs.readFileSync(cookiesFilePath);
        const parsedCookies = JSON.parse(cookiesString.toString());
        if (parsedCookies.length !== 0) {
          for (let cookie of parsedCookies) {
            await page.setCookie(cookie);
          }
        }
        // Get any new posts
        await page.goto(insta + currUname);
        await page.waitForTimeout(5000);
        let stats = await page.$$eval('.g47SY', el => el.map(x => parseInt((x.innerHTML).replace(/,/g, ''))));
        let postsCount = stats[0]; //first span is number of posts
        if (postsCount != currPosts) {
          checkPostsMilestone(postsCount);
          let postsDivs = await page.$$('.KL4Bh');
          let postsList: Array<Post> = [];
          for (let i = 0; (i < postsDivs.length) && (i < 18); i++) {
            let image = await postsDivs[i].$eval('.FFVAD', (el:any) => el.getAttribute('src'));
            let post: Post = {
              img: image
            };
            postsList.push(post);
          }
          //postsList.reverse();
          basePosts = postsList;
          io.sockets.emit('posts', postsList);
          currPosts = postsCount;
          io.sockets.emit('num-posts', currPosts);
        }

        // Extract follow numbers
        let followerCount = stats[1]; // the second span of class g47SY is followers
        let followingCount = stats[2]; // third span is following (first is posts)
        let links = await page.$$('.Y8-fY');

        // check for new followers, only need to show 12 most recent
        if (followerCount > currFollowers) {
          if ((followerCount % 100) < (currFollowers % 100)) {
            io.sockets.emit('100-followers');
          }
          await links[1].click(); // click on followers link (cannot be accessed as link)
          await page.waitForTimeout(500);
          let diff = followerCount - currFollowers;
          let followerDivs = await page.$$('div.PZuss > li');
          let followerList: Array<InstaUser> = [];

          // Instagram returns the 12 most recent followers, the max the app
          // will display. Therefore just grab up to 12.
          for (let i = 0; (i < diff) && (i < 12); i++) {
            let image = await followerDivs[i].$eval('img._6q-tv', (el: any) => el.getAttribute('src'));
            let username = await followerDivs[i].$eval('a.FPmhX', (el: any) => el.innerHTML);
            let follower: InstaUser = {
              img: image,
              username: username
            };
            followerList.push(follower);
          }
          followerList.reverse();
          updateFollow(followerList, 'followers');
          currFollowers = followerCount;
          io.sockets.emit('num-follower', currFollowers);
          await page.click('div.QBdPU'); // close follower info
          await page.waitForTimeout(500);
        }
        else if (followerCount < currFollowers) {
          currFollowers = followerCount;
          io.sockets.emit('follower-loss', currFollowers);
        }

        // Now do the same for following...
        if (followingCount > currFollowing) {
          let links = await page.$$('.Y8-fY');
          await links[2].click(); // click on following link (cannot be accessed as link)
          await page.waitForTimeout(500);
          let diff = followingCount - currFollowing;
          let followingDivs = await page.$$('div.PZuss > li');
          let followingList: Array<InstaUser> = [];

          // creates array of InstaUser objects and sends them to database
          for (let i = 0; (i < diff) && (i < 12); i++) {
            let image = await followingDivs[i].$eval('img._6q-tv', (el: any) => el.getAttribute('src'));
            let username = await followingDivs[i].$eval('a.FPmhX', (el: any) => el.innerHTML);
            let following: InstaUser = {
              img: image,
              username: username
            };
            followingList.push(following);
          }

          followingList.reverse();
          updateFollow(followingList, 'following');
          currFollowing = followingCount;
          io.sockets.emit('num-following', currFollowing);
        }
        else if (followingCount < currFollowing) {
          currFollowers = followingCount;
        }

        // go get saved posts
        await page.goto(insta + currUname + saved);
        await page.waitForTimeout(5000);
        let savedDivs = await page.$$('.KL4Bh');
        let savedList: Array<Post> = [];
        for (let i = 0; (i < savedDivs.length) && (i < 18); i++) {
          let image = await savedDivs[i].$eval('.FFVAD', (el:any) => el.getAttribute('src'));
          let post: Post = {
            img: image
          };
          savedList.push(post);
        }
        baseSaved = savedList;
        io.sockets.emit('saved', savedList);
        await page.removeAllListeners();
        await page.close();
      } catch (err) {
        console.error(err);
      } finally {
        await browser.close();
      }
    });
}

const updateFollow = async (fList: Array<InstaUser>, coll: string) => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    let collection = client.db(database).collection(coll);
    await collection.createIndex({ username: 1 }, { unique: true });
    const result = await collection.insertMany(fList);

    returnFollow(coll);

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

const returnFollow = async (coll: string) => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    let collection = client.db(database).collection(coll);
    let followArray = await collection.find().sort({_id:-1}).limit(12).toArray();
    let followList = JSON.parse(JSON.stringify(followArray));

    if (coll === 'followers') {
      io.sockets.emit('followers', followList);
    }
    else {
      io.sockets.emit('following', followList);
    }
    console.log(`sending ${coll} list`);

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

const updatePosts = async (pList: Array<Post>, coll: string) => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    let collection = client.db(database).collection(coll);
    await collection.createIndex({ img: 1 }, { unique: true });
    const result = await collection.insertMany(pList);

    returnPosts(coll);

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

const returnPosts = async (coll: string) => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    let collection = client.db(database).collection(coll);
    let postsArray = await collection.find().sort({_id:-1}).limit(18).toArray();
    let postsList = JSON.parse(JSON.stringify(postsArray));

    if (coll === 'posts') {
      io.sockets.emit('posts', postsArray);
    }
    else {
      io.sockets.emit('saved', postsArray);
    }
    console.log(`sending ${coll} list`);

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

// emit sound for every 100 and 1000 posts
const checkPostsMilestone = (postNumber: number) => {
  if (postNumber > currPosts) {
    if ((postNumber % 100) < (currPosts % 100)) {
      io.sockets.emit('100-posts');
    }
    if ((postNumber % 1000) < (currPosts % 1000)) {
      io.sockets.emit('1000-posts');
    }
  }
}

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname+'/client/build/index.html'));
});

server.listen(PORT, () => {
  console.log(`[server]: Server is running at https://localhost:${PORT}`);
});
