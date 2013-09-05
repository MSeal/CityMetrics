
var CityinputView = BaseView.extend({
    template: 'cityinput',
    events: {
    	'click .btn.remove': 'onInputRemove'
    },
    onInputRemove: function(ev) {
    	$(ev.target).parents('.cinput').remove();
    }
});