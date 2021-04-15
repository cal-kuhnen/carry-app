import express from 'express';
import http from 'http';
import axios from 'axios';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { Server, Socket } from 'socket.io';
import * as mongodb from 'mongodb';
import { config, mongoInfo } from '../config';
import route from './routes/route';

interface Comment {
  link: string;
  comment: string;
  time?: string;
}

// Setup mongoDB connection
const MongoClient = mongodb.MongoClient;
const uri = `mongodb+srv://dbAdminCal:${mongoInfo.password}@cluster0.1seup.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;


const PORT = process.env.PORT || 3002;
const app = express();
app.use(route);
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

io.on("connection", (socket:Socket) => {
  console.log(`Socket connected with id: ${socket.id}`);

  clearInterval(pingUname);
  pingUname = setInterval(checkUname, 120000, socket);

  socket.on('give-qr', () => {
    console.log('giving qr');
    socket.emit('change', currUname);
  });

  socket.on('post-comment', (toPost: Comment) => {
    console.log(`must post comment ${toPost.comment}`);
    addComment(toPost);
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
    .launch()
    .then(async browser => {
      try {
        const page = await browser.newPage();
        await page.goto(config.query);
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
    .launch()
    .then(async browser => {
      try {
        // Login flow
        const page = await browser.newPage();
        await page.goto('https://www.instagram.com/accounts/login/');
        await page.waitForSelector('input[name="username"]');
        await page.type('input[name="username"]', config.username);
        await page.type('input[name="password"]', config.password);
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
      } finally {
        await browser.close();
      }
    });
}

// Add new comment to database
const addComment = async  (newComment: Comment) => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const result = await client.db('insta_test').collection('comments').insertOne(newComment);

    console.log(`Added comment with id: ${result.insertedId}`);

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

//var instaUsername = JSON.parse(response);
//console.log(instaUsername);

app.get('/', (req,res) => res.send('Express + TypeScript Server for Instagram Gallery Viewer'));
server.listen(PORT, () => {
  console.log(`[server]: Server is running at https://localhost:${PORT}`);
});
