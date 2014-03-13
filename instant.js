/*
 * instant.js
 * 
 * Licence: MIT
 * Author:  Timm Albers (http://timmalbers.de)
 * Version: 1.0.0
 */

var instant = (function() {
	var model = {};
	var views = [];
	var config = {
		compile: function(source) {
			return Handlebars.compile(source)
		},
		render: function(template, model) {
			return template(model);
		}
	};

	var attachPropertyChangeListener = function(o) {
		for(var property in o) {
			if(o.hasOwnProperty(property)) {
				if(typeof o[property] === 'object') {
					attachPropertyChangeListener(o[property]);
				} else {
					(function() {
						var value = o[property];
						Object.defineProperty(o, property, {
							get: function() {
								return value;
							},
							set: function(value_) {
								value = value_
								render();
								return value;
							}
						});
					})();
				}
			}
		}
	};

	var updateViews = function() {
		views = [];

		$('script[type="text/template"]').each(function() {
			views.push({
				name: $(this).attr('data-view'),
				template: config.compile($(this).html())
			});
		});
	};

	var render = function() {
		for(var i in views) {
			var html = config.render(views[i].template, model);
			// alert(html);

			$(':not(script)[data-view="' + views[i].name + '"]').each(function() {
				$(this).html(html);
			});
		}
	};

	return {
		model: function(model_) {
			attachPropertyChangeListener(model_);
			model = model_;

			updateViews();
			render();

			return instant;
		},

		renderer: function(renderer) {
			return instant;
		}
	};
})();