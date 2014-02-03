/*
 * instant.js
 * 
 * Licence: MIT
 * Author:  Timm Albers (http://timmalbers.de)
 * Version: 0.1.0
 */

// TODO test
Handlebars.registerHelper('observe', function(context, options) {
	var ret = '';
	var namespace = JSON.stringify(this)
			.replace('":' + JSON.stringify(context) + '}', '')
			.replace('{"', '');
	
	for(var i=0; i < context.length; i++) {
		ret += options.fn(context[i]);
	}

	ret = ret.replace(/<input/g, '<input data-instant-namespace="' + namespace + '"');

	return ret;
});

var instant = (function() {
	return {
		/*
		 * Encapsulates the controller-functionality.
		 */
		controller: (function() {
			var data;
			var options = {
				/*
				 * Finds scripts with "text/template"-type and returns all found templates.
				 * Can be replaced via instant.controller.init().
				 */
				getTemplates: function() {
					var templateElements = $('script[type="text/template"]');
					var templates = {};

					for(var i = 0, j = templateElements.length; i < j; i++) {
						var e = $(templateElements[i]);
						var classes = e.attr('class').split(' ');
						var template = e.html();

						for(var n = 0, m = classes.length; n < m; n++) {
							classes[n] = classes[n].replace('template.', '');
							templates[classes[n]] = template;
						}
					}

					return templates;
				},

				/*
				 * Compiles a template.
				 * Can be replaced via instant.controller.init().
				 */
				compile: function(template, data) {
					return Handlebars.compile(template)(data);
				},

				renderCallback: null
			};

			return {
				/*
				 * Sets up everything.
				 */
				init: function(data_, options_) {
					if(data_) data = data_;

					if(options_) {
						for(var key in options_) {
							options[key] = options_[key];
						}
					}

					/*
					 * Register a handler-function for changes made to the DOM.
					 */
					instant.observer.register(function(subject) {
						var index = subject.element.index() / 2; // TODO
						var namespace = subject.element.attr('data-instant-namespace'); // TODO
						
						for(var key in data[namespace][index]) {
							if(data[namespace][index][key] == subject.prevValue) {
								data[namespace][index][key] = subject.getValue();
							}
						}
					});
				},

				/*
				 * Calls options.getTemplates(), compiles the template, updates the DOM and rebuilds the actions. 
				 */
				render: function() {
					var templates = options.getTemplates();

					for(var key in templates) {
						var html = options.compile(templates[key], data);

						$('.' + key).each(function() {
							if($(this).attr('type') !== 'text/template') $(this).html(html);
						});
					}

					instant.actions.rebuild();
					this.parseDOM();
					if(typeof options.renderCallback === 'function') options.renderCallback();
				},

				/*
				 * Parses the DOM, gets changable elements
				 */
				parseDOM: function() {
					instant.observer.reset();

					$('input').each(function() {
						instant.observer.add($(this));
					});
				}
			};
		})(),

		/*
		 * Encapsulates eveything for observing the DOM for changes.
		 */
		observer: (function() {
			var subjects = [];
			var listeners = [];

			/*
			 * Attaches the handler-function to DOM-events.
			 */
			var init = function() {
				$(document).keyup(onchange);
			};

			/*
			 * Handles changes in the DOM.
			 */
			var onchange = function(e) {
				for(var i = 0; i < subjects.length; i++) {
					if(subjects[i].prevValue !== subjects[i].getValue()) {
						notifyListeners(subjects[i]);

						subjects[i].prevValue = subjects[i].getValue();
					}
				}
			};

			/*
			 * 
			 */
			var notifyListeners = function(subject) {
				for(var i = 0; i < listeners.length; i++) {
					if(typeof listeners[i] === 'function') {
						listeners[i](subject);
					}
				}
			};

			init();

			return {
				reset: function() {
					subjects = [];
				},

				/*
				 * 
				 */
				add: function(subject) {
					if(typeof subject.element !== 'object') {
						subject = {
							element: subject,
							getValue: function() {
								return this.element.val();
							},
							prevValue: null
						};
					}

					subject.prevValue = subject.getValue();
					subjects.push(subject);
				},

				/*
				 * 
				 */
				register: function(listener) {
					if(typeof listener === 'function') {
						listeners.push(listener);

						return true;
					} else {
						return false;
					}
				}
			};
		})(),

		/*
		 * Encapsulates everything regarding actions.
		 */
		actions: (function() {
			/*
			 * The CSS-class-seperator for representing paths.
			 */
			var seperator = '\\.'; // TODO

			/*
			 * Adds the given actions to the DOM.
			 */
			var initDOM = function(object, parentSelector) {
				if(!parentSelector) parentSelector = [];
				
				/*
				 * Go through listeners.
				 */
				for(var key in object) {
					// Clone array.
					var selector = [].concat(parentSelector);
					selector.push(key);

					// We have a handler-function or -object (with .handler-function) here.
					if(typeof object[key] === 'function' || (typeof object[key].handler === 'function')) {
						// Build the click-handler.
						var click = (function() {
							// Get the specific handler.
							var handler = object[key] === 'function' ? object[key] : object[key].handler;
							// Get the subject. (The "parent"-object.)
							var subject = selector[selector.length-2];

							/*
							 * The concrete handler-function.
							 */
							return function(e) {
								// The DOM-element.
								var item = $(this);
								if(!$(this).hasClass(subject)) {
									item = item.closest('.' + subject);
								}

								// Get identical DOM-elements on the same DOM-layer.
								var elements = item.parent().children();
								var index = elements.index(item);

								// Call the given handler.
								handler(index);
							};
						})();
						// Add the built click-handler to the DOM.
						$('.actions' + seperator + selector.join(seperator)).click(click);

						// Check, if the given object should have a key-handler.
						if(object[key].key) {
							// Build keyboard-handlers.
							var concreteKeyHandler = (function() {
								// Get the specific handler.
								var handler = typeof object[key] === 'function' ? object[key] : object[key].handler;
								// Get the function for getting the index of the DOM-element on the same DOM-layer.
								var getIndex = typeof object[key].getIndex === 'function' ? object[key].getIndex : function() {return -1;};
								var keyCode = object[key].key;

								return function() {
									// Call the given handler.
									handler(getIndex());
								};
							})();

							// Save the built handler in keys, so that it can be called later.
							keys[object[key].key] = {};
							var obj = keys[object[key].key];
							for(var i = 0; i < selector.length; i++) {
								obj[selector[i]] = {};
								obj = obj[selector[i]]
							}
							obj.handler = concreteKeyHandler;
						}

					} else if(typeof object[key] === 'object') {
						// Recursive call.
						initDOM(object[key], selector);
					} 
				}
			};

			var keys = {};
			var keyHandler = function(e) {
				var cur = keys[e.keyCode];

				/*
				 * Invokes all handlers attached for a key.
				 */
				var invoke = function(obj) {
					for(var key in obj) {
						if(obj[key].handler) obj[key].handler();
						else invoke(obj[key]);
					}
				};

				if(cur) {
					invoke(cur);
				}
			};
			// Add the key-handler to the DOM.
			$(document).keydown(keyHandler);

			return {
				/*
				 * Initialize the actions.
				 */
				init: function(handlers) {
					this.invoke = handlers;
					initDOM(handlers);
				},

				/*
				 * Rebuilds the actions. Should be called after updating the DOM.
				 */
				rebuild: function() {
					initDOM(this.invoke);
				},

				/*
				 * Placeholder-object for given handlers.
				 */
				invoke: {}
			};
		})()
	};
})();