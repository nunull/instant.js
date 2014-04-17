/**
 * instant.js
 * 
 * @license MIT
 * @author Timm Albers (http://timmalbers.de)
 * @version 1.0.7
 */
const instant = (function() {
	var model;
	var views = [];
	var renderJobs = [];
	var config = {
		compile: function(source) {
			return Handlebars.compile(source)
		},
		render: function(template, model) {
			return template(model);
		}
	};
	var instantDOM = (function() {
		var updateDOM = function(element, newDOM) {
			var $element = $(element),
				$children = $element.children(),
				oldDOM = $element.html();
				oldElementTree = getElementTree(oldDOM),
				newElementTree = getElementTree(newDOM);

			var offset = 0;
			for(var i = 0, j = newElementTree.length; i < j; i++) {
				var transformations = compareNodes(newElementTree[i + offset], oldElementTree[i - offset]);

				if(transformations) { 
					if(transformations[0] && transformations[0].type === 'nodeName') {
						// Insert node
						$children.eq(i).after(renderNode(transformations));

						offset++;
						j++;
					}

					for(var n = 0, m = transformations.length; n < m; n++) {
						// Update HTML
						if(transformations[n].type === 'html') {
							$children.eq(i).html(transformations[n].newValue);

						// Update attributes
						} else if(transformations[n].type === 'attribute') {
							// Update attribute
							if(transformations[n].value !== null) {
								$children.eq(i).attr(transformations[n].key, transformations[n].value);

							// Remove attribute
							} else {
								$children.eq(i).removeAttr(transformations[n].key);
							}
						}
					}
				} else {
					if(oldElementTree[i - offset]) {
						// Delete node
						$children.eq(i - offset).remove();
					}
					if(newElementTree[i]) {
						// Append node
						$element.append(newElementTree[i].source);
					}
				}
			}
		};

		var getElementTree = function(dom) {
			var nodes = [],
				offset = 0,
				nextDomNode = {};

			nextDomNode = getNextNode(dom, offset);
			while(nextDomNode) {
				offset = nextDomNode.endIndex;
				nodes.push(nextDomNode);

				nextDomNode = getNextNode(dom, offset);
			}

			console.log(nodes);

			return nodes;
		};

		var getNextNode = function(dom, offset) {
			if(!offset) offset = 0;

			var slicedDOM = dom.slice(offset),
				startIndex = slicedDOM.search(/<[^\/]*>/),
				headerEndIndex = slicedDOM.search(/>/),
				header = slicedDOM.slice(startIndex, headerEndIndex).replace('<', '').split(' '),
				nodeName = header[0],
				endIndex = slicedDOM.search('</' + nodeName + '>') + ('</' + nodeName + '>').length,
				source = slicedDOM.slice(startIndex, endIndex),
				attributes = [],
				html = slicedDOM.slice(headerEndIndex + 1, endIndex - ('</' + nodeName + '>').length),
				text = html.replace(/<.*>.*<\/[^\/]*>/, '');

			for(var i = 1, j = header.length; i < j; i++) {
				var parts = header[i].split('=');

				attributes.push({
					key: parts[0],
					value: parts[1].replace(/"/g, '')
				});
			}

			if(startIndex !== -1) {
				return {
					startIndex: offset + startIndex,
					endIndex: offset + endIndex,
					nodeName: nodeName,
					attributes: attributes,
					html: html,
					text: text,
					source: source,
					children: getElementTree(html)
				};
			}
		};

		var compareNodes = function(newNode, oldNode) {
			if(newNode && oldNode) {
				var newNodeAttributes = newNode.attributes,
					oldNodeAttributes = oldNode.attributes,
					transformations = [];

				if(newNode.nodeName !== oldNode.nodeName) {
					transformations.push({
						type: 'nodeName',
						oldValue: oldNode.nodeName,
						newValue: newNode.nodeName
					});
				}
				if(newNode.html !== oldNode.html) {
					transformations.push({
						type: 'html',
						oldValue: oldNode.html,
						newValue: newNode.html
					});
				}

				// Add missing attributes
				for(var i = 0, j = newNodeAttributes.length; i < j; i++) {
					var isSynced = false;
					for(var n = 0, m = oldNodeAttributes.length; n < m; n++) {
						isSynced = newNodeAttributes[i].key === oldNodeAttributes[n].key &&
								newNodeAttributes[i].value === oldNodeAttributes[n].value;
					}

					if(!isSynced) {
						transformations.push({
							type: 'attribute',
							key: newNodeAttributes[i].key,
							value: newNodeAttributes[i].value
						});
					}
				}

				// Remove unused attributes
				for(var i = 0, j = oldNodeAttributes.length; i < j; i++) {
					var isUnused = true;
					for(var n = 0, m = newNodeAttributes.length; n < m; n++) {
						if(newNodeAttributes[i]) {
							isUnused = newNodeAttributes[i].key !== oldNodeAttributes[n].key;
						}
					}

					if(isUnused) {
						transformations.push({
							type: 'attribute',
							key: oldNodeAttributes[i].key,
							value: null
						});
					}
				}

				return transformations;
			} else {
				return undefined;
			}
		};

		var renderNode = function(transformations) {
			var nodeHTML = '<' + transformations[0].newValue;
			var htmlBody = '';

			for(var i = 1, j = transformations.length; i < j; i++) {
				if(transformations[i].type === 'attribute' && transformations[i].value) {
					nodeHTML += ' ' + transformations[i].key + '="' + transformations[i].value + '"';
				} else if(transformations[i].type === 'html') {
					htmlBody = transformations[i].newValue;
				}
			}

			nodeHTML += '>' + htmlBody + '</' + transformations[0].newValue + '>';

			return nodeHTML;
		};

		return {
			updateDOM: updateDOM
		};
	})();

	/**
	 * Initialize action listeners.
	 */
	(function() {
		$('body').on('input', function(e) {
			var $focusedElement = $(':focus'),
				focusedElementId = $focusedElement.attr('data-instant-id'),
				caretPosition = $focusedElement.caret(),
				$target = $(e.target),
				path = $target.attr('data-instant-attribute')
					.split('.'),
				newValue = $target.text() || $target.val();
			
			// Update model.
			var value = model;
			var arrayCount = 0;
			for(var i in path) {
				if(path.length-1 == i) {
					if(value) {
						if(value[path[i]].hasOwnProperty('text')) {
							value[path[i]].setProperty(newValue);
						} else if(value[path[i]] !== newValue) {
							value[path[i]] = newValue;
						}
					}
				} else {
					value = value[path[i]];
					var containerCount = $target.parents('[data-container]').length;

					if(Array.isArray(value)) {
						var index = 0;
						
						$target.parents('[data-container]').eq((containerCount-1)-arrayCount).find('[data-bind-value], [data-bind-text]').each(function() {
							if($(this).is($target)) {
								value = value[index];
							}

							index++;
						});

						arrayCount++;
					}
				}
			}

			$focusedElement = $('[data-instant-id=' + focusedElementId + ']');
			$focusedElement.focus().caret(caretPosition);
		});
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
					// Attach the listener.
					(function() {
						var value = o[property];
						Object.defineProperty(o, property, {
							get: function() {
								return value;
							},
							set: function(value_) {
								value = value_;
								
								// Ensure that every attribute (i.e. new added array elements) has listeners attached.
								attachPropertyChangeListener(model);
								render();
								return value;
							}
						});
					})();
				}
			}
		}
	};

	/**
	 * Inserts the library specific tags into the DOM.
	 *
	 * @param <String> source
	 * @return <String> result
	 */
	var insertInstantAttributes = function(source) {
		source = source.replace(/.[^<]*data-bind-.[^>]*>({{.*}})*/g, function(match, a, offset, original) {
			var path = [],
				previous = original.substr(0, offset);
			
			var oldPrevious = '';
			while(oldPrevious !== previous) {
				oldPrevious = previous;
				previous = previous.replace(/{{#.[^}]*}}[^}}]*{{\/.[^{{#]*}}/g, '');
			}

			var splits = previous.split('{{#');
			splits.shift();
			for(var i in splits) {
				var parts = splits[i].split('}}')[0].split(' ');
				path.push(parts[parts.length-1]);
			}

			var attributeName = match
					.replace(/.*\{\{/, '')
					.replace(/\}\}.*/, '');
			path.push(attributeName);

			return match
					.replace(/>/, ' data-instant-attribute="' + path.join('.') + '">')
					.replace(/>/, ' data-instant-id="' + ('' + Math.random()).replace(/0./, '') + '">');
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
				template: config.compile(insertInstantAttributes($(this).html()))
			});
		});
	};

	/**
	 * Renders the compiled templates.
	 *
	 * @param template (optional)
	 */
	var render = function(template) {
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
		} else {
			var instantIds = {};

			for(var i in views) {
				var html = config.render(views[i].template, model);

				$(':not(script)[data-view="' + views[i].name + '"]').each(function() {
					html = html.replace(/data-instant-id=".[^"]*"/g, function(match) {
						var parts = match.split('"'),
							instantId = parts[1];

						if(!instantIds[instantId]) instantIds[instantId] = 0;
						instantIds[instantId]++;

						if(instantIds[instantId] > 0) {
							parts[1] = instantId + instantIds[instantId];
							match = parts.join('"');
						}

						return match;
					});

					instantDOM.updateDOM($(this), html);
					// $(this).html(html);
				});
			}
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
		 * Called after the model has changed.
		 */
		change: function(callback) {
			// TODO
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