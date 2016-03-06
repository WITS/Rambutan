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
	// Define the defining function
	var _this = this;
	this.namespace.defun = function() {
		_this.namespace[this[0]] = RambutanFunction({
			args: this[1],
			body: this.slice(2)
		});
	}
	// Define the GLOBAL variable setting function
	// NOTE: This is not the same as set/setq in Common LISP,
	// it acts like setf. Moreover, this is mimicking JS vars
	this.namespace.set = function() {

		_this.namespace[arguments[0].symbol] = arguments[1];
		return arguments[1];
	}
	// Define the LOCAL variable setting function
	this.namespace.let = function() {
		this.namespace[arguments[0].symbol] = arguments[1];
		return arguments[1];
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
		atom_index = -1, // The index of the current atom (or list)
		atom = null, // The current atom object / primitive
		p_level = 0 // Parentheses level
		; x < y; ++ x) {
		var char = code[x];
		var charCode = code.charCodeAt(x);

		// Out of list
		if (base_list === null) {
			if (char !== "(") continue;
			cur_list = base_list = new RambutanList({
				interpreter: this,
				apostrophe: (x && code[x - 1] === "'")
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
					apostrophe: code[x - 1] === "'"
				});
				++ p_level;
				continue;
			}

			// Out of that dream layer
			if (char === ")") {
				if (atom_index !== -1) {
					cur_list.push(code.substr(atom_index, x - atom_index));
					atom_index = -1;
				}
				// Evaluate
				var result = cur_list.evaluate() || "nil";
				if (cur_list.parent) {
					cur_list = cur_list.parent;
					cur_list.splice(cur_list.length - 1);
					cur_list.push(result);
				} else { // Base list
					console.log(base_list);
					base_list = null;
				}
				-- p_level;
				continue;
			}
		}

		// Null space
		if (atom_index === -1) {
			if (cur_list.name && char === '"') {
				quote = true;
				atom_index = x;
			} else if (charCode >= 33 && charCode <= 126) {
				atom_index = x;
			}
			continue;
		} else if (charCode < 33 || charCode > 126) {
			cur_list.push(code.substr(atom_index, x - atom_index));
			atom_index = -1;
			continue;
		}
	}
}

// Define the JS defun function
Rambutan.prototype.defun = function(name, args, body) {
	if (body) { // LISP function
		this.namespace[name] = new RambutanFunction({
			args: args,
			body: body || new Array()
		});
	} else { // JS-LISP interop
		this.namespace[name] = args;
	}
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
	if (this.parent) this.parent.push(this);
}

RambutanList.prototype = new Array();

RambutanList.prototype.apostrophe = false;
RambutanList.prototype.backtick = false;
RambutanList.prototype.comma = false;

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
			// Single-atom list
			if (typeof val === 'string') {
				val = new RambutanAtom(val);
			}
		}
	}
	Array.prototype.push.call(this, val);
}

RambutanList.prototype.evaluate = function() {
	if (!this.length) return null;
	var f;
	var a = this[0];
	if (!(a instanceof RambutanAtom)) return this;
	// Check the local namespace(s)
	for (var l = this; true; l = l.parent) {
		if (!f) f = l.namespace[a];
		if (l.apostrophe) return this;
		if (!l.parent) break;
	}
	// Check the global namespace, if appropriate
	if (!f) f = this.interpreter.namespace[a];
	if (typeof f === 'function') {
		return f.apply(this, this.slice(1));
	} else if (f instanceof RambutanFunction) {
		return f.evaluate(this);
	} else {
		return f;
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
RambutanAtom = function(symbol) {
	this.symbol = symbol || "";
}

RambutanAtom.prototype.symbol = "";

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

window.addEventListener("load", function() {
	// Find all LISP script tags
	var scripts = document.querySelectorAll("script[type='text/lisp']," +
		"script[src$='.lisp']");
	// Load the scripts in the primary interpreter
	for (var x = 0, y = scripts.length; x < y; ++ x) {
		var s = scripts[x];
		var src = s.getAttribute("src");
		if (src) { // Attempt to load source via AJAX
			// TODO
		} else { // Interpet the inline text
			LISP.eval(s.text);
		}
	}
});