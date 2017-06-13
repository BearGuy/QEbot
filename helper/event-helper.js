let sender = require('./send-helper');
let EventSearch = require("facebook-events-by-location-core");

function selectEvent(events, entities) {
  // find event matching
  return events.find(function(event) {
    return entities.event[0].value.toLowerCase() === event.title.toLowerCase();
  });
}

function findByCategory(events, context, entities) {
  var selectedEvents = events.filter(function(event) {
      return event.category === entities.category[0].value;
    });

    if (selectedEvents.length === 0) {
      context.missingEvents = 'missing';
    } else {
      context.events = selectedEvents;
    }

    console.log(context.missingEvents);
    return context;
}

function getLocalEvents(recipientId, lat, lng, sort_type, time_filter){
  var events_limit;
  var es = new EventSearch({
    "lat": lat || 44.2312, //defaults to Kingston if no coordinates are passed in
    "lng": lng || -76.4860,
    "distance": 1000, // 1 km
    "sort": sort_type || "popularity",
    "since": time_filter || null
  });

  es.search()
  .then(function (events) {
    if(events.events.length > 10){
      events_limit = events.events.slice(0,10);
    } else {
      events_limit = events.events;
    }
    sendLocalEventGenericMessage(recipientId, events_limit);

    })
  .catch(function (error) {
      console.error(JSON.stringify(error));
  });
}

module.exports = {selectEvent, findByCategory}
