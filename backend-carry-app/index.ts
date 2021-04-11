import express from 'express';
import https from 'https';
import axios from 'axios';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { Server, Socket } from 'socket.io';
import config from '../config';

const PORT = process.env.PORT || 5000;
const app = express();
const server = https.createServer(app);
const io = new Server(server);

var response: string|null = 'none';
var instaInfo: any = {};

puppeteer
  .use(StealthPlugin())
  .launch()
  .then(async browser => {
    const page = await browser.newPage();
    await page.goto(config.query);
    await page.waitForTimeout(5000);
    response = await page.$eval('pre', res => {
        if (res == null) {
          return 'response null';
        }
        else {
          return res.textContent;
        }
    });
    instaInfo = JSON.parse(response!);
    console.log(instaInfo.data.user.reel.owner.username);
    await browser.close();
  })

//var instaUsername = JSON.parse(response);
//console.log(instaUsername);

app.get('/', (req,res) => res.send('Express + TypeScript Server for Instagram Gallery Viewer'));
app.listen(PORT, () => {
  console.log(`[server]: Server is running at https://localhost:${PORT}`);
});
