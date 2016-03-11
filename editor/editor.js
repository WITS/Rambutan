output_console_calls = true; // Show console calls in the output

document.addEventListener("DOMContentLoaded", function() {
	output = new Output();
	editor = ace.edit("editor");
	editor.setTheme("ace/theme/twilight");
	editor.getSession().setMode("ace/mode/lisp");
	{
		var l = console.log;
		console.log = function() {
			output.log(arguments[0]);
			l.apply(this, arguments);
		}
	}
});
document.addEventListener("keydown", function(event) {
	if (event.which == 116) {
		event.preventDefault();
		handle_run();
	}
});

Output = function() {
	this.element = document.querySelector("#output");
}

Output.prototype.clear = function() {
	this.element.innerHTML = "";
}

Output.prototype.log = function(val) {
	var elem = document.createElement("div");
	elem.className = "value";
	if (val === null) {
		elem.className += " nil";
		elem.appendChild(document.createTextNode("nil"));
	} else if (val === true) {
		elem.className += " true";
		elem.appendChild(document.createTextNode("t"));
	} else if (typeof val === 'number') {
		elem.className += " number";
		elem.appendChild(document.createTextNode(val));
	} else if (typeof val === 'string') {
		elem.className += " string";
		elem.appendChild(document.createTextNode(val));
	} else if (val instanceof RambutanAtom) {
		elem.className += " atom";
		elem.appendChild(document.createTextNode(val.toString()));
	} else if (val instanceof RambutanList) {
		elem.className += " list apostrophe";
		var highlight = function(p_elem, list) {
			for (var x = 0, y = list.length; x < y; ++ x) {
				var val = list[x];
				var elem = document.createElement("span");
				elem.className = "value";
				if (val === null) {
					elem.className += " nil";
					elem.appendChild(document.createTextNode("nil"));
				} else if (val === true) {
					elem.className += " true";
					elem.appendChild(document.createTextNode("t"));
				} else if (typeof val === 'number') {
					elem.className += " number";
					elem.appendChild(document.createTextNode(val));
				} else if (typeof val === 'string') {
					elem.className += " string";
					elem.appendChild(document.createTextNode(val));
				} else if (val instanceof RambutanAtom) {
					elem.className += " atom";
					elem.appendChild(document.createTextNode(val.toString()));
				} else if (val instanceof RambutanList) {
					elem.className += " list";
					if (elem.apostrophe) elem.className += " apostrophe";
					highlight(elem, val);
				}
				p_elem.appendChild(elem);
			}
		}
		highlight(elem, val);
	}
	this.element.appendChild(elem);
}

// Override the default log function from web.js
LISP.defun("log", function() {
	var v_str = null;
	for (var x = 0, y = arguments.length; x < y; ++ x) {
		var v = arguments[x];
		var v_str = v && typeof v === 'object' ? v.toString() : v;
		console.log(v);
	}
	return v_str;
});

function handle_run() {
	output.clear();
	LISP.eval(editor.getValue());
}