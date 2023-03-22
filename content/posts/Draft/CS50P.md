---
title: "Course | CS50P"
date: 2023-03-21T22:20:31+08:00
categories: [高手传习录]
tags:
  - CS50P
  - Course-Note
---

## Course Info.

CS50P is an introductory course to Programming using Python. Enroll for free at [https://cs50.edx.org/python](https://cs50.edx.org/python). Slides, source code, and more at [https://cs50.harvard.edu/python](https://cs50.harvard.edu/python). Playlist at [CS50's Introduction to Programming with Python (CS50P) 2022](https://www.youtube.com/playlist?list=PLhQjrBD2T3817j24-GogXmWqO5Q5vYy0V).

Course Syllabus:

- Learn how to read and write code as well as how to test and "debug" it.
- Learn about functions, arguments, and return values; variables and types; conditionals and Boolean expressions; and loops.
- Learn how to handle exceptions, find and fix bugs, and write unit tests; use third-party libraries; validate and extract data with regular expressions; model real-world entities with classes, objects, methods, and properties; and read and write files.

## Course Note

### Functions, Variables

> Ref.01: https://docs.python.org/3/library/functions.html#print

```python
print(* objects , sep=' ', end='\n', file=None, flush=False)
```

- Print objects to a text file with specified separators and endings using keyword arguments.
- Non-keyword arguments are converted to `strings` and printed with a `sep` and an `end`. If no objects are given, only the `end` will be printed.
- The `file` argument must have a `write()` method. If it's not provided, `sys.stdout` is used. `print()` can't be used with binary mode file objects, use` file.write(...)` instead.
- Output buffering is determined by the file, but can be forcibly flushed using the `flush` keyword argument.

```python
# Ask user for their name
name = input("What's your name? ")

# Say hello to user
print("hello,", name, seq=' ')  # Standard syntax
print("hello, " + name)  # '+' Attach the value of 'name' after 'hello, ', so this expression as a whole is actually a single parameter.
print(f"hello, {name}")  # F-strings(formatted stings): Use Python syntax to embed expressions in string literals.
```

> Ref.02: https://docs.python.org/3/library/stdtypes.html#string-methods

```python
# Ask user for their name,
# then remove whitespace from str and capitalize user's name
name = input("What's your name? ").strip().title()

# Split user's name to first name and last name
first, last = name.split(' ')

# Say hello to user
print(f"hello, {name}")
```

> Ref.03: https://docs.python.org/3/library/stdtypes.html#numeric-types-int-float-complex  
> https://docs.python.org/3/library/functions.html#round  
> https://docs.python.org/3/reference/lexical_analysis.html#f-strings

```python
round(number, ndigits=None)
```

- Round a number to a specified decimal place or return the nearest integer if no decimal place is specified.
- Values are rounded to the nearest multiple of $10^{-n}$, with rounding towards even numbers in case of a tie (so, for example, both round(0.5) and round(-0.5) are 0, and round(1.5) is 2).
- Any integer value is valid for ndigits (positive, zero or negative). The return value is an `int` if ndigits is not specified, otherwise it has the same type as number.

```python
x = float(input("What's x?"))
y = float(input("What's y?"))

z = round(x + y)

print(f"{z:,}")  # ',' indicates the separation of thousands in the output number.
print(f"{z:.2f}")  # Print a formatted string containing a variable z with two decimal places.
```

> Ref04: https://docs.python.org/3/reference/compound_stmts.html#function-definitions

```python
# Python interpreter requires functions to exist before they are called.
# For clarity and easy upkeep, define a main function at the beginning of the script and call it at the end.
def main():
  name = input("What's your name? ")
  hello(name)

def hello(to="world"):
  print("hello", to)

main()
```

### Conditionals

```python

```

### Loops

```python

```

### Exceptions

```python

```

### Debugging

```python

```

### Libraries

```python

```

### Style

```python

```

### Unit Test

```python

```

### File I/O

```python

```

### Regular Expressions

```python

```

### Object-Oriented Programming

```python

```

### Et Cetera

```python

```
