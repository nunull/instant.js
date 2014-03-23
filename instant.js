/**
 * instant.js
 * 
 * @license MIT
 * @author Timm Albers (http://timmalbers.de)
 * @version 1.0.3
 */
const instant = (function() {
	var model;
	var views = [];
	var renderJobs = [];
	// If true, the next call of render() will be ignored.
	var suppressRendering = false;
	var config = {
		compile: function(source) {
			return Handlebars.compile(source)
		},
		render: function(template, model) {
			return template(model);
		}
	};

	/**
	 * Inititalize Handlebars.
	 */
	(function() {
		Handlebars.registerHelper('blank', function(context, options) {
			return context;
		});
	})();

	/**
	 * Initialize action listeners.
	 */
	(function() {
		$('body').on('input', function(e) {
			console.debug(e);
		});
		// TODO
		// $('body').keyup(function(e) {
		// 	var propertyIndex = 0;

		// 	$('[data-instant-property]').each(function() {
		// 		var propertyName = $(this).attr('data-instant-property');
		// 		var path = propertyName.split('.');

		// 		if($('[data-instant-property="' + propertyName + '"]').length > 1) {
		// 			var tmp = path.pop();
		// 			path.push(propertyIndex++);
		// 			path.push(tmp);
		// 		}
		// 		else propertyIndex = 0;

		// 		var value = model;
		// 		for(var i in path) {
		// 			if(path.length-1 == i) {
		// 				if(value) {
		// 					if(value[path[i]].hasOwnProperty('text')) {
		// 						value[path[i]].setProperty($(this).html());
		// 					} else if(value[path[i]] !== $(this).html()) {
		// 						value[path[i]] = $(this).html();
		// 					}
		// 				}
		// 			} else {
		// 				value = value[path[i]];
		// 			}
		// 		}
		// 	});

		// 	suppressRendering = true;
		// });
	})();

	/**
	 * Attaches a property change listener recursivly to the given object.
	 *
	 * @param <Object> o
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

	// TODO
	/**
	 * Inserts the library specific tags into the DOM.
	 *
	 * @param <String> source
	 * @return <String> result
	 */
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
			} else if(match.indexOf('{{/') === 0) {
				isBlock = true;
				path.pop();
			} else {
				match = '<div data-instant-property="' + path.join('.') + '">' + match + '</div>';
				path.pop();
			}

			return match;
		});

		return source;
	};

	/**
	 * Parse the DOM, search for views and initialize those.
	 */
	var updateViews = function() {
		views = [];

		$('script[type="text/template"]').each(function() {
			views.push({
				name: $(this).attr('data-view'),
				// TODO
				// template: config.compile(insertInstantTags($(this).html()))
				template: config.compile($(this).html())
			});
		});
	};

	/**
	 * Renders the compiled templates.
	 *
	 * @param template (optional)
	 */
	var render = function(template) {
		// console.debug('1');
		if(renderJobs.length && model) {
			for(var i = 0; i < renderJobs.length; i++) {
				var template = renderJobs[i].template;

				if(typeof template === 'function') {
					renderJobs[i].toString = function() {
						return config.render(template, model);
					};
				}
			}

			renderJobs = [];
		}

		if(template) {
			if(model) {
				return config.render(template, model);
			} else {
				var renderJob = {
					template: template
				};
				renderJobs.push(renderJob);

				return renderJob;
			}
		} else if(!suppressRendering) {
			// console.debug('2');
			for(var i in views) {
				var html = config.render(views[i].template, model);
				// console.debug(html);

				$(':not(script)[data-view="' + views[i].name + '"]').each(function() {
					$(this).html(html);
				});
			}
		} else {
			suppressRendering = false;
		}
	};

	return {
		/**
		 * Sets and initializes the model. Can ben used once; or multiple times to overwrite the set model.
		 *
		 * @param <Object> model
		 * @return <Object> instant.js
		 */
		model: function(model_) {
			attachPropertyChangeListener(model_);
			model = model_;

			updateViews();
			render();

			// Return instant for method chaining.
			return instant;
		},

		/**
		 * Sets the compiler function.
		 *
		 * @param <Function> compiler
		 * @return <Object> instant.js
		 */
		compiler: function(compiler) {
			config.compile = compiler;

			// Return instant for method chaning.
			return instant;
		},

		/**
		 * Sets the renderer function.
		 *
		 * @param <Function> renderer
		 * @return <Object> instant.js
		 */
		renderer: function(renderer) {
			config.render = renderer;

			// Return instant for method chaning.
			return instant;
	    },

		/**
		 * Sets the document title.
		 *
		 * @param <String> title
		 * @return <String> title
		 */
		docTitle: function(title) {
			$(document).attr('title', title);
			return title;
		},

		/**
		 * Listens for changes of the current attribute.
		 *
		 * @param <String> att
		 * @param <Function> callback
		 * @return <String> att
		 */
		listen: function(att, callback_) {
			var o = {
				text: att,
				// TODO
				setProperty: function(value) {
					var result = callback_(value);
					if(result) value = result;
					this.text = value;
				},
				toString: function() {
					return this.text;
				}
			};

			// TODO
			(function() {
				var value = att;
				var callback = callback_;
				Object.defineProperty(o, 'text', {
					get: function() {
						return value;
					},
					set: function(value_) {
						console.log('rkwje');
						alert("kj");
						// value = value_;
						
						// callback();
						return value;
					}
				});
			})();

			return o;
		},

		// TODO
		template: function(viewName) {
			updateViews();
			var template = '';
			for(var i in views) {
				if(views[i].name === viewName) template = views[i].template;
			}

			return render(template);
		}
	};
})();