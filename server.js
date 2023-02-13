const http = require('http');
const Koa = require('koa');
const WS = require('ws');
const cors = require('@koa/cors');
const { koaBody } = require('koa-body');
const { v4 } = require('uuid');

const app = new Koa();
const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });
const usersId = [];

app.use(koaBody({
	urlencoded: true,
 }));
 
 app.use((ctx, next) => {
	 const origin = ctx.request.get('Origin');
	 if (ctx.request.method === "GET") {
		console.log("OK");
	 }
	 if (!origin) {
		return next();
	 }
 
  });
 app.use(cors());
//  app.use(async ctx => {
// 	ctx.response.status = 404;
// 	ctx.response.body ='server';
// 	return
//  });
 
 const port = process.env.PORT || 7777;

function getAllUserNames() {
  const names = []
  wsServer.clients.forEach(function each(client) {
    if (client.readyState === WS.OPEN && client.name) {
      names.push(client.name);
    }
  });
  return names;
}

function broadcast(message) {
  wsServer.clients.forEach(function each(client) {
    if (client.readyState === WS.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function error(err) {
  const errorObj = {
    type: 'error',
    message: err
  }
  ws.send(JSON.stringify(errorObj))
}

function deleteID(id, array) {
  const idx = array.findIndex((element) => Number(element) === Number(id))
  if (idx !== -1) {
    array.splice(idx,1)
  }
}

wsServer.on('connection', (ws, req) => {
  const errCallback = (err) => {
    if (err) {
      console.log(err);
    }
  }

  ws.on('message', (data) => {
    const message = JSON.parse(data.toLocaleString());
    switch (message.type) {
      case 'connect':
        {
          if (message.name) {
            ws.name = message.name;
            ws.userID = v4();
            message.userID = ws.userID;
            message.allUsers = getAllUserNames();
            broadcast(message);
            const reportID = {
              type: 'reportID',
              userID: ws.userID
            }
            ws.send(JSON.stringify(reportID))
          } else {
            error('Username required')
          }
        }
        break
      case 'message':
        {
          if (message.name === ws.name) {
            broadcast(message)
          } else {
            error('Invalid username')
          }
        }
        break
      default:
        error('Unsupported message type')
    }

    ws.on('close', () => {
      if (ws.name) {
        const message = {
          type: 'disconnect',
          name: ws.name,
        }
        message.allUsers = getAllUserNames()
        broadcast(message);
        deleteID(ws.id, usersId);
      }
    })
  });

  ws.send(JSON.stringify('welcome'), errCallback);
})

server.listen(port, (err) => {
  if (err) {
    console.log(err);

    return;
  }

  console.log('Server is listening to ' + port);
});
