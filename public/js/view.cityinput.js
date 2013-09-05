
var CityinputView = BaseView.extend({
    template: 'cityinput',
    events: {
    	'click .btn.remove': 'onInputRemove',
    	'keyup input[type="text"]': 'onInputKeyup',
    	'keydown input': 'onKeydown',
    	'click .go': 'onGo',
		'click .random': 'onRandom'
    },
    onInputRemove: function(ev) {
    	if (this.$el.find('input').length > 1) {
    		$(ev.target).parents('.cinput').remove();
    	} else {
    		$(ev.target).parents('.cinput').find('input').val('');
    	}
    	this.onInputKeyup();
    },
    onInputKeyup: function(ev) {
    	var input = this.$el.find('input').last();
    	if (input.val()) {
    		var cinput = input.parents('.cinput'),
    			clone = cinput.clone();
    		clone.find('input').val('');
    		cinput.after(clone);
    	}
    },
    onGo: function() {
		var vals = this.$el.find('input').map(function() {return $(this).val()}).filter(function(x) {return x});
		this.trigger('compare', vals);
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
});