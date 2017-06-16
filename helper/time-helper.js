
// return true if two datetimes are on the same day
// check the exact time if sameTimeToo is true
function sameDate(dateTime1, dateTime2, sameTimeToo=false) {

  dateTime1 = new Date(Date.parse(dateTime1))
  dateTime2 = new Date(Date.parse(dateTime2))

  // check if the datetimes are on the same day if sameTimeToo is false
  if (!sameTimeToo) {
    dateTime1 = dateTime1.toDateString()
    dateTime2 = dateTime2.toDateString()
  }

  return dateTime1 === dateTime2;
}

function datetimeToUnixtime(dateTime){
  dateTime = new Date(Date.parse(dateTime));
  dateTime = dateTime.getTime()/1000;
  return dateTime
}

function sqlTimestampToDate(sql_timestamp) {
  // Split timestamp into [ Y, M, D, h, m, s ]
  var t = sql_timestamp.split(/[- :]/);

  // Apply each element to the Date function
  var d = new Date(Date.UTC(t[0], t[1]-1, t[2], t[3], t[4], t[5]));

  return d
  // -> Wed Jun 09 2010 14:12:01 GMT+0100 (BST)
}

function withinDateRange(dateTime1, dateTimeRange1, dateTimeRange2) {
  dateTime1 = new Date(Date.parse(dateTime1))
  dateTimeRange1 = new Date(Date.parse(dateTimeRange1))
  dateTimeRange2 = new Date(Date.parse(dateTimeRange2))

  return dateTime1 >= dateTimeRange1 && dateTime1 <= dateTimeRange1;
}

function dateToReadableString(timestamp) {
  var result = new Date(Date.parse(timestamp));
  let formattingOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}

  return result.toLocaleString('en-US', formattingOptions) + " at " + result.toLocaleTimeString({hour: 'numeric', minute: '2-digit', timeZoneName: 'short'});
}

module.exports = { sameDate, datetimeToUnixtime, withinDateRange, dateToReadableString, sqlTimestampToDate }
