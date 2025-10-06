const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();
const home = require('./routes/home');
const gettrain = require('./routes/getTrains');

const PORT = process.env.PORT || 4000;
const app = express();

// Basic CORS middleware for CRA dev server
app.use((req, res, next) => {
  const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use("/", home);
app.use("/trains", gettrain);

app.listen(PORT, () => {
  console.log(`Embedded backend listening on ${PORT}`);
});


