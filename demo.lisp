(setq n 7)
(log `("hello" ,(. "00" n)
	" repeat: " (. "00" n)))

(let ((x 5) (y 4) (z 3))
	(log
		"Hello world"						; Always a good start
		(. "(" x ", " y ", " z ")")	; 3d coordinates
		(- x y)								; subtraction
		(if (> x y z)						; conditional test
			"True"
			"False")))