![](http://timmalbers.de/instant.js/res/logo.medium.small.png)
==========

A lightweight client side MVC framework using [handlebars.js](http://handlebarsjs.com/) and [jQuery](http://jquery.com/). Keeps your data and the DOM in sync.

### Sideproject

**instant.dom.js**: [GitHub](https://github.com/nunull/instant.dom.js)

Usage
-----

1. Include dependencies:

		<script type="text/javascript" src="jquery.min.js"></script>
		<script type="text/javascript" src="jquery.caret.js"></script>
		<script type="text/javascript" src="handlebars.js"></script>
		<script type="text/javascript" src="instant.js"></script>

2. Define your model:

		var model = {
			title: instant.docTitle('instant.js'),
			text: 'A lightweight client side framework.'
		};
		instant.model(model);

### Templating

	<div data-view="main"></div>

	<script type="text/template" data-view="main">
		<h1>{{title}}</h1>
		<span>{{text}}</span>
	</script>

### Updating the DOM from model

*instant.js* will automatically rerender, if you update your model.

**Example:** `model.text = 'Some new text.'`

### Updating the model from the DOM

*instant.js* will automatically update your model, if you specify a `data-bind-*` attribute on a DOM element and change its value / text.

**Example with input-field:** `<input type="text" value="{{text}}" data-bind-value>` (Use `data-bind-value` attribute without a value)

**Example with `contenteditable`:** `<span contenteditable="true" data-bind-text>{{text}}</span>` (Use `data-bind-text` attribute without a value)

### Listening for value changes of an attribute

	var model = {
		title: instant.docTitle('instant.js'),
		text: instant.listen('A lightweight client side framework.', function(newValue) {
			console.log(newValue)
		})
	};
	instant.model(model);
