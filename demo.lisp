(let ((x 3) (y 4))
	(log
		"Hello world"			; Always a good start
		(. "(" x ", " y ")")	; 2d coordinates
		(- x y)					; subtraction
		(if (and x y)			; conditional test
			"True"
			"False")))