import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { Server, Socket } from 'socket.io';
import * as mongodb from 'mongodb';
//import { config, mongoInfo } from './config';
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
  key?: number;
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

const query = `https://www.instagram.com/graphql/query/?query_hash=c9100bf9110dd6361671f113dd02e7d6&variables={%22user_id%22:%22${process.env.USER_ID}%22,%22include_chaining%22:false,%22include_reel%22:true,%22include_suggested_users%22:false,%22include_logged_out_extras%22:false,%22include_highlight_reels%22:false,%22include_related_profiles%22:false}`;
const cookiesFilePath = 'cookies.json';
const insta = 'https://www.instagram.com/';
const saved = '/saved/all-posts';

// Setup mongoDB connection
const MongoClient = mongodb.MongoClient;
const uri = `mongodb+srv://dbAdminCal:${process.env.MONGO_PASS}@cluster0.1seup.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const database = 'carry_instagram';

const PORT = process.env.PORT || 3002;
const app = express();
app.use(express.static(path.join(__dirname, 'client/build')));
const server = http.createServer(app);
const io = new Server(server);
// {
//   cors: {
//     origin: "http://localhost:3000",
//     methods: ["GET", "POST"]
//   }
// });

let response: string|null = 'none';
let instaInfo: any = {};
let currUname = '';
let pingUname: any;
let pingFollow: any;
let currPosts = 0;
let currFollowers = 0;
let currFollowing = 0;
let baseFollowers: Array<InstaUser> = [{img:'', username:''}];
let baseFollowing: Array<InstaUser> = [{img:'', username:''}];
let basePosts: Array<Post> = [{img:''}];
let baseSaved: Array<Post> = [{img:''}];

io.on("connection", (socket:Socket) => {
  console.log(`Socket connected with id: ${socket.id}`);

  console.log(`Clients: ${socket.client.conn.server.clientsCount}`);

  console.log('giving qr');
  returnComments(socket);
  socket.emit('followers', baseFollowers);
  socket.emit('following', baseFollowing);
  socket.emit('quiet-change', currUname);
  socket.emit('num-follower', currFollowers);
  socket.emit('num-following', currFollowing);
  socket.emit('num-posts', currPosts);
  socket.emit('posts', basePosts);
  socket.emit('saved', baseSaved);

  socket.on('post-comment', (toPost: Comment) => {
    console.log(`must post comment ${toPost.comment}`);
    postComment(socket, toPost);
  });

  socket.on('error', err => {
    console.error(err);
    clearInterval(pingUname);
    clearInterval(pingFollow);
  })

  socket.on("disconnect", () => {
    console.log("user disconnected");
    console.log(`clients: ${socket.client.conn.server.clientsCount}`);
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
        await page.type('input[name="username"]', process.env.INSTA_USERNAME);
        await page.type('input[name="password"]', process.env.INSTA_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
        if ((await page.$('.sqdOP')) !== null) {
          console.log('need to click browser info button');
          await page.click('button[type="button"]');
          await page.waitForTimeout(5000);
          let buttons = await page.$$('button[type="button"]');
          console.log(buttons.length);
        }
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
const checkUname = async () => {
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
      //   // load cookies for login info
      //   const page = await browser.newPage();
      //   const cookiesString = fs.readFileSync(cookiesFilePath);
      //   const parsedCookies = JSON.parse(cookiesString.toString());
      //   if (parsedCookies.length !== 0) {
      //     for (let cookie of parsedCookies) {
      //       await page.setCookie(cookie);
      //     }
      //   }
        const page = await browser.newPage();
        await page.goto('https://www.instagram.com/accounts/login/');
        await page.waitForSelector('input[name="username"]');
        await page.type('input[name="username"]', process.env.INSTA_USERNAME);
        await page.type('input[name="password"]', process.env.INSTA_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
        if ((await page.$('.sqdOP')) !== null) {
          console.log('need to click browser info button');
          await page.click('button[type="button"]');
          await page.waitForTimeout(5000);
          await page.goto('https://www.instagram.com');
        }
        // Get any new posts
        await page.goto(insta + currUname);
        await page.waitForTimeout(5000);
        let stats = await page.$$eval('.g47SY', el => el.map(x => parseInt((x.innerHTML).replace(/,/g, ''))));
        let postsCount = stats[0]; //first span is number of posts
        if (postsCount != currPosts) {
          checkPostsMilestone(postsCount);
          let postsLinks = await page.$$eval('.FFVAD', (el:any) => el.map((x: any) => x.getAttribute('src')));
          let postsList: Array<Post> = [];
          for (let i = 0; (i < postsLinks.length) && (i < 18); i++) {
            let imageSource = await page.goto(postsLinks[i]);
            let buffer = await imageSource.buffer();
            let base64image = buffer.toString('base64');
            let post = {
              img: base64image
            }
            postsList.push(post);
          }
          //postsList.reverse();
          basePosts = postsList;
          io.sockets.emit('posts', postsList);
          currPosts = postsCount;
          io.sockets.emit('num-posts', currPosts);
        }

        // Extract follow numbers
        await page.goto(insta + currUname);
        let followerCount = stats[1]; // the second span of class g47SY is followers
        let followingCount = stats[2]; // third span is following (first is posts)
        let links = await page.$$('.Y8-fY');
        // check for new followers, only need to show 12 most recent
        if (followerCount != currFollowers) {
          if (followerCount > currFollowers) {
            if ((followerCount % 100) < (currFollowers % 100)) {
              io.sockets.emit('100-followers');
            }
          }
          await links[1].click(); // click on followers link (cannot be accessed as link)
          await page.waitForTimeout(500);
          let followerDivs = await page.$$('div.PZuss > li');
          let followerList: Array<InstaUser> = [];
          let followerImages = await page.$$eval('.Jv7Aj > .RR-M- > ._2dbep > img._6q-tv', (el: any) => el.map((x: any) => x.getAttribute('src')));

          for (let i = 0; (i < followerDivs.length) && (i < 12); i++) {
            let username = await followerDivs[i].$eval('a.FPmhX', (el: any) => el.innerHTML);
            let page2 = await browser.newPage();
            let imageSource = await page2.goto(followerImages[i]);
            let buffer = await imageSource.buffer();
            let base64image = buffer.toString('base64');
            let follower: InstaUser = {
              img: base64image,
              username: username
            };
            page2.close();
            followerList.push(follower);
          }
          currFollowers = followerCount;
          baseFollowers = followerList;
          io.sockets.emit('followers', baseFollowers);
          io.sockets.emit('num-follower', currFollowers);
          await page.click('div.QBdPU'); // close follower info
          await page.waitForTimeout(500);
        }
        else if (followerCount < currFollowers) {
          currFollowers = followerCount;
          io.sockets.emit('follower-loss', currFollowers);
        }

        // Now do the same for following...
        if (followingCount != currFollowing) {
          let links = await page.$$('.Y8-fY');
          await links[2].click(); // click on following link (cannot be accessed as link)
          await page.waitForTimeout(500);
          let followingDivs = await page.$$('div.PZuss > li');
          let followingList: Array<InstaUser> = [];
          let followingImages = await page.$$eval('.Jv7Aj > .RR-M- > ._2dbep > img._6q-tv', (el: any) => el.map((x: any) => x.getAttribute('src')));
          // creates array of InstaUser objects and sends them to database
          for (let i = 0; (i < followingDivs.length) && (i < 12); i++) {
            let username = await followingDivs[i].$eval('a.FPmhX', (el: any) => el.innerHTML);
            let page2 = await browser.newPage();
            let imageSource = await page2.goto(followingImages[i]);
            let buffer = await imageSource.buffer();
            let base64image = buffer.toString('base64');
            let following: InstaUser = {
              img: base64image,
              username: username
            };
            followingList.push(following);
            page2.close();
          }
          currFollowing = followingCount;
          baseFollowing = followingList;
          io.sockets.emit('following', baseFollowing);
          io.sockets.emit('num-following', currFollowing);
        }
        else if (followingCount < currFollowing) {
          currFollowers = followingCount;
        }

        //go get saved posts
        await page.goto(insta + currUname + saved);
        await page.waitForTimeout(5000);
        let savedLinks = await page.$$eval('.FFVAD', (el:any) => el.map((x: any) => x.getAttribute('src')));
        let savedList: Array<Post> = [];
        for (let i = 0; (i < savedLinks.length) && (i < 18); i++) {
          let imageSource = await page.goto(savedLinks[i]);
          let imagePath = path.join(__dirname, `/client/build/pics/saved/saved${i}.jpg`);
          fs.writeFile(imagePath, await imageSource.buffer(), function (err) {
            if (err) {
                return console.log(err);
            }
            console.log("file saved");
          });
          let post: Post = {
            key: Math.floor(Date.now() / 1000) + i,
            img: `./pics/saved/saved${i}.jpg`
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

checkUname();
pingUname = setInterval(checkUname, 120000);
pingFollow = setInterval(checkProfile, 60000);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname+'/client/build/index.html'));
});

server.listen(PORT, () => {
  console.log(`[server]: Server is running at https://localhost:${PORT}`);
});
