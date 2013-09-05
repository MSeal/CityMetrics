var DetailView = BaseView.extend({
	template: 'detail',
	events: {
		'click .metricsimilar a': 'onClickSimilar'
	},
	onClickSimilar: function(ev) {
		ev.preventDefault();
		var val = this.model.get('cities').concat([$(ev.target).text()]);
		this.model.set('cities', val);
	}
});