const Wit = require('node-wit').Wit;
const log = require('node-wit').log;

const sessions = require('../sessions');

let qremAPI = require('../http/http-qrem');
let sendHelper = require('../helper/send-helper');

// ----------------------------------------------------------------------------
// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}

// Our bot actions
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

module.exports = wit;