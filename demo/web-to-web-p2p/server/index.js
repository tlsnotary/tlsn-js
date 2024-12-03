// This file runs a WebSocket server which enables a web prover and web verifier to connect to each other

const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const qs = require('qs');
const app = express();
const port = process.env.PORT || 3001;
const server = createServer(app);

const wss = new WebSocketServer({ server });

const clients = new Map();
wss.on('connection', async (client, request) => {
  const query = qs.parse((request.url || '').replace(/\/\?/g, ''));
  const id = query.id;
  clients.set(id, client);
  client.on('message', (data) => {
    const target = id === 'prover' ? 'verifier' : 'prover';
    console.log(target, data.length);
    clients.get(target).send(data);
  });
});

server.listen(port, () => {
  console.log(`ws server listening on port ${port}`);
});
