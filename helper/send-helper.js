let request = require('request');
var timeHelper = require('./time-helper');

const sender = {
  sendTextMessage(recipientId, messageText, quickReplies) {
    if (typeof quickReplies !== 'undefined') {
      quickReplies = quickReplies.map(function(x) {
                         return {  title: x,
                                   content_type: "text",
                                   payload: "empty" }
      });
      console.log("quickReplies")
      console.log(quickReplies)
    }

    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: messageText,
        quick_replies: quickReplies,
      }
    };

    this.callSendAPI(messageData);
  },

  // send location prompt to gain local data from user
  sendLocationPrompt(recipientId) {
    var messageData = {
      "recipient":{
        "id": recipientId
      },
      "message":{
        "text":"Please share your location:",
        "quick_replies":[
          {
            "content_type":"location",
          }
        ]
      }
    }
    this.callSendAPI(messageData);
  },

  sendEventQuickReplies(recipientId) {
    var choiceData = {
      "recipient":{
        "id": recipientId
      },
      "message":{
        "text":"Pick an event filter:",
        "quick_replies":[
          {
            "content_type":"text",
            "title":"Popular",
            "payload":"Popular",
            "image_url": "https://s3.ca-central-1.amazonaws.com/queens-events/icons/events_icon.png"
          },
          {
            "content_type":"text",
            "title":"Concerts",
            "payload":"concerts",
            "image_url": "https://s3.ca-central-1.amazonaws.com/queens-events/icons/concert_icon.png"
          },
          {
            "content_type":"text",
            "title":"Movies",
            "payload":"movies",
            "image_url": "https://s3.ca-central-1.amazonaws.com/queens-events/icons/movie_icon.png"
          },
          {
            "content_type":"text",
            "title":"19+ Socials",
            "payload":"adult_socials",
            "image_url": "https://s3.ca-central-1.amazonaws.com/queens-events/icons/19_social_icon.png"
          },
          {
            "content_type":"text",
            "title":"All Ages Socials",
            "payload":"all_ages_socials",
            "image_url": "https://s3.ca-central-1.amazonaws.com/queens-events/icons/child_icon.png"
          },
          {
            "content_type":"text",
            "title":"Arts",
            "payload":"arts_and_theater",
            "image_url": "https://s3.ca-central-1.amazonaws.com/queens-events/icons/arts_icon.png"
          },
          {
            "content_type":"text",
            "title":"Educational",
            "payload":"educational",
            "image_url": "https://s3.ca-central-1.amazonaws.com/queens-events/icons/edu_icon.png"
          },
          {
            "content_type":"text",
            "title":"Health",
            "payload":"health",
            "image_url": "https://s3.ca-central-1.amazonaws.com/queens-events/icons/health_icon.png"
          },
          {
            "content_type":"text",
            "title":"Sports",
            "payload":"sports",
            "image_url": "https://s3.ca-central-1.amazonaws.com/queens-events/icons/sports_icon.png"
          },
        ]
      }
    }
    this.callSendAPI(choiceData);
  },

  sendLocalEventFilterChoice(recipientId) {
    var choiceData = {
      "recipient":{
        "id": recipientId
      },
      "message":{
        "text":"Pick an event filter:",
        "quick_replies":[
          {
            "content_type":"text",
            "title":"Close",
            "payload":"Close"
          },
          {
            "content_type":"text",
            "title":"Soon",
            "payload":"Soon"
          },
          {
            "content_type":"text",
            "title":"Popular",
            "payload":"Popular"
          },
        ]
      }
    }
    this.callSendAPI(choiceData);
  },

  // send event data following the generic template
  sendLocalEventGenericMessage(recipientId, events) {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: []
          }
        }
      }
    };

    // for (let e in eventObjectList) {

    //   let dateTime = new Date(Date.parse(eventObjectList[e].starttime))

    //   let item_url = eventO//'https://facebook.com/events/' + eventObjectList[e].id;
    //   let {city, state, country} = eventObjectList[e].venue.location;
    //   let location = `\n${eventObjectList[e].venue.name}\n${city}, ${state}, ${country}`

    //   messageData.message.attachment.payload.elements.push(
    //     {
    //       title: eventObjectList[e].name,
    //       subtitle: dateToReadableString(dateTime) + location,
    //       item_url: item_url,
    //       image_url: eventObjectList[e].coverPicture,
    //       buttons: [{
    //         type: 'web_url',
    //         url: item_url,
    //         title: 'Learn More',
    //       },
    //       {
    //         type: "element_share"
    //       }
    //       ],
    //     }
    //   );
    // }

    events.forEach((event) => {
      let dateTime = new Date(Date.parse(eventObjectList[e].starttime));

      messageData.message.attachment.payload.elements.push(
        {
          title: event.title,
          subtitle: timeHelper.dateToReadableString(dateTime),
          item_url: item_url,
          image_url: event.coverPicture,
          buttons: [{
            type: 'web_url',
            url: item_url,
            title: 'Learn More',
          },
          {
            type: "element_share"
          }
          ],
        }
      );
    })
    this.callSendAPI(messageData);
  },

  sendEventGenericMessage(recipientId, events) {
   var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: []
          }
        }
      }
    };
    console.log('These are the events');
    console.log(events);
    //for (let e in events) {
    Array.from(events).forEach((event) => {
      //let dateTime = new Date(Date.parse(event.startTime));
      //let location = eventObjectList[e].location.city;

      messageData.message.attachment.payload.elements.push(
        {
          title: event.title,
          subtitle: timeHelper.sqlTimestampToDate(event.starttime) || event.starttime, //+ "\n" + location,
          item_url: event.item_url,
          image_url: event.image_url,
          buttons: [{
            type: 'web_url',
            url: event.item_url,
            title: 'Learn More',
          },
          {
            type: "element_share"
          }
          ],
        }
      );
    })
  // }

    this.callSendAPI(messageData);
  },

  sendGenericMessage(recipientId) {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [{
              title: "rift",
              subtitle: "Next-generation virtual reality",
              item_url: "https://www.oculus.com/en-us/rift/",
              image_url: "http://messengerdemo.parseapp.com/img/rift.png",

             buttons: [{
                type: "web_url",
                url: "https://www.oculus.com/en-us/rift/",
                title: "Open Web URL"
              }, {
                type: "postback",
                title: "Call Postback",
                payload: "Payload for first bubble",
              }],
            }, {
              title: "touch",
              subtitle: "Your Hands, Now in VR",
              item_url: "https://www.oculus.com/en-us/touch/",
              image_url: "http://messengerdemo.parseapp.com/img/touch.png",
              buttons: [{
                type: "web_url",
                url: "https://www.oculus.com/en-us/touch/",
                title: "Open Web URL"
              }, {
                type: "postback",
                title: "Call Postback",
                payload: "Payload for second bubble",
              }]
            }]
          }
        }
      }
    };

    this.callSendAPI(messageData);
  },

  callSendAPI(messageData) {
    request({
      uri: 'https://graph.facebook.com/v2.9/me/messages',
      qs: { access_token: process.env.PAGE_ACCESS_TOKEN },//'EAAbMvESBmPABAMr8alGszgzC3QdSA92SZA7A5fDUiZA7rG8pEEbaMO4vcxcOiNa3PZA3fSOt8tdA9yAFjOhQ8q97aZBLWbJ27dUhE7NYRGqO4ekOqZCTbHofC1IX6bp876r8LepxVQYeEOZAP166DLpyxQs66JqwKxcdpGaEBs3MPKFYRLxqxz' },
      method: 'POST',
      json: messageData

    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var recipientId = body.recipient_id;
        var messageId = body.message_id;

        console.log("Successfully sent generic message with id %s to recipient %s",
          messageId, recipientId);
      } else {
        console.error("Unable to send message.");
        console.error(response);
        console.error('THis is the error: ' + error);
      }
    });
  },

  createPersistentMenu() {

    let messageData =
      {
        "setting_type" : "call_to_actions",
        "thread_state" : "existing_thread",
        "call_to_actions":[
          {
            "type":"postback",
            "title":"Help",
            "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_HELP"
          },
          {
            "type":"postback",
            "title":"Start a New Order",
            "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_START_ORDER"
          },
          {
            "type":"web_url",
            "title":"Checkout",
            "url":"http://petersapparel.parseapp.com/checkout",
            "webview_height_ratio": "full",
            "messenger_extensions": true
          },
          {
            "type":"web_url",
            "title":"View Website",
            "url":"http://petersapparel.parseapp.com/"
          }
        ]
      };

    request({
      uri: "https://graph.facebook.com/v2.6/me/thread_settings",
      qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
      method: 'POST',
      json: messageData
    }), function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var result = body.result;

        console.log("%s", result);
      } else {
        console.error("Unable to send message.");
        console.error(response);
        console.error(error);
      }
    }
  }
}

module.exports = sender;
