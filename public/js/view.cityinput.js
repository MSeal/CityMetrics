
var CityinputView = BaseView.extend({
    template: 'cityinput',
    events: {
    	'click .btn.remove': 'onInputRemove',
    	'keyup input[type="text"]': 'onInputKeyup',
    	'keydown input': 'onKeydown',
    	'click .go': 'onGo',
		'click .random': 'onRandom'
    },
    onRender: function() {
    	utils.createAutocomplete(this.$el.find('input'));
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
    		utils.createAutocomplete(clone.find('input'));
    		cinput.after(clone);
    	}
    },
    onGo: function() {
		var vals = this.$el.find('input').map(function() {return $(this).val()}).toArray().filter(function(x) {return x});
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
	}
});