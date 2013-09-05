
var MainView = BaseView.extend({
	template: 'main',
	events: {
		'click .go': 'onGo',
		'click .random': 'onRandom',
		'keydown .cityname': 'onKeydown',
    'click .statinfo li a': 'onLink',
    'click .examples a': 'onExample',
    'click .statinfo a.preset': 'onPreset'
	},
	onGo: function() {
		var val = this.$el.find('.cityname').val();
		this.trigger('go', val);
	},
	onRandom: function() {
		this.trigger('random');
	},
	onKeydown: function(ev) {
		if (ev.which === 13) {
			this.onGo();
			ev.preventDefault();
		}
	},
  onPreset: function(ev) {
    ev.preventDefault();
    var val = $(ev.target).parents('.statinfo').data('preset').split(',');
    this.trigger('preset', {
      sort: val[0],
      order: val[1]
    });
  },
  onLink: function(ev) {
    ev.preventDefault();
    var val = $(ev.target).text();
    this.trigger('go', val);
  },
  onExample: function(ev) {
    ev.preventDefault();
    var val = $(ev.target).text();
    val = val.split(/ *, *| * vs. */g);
    this.trigger('compare', val);
  },
	onRender: drawMap
});

function drawMap() {
	var width = 480,
    height = 250,
    centered;

var projection = d3.geo.albersUsa()
    .scale(1070/2)
    .translate([width / 2, height / 2]);

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("svg#map")
    .attr("width", width)
    .attr("height", height);

svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .on("click", clicked);

var g = svg.append("g");

/*d3.json("us.json", function(error, us) {
  g.append("g")
      .attr("id", "states")
    .selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
    .enter().append("path")
      .attr("d", path)
      .on("click", clicked);

  g.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("id", "state-borders")
      .attr("d", path);
});*/

var xjson;

d3.json("us.json", function(error, us) {

d3.json("state.json", function(json) {
  //var xstates = {ak:1, hi:1};

/*  json.features = json.features.filter(function(x) {
    var ret = !(x.properties.abbr in xstates);
    console.log(x.properties.abbr);
    return ret;
  })*/

/*  var heatmap = d3.scale.linear()
    .domain([0,d3.max(json.features, function(d) { return Math.log(hits[d.properties.abbr] || 1); })])
    .interpolate(d3.interpolateRgb)
    .range(["#ffffff","#073f07"])*/
/*  var states = g.append("g")
      .attr("id", "states")
    .selectAll("path")
    .data(json.objects)
    .enter().append("path")
      .attr("d", path)
      .attr("id", function(d) { return d.properties.abbr; })
      //.style("fill", function(d) { return heatmap(Math.log(hits[d.properties.abbr] || 1)); })
      .on("click", clicked)*/

  g.append("g")
      .attr("id", "states")
    .selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
    .enter().append("path")
      .attr("d", path)
      .on("click", clicked);

  g.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("id", "state-borders")
      .attr("d", path);

/*  var labels = g.selectAll("text")
    .data(json.features)
    .enter().append("text")
      .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
      .attr("id", function(d) { return 'label-'+d.properties.abbr; })
      .attr("dy", ".2em")
      .attr("dx", "-0.6em")
      .on("click", clicked)
      .text(function(d) { return d.properties.abbr.toUpperCase(); });*/

      xjson = json;

});

});

function clicked(d) {

  var x, y, k;

  if (d && centered !== d) {
    var state = xjson.objects.state.geometries.filter(function(x) {
      return x.id == d.id;
    });
    state = state[0];
    console.log(d.id, state.id, state.properties.NAME10);

    var centroid = path.centroid(d);
    x = centroid[0];
    y = centroid[1];
    k = 4;
    centered = d;
  } else {
    x = width / 2;
    y = height / 2;
    k = 1;
    centered = null;
  }

  g.selectAll("path")
      .classed("active", centered && function(d) { return d === centered; });

  g.transition()
      .duration(750)
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
      .style("stroke-width", 1.5 / k + "px");
}
}