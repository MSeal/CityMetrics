
var BaseView = Backbone.View.extend({
	initialize: function() {
		this.model.on('change', function() {
			this.render();
		}.bind(this));
	},
	render: function() {
		if (!this._template) {
			this._template = _.template($('#template-'+this.template).html());
		}
		this.$el.html(this._template(this.model ? this.model.toJSON() : {}));
		if (this.onRender) {
			this.onRender();
		}
	}
});