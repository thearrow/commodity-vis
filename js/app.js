/* global d3 */

var margin = {top: 20, right: 20, bottom: 30, left: 50};
var width = 1000 - margin.left - margin.right;
var height = 500 - margin.top - margin.bottom;

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
  .x(function(d) { return x(d.time); })
  .y(function(d) { return y(d.value); })
  .interpolate('step');

var zoom = d3.behavior.zoom()
    .on('zoom', zoomed);

var svg = d3.select('.chart').append('svg')
  .call(zoom)
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
  .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

function zoomed() {
  svg.select('.x.axis').call(xAxis);
  svg.select('.y.axis').call(yAxis);
  svg.selectAll('path.line').attr('d', line);
}

function sortByTime(a, b) {
  // Dates will be cast to numbers automagically:
  return a.time - b.time;
}

d3.csv('../data.csv', function(error, data) {
  if (error) {
    throw error;
  }

  var timeFormatter = d3.time.format('%Y-%m-%d %H:%M:%S');
  var dayFormatter = d3.time.format('%Y-%m-%d');
  var bids = [];
  var asks = [];

  data.forEach(function(datum) {
    datum.time = timeFormatter.parse(datum.time);
    datum.value = Number(datum.value);
    if (datum.type === 'a') {
      asks.push(datum);
    } else if (datum.type === 'b') {
      bids.push(datum);
    }
  });

  data = data.sort(sortByTime);
  asks = asks.sort(sortByTime);
  bids = bids.sort(sortByTime);

  var asksNest = d3.nest()
    .key(function(d) { return dayFormatter(d.time); })
    .rollup(function(d) { return d3.mean(d, function(d) { return d.value; }); })
    .entries(asks);

  var bidsNest = d3.nest()
    .key(function(d) { return dayFormatter(d.time); })
    .rollup(function(d) { return d3.mean(d, function(d) { return d.value; }); })
    .entries(bids);

  asksNest.forEach(function (d) {
    d.time = dayFormatter.parse(d.key);
    d.value = Number(d.values);
  });

  bidsNest.forEach(function (d) {
    d.time = dayFormatter.parse(d.key);
    d.value = Number(d.values);
  });

  x.domain(d3.extent(data, function(d) { return d.time; }));
  zoom.x(x);
  y.domain(d3.extent(data, function(d) { return d.value; }));

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
    .datum(asksNest)
    .attr('class', 'line asks')
    .attr('d', line);

  svg.append('path')
    .datum(bidsNest)
    .attr('class', 'line bids')
    .attr('d', line);

  console.log(data);
});
