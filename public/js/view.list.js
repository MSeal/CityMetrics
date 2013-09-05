var ListView = BaseView.extend({
	template: 'list',
	events: {
		'click .sort .metricrow': 'onSortChange',
		'click .metric .metricrow': 'onMetricChange',
    'click .where .metricrow': 'onWhereChange'
	},
	onSortChange: function(ev) {
		this.model.set('order', $(ev.target).data('value'));
		//console.log('sort', $(ev.target).data('value'));
	},
	onMetricChange: function(ev) {
		this.model.set('sort', $(ev.target).data('value'));
		//console.log('metric', $(ev.target).data('value'));
	},
  onWhereChange: function(ev) {
    this.model.set('where', $(ev.target).data('value'));
    //console.log('metric', $(ev.target).data('value'));
  },
	onCitySelect: function(city) {
		this.trigger('go', city);
	},
	onRender: function() {
    var metric = this.model.get('sort');

    drawChart.call(this, [{
      //'key': 'Series2',
      "color": "#1f77b4",
      "values": (this.model.get('values')||[]).map(function(x) {
        return {
          label:  utils.createCityLabel(x),
          value: x[metric]
        }
      })
    }])
  }
});

function drawChart(vals) {
	var self = this;

$('#listchart').height(30*vals[0].values.length);

nv.addGraph(function() {
     var chart = nv.models.multiBarHorizontalChart()
         .x(function(d) { return d.label })
         .y(function(d) { return d.value })
         .margin({top: 30, right: 20, bottom: 50, left: 175})
         .showValues(true)
         .showControls(false)
         .showLegend(false)
         .tooltips(false)
         .tooltip(function(key, x, y, e, graph) {
	        return '<h3>' + x + '</h3>' +
	               '<p>' +  y + '</p>'
	      });
 
/*     chart.yAxis
         .tickFormat(d3.format(',.2f'))
         .height();*/

    chart.xAxis
    	.ticks(0);
 
     d3.select('#listchart svg')
         .datum(vals)
       .transition().duration(500)
         .call(chart);
 
     nv.utils.windowResize(chart.update);
 
     return chart;
   },function(){
          d3.selectAll(".nv-bar").on('click',
               function(obj) {
                     self.onCitySelect(obj.label);
           });
      });
}