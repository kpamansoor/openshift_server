//  OpenShift sample Node application
var express = require('express'),
  app = express(),
  morgan = require('morgan'),
  FCM = require('fcm-push'),
  CronJob = require('cron').CronJob;
let Parser = require('rss-parser');
let parser = new Parser();
var store = require('data-store')('my-app');
require('log-timestamp');

var serverKey = 'AAAABALux8I:APA91bHyPZclYU-lvSwWwnTPW-bXmYavgp1lp_bTpWZdqmmX_W_3rVU1lk8QtzNpqC9ozO2psixGcGFIjVaEOXHS9AR-O16UfHIPozWyn-u9OBGde04B3dYvgtWNyd4b6-0oaVCFah7l';
var fcm = new FCM(serverKey);
Object.assign = require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

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

app.get('/vly_broadcast', function (req, res) {

  checkForNewNews(false);

});
app.get('/vly_broadcast_forced', function (req, res) {

  checkForNewNews(true,res);

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

    console.log(feed.items[0].link);
    // console.log("from menory : " + store.get("last_news_link"));
    // console.log("from feed : " + feed.items[0].link);
    if (store.get("last_news_link") != undefined) {
      if (!forcefully) {
        if (JSON.stringify(feed.items[0].link) != store.get("last_news_link")) {
          store.set("last_news_link", JSON.stringify(feed.items[0].link));
          console.log("news update found------------------");
          //sendFCM("Valanchery News",JSON.stringify(feed.items[0].title), 'news',res);
        } else
          store.set("last_news_link", JSON.stringify(feed.items[0].link));
      }else{
        console.log("Forecfully sending------------------");
        //sendFCM("Valanchery News",JSON.stringify(feed.items[0].title), 'news',res);
      }
    }
  })();
}

var sendFCM = function (ttl, msg, topic,res) {

  var message = {
    to: '/topics/' + topic, // required fill with device token or topics
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
      res.send(response);
    })
    .catch(function (err) {
      console.log("Something has gone wrong!");
      console.error(err);
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

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app;