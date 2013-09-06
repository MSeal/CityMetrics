
var views = [
	{"name":"Main", "defaults":{
		'presets': [],
		'stats': {
		  "metrics": '',
		  "cities": '',
		  "countries": ''
		},
		"suggestions": []
	}},
	{"name":"Detail", "defaults":{data: []}},
	{"name":"List", "defaults":{
		values: [],
		metrics: [
			//{"name":"type","label":"type"},

			{"name":"population","label":"Population","units":"people"},
			{"name":"populationMetro","label":"Population Metro","units":"people"},
			{"name":"populationDensity","label":"Population Density","units":"people/sqkm"},
			
			// {"name":"country","label":"Country"},
			// {"name":"state","label":"State"},
			// {"name":"region","label":"Region"},
			// {"name":"district","label":"District"},

			{"name":"areaTotal","label":"Area","units":"m2"},
			{"name":"areaLand","label":"Area Land","units":"m2"},
			{"name":"areaWater","label":"Area Water","units":"m2"},

			{"name":"elevation","label":"Elevation","units":"u"}

			//{"name":"latitude","label":"Latitude"},
			//{"name":"longitude","label":"Longitude"},

			//{"name":"foundingDate","label":"foundingDate"},
			//{"name":"governmentType","label":"governmentType"},
			//{"name":"leaderTitle","label":"leaderTitle"},
			//{"name":"name","label":"name"},
			//{"name":"homepage","label":"homepage"},
			
		],
		sort: 'population',
		sorts: [
			{name: 'valueDesc', label: 'Value largest'},
			{name: 'valueAsc', label: 'Value smallest'},
			{name: 'nameAsc', label: 'Name A-Z'},
			{name: 'nameDesc', label: 'Name Z-A'}
		],
		order: 'valueDesc',
		wheres: [
			{name: 'world', label: 'World'},
			{name: 'usa', label: 'U.S.'}
		],
		where: 'world'
	}},
	{"name":"Comparison", "defaults":{data: []}},
	{"name":"Cityinput", "defaults":{cities: []}}
];

var children = {};

views.forEach(function(x) {
	var view = new window[x.name+'View']({
		el: '#'+x.name.toLowerCase(),
		model: new Backbone.Model(x.defaults)
	});
	view.$el.hide();
	children[x.name.toLowerCase()] = view;
});

function show() {
	var s = Array.prototype.slice.apply(arguments);
	for (var v in children) {
		if (s.indexOf(v) === -1) {
			children[v].$el.hide();
		} else {
			children[v].$el.show();
		}
	}
}

var presets = [
	  {
	    color: '#4C9BD4',
	    label: 'Largest cities',
	    cities: ['cityname','cityname','cityname','cityname','cityname'],
	    preset: 'areaTotal,valueDesc'
	  },
	  {
	    color: '#7EC245',
	    label: 'Most Populated',
	    cities: ['cityname','cityname','cityname','cityname','cityname'],
	    preset: 'population,valueDesc'
	  },
	  {
	    color: '#DF5893',
	    label: 'Smallest cities',
	    cities: ['cityname','cityname','cityname','cityname','cityname'],
	    preset: 'areaTotal,valueAsc'
	  }
];

var presetnum = presets.length;

presets.forEach(function(x, i) {
	var vals = x.preset.split(','),
		sort = vals[0],
		order = vals[1];

	var q = {
		sort: order.match(/^value/) ? sort : 'name',
		order: order.match(/Asc$/) ? 'asc' : 'desc',
		limit: 5
	};
	utils.api('listmetric', q, function(err, data) {
		presets[i].cities = data;
		if (--presetnum <= 0) {
			children.main.model.set('presets', presets);
		}
	});
});

var metrics = [
	//{"name":"type","label":"type"},

	{"name":"population","label":"Population","units":"people"},
	{"name":"populationMetro","label":"Population Metro","units":"people"},
	{"name":"populationDensity","label":"Population Density","units":"people/sqkm"},
	
	// {"name":"country","label":"Country"},
	// {"name":"state","label":"State"},
	// {"name":"region","label":"Region"},
	// {"name":"district","label":"District"},

	{"name":"areaTotal","label":"Area","units":"m2"},
	{"name":"areaLand","label":"Area Land","units":"m2"},
	{"name":"areaWater","label":"Area Water","units":"m2"},

	{"name":"elevation","label":"Elevation","units":"u"}

	//{"name":"latitude","label":"Latitude"},
	//{"name":"longitude","label":"Longitude"},

	//{"name":"foundingDate","label":"foundingDate"},
	//{"name":"governmentType","label":"governmentType"},
	//{"name":"leaderTitle","label":"leaderTitle"},
	//{"name":"name","label":"name"},
	//{"name":"homepage","label":"homepage"},
	
];

children.cityinput.model.on('change:cities', function() {
	var cities = children.cityinput.model.get('cities');

	children.detail.model.set('cities', cities);
	children.comparison.model.set('cities', cities);

	utils.api('compare', {cities: cities}, function(err, data) {
		if (cities.length === 1) {
			var out = _.map(data[0], function(val, key) {
				var label = metrics.filter(function(x) {return x.name === key})[0];
				if (label && val !== null) {
					return {
						label: label.label,
						value: val + (label.units ? ' '+label.units : ''),
						sim: ['Houston', 'Denver']
					};
				}
			}).filter(function(x) {return x});
			children.detail.model.set({
				'data': out
			});
			show('cityinput', 'detail');
		} else {
			var out = [];
			for (var i = 0; i < metrics.length; i+=1) {
				var row = [],
					empty = true;

				for (var j = 0; j < data.length; j+=1) {
					var value = data[j][metrics[i].name];
					row.push({label: utils.createCityLabel(data[j]), value: value});
					if (value) {
						empty = false;
					}
				}
				row = _.uniq(row, function(x) { return x.label });
				if (!empty) {
					out.push({metric: metrics[i], data: row});
				}
			}

			children.comparison.model.set('data', out);
			show('cityinput', 'comparison');
		}
	});
});


children.list.model.on('change', function(model) {
	if ('order' in model.changed || 'sort' in model.changed || 'where' in model.changed) {
		var q = {
			sort: model.get('order').match(/^value/) ? model.get('sort') : 'name',
			order: model.get('order').match(/Asc$/) ? 'asc' : 'desc',
			limit: 20,
			where: model.get('where')
		};
		utils.api('listmetric', q, function(err, data) {
			children.list.model.set('values', data);
		});
	}
});


children.main.on('go', function(val) {
	children.cityinput.model.set('cities', [val]);
	
	show('cityinput', 'detail');
});

children.main.on('random', function(val) {
	utils.api('random', {}, function(err, data) {
		children.cityinput.model.set('cities', [utils.createCityLabel(data[0])]);
	});
});

children.cityinput.on('random', function(val) {
	utils.api('random', {}, function(err, data) {
		children.cityinput.model.set('cities', [utils.createCityLabel(data[0])]);
	});
});

children.main.on('compare', function(val) {
	children.cityinput.model.set('cities', val);
	children.comparison.render();
	
	show('cityinput', 'comparison');
});

children.cityinput.on('compare', function(val) {
	console.log(val);
	children.cityinput.model.set('cities', val);
	children.comparison.render();
	
	show('cityinput', 'comparison');
});

children.main.on('preset', function(val) {
	children.list.model.set(val);
	
	show('list');
});

children.list.on('go', function(val) {
	children.cityinput.model.set('cities', [val]);
	
	show('cityinput', 'detail');
});




$('h1').click(function() {
	show('main');
});

utils.api('stats', {}, function(err, data) {
	children.main.model.set('stats', data);
});

//show('cityinput', 'comparison');
show('main');

