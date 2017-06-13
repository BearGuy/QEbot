var express = require("express");
var request = require("request");
var bodyParser = require("body-parser");
var wit = require('./wit/bot');

var sendHelper = require('./helper/send-helper');

var app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 5000));

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
    sessions[sessionId] = {fbid: fbid, context: {}};
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
              //sessions[sessionId].context = context;
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
      sendTextMessage(senderID, "Message with attachment received");
    }
  }
}

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
  sendTextMessage(senderID, "Postback called");
}

/*

//////////////////////////
// Sending helpers
//////////////////////////

*/
