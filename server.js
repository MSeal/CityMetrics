_ = require("underscore")

var cfg = {
	port: 3000,
	mysql: {
	  host     : 'localhost',
	  user     : 'root',
	  password : 'toor',
	  database : 'metrics'
	},
	table: 'cityPrimaryStats'
};

var express = require('express'),
	mysql = require('mysql');

var app = express(),
	connection = mysql.createConnection(cfg.mysql);

//connection.connect();

app.use(express.static(__dirname + '/public'));

// list cities and specified metric - allows for "10 largest cities" etc.
app.get('/api/listmetric', function(req, res) {
	var metric = req.query.metric,
		sort = req.query.sort || 'name',
		order = req.query.order === 'asc' ? 'ASC' : 'DESC',
		limit = parseInt(req.query.limit) || 10;

	var q = 'SELECT * FROM ?? WHERE country = \'United States\' AND ?? IS NOT NULL ORDER BY ?? '+order+' LIMIT ?',
		args = [cfg.table, sort, sort, limit];

	console.log(q, args);

	connection.query(q, args, function(err, results) {
			res.send(results);
	});
});

// list cities for specified US state
app.get('/api/liststate', function(req, res) {
	var state = req.query.state,
		order = req.query.order === 'desc' ? 'DESC' : 'ASC',
		limit = parseInt(req.query.limit) || 10;

	connection.query(
		'SELECT name FROM ?? WHERE state = ? ORDER BY name '+order+' LIMIT ?',
		[cfg.table, state, limit],
		function(err, results) {
			res.send(results);
	});
});

app.get('/api/stats', function(req, res) {
	connection.query("select count(*) as result from INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'metrics' AND COLUMN_NAME NOT IN ('id', 'cityId')",
		function(err, metrics) {
			connection.query('select count(*) as result from ??', [cfg.table], function(err, cities) {
				connection.query('select count(distinct country) as result from cityPrimaryStats',function(err, countries) {
					res.send({
						metrics: metrics[0].result,
						cities: cities[0].result,
						countries: countries[0].result
					});
				});
			});
	});
});

function createCityWhere(input) {
	var parts = input.split(',').map(function(x) { return x.replace(/^\s+|\s+$/g, '')}).filter(function(x) {return x});

	var q = '(name COLLATE UTF8_GENERAL_CI LIKE '+connection.escape(parts[0]+'%');

	if (parts.length === 2) {
		q += ' AND (state COLLATE UTF8_GENERAL_CI LIKE '+connection.escape(parts[1]+'%')+' OR country COLLATE UTF8_GENERAL_CI LIKE '+connection.escape(parts[1]+'%')+')';
	} else if (parts.length === 3) {
		q += ' AND state COLLATE UTF8_GENERAL_CI LIKE '+connection.escape(parts[1]+'%')+' AND country COLLATE UTF8_GENERAL_CI LIKE '+connection.escape(parts[2]+'%');
	}

	q += ')';

	return q;
}

// list cities for autocomplete
app.get('/api/autocomplete', function(req, res) {
	var input = req.query.term.toLowerCase(),
		limit = parseInt(req.query.limit) || 20;

	var q = 'SELECT * FROM ?? WHERE '+createCityWhere(input)+' LIMIT ?',
		args = [cfg.table, limit];

	console.log(q, args);

	connection.query(q, args,
		function(err, results) {
			res.send(results.map(function(x) {
		        var label = [x.name],
		            place = x.state ? x.state : x.country;
		        if (place) {
		          label.push(place);
		        }
		        return label.join(', ');
		      }));
	});
});

// list metrics for specified cities
app.get('/api/compare', function(req, res) {
	var cities = req.query.cities,
		limit = parseInt(req.query.limit) || 50,
		q = 'SELECT * FROM ?? WHERE '+cities.map(createCityWhere).join(' OR ')+' LIMIT ?',
		args = [cfg.table, limit];

	console.log(q, args);

	connection.query(q, args,
		function(err, results) {
			res.send(results);
	});
});

// list metrics for specified cities
app.get('/api/metric', function(req, res) {
	var field = req.query.field,
		city = parseInt(req.query.id),
		limit = parseInt(req.query.limit) || 10;

    console.log(field, city, limit)
	connection.query(
		'SELECT ?? FROM ?? WHERE id = ?',
		[field, cfg.table, city],
		function(err, results) {
			if (_.isEmpty(results)) {
				res.send([]);
			}
			value = results[0][field]
			console.log("value", value)
			if (_.isNumber(value)) {
				connection.query(
					'SELECT * FROM ?? WHERE ?? IS NOT NULL ORDER BY ABS(?? - ?) LIMIT ?',
					[cfg.table, field, field, value, limit],
					function(err, results) {
						res.send(results);
					}
				);
			} else {
				connection.query(
					'SELECT * FROM ?? WHERE ?? = ? LIMIT ?',
					[cfg.table, field, value, limit],
					function(err, results) {
						res.send(results);
					}
				);
			}
		}
	);
});

app.listen(cfg.port);
console.log('Listening on port '+cfg.port);
