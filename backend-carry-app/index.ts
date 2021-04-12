import express from 'express';
import http from 'http';
import axios from 'axios';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { Server, Socket } from 'socket.io';
import config from '../config';

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server);

var response: string|null = 'none';
var instaInfo: any = {};
var currUname = '';

io.on("connection", (socket: Socket) => {
  console.log(socket.id);

  const pingUname = async () => {
    await new Promise(r => setTimeout(r, 60000));
    checkUname(socket);
    pingUname();
  }

  pingUname();

});

const checkUname = (socket: Socket) => {
  // Use puppeteer to access instagram graphql query because using axios results
  // in bot detection and a redirect from instagram.
  console.log('check uname in progress');
  puppeteer
    .use(StealthPlugin())
    .launch()
    .then(async browser => {
      const page = await browser.newPage();
      await page.goto(config.query);
      await page.waitForTimeout(5000);
      response = await page.$eval('pre', res => res.textContent); // get JSON portion of html response
      if(response != null) {
        try {
          instaInfo = JSON.parse(response!);
          let newUname = instaInfo.data.user.reel.owner.username;
          if(newUname != currUname) {
            currUname = newUname;  // check for username update
            console.log(currUname);
            socket.emit('change', currUname);
          }
        } catch (error) {
          console.error(error);
        }
      }
      await browser.close();
    });
}

//var instaUsername = JSON.parse(response);
//console.log(instaUsername);

app.get('/', (req,res) => res.send('Express + TypeScript Server for Instagram Gallery Viewer'));
server.listen(PORT, () => {
  console.log(`[server]: Server is running at https://localhost:${PORT}`);
});
