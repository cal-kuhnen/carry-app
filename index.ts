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
}

interface InstaUser {
  img: string;
  username: string;
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

const query = "https://www.instagram.com/graphql/query/?query_hash=c9100bf9110dd6361671f113dd02e7d6&variables={%22user_id%22:%222010715942%22,%22include_chaining%22:false,%22include_reel%22:true,%22include_suggested_users%22:false,%22include_logged_out_extras%22:false,%22include_highlight_reels%22:false,%22include_related_profiles%22:false}";
const cookiesFilePath = 'cookies.json';
const insta = 'https://www.instagram.com/';

// Setup mongoDB connection
const MongoClient = mongodb.MongoClient;
const uri = `mongodb+srv://dbAdminCal:${process.env.MONGO_PASS || mongoInfo.password}@cluster0.1seup.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const PORT = process.env.PORT || 3002;
const app = express();
app.use(express.static(path.join(__dirname, 'client/build')));
const server = http.createServer(app);
const io = new Server(server,
{
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
let currFollowers = 0;
let currFollowing = 0;

io.on("connection", (socket:Socket) => {
  console.log(`Socket connected with id: ${socket.id}`);

  instaLogin();

  clearInterval(pingUname);
  pingUname = setInterval(checkUname, 60000, socket);

  clearInterval(pingFollow);
  pingFollow = setInterval(checkFollow, 40000);

  socket.on('give-qr', () => {
    console.log('giving qr');
    socket.emit('change', currUname);
  });

  socket.on('give-comments', () => {
    returnComments(socket);
  })

  socket.on('post-comment', (toPost: Comment) => {
    console.log(`must post comment ${toPost.comment}`);
    addComment(socket, toPost);
    postComment(socket, toPost);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
    clearInterval(pingUname);
    clearInterval(pingFollow);
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

// Use puppeteer to access instagram graphql query because using axios results
// in bot detection and a redirect from instagram.
const checkUname = (socket:Socket) => {
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
        console.log('comment posted');
      } catch (err) {
        console.error(err);
        socket.emit('cList');
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
    let collection = client.db('insta_test').collection('comments');
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
    let collection = client.db('insta_test').collection('comments');

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
const checkFollow = (socket: Socket) => {
  console.log('getting followers/following');
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
        // Extract follow numbers
        await page.goto(insta + config.username);
        await page.waitForSelector('ul > li.Y8-fY');
        let stats = await page.$$eval('.g47SY', el => el.map(x => parseInt(x.innerHTML)));
        let followerCount = stats[1]; // the second span of class g47SY is followers
        let followingCount = stats[2]; // third span is following (first is posts)
        console.log(`Followers: ${followerCount}, Following: ${followingCount}`);
        let links = await page.$$('.Y8-fY');

        // check for new followers, only need to show 12 most recent
        if (followerCount > currFollowers) {
          await links[1].click(); // click on followers link (cannot be accessed as link)
          await page.waitForTimeout(500);
          let diff = followerCount - currFollowers;
          let followerDivs = await page.$$('div.PZuss > li');
          let followerList: Array<InstaUser> = [];

          // Instagram returns the 12 most recent followers, the max the app
          // will display. Therefore just grab all 12 if there have been 12 or
          // more new follows.
          if (diff >= 12) {
            // creates array of InstaUser objects and sends them to database
            for (const element of followerDivs) {
              let image = await element.$eval('img._6q-tv', (el: any) => el.getAttribute('src'));
              let username = await element.$eval('a.FPmhX', (el: any) => el.innerHTML);
              let follower: InstaUser = {
                img: image,
                username: username
              };
              followerList.push(follower);
            }
            updateFollowers(followerList);
          }
          // Less than 12 new followers means just adding the exact amount of
          // new followers.
          else {
            // creates array of InstaUser objects and sends them to database
            for (let i = 0; i < diff; i++) {
              let image = await followerDivs[i].$eval('img._6q-tv', (el: any) => el.getAttribute('src'));
              let username = await followerDivs[i].$eval('a.FPmhX', (el: any) => el.innerHTML);
              let follower: InstaUser = {
                img: image,
                username: username
              };
              followerList.push(follower);
            }
            updateFollowers(followerList);
          }
          currFollowers = followerCount;
          io.sockets.emit('follower-number', currFollowers);
          await page.click('div.QBdPU');
        }

        // Now do the same for following... :(
        if (followingCount > currFollowing) {
          let links = await page.$$('.Y8-fY');
          await links[2].click(); // click on following link (cannot be accessed as link)
          await page.waitForTimeout(500);
          let diff = followingCount - currFollowing;
          let followingDivs = await page.$$('div.PZuss > li');
          let followingList: Array<InstaUser> = [];

          // Instagram returns the 12 most recent following as well.
          if (diff >= 12) {
            // creates array of InstaUser objects and sends them to database
            for (const element of followingDivs) {
              let image = await element.$eval('img._6q-tv', (el: any) => el.getAttribute('src'));
              let username = await element.$eval('a.FPmhX', (el: any) => el.innerHTML);
              let following: InstaUser = {
                img: image,
                username: username
              };
              followingList.push(following);
            }
          }
          else {
            // creates array of InstaUser objects and sends them to database
            for (let i = 0; i < diff; i++) {
              let image = await followingDivs[i].$eval('img._6q-tv', (el: any) => el.getAttribute('src'));
              let username = await followingDivs[i].$eval('a.FPmhX', (el: any) => el.innerHTML);
              let following: InstaUser = {
                img: image,
                username: username
              };
              followingList.push(following);
            }
            console.log(followingList[0]);
          }
          currFollowing = followingCount;
          io.sockets.emit('following-number', currFollowing);
        }
      } catch (err) {
        console.error(err);
      } finally {
        await browser.close();
      }
    });
}

const updateFollowers = async (fList: Array<InstaUser>) => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    let collection = client.db('insta_test').collection('followers');
    await collection.createIndex({ username: 1 }, { unique: true });
    const result = await collection.insertMany(fList);
    console.log('added followers');

    returnFollowers();

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

const returnFollowers = async () => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    let collection = client.db('insta_test').collection('followers');
    let followerArray = await collection.find().sort({_id:-1}).limit(12).toArray();
    let followerList = JSON.parse(JSON.stringify(followerArray));
    io.sockets.emit('fList', followerArray);
    console.log('sending follower list');

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}



// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname+'/client/build/index.html'));
// });

server.listen(PORT, () => {
  console.log(`[server]: Server is running at https://localhost:${PORT}`);
});
