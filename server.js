//  OpenShift sample Node application
var express = require('express'),
  app = express(),
  morgan = require('morgan'),
  FCM = require('fcm-push'),
  CronJob = require('cron').CronJob;
let Parser = require('rss-parser');
let parser = new Parser();
require('log-timestamp');
var https = require('https');
var fs = require('fs');
var link_file_name = 'link.txt';
var vly_news_topic = 'news';

const auth = require('./authentication');
app.use(auth);
var serverKey = 'AAAABALux8I:APA91bHyPZclYU-lvSwWwnTPW-bXmYavgp1lp_bTpWZdqmmX_W_3rVU1lk8QtzNpqC9ozO2psixGcGFIjVaEOXHS9AR-O16UfHIPozWyn-u9OBGde04B3dYvgtWNyd4b6-0oaVCFah7l';
var fcm = new FCM(serverKey);
Object.assign = require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))
app.use("/vly", express.static(__dirname + '/client_vly'));
app.use(function (request, response, next) {
  //console.log("hit------------------- " + request);
  response.header("Access-Control-Allow-Origin", "*");
  response.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  response.header("Access-Control-Allow-Headers", "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept");
  //Access-Control-Allow-Origin: http://api.bob.com
  response.header('Access-Control-Allow-Credentials', true);
  response.header('Access-Control-Max-Age', '86400');
  //response.sendFile(__dirname + '/client/index.html');
  //response.redirect('/index.html');
  next();
});

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
  ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
  mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
  mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
    mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
    mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
    mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
    mongoPassword = process.env[mongoServiceName + '_PASSWORD']
  mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' + mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
  dbDetails = new Object();

var initDb = function (callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function (err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function (err) {});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({
      ip: req.ip,
      date: Date.now()
    });
    col.count(function (err, count) {
      if (err) {
        console.log('Error running count. Message:\n' + err);
      }
      res.render('index.html', {
        pageCountMessage: count,
        dbInfo: dbDetails
      });
    });
  } else {
    res.render('index.html', {
      pageCountMessage: null
    });
  }
});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function (err) {});
  }
  if (db) {
    db.collection('counts').count(function (err, count) {
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

app.get('/vly/vly_broadcast', function (req, res) {

  checkForNewNews(false);

});
app.get('/vly/vly_broadcast_forced', function (req, res) {

  checkForNewNews(true,res);

});

app.get('/vly/sendNotification', function (req, res) {
  console.log("Sending broadcast from web panel..........");
  sendFCM(req.query.title,req.query.title, res);

});

// CronJob for fetching news and sending FCM

var job = new CronJob({
  cronTime: '30 * * * * *',
  onTick: function () {

    console.log("CronJob for news update check!");
    checkForNewNews(false);

  },
  start: false,
  timeZone: 'America/Los_Angeles'
});
job.start();

// Function for new news update
var checkForNewNews = function (forcefully,res) {
  (async () => {

    let feed = await parser.parseURL('https://www.valanchery.in/feed/');   

    // feed.items.forEach(item => {
    //   console.log(item.title + ':' + item.link)
    // });

    // console.log("new data :"+feed.items[0].link);   
    
    fs.readFile(link_file_name, 'utf-8' ,function(err, buf) {
      var file_data = buf.toString();
      var data = JSON.stringify(feed.items[0].link);
      // console.log("file data :"+file_data);
      if (file_data != undefined) {
        if (!forcefully) {
          if (JSON.stringify(feed.items[0].link) != file_data) {
            
            console.log("news update found------------------");
            
            fs.writeFile(link_file_name, data, function(err, data){
            sendFCM("Valanchery News",JSON.stringify(feed.items[0].title), res);
            });
            
          } 
          else
            fs.writeFile(link_file_name, data, function(err, data){});
        }else{
          console.log("Forecfully sending------------------");
          fs.writeFile(link_file_name, data, function(err, data){});
          sendFCM("Valanchery News",JSON.stringify(feed.items[0].title), res);
        }
      }
    });    
  })();
}

var sendFCM = function (ttl, msg, res) {

  var message = {
    to: '/topics/' + vly_news_topic, // required fill with device token or topics
    collapse_key: 'test', //your_collapse_key 
    data: {
      your_custom_data_key: 'your_custom_data_value'
    },
    notification: {
      title: ttl,
      body: msg
    }
  };

  fcm.send(message)
    .then(function (response) {
      console.log("Successfully sent with response: ", response);
      if(res != undefined)
          res.send(response);
    })
    .catch(function (err) {
      console.log("Something has gone wrong!");
      console.error(err);
      if(res != undefined)
          res.send(err);
    })
}

// error handling
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function (err) {
  console.log('Error connecting to Mongo. Message:\n' + err);
});

// app.listen(port, ip);
// console.log('Server running on http://%s:%s', ip, port);
var options = {
  key: fs.readFileSync(__dirname + '/ssl_cert/private-key.pem'),
  cert: fs.readFileSync(__dirname + '/ssl_cert/public-cert.pem')
};

https.createServer(options, app).listen(443, function () {
  console.log("Server started at port 443");
});

module.exports = app;
