/*
Rambutan.js - a LISP interpreter designed for the modern web

The MIT License (MIT)

Copyright (c) 2016 Ian Jones

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// Each instance of Rambutan serves as an independent LISP interpreter
Rambutan = function() {
	this.namespace = new Object();
	this.delayed = ["let", "set", "setq"];
	// Define the defining function
	var _this = this;
	this.namespace.defun = function() {
		_this.namespace[this[0]] = RambutanFunction({
			args: this[1],
			body: this.slice(2)
		});
	}
	// Define the GLOBAL variable setting function
	this.namespace.set = function() {
		var symbol = arguments[0];
		if (symbol instanceof RambutanAtom ||
			symbol instanceof RambutanList) {
			symbol = symbol.delayedEvaluate();
		}
		if (symbol != null) symbol = symbol.toString();
		var result = arguments[1];
		if (arguments[1] instanceof RambutanList) {
			result = arguments[1].delayedEvaluate();
		}
		_this.namespace[symbol] = result;
		return result;
	}
	// Equivalent to (set (quote [symbol]) [value])
	this.namespace.setq = function() {
		var result = arguments[1];
		if (arguments[1] instanceof RambutanList) { 
			result = arguments[1].delayedEvaluate();
		}
		_this.namespace[arguments[0].symbol] = result;
		return result;
	}
	// Define the LOCAL variable setting function
	this.namespace.let = function() {
		// Set temporary variables
		for (var i = arguments[0].length; i --; ) {
			var pair = arguments[0][i];
			if (pair instanceof RambutanList) { // Pair
				this.namespace[pair[0].symbol] = pair[1];
			} else { // Symbol
				this.namespace[pair[0].symbol] = null;
			}
		}
		// Execute the body
		var result = null;
		for (var x = 1, y = arguments.length; x < y; ++ x) {
			var arg = arguments[x];
			arg.parent = this;
			// TODO: Make delayedEvaluate work with RambutanAtom
			if (!(arg instanceof RambutanList)) { 
				result = arg;
				continue;
			}
			result = arg.delayedEvaluate();
		}
		// Clear the namespace and return the value of the last line
		this.namespace = new Object();
		return result;
	}
	// Any of these functions can be renamed via JS or interpreted LISP
}

// Evaluate (interpret) a (JavaScript) string of LISP code
Rambutan.prototype.eval = function(code) {
	for (var x = 0, // The index of the current character
		y = code.length, // The length of this string of code
		base_list = null, // The first-level list
		cur_list = null, // The list that this atom is inside of
		quote = false, // Are we inside of a string?
		comment = false, // Are we inside a comment?
		atom_index = -1, // The index of the current atom (or list)
		atom = null, // The current atom object / primitive
		p_level = 0 // Parentheses level
		; x < y; ++ x) {
		var char = code[x];
		var charCode = code.charCodeAt(x);

		// Comments
		if (comment && char !== '\n') continue;
		if (comment) {
			comment = false;
			continue;
		}
		if (!quote && char === ';') {
			comment = true;
			continue;
		}

		// Out of list
		if (base_list === null) {
			if (char !== "(") continue;
			cur_list = base_list = new RambutanList({
				interpreter: this,
				apostrophe: (x && code[x - 1] === "'"),
				backtick: (x && code[x - 1] === "`")
			});
			++ p_level;
			continue;
		}

		// Quotes
		if (quote && char !== '"') continue;
		if (quote && char === '"' && code[x - 1] === "\\") continue;
		if (quote) {
			quote = false;
			cur_list.push(code.substr(atom_index, x - atom_index + 1));
			// console.log("Taking slice: " + code.substr(atom_index, x - atom_index + 1));
			atom_index = -1;
			continue;
		}

		if (!quote) {
			// Into the next dream layer
			if (char === "(") {
				if (code[x - 1] === "'") {
					atom_index = -1;
				}
				cur_list = new RambutanList({
					parent: cur_list,
					apostrophe: code[x - 1] === "'",
					backtick: code[x - 1] === "`",
					comma: code[x - 1] === ","
				});
				++ p_level;
				continue;
			}

			// Out of that dream layer
			if (char === ")") {
				if (atom_index !== -1) {
					cur_list.push(code.substr(atom_index, x - atom_index));
					var a = cur_list[cur_list.length - 1];
					if (a instanceof RambutanAtom) cur_list[cur_list.length - 1] = a.evaluate();
					atom_index = -1;
				}
				// Evaluate
				var result = cur_list.evaluate() || "nil";
				if (cur_list.parent) {
					cur_list = cur_list.parent;
					cur_list.splice(cur_list.length - 1);
					cur_list.push(result);
				} else { // Base list
					// console.log(base_list);
					base_list = null;
				}
				-- p_level;
				continue;
			}
		}

		// Null space
		if (atom_index === -1) {
			if (char === '"') {
				quote = true;
				atom_index = x;
			} else if (charCode >= 33 && charCode <= 126) {
				atom_index = x;
			}
			continue;
		} else if (charCode < 33 || charCode > 126) {
			cur_list.push(code.substr(atom_index, x - atom_index));
			var a = cur_list[cur_list.length - 1];
			if (a instanceof RambutanAtom) cur_list[cur_list.length - 1] = a.evaluate();
			atom_index = -1;
			continue;
		}
	}
}

// Define the JS defun function
Rambutan.prototype.defun = function(name, callback, delayed) {
	this.namespace[name] = callback;
	if (delayed) this.delayed.push(name);
	// POTENTIAL PROBLEM: re-defining a delayed function with a non-delayed function
}

// Create the primary interpreter
LISP = new Rambutan();

// Stores information about the hierarchy of the current code
RambutanList = function(json) {
	var json = json || {};
	this.parent = json.parent || null;
	this.interpreter = json.interpreter || this.parent.interpreter || null;
	this.namespace = new Object();
	if (json.apostrophe) this.apostrophe = true;
	if (json.backtick) this.backtick = true;
	if (json.comma) this.comma = true;
	if (this.parent) this.parent.push(this);
}

RambutanList.prototype = new Array();

RambutanList.prototype.apostrophe = false;
RambutanList.prototype.backtick = false;
RambutanList.prototype.comma = false;
RambutanList.prototype.delayedEvaluation = false;

RambutanList.prototype.push = function(val) {
	// Convert val to appropriate type
	if (typeof val === 'string') {
		// String
		if (val.length >= 2 && val[0] === '"' &&
			val[val.length - 1] === '"') {
			val = val.substr(1, val.length - 2);
		} else {
			// Number (Doubles only [for now])
			var pval = +val;
			if (val.length && pval === pval) val = pval;
			// True
			if (val === 't') val = true;
			// Nil
			if (val === 'nil') val = null;
			// Atom
			if (typeof val === 'string') {
				var apostrophe = false;
				if (val.length >= 2 && val[0] === "'") {
					apostrophe = true;
					val = val.substr(1);
				}
				var backtick = false;
				if (val.length >= 2 && val[0] === "`") {
					backtick = true;
					val = val.substr(1);
				}
				var comma = false;
				if (val.length >= 2 && val[0] === ",") {
					comma = true;
					val = val.substr(1);
				}
				val = new RambutanAtom({
					symbol: val,
					parent: this,
					apostrophe: apostrophe,
					backtick: backtick,
					comma: comma
				});
				// Make sure certain special functions are evaluated properly
				if (!this.length && this.interpreter.delayed.indexOf(val.symbol) !== -1) {
					this.delayedEvaluation = true;
				}
			}
		}
	}
	Array.prototype.push.call(this, val);
}

RambutanList.prototype.evaluate = function() {
	if (!this.length) return null;
	var f;
	var a = this[0];
	if (this.length === 1 && (a === null || typeof a !== 'object')) return a;
	if (!(a instanceof RambutanAtom)) return this;
	// Evaluate children first
	var temp = new RambutanList({
		interpreter: this.interpreter
	});
	temp.parent = this.parent;
	for (var x = 0, y = this.length; x < y; ++ x) {
		if (!this[x] || typeof this[x] !== 'object') {
			temp.push(this[x]);
			continue;
		}
		temp.push(this[x].evaluate());
	}
	// Check the local namespace(s)
	for (var l = this; true; l = l.parent) {
		if (f === undefined) f = l.namespace[a];
		if (l.apostrophe) return this;
		if (l.delayedEvaluation && l !== this) return this;
		if (!l.parent) break;
	}
	// Check the global namespace, if appropriate
	if (!f) f = this.interpreter.namespace[a];
	if (typeof f === 'function') { // JS-Interop Function
		return f.apply(temp, temp.slice(1));
	} else if (f instanceof RambutanFunction) { // LISP Function
		return f.evaluate(temp);
	} else { // Variable
		if (f !== undefined && temp.length === 1) { // Definitely a variable
			return f;
		} else if (temp.length === 1) { // Primitive
			return temp[0];
		} else { // Pair / List
			return temp;
		}
	}
}

RambutanList.prototype.delayedEvaluate = function() {
	if (!this.length) return null;
	var temp = new RambutanList({
		interpreter: this.interpreter
	});
	temp.parent = this.parent;
	var f;
	var delayedEvaluation = this.parent.delayedEvaluation;
	this.parent.delayedEvaluation = false;
	// Evaluate children first
	for (var x = 0, y = this.length; x < y; ++ x) {
		if (!this[x] || typeof this[x] !== 'object') {
			temp.push(this[x]);
			continue;
		}
		temp.push(this[x].evaluate());
	}
	this.parent.delayedEvaluation = delayedEvaluation;
	// Evaluate ya'self
	var a = temp[0];
	if (this.length === 1 && (a === null || typeof a !== 'object')) return a;
	if (!(a instanceof RambutanAtom)) return temp;
	// Check the local namespace(s)
	for (var l = temp; true; l = l.parent) {
		if (f === undefined) f = l.namespace[a];
		// if (l.apostrophe) return temp;
		if (!l.parent) break;
	}
	// Check the global namespace, if appropriate
	if (!f) f = temp.interpreter.namespace[a];
	if (typeof f === 'function') { // JS-Interop Function
		return f.apply(temp, temp.slice(1));
	} else if (f instanceof RambutanFunction) { // LISP Function
		return f.evaluate(temp);
	} else { // Variable
		if (f !== undefined && temp.length === 1) { // Definitely a variable
			return f;
		} else if (temp.length === 1) { // Primitive
			return temp[0];
		} else { // Pair / List
			return temp;
		}
	}
}

RambutanList.prototype.toString = function() {
	var temp = new Array();
	for (var i = this.length; i --; ) {
		temp[i] = typeof this[i] === 'string' ? '"' + this[i] + '"' : this[i].toString();
	}
	return (this.apostrophe ? "'" : "") + "(" + temp.join(" ") + ")";
}

// Stores LISP atom (to avoid confusion with strings)
RambutanAtom = function(json) {
	var json = json || new Object();
	this.symbol = json.symbol || "";
	this.parent = json.parent || null;
	this.interpreter = json.interpreter || this.parent.interpreter || null;
	if (json.apostrophe) this.apostrophe = json.apostrophe;
	if (json.backtick) this.backtick = json.backtick;
	if (json.comma) this.comma = json.comma;
}

RambutanAtom.prototype.symbol = "";
RambutanAtom.prototype.apostrophe = false;
RambutanAtom.prototype.backtick = false;
RambutanAtom.prototype.comma = false;

RambutanAtom.prototype.evaluate = function() {
	// If this is actually the name of a function, return self
	if (this.parent && this.parent[0] == this) return this;
	// Check the local namespace(s)
	var f;
	for (var l = this; true; l = l.parent) {
		if (f === undefined && l.namespace) f = l.namespace[this.symbol];
		if (l.apostrophe) return this;
		if (l.delayedEvaluation && l !== this) return this;
		if (!l.parent) break;
	}
	// console.log(f);
	// Check the global namespace, if appropriate
	if (f === undefined) f = this.interpreter.namespace[this.symbol];
	if (typeof f === 'function') { // JS-Interop Function
		return f.apply(this);
	} else if (f instanceof RambutanFunction) { // LISP Function
		return f.evaluate(this);
	} else { // Variable
		if (f !== undefined) { // Definitely a variable
			return f;
		} else { // I don't exist...
			return null;
		}
	}
}

RambutanAtom.prototype.delayedEvaluate = function() {
	var temp = new RambutanAtom({
		symbol: this.symbol,
		interpreter: this.interpreter
	});
	temp.parent = this.parent;
	var delayedEvaluation = this.parent.delayedEvaluation;
	this.parent.delayedEvaluation = false;
	// If this is actually the name of a function, return self
	if (this.parent && this.parent[0] == this) return temp;
	// Check the local namespace(s)
	var f;
	for (var l = this; true; l = l.parent) {
		if (f === undefined && l.namespace) f = l.namespace[this.symbol];
		if (l.apostrophe || (l.delayedEvaluation && l !== this)) {
			this.parent.delayedEvaluation = delayedEvaluation;
			return temp;
		}
		if (!l.parent) break;
	}
	this.parent.delayedEvaluation = delayedEvaluation;
	// Check the global namespace, if appropriate
	if (f === undefined) f = this.interpreter.namespace[this.symbol];
	if (typeof f === 'function') { // JS-Interop Function
		return f.apply(this);
	} else if (f instanceof RambutanFunction) { // LISP Function
		return f.evaluate(this);
	} else { // Variable
		if (f !== undefined) { // Definitely a variable
			return f;
		} else { // I don't exist...
			return null;
		}
	}
}

RambutanAtom.prototype.toString = function() {
	return this.symbol;
}

// Stores LISP function
RambutanFunction = function(json) {
	var json = json || new Object();
	this.args = json.args || [];
	this.body = json.body || [];
}

RambutanFunction.prototype.toString = function() {
	return "function";
}

// TEMP
// console.log(document.currentScript);
var scriptsObserver = new MutationObserver(function(mutations) {
	// console.log(mutations);
	for (var i = mutations.length; i --; ) {
		var nodes = mutations[i].addedNodes;
		for (var j = nodes.length; j --; ) {
			var node = nodes[j];
			if (node.tagName !== "SCRIPT") continue;
			// console.log(node);
			if (!/\.lisp$/i.test(node.src)) {
				if (node.type == "text/lisp") {
					node.setAttribute("data-rambutan-handled", true);
					LISP.eval(node.text);
				}
				continue;
			}
			node.type = "text/lisp";
			httpRequest = new XMLHttpRequest();
			httpRequest.addEventListener("readystatechange", function(event) {
				// Evaluate the code if/when successful
				if (httpRequest.readyState === XMLHttpRequest.DONE) {
					LISP.eval(httpRequest.responseText);
				}
			});
			httpRequest.open("GET", node.src, true);
			httpRequest.send(null);
			node.setAttribute("data-rambutan-handled", true);
		}
	}
});
scriptsObserver.observe(document.head, { childList: true });

document.addEventListener("DOMContentLoaded", function() {
	// Find all LISP script tags
	var scripts = document.querySelectorAll("script[type='text/lisp']," +
		"script[src$='.lisp']");
	// Load the scripts in the primary interpreter
	for (var x = 0, y = scripts.length; x < y; ++ x) {
		var s = scripts[x];
		if (s.getAttribute("data-rambutan-handled")) continue;
		var src = s.getAttribute("src");
		if (src) { // Attempt to load source via AJAX
			httpRequest = new XMLHttpRequest();
			httpRequest.addEventListener("readystatechange", function(event) {
				// Evaluate the code if/when successful
				if (httpRequest.readyState === XMLHttpRequest.DONE) {
					LISP.eval(httpRequest.responseText);
				}
			});
			httpRequest.open("GET", src, true);
			httpRequest.send(null);
			s.setAttribute("data-rambutan-handled", true);
		} else { // Interpet the inline text
			LISP.eval(s.text);
		}
	}
});