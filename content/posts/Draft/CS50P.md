---
title: "Course | CS50P"
date: 2023-03-21T22:20:31+08:00
categories: [高手传习录]
tags:
  - CS50P
  - Course-Note
toc:
  auto: false
---

## Course Info.

CS50P is an introductory course to Programming using Python. Enroll for free at [https://cs50.edx.org/python](https://cs50.edx.org/python). Slides, source code, and more at [https://cs50.harvard.edu/python](https://cs50.harvard.edu/python). Playlist at [CS50's Introduction to Programming with Python (CS50P) 2022](https://www.youtube.com/playlist?list=PLhQjrBD2T3817j24-GogXmWqO5Q5vYy0V).

Course Syllabus:

- Improve coding skills by mastering reading, writing, testing and debugging code.
- Learn fundamental programming concepts such as functions, arguments, and return values; variables and types; conditionals and Boolean expressions; and loops.
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

> Ref05: https://docs.python.org/3/tutorial/controlflow.html  
> https://docs.python.org/3/reference/expressions.html#comparisons

```python
x = int(input("What's x? "))
y = int(input("What's y? "))

if x < y:  # Boolean expressions
  print("x is less than y.")
elif x > y:
  print("x is greater than y.")
else:
  print("x is equal to y.")

if y < x or x > y:
  print("x is not equal to y.")
else:
  print("x is equal to y.")
```

```python
def main():
  x = int(input("What's x? "))
  if is_even(x):
    print("Even")
  else:
    print("Odd")

def is_even(n):
  # return True if n % 2 == 0 else False  # Pythonic Code
  return n % 2 == 0

main()
```

> Ref06: https://docs.python.org/3.10/reference/compound_stmts.html#the-match-statement

```python
name = input("What's your name? ")

match name:
  case "Harry" | "Hermione" | "Ron":
    print("Grayffidor")
  case "Draco":
    print("Slytherin")
  case _:
    print("Who?")
```

### Loops

> Ref07: https://docs.python.org/3/tutorial/controlflow.html

```python
def main():
  number = get_number()
  meow(number)

def get_number():
  while True:  # while Statements: Validating Input
    n = int(input("What's n?"))
    if n > 0: break
  return n

def meow(n):
  # print("meow\n" * n, end="")  # Pythonic Statements
  for _ in range(n): print("meow")

main()
```

> Ref08: https://docs.python.org/3/tutorial/introduction.html#lists  
> https://docs.python.org/3/library/stdtypes.html#sequence-types-list-tuple-range  
> https://docs.python.org/3/library/functions.html#len

```python
students = ["Hermione", "Harry", "Ron"]

for student in students:
  print(student)

for i in range(len(students)):
  print(i + 1, students[i])
```

> Ref09: https://docs.python.org/3/library/stdtypes.html#mapping-types-dict

```python
students = {
  "Hermione": "Gryffindor",
  "Harry": "Gryffindor",
  "Ron": "Gryffindor",
  "Draco": "Slytherin",
}

for student in students:
  print(student, students[student], sep=",")
```

```python
# Lists of Dictionaries
students = [
  {"name": "Hermione", "house": "Gryffindor", "patronus": "Otter"},
  {"name": "Harry", "house": "Gryffindor", "patronus": "Stag"},
  {"name": "Ron", "house": "Gryffindor", "patronus": "Jack Russell terrier"},
  {"name": "Draco", "house": "Slytherin", "patronus": None}
]

for student in students:
  print(student["name"], student["house"], student["patronus"], sep=",")
```

```python
# Nested Loops
def main():
  print_square(3)

def print_square(size):
  for i in range(size):
    # print("#" * size)  # Pythonic Code
    for j in range(size):
      print("#", end="")
    print()

main()
```

### Exceptions

> Ref10: https://docs.python.org/3/library/exceptions.html  
> https://docs.python.org/3/tutorial/errors.html

```python
def main():
  x = gey_int("What's x? ")
  print(f"x is {x}")

def gey_int(prompt):
  while True:
    try:
      return int(input(prompt))
    except ValueError:
      pass  # print("x is not an integer.")

main()
```

### Libraries

> Ref11: https://docs.python.org/3/library/random.html

```python
import random

# random.randint(a, b)
number = random.randint(1, 10)
print(number)

# random.shuffle(x)
cards = ["Jack", "queen", "king"]
random.shuffle(card)
for card in cards:
  print(card)
```

```python
# random.choice(seq)
from random import choice

coin = choice(["heads","tails"])
print(coin)
```

> Ref12: https://docs.python.org/3/library/sys.html

```python
import sys

# Check for errors
if len(sys.argv) < 2:
  sys.exit("Too few arguments")
elif len(sys.argv) > 2:
  sys.exit("Too many arguments")

# Print name tags
print("hello, my name is", sys.argv[1]="Default")
```

```bash
# Command-line Arguments
$ python name.py David
hello, my name is David

$ python name.py "David Malan"
hello, my name is David Malan
```

> Ref13: https://docs.python.org/3/installing/index.html  
> https://pypi.org  
> https://pypi.org/project/cowsay

```python
# pip install cowsay
import cowsay
import sys

if len(sys.argv) == 2:
  cowsay.cow("hello, " + sys.argv[1])
```

```bash
$ python say.py David
```

> Ref14: https://pypi.org/project/requests  
> https://docs.python.org/3/library/json.html

```python
# itunes.py
import requests
import json
import sys

if len(sys.argv) != 2:
  sys.exit()

# Itunes API
response = requests.get("https://itunes.apple.com/search?entity=song&limit=1&term=" + sys.argv[1])

# print(json.dumps(response.json(), indent=2))
o = response.json()
for result in o["results"]:
  print(result["trackName"])
```

```bash
$ python itunes.py weezer
```

> Ref15: https://docs.python.org/3/reference/datamodel.html#special-method-names

In Python, `name` is a built-in special global variable that represents the name of a module. When the Python interpreter executes code in a .py file, it treats this file as a module and stores the name of this module in the **name** variable. If this file is imported into other files as a module, then the value of **name** is the name of this module; if this file is executed directly, then the value of **name** is **main**. Therefore, we can usually use `if __name__ == "__main__":` to determine whether a module is being executed directly or imported into other modules.

```python
# ~/sayings.py
def main():
  hello("world")
  goodbye("world")

def hello(name):
  print(f"hello, {name}")

def goodbye(name):
  print(f"goodbye, {name}")

if __name__ == "__main__":
  main()
```

```python
# ~/say.py
import sys
from sayings import hello

if len(sys.argv) == 2:
  hello(sys.argv[1])
```

```bash
$ python say.py David
hello, David
```

### Unit Test

> Ref16: https://docs.python.org/3/reference/simple_stmts.html#the-assert-statement

The `assert` statement in Python checks if a condition is true and raises an `AssertionError` exception if it's false. It has the syntax: `assert condition[, message]`. The optional message argument provides additional information about the assertion failure.

```python
# calculator.py
def main():
  x = int(input("What's x? "))
  print("x squared is", square(x))

def square(n):
  return n * n

if __name__ == "__main__":
  main()
```

```python
# test_calculator.py
from calculator import square

def main():
  test_square()

def test_square():
  assert square(2) == 4, "2 squared was not 4"
  assert square(3) == 9, "3 squared was not 9"

if __name__ == "__main__":
  main()
```

> Ref17: https://docs.pytest.org

`pytest` is a third-party python library for writing and running unit and functional tests. It has rich features, uses decorators and assertions syntax, just like the built-in `unittest` module of Python. However, `pytest` stands out for its ease of use and support for `fixtures`, `parameterized tests`, `mock objects` in test cases, as well as executing unittest-style test cases.

```python
# pytest_calculator.py
import pytest
from calculator import square

def main():
  test_square()

def test_positive():
  assert square(2) == 4
  assert square(3) == 9

def test_negative():
  assert square(-2) == 4
  assert square(-3) == 9

def test_zero():
  assert square(0) == 0

if __name__ == "__main__":
  main()
```

```bash
pytest pytest_calculator.py
```

To improve testing, it is recommended that functions have return values. Therefore, let's modify the `hello.py` code to enhance its testability.

```python
# hello.py
def main():
  name = input("What's your name? ")
  print(hello(name))

def hello(to="world"):
  return f"hello, {to}"

if __name__ == "__main__":
  main()
```

```python
# test_hello.py
from hello import hello

def test_default():
  assert hello() == "hello, world"

def test_argument():
  for name in ["Herminor", "Harry", "Ron"]:
    assert hello(name) == f"hello, {name}"
```

To run all test cases in the 'test' folder, simply use the `pytest` command followed by the folder name. The command is as follows:

```bash
pytest test/
```

To test all tests in current and subdirectories, use `pytest` command without folder name. Please note the following points:

1. Test files should be named with `test_*.py` for pytest to automatically detect them.
   - For example, use `test_example.py` instead of `example_test.py`.
2. Test functions in test cases must start with `test_` for pytest to detect them automatically.
   - For instance, use `test_example()` instead of `example_test()`.
3. Importing pytest module at the top of a test file is necessary for using its syntax and functionality.

### File I/O

> Ref18: https://docs.python.org/3/tutorial/datastructures.html#more-on-lists

```python
names = []

for _ in range(3):
  names.append(input("What's your name? "))

for name in sorted(names):
  print(f"hello, {name}")
```

> Ref19: https://docs.python.org/3/library/functions.html#open

The `open()` function in Python opens files and returns a file object. It takes two parameters: `filename`(string) and `mode`(string). Mode is optional, with `r`(read-only) as the default value. Other modes include `w`(write), `a`(append), `x`(exclusive creation), and `b`(binary mode).

```python
name = input("What's your name? ")

file = open("name.txt", "a")
file.write(f"{name}\n")
file.close()
```

> Ref20: https://docs.python.org/3/reference/compound_stmts.html#the-with-statement

The `with` statement in Python simplifies the management of system resources by setting up and tearing down a context. It is used with objects that support the context management protocol, ensuring that resources are acquired and released properly.

```python
name = input("What's your name? ")

with open("name.txt", "a") as file:
  file.write(f"{name}\n")
```

```python
names = []

with open("name.txt") as file:
  for line in file:
    names.append(line.rstrip())

for name in sorted(names):
  print(f"hello, {name}")
```

```python
# pythonic!!!
with open("name.txt") as file:
  for line in sorted(file):
    print("hello,", line.rstrip())
```

> Ref21: https://docs.python.org/3/library/csv.html  
> https://docs.python.org/3/reference/expressions.html#lambda

Lambda expression in Python is an anonymous function that can take multiple arguments but only has one expression. Syntax: `lambda arguments: expression`. Lambda functions are commonly used with `map()`, `filter()`, and `reduce()` in Python, and can be treated like any other object.

```python
# students.csv
Harry,"Number Four, Privet Drive"
Ron,the Burrow
Draco,Malfoy Manor
```

```python
import csv

students = []

with open("students.csv") as file:
  reader = csv.reader(file)  # list
  for name, home in reader:
    students.append({"name": name, "home": home})

for student in sorted(students, key=lambda item: item["name"]):
  print(f"{student['name']} is in {student['house']}")
```

> Ref22: https://docs.python.org/3/library/stdtypes.html#dict

```python
import csv

name = input("What's your name? ")
home = input("What's your home? ")

with open("students.csv", "a") as file:
  write = csv.DictWriter(file, diednames=["name", "home"])
  write.writerow({"name": name, "home": home})
```

```python
# students.csv
name,home
Harry,"Number Four, Privet Drive"
Ron,the Burrow
Draco,Malfoy Manor
```

```python
import csv

students = []

with open("students.csv") as file:
  reader = csv.DictReader(file)  # dict
  for row in reader:
    #students.append({"name": row["name"], "home": row["home"]})
    students.append(row)

for student in sorted(students, key=lambda item: item["name"]):
  print(f"{student['name']} is in {student['home']}")
```

> Ref22: https://pillow.readthedocs.io

```python
import sys
from PIL import Image

images = []

# Loop through images and add them to the list.
for arg in sys.argv[1:]:
  image = Image.open(arg)
  images.append(image)

# Save GIF file with all frames, 200ms duration per frame, and loop count of 0.
images[0].save(
  "custumes.gif", save_all=True,
  append_images=[images[1], duration=200, loop=0]
)
```

```bash
python custumes.py custume1.gif custume2.gif
```

### Regular Expressions

> Ref22: https://docs.python.org/3/library/re.html

The `re` module in Python is a library for pattern matching and text manipulation. It allows you to **search** for specific patterns within strings, **extract** information based on those patterns, and **manipulate** text in a variety of ways.

```python
email = input("What's your email? ").strip()

# re.search(pattern, string, flags=0)
if "@" in email:
  print("Valid")
else:
  print("Invalid")
```

### Object-Oriented Programming

```python

```

### Et Cetera

```python

```
