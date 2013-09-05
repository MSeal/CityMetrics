
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

	var q = 'SELECT * FROM ?? WHERE country = \'United States\' ORDER BY ?? '+order+' LIMIT ?',
		args = [cfg.table, sort, limit];

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

// list metrics for specified cities
app.get('/api/compare', function(req, res) {

});

app.listen(cfg.port);
console.log('Listening on port '+cfg.port);
