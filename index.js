const http = require('http');
const Koa = require('koa');
const WS = require('ws');
const cors = require('@koa/cors');
const { koaBody } = require('koa-body');
const { v4 } = require('uuid');

const app = new Koa();
const port = process.env.PORT || 8000;
const usersId = [];

app.use(cors());
app.use(koaBody({urlencoded: true, multipart: true, json: true}));

app.use(async ctx => {
  ctx.response.status = 200;
  ctx.response.body ='server';
  return;
});

const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });


function getAllUserNames() {
const names = [];
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
    message: err,
  }
  wsServer.clients.forEach(function each(client) {
	client.send(JSON.stringify(errorObj))
  });
}

function deleteID(id, array) {
  const idx = array.findIndex((element) => Number(element) === Number(id))
  if (idx !== -1) {
    array.splice(idx,1)
  }
}


wsServer.on('connection', (ws) => {
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
        message.allUsers = getAllUserNames();
        broadcast(message);
        deleteID(ws.id, usersId);
      }
    })
  });

  ws.send(JSON.stringify('welcome'), errCallback);
});

server.listen(port);
