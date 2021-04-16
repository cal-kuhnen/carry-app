import express from 'express';
import http from 'http';
import path from 'path';
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


// Setup mongoDB connection
const MongoClient = mongodb.MongoClient;
const uri = `mongodb+srv://dbAdminCal:${process.env.MONGO_PASS}@cluster0.1seup.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const PORT = process.env.PORT || 3002;
const app = express();
app.use(express.static(path.join(__dirname, 'client/build')));
const server = http.createServer(app);
const io = new Server(server);
// below is for dev environment
/* {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
} */

let response: string|null = 'none';
let instaInfo: any = {};
let currUname = '';
let pingUname: any;

io.on("connection", (socket:Socket) => {
  console.log(`Socket connected with id: ${socket.id}`);

  clearInterval(pingUname);
  pingUname = setInterval(checkUname, 60000, socket);

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
  });
});

// Use puppeteer to access instagram graphql query because using axios results
// in bot detection and a redirect from instagram.
const checkUname = (socket:Socket) => {
  console.log('check uname in progress');
  puppeteer
    .use(StealthPlugin())
    .launch({ args: ['--no-sandbox']})
    .then(async browser => {
      try {
        const page = await browser.newPage();
        await page.goto('https://www.instagram.com/accounts/login/');
        await page.waitForSelector('input[name="username"]');
        await page.type('input[name="username"]', process.env.INSTA_USERNAME);
        await page.type('input[name="password"]', process.env.INSTA_PASSWORD);
        await page.click('button[type="submit"]');

        // Waiting for page to refresh
        await page.waitForNavigation();
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
              socket.emit('change', currUname); // send new username to frontend
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
    .launch({ args: ['--no-sandbox']})
    .then(async browser => {
      try {
        // Login flow
        const page = await browser.newPage();
        await page.goto('https://www.instagram.com/accounts/login/');
        await page.waitForSelector('input[name="username"]');
        await page.type('input[name="username"]', process.env.INSTA_USERNAME);
        await page.type('input[name="password"]', process.env.INSTA_PASSWORD);
        await page.click('button[type="submit"]');

        // Waiting for page to refresh
        await page.waitForNavigation();

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

// Add new comment to database, send back updated comment list
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

const returnComments = async (socket: Socket) => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    let collection = client.db('insta_test').collection('comments');

    // get 10 most recent comments to display on page after adding new
    let commentArray = await collection.find().sort({_id:-1}).limit(10).toArray();
    let commentList = JSON.parse(JSON.stringify(commentArray));
    io.sockets.emit('cList', commentList);
    console.log('sending comment list');

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname+'/client/build/index.html'));
});

server.listen(PORT, () => {
  console.log(`[server]: Server is running at https://localhost:${PORT}`);
});
