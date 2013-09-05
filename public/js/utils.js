
var utils = {
	createAutocomplete: function(els) {
		els.autocomplete({
	      source: '/api/autocomplete',
	      minLength: 1
	      /*select: function( event, ui ) {
	        log( ui.item ?
	          "Selected: " + ui.item.value + " aka " + ui.item.id :
	          "Nothing selected, input was " + this.value );
	      }*/
	    });
	},
	createCityLabel: function(x) {
		var label = [x.name],
	        place = x.state ? x.state : x.country;
	    if (place) {
	      label.push(place);
	    }

	    return label.join(', ');
	},
	api: function(uri, args, cb) {
		$.getJSON('/api/'+uri, args, function(data) {
			cb(null, data);
		});
	}
};