var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var EventSchema = new Schema ({
  user_id: {type: String},
  title: {type: String},
  description: {type: String},
  item_url: {type: String},
  image_url: {type: String},
  category: {type: String},
  venue_id: {type: String },
  organization_id: {type: String},
  startTime: {type: Date},
  endTime: {type: Date}
});

module.exports = EventSchema;