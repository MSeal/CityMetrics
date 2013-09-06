var ComparisonView = BaseView.extend({
	template: 'comparison',
	onRender: function() {
		var data = this.model.get('data');
		data.forEach(function(metric) {
			this.$el.append($('<div class="mname">').text(
				metric.metric.label + (metric.metric.units ? ' ('+metric.metric.units + ')' : '')
			));
			var chart = $('<div class="mchart"><svg></svg></div>');
			this.$el.append(chart);

			var vals = [{
    			"values": metric.data
			}];

/*			var vals = metric.data.map(function(x) {
				return {
					values: [
						x
					]
				};
			});*/

			this.drawChart(chart, vals, metric.data.length);
		}.bind(this));
	},
	drawChart: function (el, vals, len) {
		var self = this;

		el.height(30*len+50);
		//el.find('svg').height(30*len);

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
		 
		     d3.select(el.find('svg').get(0))
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
});


