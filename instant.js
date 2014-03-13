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

	/*
	 * Attaches a property change listener recursivly to the given object.
	 */
	var attachPropertyChangeListener = function(o) {
		// Walk through propertys.
		for(var property in o) {
			if(o.hasOwnProperty(property)) {
				// Recursion.
				if(typeof o[property] === 'object') {
					attachPropertyChangeListener(o[property]);
				} else {
					// Atach the listener.
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

	/*
	 * Parse the DOM, search for views and initialize those.
	 */
	var updateViews = function() {
		views = [];

		$('script[type="text/template"]').each(function() {
			views.push({
				name: $(this).attr('data-view'),
				template: config.compile($(this).html())
			});
		});
	};

	/*
	 * Renders the compiled templates.
	 */
	var render = function() {
		for(var i in views) {
			var html = config.render(views[i].template, model);

			$(':not(script)[data-view="' + views[i].name + '"]').each(function() {
				$(this).html(html);
			});
		}
	};

	return {
		/*
		 * Sets and initializes the model. Can ben used once; or multiple times to overwrite the set model.
		 */
		model: function(model_) {
			attachPropertyChangeListener(model_);
			model = model_;

			updateViews();
			render();

			// Return instant for method chaning.
			return instant;
		},

		/*
		 * Sets the compiler function.
		 */
		compiler: function(compiler) {
			config.compile = compiler;

			// Return instant for method chaning.
			return instant;
		},

		/*
		 * Sets the renderer function.
		 */
		renderer: function(renderer) {
			config.render = renderer;

			// Return instant for method chaning.
			return instant;
		}
	};
})();