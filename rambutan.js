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
}

// Evaluate (interpret) a (JavaScript) string of LISP code
Rambutan.prototype.eval = function(code) {
	for (var x = 0, // The index of the current character
		y = code.length, // The length of this string of code
		base_list = null, // The first-level list
		// list_index = -1, // The index of the current list
		cur_list = null, // The list that this atom is inside of
		apostrophe = -1, // The p_level of the apostrophe
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
			cur_list = base_list = new RambutanList();
			++ p_level;
			continue;
		}

		// Quotes
		if (quote && char !== '"') continue;
		if (quote && char === '"' && code[x-1] === "\\") continue;
		if (quote) {
			quote = false;
			cur_list.push(code.substr(atom_index + 1, x - atom_index - 1));
			atom_index = -1;
			continue;
		}

		if (!quote) {
			// Into the next dream layer
			if (char === "(") {
				if (code[x - 1] === "'") {
					apostrophe = p_level;
					atom_index = x;
				}
				if (apostrophe === -1) {
					cur_list = new RambutanList({
						parent: cur_list
					});
				}
				++ p_level;
				continue;
			}

			// Out of that dream layer
			if (char === ")") {
				if (apostrophe === -1) {
					if (atom_index !== -1) {
						cur_list.push(code.substr(atom_index, x - atom_index));
						atom_index = -1;
					}
					if (cur_list.parent) {
						cur_list = cur_list.parent;
					} else { // Base list
						console.log(base_list);
						base_list = null;
					}
				}
				-- p_level;
				if (apostrophe !== -1 && p_level === apostrophe) {
					apostrophe = -1;
					cur_list.push(new RambutanQuote(
						code.substr(atom_index, x - atom_index + 1)));
					atom_index = -1;
				}
				continue;
			}
		}

		// Apostrophe
		if (apostrophe !== -1) continue;

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

// Create the primary interpreter
LISP = new Rambutan();

// Stores information about the hierarchy of the current code
RambutanList = function(json) {
	var json = json || {};
	this.parent = json.parent || null;
	if (this.parent) this.parent.push(this);
}

RambutanList.prototype = new Array();

RambutanList.prototype.name = "";

RambutanList.prototype.push = function(val) {
	if (this.name) {
		// Convert val to appropriate type
		if (typeof val === 'string') {
			if (/[+\-]?(?:[0-9]+\.?[0-9]*|\.[0-9]+)/.test(val)) val = +val;
			if (val === 't') val = true;
			if (val === 'nil') val = null;
		}
		Array.prototype.push.call(this, val);
	} else {
		this.name = val;
	}
}

// Stores unevaluated LISP code
RambutanQuote = function(str) {
	this.value = str;
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