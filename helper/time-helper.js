
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

module.exports = { sameDate, datetimeToUnixtime, withinDateRange, dateToReadableString }