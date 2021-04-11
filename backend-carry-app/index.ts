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

console.log(config.query);

puppeteer
  .use(StealthPlugin())
  .launch()
  .then(async browser => {
    const page = await browser.newPage()
    await page.goto(config.query)
    await page.waitForTimeout(5000)
    await page.screenshot({ path: 'stealth.png', fullPage: true })
    await browser.close()
  })

app.get('/', (req,res) => res.send('Express + TypeScript Server for Instagram Gallery Viewer'));
app.listen(PORT, () => {
  console.log(`[server]: Server is running at https://localhost:${PORT}`);
});
