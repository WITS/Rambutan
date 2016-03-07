/*
Rambutan.Common.js - a module for common operators / Control flow

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

// Control flow
LISP.defun("if", function() {
	var condition = arguments[0];
	if (condition instanceof RambutanList) {
		condition = condition.delayedEvaluate();
	} else if (condition instanceof RambutanAtom) {
		condition = condition.evaluate();
	}
	if (condition) { // Then
		var result = arguments[1];
		if (result instanceof RambutanList) {
			result = result.delayedEvaluate();
		}
		return result;
	} else if (arguments.length >= 3) { // Else (if available)
		var result = arguments[2];
		if (result instanceof RambutanList) {
			result = result.delayedEvaluate();
		}
		return result;
	}
	return null;
}, true);

// Logical operators
LISP.defun("and", function() {
	for (var x = 0, y = arguments.length; x < y; ++ x) {
		if (!arguments[x]) return false;
	}
	return true;
});

LISP.defun("or", function() {
	for (var x = 0, y = arguments.length; x < y; ++ x) {
		if (arguments[x]) return true;
	}
	return false;
});

LISP.defun("not", function() {
	return !arguments[0];
});

// Equality/inequality operators
// TODO: Ensure that RambutanLists and RambutanAtoms
// are compared correctly
LISP.defun("=", function() {
	for (var x = 1, y = arguments.length; x < y; ++ x) {
		if (arguments[x - 1] != arguments[x]) return false;
	}
	return true;
});

LISP.defun("!=", function() {
	for (var x = 1, y = arguments.length; x < y; ++ x) {
		if (arguments[x - 1] == arguments[x]) return false;
	}
	return true;
});

LISP.defun("<", function() {
	for (var x = 1, y = arguments.length; x < y; ++ x) {
		if (arguments[x - 1] >= arguments[x]) return false;
	}
	return true;
});

LISP.defun("<=", function() {
	for (var x = 1, y = arguments.length; x < y; ++ x) {
		if (arguments[x - 1] > arguments[x]) return false;
	}
	return true;
});

LISP.defun(">", function() {
	for (var x = 1, y = arguments.length; x < y; ++ x) {
		if (arguments[x - 1] <= arguments[x]) return false;
	}
	return true;
});

LISP.defun(">=", function() {
	for (var x = 1, y = arguments.length; x < y; ++ x) {
		if (arguments[x - 1] < arguments[x]) return false;
	}
	return true;
});

// Arithmetic operators
LISP.defun("+", function() {
	var sum = 0;
	for (var i = arguments.length; i --; ) {
		var val = +arguments[i];
		if (val !== val) continue;
		sum += val;
	}
	return sum;
});

LISP.defun("-", function() {
	var sum = (+arguments[0]) || 0;
	if (arguments.length <= 1) return -sum;
	for (var i = arguments.length; -- i >= 1; ) {
		var val = +arguments[i];
		if (val !== val) continue;
		sum -= val;
	}
	return sum;
});

LISP.defun("*", function() {
	var product = 1;
	for (var i = arguments.length; i --; ) {
		var val = +arguments[i];
		if (val !== val) return 0;
		product *= val;
	}
	return product;
});

LISP.defun("/", function() {
	var product = (+arguments[0]) || 0;
	if (arguments.length <= 1) return 1 / product;
	for (var i = arguments.length; -- i >= 1; ) {
		var val = +arguments[i];
		if (val !== val) continue;
		product /= val;
	}
	return product;
});

// String operators
LISP.defun(".", function() {
	var str = "";
	for (var x = 0, y = arguments.length; x < y; ++ x) {
		str += arguments[x];
	}
	return str;
});