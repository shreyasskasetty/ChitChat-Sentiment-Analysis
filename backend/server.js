const express = require("express");
const app = express();
const port = 8002;
var server = require("http").Server(app);
const io = require("socket.io")(server);
const users = require("./configs/users");
const cors = require("cors");
const Sentiment = require('sentiment');
app.use(cors());
const sentiment = new Sentiment();
var clients = {};

io.on("connection", function(client) {
  client.on("sign-in", e => {
    let user_id = e.id;
    if (!user_id) return;
    client.user_id = user_id;
    if (clients[user_id]) {
      clients[user_id].push(client);
    } else {
      clients[user_id] = [client];
    }
  });

  client.on("message", e => {

    const SAD_EMOJI = [55357, 56864];
  const HAPPY_EMOJI = [55357, 56832];
  const NEUTRAL_EMOJI = [55357, 56848];
    let targetId = e.to;
    const sentimentScore = sentiment.analyze(e.message.text).score;
    const mood = sentimentScore > 0 ? HAPPY_EMOJI : (sentimentScore === 0 ? NEUTRAL_EMOJI : SAD_EMOJI);
    e.message.text+="\n"+String.fromCodePoint(...mood);
    console.log(sentimentScore)
    let sourceId = client.user_id;
    if(targetId && clients[targetId]) {
      clients[targetId].forEach(cli => {
        cli.emit("message", e);
      });
    }

    if(sourceId && clients[sourceId]) {
      clients[sourceId].forEach(cli => {
        cli.emit("message", e);
      });
    }
  });

  client.on("disconnect", function() {
    if (!client.user_id || !clients[client.user_id]) {
      return;
    }
    let targetClients = clients[client.user_id];
    for (let i = 0; i < targetClients.length; ++i) {
      if (targetClients[i] == client) {
        targetClients.splice(i, 1);
      }
    }
  });
});

app.get("/users", (req, res) => {
  res.send({ data: users });
});

server.listen(port, () =>
  console.log(`Example app listening on port ${port}!`)
);
