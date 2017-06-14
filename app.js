var express = require("express");
var request = require("request");
var bodyParser = require("body-parser");

const Wit = require('node-wit').Wit;
const log = require('node-wit').log;
//var wit = require('./wit/bot');

//const sessions = require('./sessions');

var qremAPI = require('./http/http-qrem');
var sendHelper = require('./helper/send-helper');

var app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 5000));

//const sessions = {}; //eventually will be stored in redis to track people's usage of it
// Server index page
app.get("/", function (req, res) {
  res.send("Deployed!");
});

// Facebook Webhook
// Used for verification
app.get("/webhook", function (req, res) {
  if (req.query["hub.verify_token"] === process.env.VERIFICATION_TOKEN) {
    console.log("Verified webhook");
    res.status(200).send(req.query["hub.challenge"]);
  } else {
    console.error("Verification failed. The tokens do not match.");
    res.sendStatus(403);
  }
});

// All callbacks for Messenger will be POST-ed here
app.post("/webhook", function (req, res) {
  // Make sure this is a page subscription
  var data = req.body;
  if (data.object === 'page') {
    // Iterate over each entry
    // There may be multiple entries if batched

    data.entry.forEach((entry) => {
      // Iterate over each messaging event
      var pageID = entry.id;
      var timeofEvent = entry.time;

      entry.messaging.forEach((event) => {
        if (event.postback) {
          processPostback(event);
        } else if(event.message) {
          receivedMessage(event);
        } else {
          console.log("Webhook received unknow event: ", event);
        }
      });
    });

    res.sendStatus(200);
  }
});

function processPostback(event) {
  var senderId = event.sender.id;
  var payload = event.postback.payload;

  if (payload === "Greeting") {
    // Get user's first name from the User Profile API
    // and include it in the greeting
    request({
      url: "https://graph.facebook.com/v2.6/" + senderId,
      qs: {
        access_token: process.env.PAGE_ACCESS_TOKEN,
        fields: "first_name"
      },
      method: "GET"
    }, (error, response, body) => {
      var greeting = "";
      if (error) {
        console.log("Error getting user's name: " +  error);
      } else {
        var bodyObj = JSON.parse(body);
        name = bodyObj.first_name;
        greeting = "Hi " + name + ". ";
      }
      var message = greeting + "My name is QEbot Bot. I can tell you various details regarding events. What events would you like to know about?";
      sendMessage(senderId, {text: message});
    });
  }
}

const sessions = {};

const findOrCreateSession = (fbid) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = {fbid: fbid, context: { _fbid_: fbid }};
  }
  return sessionId;
};


function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;
  var messageText = message.text;
  var messageAttachments = message.attachments;
  //const {text, attachments} = message;
  const sessionId = findOrCreateSession(senderID);

  if (messageText) {

    // If we receive a text message, check to see if it matches a keyword
    // and send back the template example. Otherwise, just echo the text we received.
    if(messageText === 'Popular' || messageText === 'Close' || messageText === 'Soon') {
        filterChoice = messageText;
        sendHelper.sendLocationPrompt(sessions[sessionId].fbid);
        // We retrieve the user's current session, or create one if it doesn't exist
        // This is needed for our bot to figure out the conversation history
     } else {
        wit.runActions(
              sessionId, // the user's current session
              messageText, // the user's message
              //messageAttachments, // the users data
              sessions[sessionId].context // the user's current session state
            ).then((context) => {

              console.log("sessions context")
              console.log(sessions[sessionId].context)

              // Our bot did everything it has to do.
              // Now it's waiting for further messages to proceed.
              console.log('Waiting for next user messages');

              // Based on the session state, you might want to reset the session.
              // This depends heavily on the business logic of your bot.
              // Example:
              // if (context['done']) {
              //delete sessions[sessionId];
              // }

              // Updating the user's current session state
              sessions[sessionId].context = context;
            })
            .catch((err) => {
              console.error('Oops! Got an error from Wit: ', err.stack || err);
            })
      }
    } else if (messageAttachments) {
      if (messageAttachments[0].type === "location"){
        //sendLocalEventFilterChoice(senderID);
        var sortBy;
        switch(filterChoice){
          case 'Close':
            sortBy = 'distance'
            break;
          case 'Soon':
            sortBy = 'time'
            break;
          case 'Popular':
            sortBy = 'popularity';
            break;
          default:
            break;
        }
        let {lat, long} = messageAttachments[0].payload.coordinates
        getLocalEvents(senderID, lat, long, sortBy, null); //senderID

    } else {
      sendHelper.sendTextMessage(senderID, "Message with attachment received");
    }
  }
}

const actions = {
  send({sessionId}, {text}) {
    // Our bot has something to say!
    // Let's retrieve the Facebook user whose session belongs to
    const recipientId = sessions[sessionId].fbid;
    if (recipientId) {
      // Yay, we found our recipient!
      // Let's forward our bot response to her.
      // We return a promise to let our bot know when we're done sending
      return sendHelper.sendTextMessage(recipientId, text);
      /*.then(() => null)
      .catch((err) => {
        console.error(
          'Oops! An error occurred while forwarding the response to',
          recipientId,
          ':',
          err.stack || err
        );
      });*/
    } else {
      console.error('Oops! Couldn\'t find user for session:', sessionId);
      // Giving the wheel back to our bot
      return Promise.resolve()
    }
  },
  // You should implement your custom actions here
  // See https://wit.ai/docs/quickstart
  // You should implement your custom actions here
  // See https://wit.ai/docs/quickstart
  getEvents({sessionId, context, entities}){
    return qremAPI.get('/events')
      .then(resp => resp.data)
      .then((events) => {
        console.log(events);
        let eventsArray = [];
        eventsArray = events;
        context.events = eventsArray//JSON.parse(events); //.slice(0,5)//[rand_id];

        console.log(sessions[sessionId]);
        //sessions[sessionId].fbid
        sendHelper.sendEventGenericMessage(context._fbid_, context.events);

        return context;
      })


    // return new Promise(function(resolve, reject) {
    //   //console.log("we exist");
    //   //console.log(events.slice(0,3))
    //   //var rand_id = Math.floor(Math.random() * (events.length));
    //   context.events = events.slice(0,5);//[rand_id];

    //   console.log(sessions[sessionId]);

    //   sendEventGenericMessage(sessions[sessionId].fbid, context.events);

    //   return resolve(context);
    // });
  },

  findAttributeByEvent({sessionId, context, entities}) {
    return new Promise(function(resolve, reject) {
      // Here should go the api call, e.g.:
      // context.forecast = apiCall(context.loc)

      console.log("Intent: ")
      console.log(entities.intent)

      if(entities.intent[0]) {

        switch (entities.intent[0].value) {
          case 'findEvent':
            console.log("Executing findEvent");

            let selectedEvent = selectEvent(entities)

            sendEventGenericMessage(sessions[sessionId].fbid, [selectedEvent]);

            context.eventTitle = selectedEvent.title;
            break;
          case 'findEventCategory':
            break;
          case 'findEventTime':
            console.log("Executing findEventTime");

            let result = selectEvent(entities);

            var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };

            context.startTime = dateToReadableString(result.startTime, options);
            context.endTime = dateToReadableString(result.endTime, options);
            break;
          case 'findEventLocation':
            console.log("Executing findEventLocation");
            console.log(entities);

            let selectedEvent2 = selectEvent(entities);
            console.log(context)
            console.log(selectedEvent2)

            context.eventTitle = selectedEvent2.title;
            context.locationPlace = selectedEvent2.location.place;
            context.locationCity = selectedEvent2.location.city;

            break;
          default:
            console.log("No")
            context.errorMessage = true;
        }
      }
      return resolve(context);
    });
  },

  getEventCategories({context, entities}){
    return new Promise(function(resolve, reject) {
      const categories_array = [];
      let categories_str = "";

      for (var key in categories) {
        if (categories.hasOwnProperty(key)) {
          categories_array.push(categories[key]);
        }
      }

      for (let key in categories) {

        if (categories[key] === categories_array[categories_array.length - 2])
          categories_str += categories[key] + ", and ";
        else if (categories[key] !== categories_array[categories_array.length - 1])
          categories_str += categories[key] + ", ";
        else
          categories_str += categories[key] + ". "
      }

      context.categoriesStr = categories_str;

      return resolve(context);
    });
  },

  findEventsByAttribute({sessionId, context, entities}){
    return new Promise(function(resolve, reject) {
      // Here should go the api call, e.g.:
      // context.forecast = apiCall(context.loc)
      //console.log(entities.category[0].value)
      //console.log(dateToReadableString(entities.datetime[0].value));

      var selectedEvents = events.filter(function(event) {

        // only consider checking whether this event should be returned
        // only if the user asked for events with these attributes
        // ie. these attributes are in entities
        if (entities.category && entities.datetime) {
          return event.category === entities.category[0].value &&  sameDate(event.startTime, entities.datetime[0].value);
        }
        else if (entities.category) {
          return event.category === entities.category[0].value;
        }
        else if (entities.datetime) {
          console.log("datetime")
          console.log(entities.datetime[0].values)
          if (typeof entities.datetime[0].to !== 'undefined') {
              return sameDate(event.startTime, entities.datetime[0].value) || withinDateRange(event.startTime, entities.datetime[0].to, entities.datetime[0].from);
          }
          return sameDate(event.startTime, entities.datetime[0].value);
        }

      });

      if (selectedEvents.length === 0) {
        context.missingEvents = 'missing';
      } else {
        context.events = selectedEvents;
        if (typeof entities.datetime !== 'undefined')
          context.eventDay = entities.datetime[0].value.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
      }
      if (context.events) { sendEventGenericMessage(sessions[sessionId].fbid, context.events); }

      return resolve(context);
    });
  },

  getLocalEventsByAttribute({sessionId, context, entities}) {
    return new Promise(function(resolve, reject) {
      if(entities.intent[0].value){
        switch(entities.intent[0].value){
          case 'findLocalEventsDatetime':
            getLocalEvents(sessions[sessionId].fbid, null, null, 'time', datetimeToUnixtime(entities.datetime[0].value));
            context.events = true;
            context.time = dateToReadableString(entities.datetime[0].value);
            break;
          case 'findLocalEventsProximity':
            getLocalEvents(sessions[sessionId].fbid, null, null, 'distance', datetimeToUnixtime(entities.datetime[0].value));
            context.events = true;
            context.time = dateToReadableString(entities.datetime[0].value);
            break;
          default:
            getLocalEvents(sessions[sessionId].fbid);
            break;
        }
      }
      return resolve(context);
    });
  },

  findLocalEvents({sessionId, context, entities}) {
    return new Promise(function(resolve, reject) {
      sendLocalEventFilterChoice(sessions[sessionId].fbid);
    });
  },

  getSecret({context, entities}){
    return new Promise(function(resolve, reject){
      context.secret = 'ssh-rsa AAAAB3NzaC1yc2EAAAABJQAAAQB/nAmOjTmezNUDKYvEeIRf2YnwM9/uUG1d0BYsc8/tRtx+RGi7N2lUbp728MXGwdnL9od4cItzky/zVdLZE2cycOa18xBK9cOWmcKS0A8FYBxEQWJ/q9YVUgZbFKfYGaGQxsER+A0w/fX8ALuk78ktP31K69LcQgxIsl7rNzxsoOQKJ/CIxOGMMxczYTiEoLvQhapFQMs3FL96didKr/QbrfB1WT6s3838SEaXfgZvLef1YB2xmfhbT9OXFE3FXvh2UPBfN+ffE7iiayQf/2XR+8j4N4bW30DiPtOQLGUrH1y5X/rpNZNlWW2+jGIxqZtgWg7lTy3mXy5x836Sj/6L';
      resolve(context);
    });
  }
};

// Setting up our bot
const wit = new Wit({
  accessToken: process.env.WIT_TOKEN,
  actions,
  logger: new log.Logger(log.INFO)
});

// sends message to user
function sendMessage(recipientId, message) {
  request({
    url: "https://graph.facebook.com/v2.6/me/messages",
    qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
    method: "POST",
    json: {
      recipient: {id: recipientId},
      message: message,
    }
  }, (error, response, body) => {
    if (error) {
      console.log("Error sending message: " + response.error);
    }
  });
}

function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " +
    "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to
  // let them know it was successful
  sendHelper.sendTextMessage(senderID, "Postback called");
}
