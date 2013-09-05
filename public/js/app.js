

var api = function(uri, args, cb) {
	$.getJSON('/api/'+uri, args, function(data) {
		cb(null, data);
	});
};

var views = 'Main Detail List Comparison Cityinput'.split(' ');

var children = {};

views.forEach(function(x) {
	var view = new window[x+'View']({
		el: '#'+x.toLowerCase(),
		model: new Backbone.Model()
	});
	view.$el.hide();
	children[x.toLowerCase()] = view;
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

children.list.model.set({
	metrics: [
		//{"name":"type","label":"type"},

		{"name":"population","label":"Population"},
		{"name":"populationMetro","label":"Population Metro"},
		{"name":"populationDensity","label":"Population Density"},
		
		{"name":"country","label":"Country"},
		{"name":"state","label":"State"},
		{"name":"region","label":"Region"},
		{"name":"district","label":"District"},

		{"name":"area","label":"Area"},
		{"name":"areaLand","label":"Area Land"},
		{"name":"areaTotal","label":"Area Total"},
		{"name":"areaWater","label":"Area Water"},

		{"name":"elevation","label":"Elevation"}

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
	order: 'valueDesc'
});


var presets = [
	  {
	    color: '#4C9BD4',
	    label: 'Largest cities',
	    cities: ['cityname','cityname','cityname','cityname','cityname'],
	    preset: 'area,valueDesc'
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
	    preset: 'area,valueAsc'
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
	api('listmetric', q, function(err, data) {
		presets[i].cities = data;
		if (--presetnum <= 0) {
			children.main.model.set('presets', presets);
		}
	});
});

children.main.model.set({
	'presets': [],
	'stats': {
	  "metrics": '',
	  "cities": '',
	  "countries": ''
	}
});



children.cityinput.model.on('change:cities', function() {
	children.detail.model.set('cities', children.cityinput.model.get('cities'));
	children.comparison.model.set('cities', children.comparison.model.get('cities'));
});

children.list.model.on('change', function(model) {
	if ('order' in model.changed || 'sort' in model.changed) {
		var q = {
			sort: model.get('order').match(/^value/) ? model.get('sort') : 'name',
			order: model.get('order').match(/Asc$/) ? 'asc' : 'desc',
			limit: 20
		};
		api('listmetric', q, function(err, data) {
			children.list.model.set('values', data);
		});
	}
});


children.main.on('go', function(val) {
	children.cityinput.model.set('cities', [val]);
	
	show('cityinput', 'detail');
});

children.main.on('random', function(val) {
	//children.detail.model.set('cities', [val]);
	
	show('cityinput', 'detail');
});

children.main.on('compare', function(val) {
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


children.cityinput.model.set('cities', []);
children.list.model.set('values', []);

api('stats', {}, function(err, data) {
	children.main.model.set('stats', data);
});

//show('cityinput', 'comparison');
show('main');

