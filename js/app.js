/* global d3 */

var margin = {top: 20, right: 20, bottom: 30, left: 50};
var width = 1000 - margin.left - margin.right;
var height = 500 - margin.top - margin.bottom;
var timeFormatter = d3.time.format('%Y-%m-%d %H:%M:%S');
var dayFormatter = d3.time.format('%Y-%m-%d');
var asks = [];
var asksByDay;
var bids = [];
var bidsByDay;

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

var zoom = d3.behavior.zoom()
    .on('zoom', zoomed);

var svg = d3.select('.chart').append('svg')
  .call(zoom)
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
  .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

svg.append('defs').append('clipPath')
  .attr('id', 'clip')
  .append('rect')
    .attr('width', width)
    .attr('height', height);

function zoomed() {
  svg.select('.x.axis').call(xAxis);
  svg.selectAll('path.line').attr('d', line);
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
});
