import express from 'express';
const app = express();
const PORT = process.env.PORT || 5000;

app.get('/', (req,res) => res.send('Express + TypeScript Server for Instagram Gallery Viewer'));
app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${PORT}`);
});
