/*
 * instant.js
 * 
 * Licence: MIT
 * Author:  Timm Albers (http://timmalbers.de)
 * Version: 1.0.1
 */
const instant = (function() {
	var model = {};
	var views = [];
	var suppressRendering = false;
	var config = {
		compile: function(source) {
			return Handlebars.compile(source)
		},
		render: function(template, model) {
			return template(model);
		}
	};

	// Inititalize Handlebars.
	(function() {
		Handlebars.registerHelper('', function(options) {
			alert('tejkl');
		});
	})();

	// Initialize action listeners.
	(function() {
		$('body').keyup(function(e) {
			var propertyIndex = 0;

			$('[data-instant-property]').each(function() {
				var propertyName = $(this).attr('data-instant-property');
				var path = propertyName.split('.');

				if($('[data-instant-property="' + propertyName + '"]').length > 1) {
					var tmp = path.pop();
					path.push(propertyIndex++);
					path.push(tmp);
				}
				else propertyIndex = 0;

				var value = model;
				for(var i in path) {
					if(path.length-1 == i) {
						if(value[path[i]] !== $(this).html()) value[path[i]] = $(this).html();
					} else {
						value = value[path[i]];
					}
				}
			});

			suppressRendering = true;
		});
	})();

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

	var insertInstantTags = function(source) {
		var path = [];
		var blockIndex;

		source = source.replace(/{{.[^}}]*}}/g, function(match) {
			var isBlock = false;
			path.push(match.replace('{{', '').replace('}}', ''));

			if(match.indexOf('{{#') === 0) {
				isBlock = true;
				var parts = match.split(' ');
				var blockName;
				if(parts.length > 1) blockName = (parts[1]).replace('}}', '');
				else blockName = match.replace('{{#', '').replace('}}', '');

				path.pop();
				path.push(blockName);

				// match = '<div data-instant-property="' + path.join('.') + '">' + match;
			} else if(match.indexOf('{{/') === 0) {
				isBlock = true;
				path.pop();

				// match = match + '</div>';
			} else {
				match = '<div data-instant-property="' + path.join('.') + '">' + match + '</div>';
				path.pop();
			}

			return match;
		});

		return source;
	};

	/*
	 * Parse the DOM, search for views and initialize those.
	 */
	var updateViews = function() {
		views = [];

		$('script[type="text/template"]').each(function() {
			views.push({
				name: $(this).attr('data-view'),
				template: config.compile(insertInstantTags($(this).html()))
			});
		});
	};

	/*
	 * Renders the compiled templates.
	 */
	var render = function() {
		if(!suppressRendering) {
			for(var i in views) {
				var html = config.render(views[i].template, model);

				$(':not(script)[data-view="' + views[i].name + '"]').each(function() {
					$(this).html(html);
				});
			}
		} else {
			suppressRendering = false;
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

			// Return instant for method chaining.
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