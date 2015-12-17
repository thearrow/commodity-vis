/* global d3 */

var margin = {top: 5, right: 20, bottom: 30, left: 50};
var width = 1000 - margin.left - margin.right;
var height = 500 - margin.top - margin.bottom;
var timeFormatter = d3.time.format('%Y-%m-%d %H:%M:%S');
var dayFormatter = d3.time.format('%Y-%m-%d');
var asks = [];
var asksByDay;
var bids = [];
var bidsByDay;
var raw = false;

var x = d3.time.scale()
  .range([0, width]);

var y = d3.scale.linear()
  .range([height, 0]);

var xAxis = d3.svg.axis()
  .scale(x)
  .orient('bottom');

var yAxis = d3.svg.axis()
  .scale(y)
  .orient('left');

var line = d3.svg.line()
  .x(function(d) {
    return x(d.time);
  })
  .y(function(d) {
    return y(d.value);
  })
  .interpolate('step');

var area = d3.svg.area()
  .x(function(d) {
    return x(d.time);
  })
  .y0(function() {
    return 1000;
  })
  .y1(function(d) {
    return y(d.value);
  })
  .interpolate('step');

var zoom = d3.behavior.zoom()
    .on('zoom', zoomed);

var toolbar = d3.select('.chart').append('div')
  .attr('class', 'toolbar');

var buttonRawData = toolbar.append('button')
  .text('Raw Data')
  .on('click', handleGroupNone);

var buttonDailyAvg = toolbar.append('button')
  .text('Daily Averages')
  .attr('disabled', true)
  .on('click', handleGroupDay);

var buttonShowSpread = toolbar.append('button')
  .text('Show Spread')
  .attr('disabled', true)
  .style('margin-left', '50px')
  .on('click', handleShowSpread);

var buttonHideSpread = toolbar.append('button')
  .text('Hide Spread')
  .on('click', handleHideSpread);

var legend = toolbar.append('div')
  .attr('class', 'legend');
legend.append('div')
  .text('- Ask')
  .attr('class', 'asks');
legend.append('div')
  .text('- Bid')
  .attr('class', 'bids');

var tooltip = toolbar.append('div')
  .attr('class', 'tooltip');

var svg = d3.select('.chart').append('svg')
  .call(zoom)
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
  .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

svg.append('rect')
  .attr('class', 'overlay')
  .attr('width', width)
  .attr('height', height)
  .on('mousemove', handleMouseMove);

svg.append('defs').append('clipPath')
  .attr('id', 'clip')
  .append('rect')
    .attr('width', width)
    .attr('height', height);
svg.select('defs').append('mask')
  .attr('id', 'area-mask')
  .append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'white');

function findKey(array, key) {
  return array.filter(function(d) {
    return d.key.indexOf(key) > -1;
  });
}

function handleMouseMove() {
  var date = x.invert(d3.mouse(this)[0]);
  var dateText = dayFormatter(date);
  var askText = findKey(asksByDay, dateText);
  var bidText = findKey(bidsByDay, dateText);

  askText = parseNumberFromArrayOrEmpty(askText);
  bidText = parseNumberFromArrayOrEmpty(bidText);

  tooltip
    .text(dateText +
      '  Ask: ' + askText +
      '  Bid: ' + bidText);
  d3.select('.tooltip-line')
    .attr('x1', d3.mouse(this)[0])
    .attr('x2', d3.mouse(this)[0]);
}

function parseNumberFromArrayOrEmpty(input) {
  var output;
  if (input.length > 0) {
    output = input[0].value.toFixed(1);
  } else {
    output = '';
  }
  return output;
}

function handleGroupNone() {
  raw = true;
  buttonDailyAvg.attr('disabled', null);
  buttonRawData.attr('disabled', true);

  svg.select('.line.asks')
    .datum(asks)
    .attr('d', line);
  svg.select('.line.bids')
    .datum(bids)
    .attr('d', line);
  renderAreas(raw);
}

function handleGroupDay() {
  raw = false;
  buttonDailyAvg.attr('disabled', true);
  buttonRawData.attr('disabled', null);

  svg.select('.line.asks')
    .datum(asksByDay)
    .attr('d', line);
  svg.select('.line.bids')
    .datum(bidsByDay)
    .attr('d', line);
  renderAreas(raw);
}

function handleShowSpread() {
  buttonShowSpread.attr('disabled', true);
  buttonHideSpread.attr('disabled', null);
  d3.select('.area')
    .style('display', '');
}

function handleHideSpread() {
  buttonShowSpread.attr('disabled', null);
  buttonHideSpread.attr('disabled', true);
  d3.select('.area')
    .style('display', 'none');
}

function renderAreas(raw) {
  if (raw) {
    svg.selectAll('path.area.asks').attr('d', function() {
      return area(asks);
    });
    svg.selectAll('.bids-mask').attr('d', function() {
      return area(bids);
    });
  } else {
    svg.selectAll('path.area.asks').attr('d', function() {
      return area(asksByDay);
    });
    svg.selectAll('.bids-mask').attr('d', function() {
      return area(bidsByDay);
    });
  }
}

function zoomed() {
  svg.select('.x.axis').call(xAxis);
  svg.selectAll('path.line').attr('d', line);
  renderAreas(raw);
}

function sortByTime(a, b) {
  return a.time - b.time;
}

function dailyAverages(data) {
  var nest = d3.nest()
    .key(function(d) {
      return dayFormatter(d.time);
    })
    .rollup(function(d) {
      return d3.mean(d, function(d) {
        return d.value;
      });
    })
    .entries(data);

  nest.forEach(function(d) {
    d.time = dayFormatter.parse(d.key);
    d.value = Number(d.values);
  });

  return nest;
}

d3.csv('../data.csv', function(error, data) {
  if (error) {
    throw error;
  }

  data.forEach(function(datum) {
    datum.time = timeFormatter.parse(datum.time);
    datum.value = Number(datum.value);
    if (datum.type === 'a') {
      asks.push(datum);
    } else if (datum.type === 'b') {
      bids.push(datum);
    }
  });

  asks = asks.sort(sortByTime);
  asksByDay = dailyAverages(asks);

  bids = bids.sort(sortByTime);
  bidsByDay = dailyAverages(bids);

  x.domain(d3.extent(data, function(d) {
    return d.time;
  }));
  zoom.x(x);
  y.domain(d3.extent(data, function(d) {
    return d.value;
  }));

  svg.append('g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0,' + height + ')')
    .call(xAxis);

  svg.append('g')
    .attr('class', 'y axis')
    .call(yAxis)
  .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', 6)
    .attr('dy', '.71em')
    .style('text-anchor', 'end')
    .text('Price ($/ton)');

  svg.append('path')
    .datum(asksByDay)
    .attr('class', 'line asks')
    .attr('d', line)
    .attr('clip-path', 'url(#clip)');

  svg.append('path')
    .datum(bidsByDay)
    .attr('class', 'line bids')
    .attr('d', line)
    .attr('clip-path', 'url(#clip)');

  svg.select('#area-mask').append('path')
    .attr('class', 'bids-mask')
    .attr('d', function() {
      return area(bidsByDay);
    });

  svg.append('path')
    .attr('class', 'area asks')
    .attr('mask', 'url(#area-mask)')
    .attr('d', function() {
      return area(asksByDay);
    });

  svg.append('line')
    .attr('class', 'tooltip-line')
    .attr('x1', 0)
    .attr('x2', 0)
    .attr('y1', 0)
    .attr('y2', height);
});
