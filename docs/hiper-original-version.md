# Hiper language code examples

This document serves as an initial draft outlining Hiper language design and ideas.

```
-- ------------------
-- Quick look
-- ------------------

-- this is a function
.fib(.a :int)
  if (a :0) =>
    0
  else =>
    a + fib(a - 1)

-- this is a string literal
`This is paragraph`

-- this is a variable with string embedding
.template = `The result: ${fib(10)}\n`


-- ------------------
-- Reference
-- ------------------

.x    create a name (positive association)
\x    create a name (negative association)
:x    interpret name as a type
x     eval a name
x()   eval a name (with args)
#x    eval or mix a name in (at runtime)
$x    eval or mix a name in (at comptime)
${x}  place a name into a string
=     associate (eager: references should exist; evaluate if possible)
=>    associate (lazy: references may not exist; evaluate on demand)
`     string
'     interpret literally


-- ------------------
-- Mix in
-- ------------------

.color-blue
  [color: blue]

.table #color-blue

-- Equals to
.table [color: blue]


-- ------------------
-- Data structures
-- ------------------

-- Define structure
.User
  .Name: str
  .Height: num

-- Create a table
.table: User{*}
  `John`, 191
  `Mary`, 175

<table #c-gray>
  for (`John`, `Tom`, `Mary`) |.p, .i|
    <tr>
      <td #txt-bold> p
      <td> i
  <tr>
    <td> `Всего`
    <td> /<table>/<tr>/0/@len

-- Generate
<table...> -- project structure into HTML

/<div>/<div>
/<div>//.var: <div> => print(var)

.users: (.name: str, .age: num){*}
  `John`, 31
  `Mary`, 28

.usersStyle
  ./<tr>/<td>
    #text-bold
  ./<tr>/<td>/:1
    #text-gray

<table>
  for (users) |.user| =>
    <tr>
      <td> user.name
      <td> user.age


-- ------------------
-- Underlying structure
-- ------------------
.table :type = `Hi everyone`
  @args
    .a :int
    .b :int
  @ret
    User{*}
  @style
    color-blue
    text-bold
  @val
    `Timur`, 29
    `Timur`, 29
    `Timur`, 29
```
