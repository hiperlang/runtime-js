# Hyper Language Reference

## Basic Constructs

```html
<!-- block name -->
<foo#></foo#>

<!-- var name -->
<foo$></foo$>

<!-- control block name -->
<foo!></foo!>

<!-- option name -->
[option]

<!-- mixin name -->
mixin.

<!-- type name -->
:type

<!-- meta name -->
meta@

<!-- (raw) attribute name -->
attr=""

<!-- reference name -->
<foo></foo>
```

## Modes of processing DOM

1. Inplace Processing (Destructive): [inplace] (default)
1. Non-Destructive (Immutable) Processing: [preserve]="at"

## Examples

### "Wrapping" definitions (slots)

```html
<!-- use -->
<h#>Foo</h#>

<!-- result -->
(empty)
```

```html
<!-- use -->
<h#>Foo</h#>
<h></h>

<!-- result -->
<h>Foo</h>
```

```html
<!-- use -->
<h></h>

<!-- result -->
(error: undefined `h`)
```

### "Unwrapping" definitions (vars)

```html
<h$>Foo</h$>

<!-- result -->
(empty)
```

```html
<h$>Foo</h$>
<h></h>

<!-- result -->
Foo
```

```html
<h></h>

<!-- result -->
(error: undefined `h`)
```

### Definition mutation

```html
<!-- use -->
<h$>Foo</h$>
<h></h>
<mut h>Bar</mut>
<h></h>

<!-- result -->
Foo Bar
```

### Self-applied definitions

```html
<!-- use -->
<foo# !>Wrapped</foo#>
<bar$ !>Unwrapped</bar$>

<!-- result -->
<foo>Wrapped</foo>
Unwrapped
```

### HTML tags

```html
<!-- use -->
<h1>Foo</h1>

<!-- result -->
<h1>Foo</h1>
```

```html
<!-- use -->
<h1#>Foo</h1#>

<!-- result -->
(no error)
```

```html
<!-- use -->
<h1#>Foo</h1#>
<h1></h1>

<!-- result -->
<h1>Foo</h1>
```

```html
<!-- use -->
<h1#>Foo</h1#>
<h1>Bar</h1>

<!-- result -->
(error: to use text inside `h1` provide <text@></text@> placeholder)
```

```html
<!-- use -->
<h1#>Foo <text@></text@></h1#>
<h1>Bar</h1>

<!-- result-->
<h1>Foo Bar</h1>

<!-- use (cont.) -->
<h1><p>Bar</p></h1>

<!-- result -->
(error: to use elements inside `h1` provide a placeholder: <slot@></slot@>)
```

```html
<!-- use -->
<h1$>
  <p>Foo</p>
</h1$>

<!-- result -->
(error: standard HTML tags cannot be used as inline names)
```

### Structure definition

Possible options:

- `[strict]`

```html
<!-- use -->
<user#>
  <age# :num></age#>
  <name# :str></name#>
</user#>

<!-- result (no error) -->
<user>
  <age>30</age>
  <name>Timur</name>
</user>
```

### Mixins

Basic:

```html
<stl. b="1 red rounded" c="red"></stl.>
<div stl.></div>
<!-- result -->
<div class="b-1 b-red b-rounded c-red"></div>
```

```html
<stl. for@="*" bg="red"></stl.>
<div stl.>
  <div></div>
  <div></div>
</div>
<!-- result -->
<div>
  <div class="bg-red"></div>
  <div class="bg-red"></div>
</div>
```

```html
<stl. bg="red"></stl.>
<div stl.>
  <div></div>
  <div></div>
</div>
<!-- result -->
<div class="bg-red">
  <div></div>
  <div></div>
</div>
```

Patterned styling:

```html
<stl. bg="red">
  <age c="red"></age>
  <name c="blue"></name>
</stl.>
<user stl.>
  <age>30</age>
  <name>Timur</name>
</user>
<!-- result -->
<user class="bg-red">
  <age class="c-red">30</age>
  <name class="c-blue">Timur</name>
</user>
```

```html
<!-- define -->
<stl. bg="red">
  <this@ c="red"></this@>
  <this@ c="blue"></this@>
</stl.>
<!-- apply -->
<user stl.>
  <age>30</age>
  <name>Timur</name>
</user>
<!-- result -->
<user class="bg-red">
  <age class="c-red">30</age>
  <name class="c-blue">Timur</name>
</user>
```

### Control structures

**For**

```html
<list# !>
  <p>1</p>
  <p>2</p>
  <p>3</p>
</list#>

<for! list# e,ix>
  <print>Element: <e></e>; Index: <ix></ix></print>
</for!>
<!-- result (log) -->
<pre>
Element: 1; Index: 0
Element: 2; Index: 1
Element: 3; Index: 2
</pre>
```

## Use cases

```html
<div [autoprefix]>
  <!-- structure -> style -> content -->
  <user#>
    <age# :int></age#>
    <name# :str></name#>
  </user#>

  <table.>
    <user b="1px solid black">
      <age txt="bold"></age>
      <name txt="italic"></name>
    </user>
  </table.>

  <tbl table. :user>
    <on@ click bg="red">
      <mut! all="user > age">0</mut!>
    </on@>
    <user>
      <age>29</age>
      <name>Timur</name>
    </user>
  </tbl>
</div>
```

```html
<hyper>
  <func#>
    <arg@ a :num></arg@>
    <arg@ b :num></arg@>
    <calc a*b></calc>
  </func#>
  <out #>
    <on click>
      <print>Clicked!</print>
      <mut self>2</mut>
    </on>
    <rep 10>
      <func 1 2></func>
    </rep>
  </out>
  <h1>
    <p>Paragraph</p>
    <out></out>
  </h1>
</hyper>
```

````html
<div table. tbl# is@="row > cell > :num">
  <is@>
    <row>
      <cell :num></cell>
    </row>
  </is@>
  <row>
    <cell>1</cell>
    <cell>2</cell>
  </row>
  <row>
    <cell>3</cell>
    <cell>4</cell>
  </row>
  <row>
    <cell>5</cell>
    <cell>6</cell>
  </row>
  <row>
    <cell>
      <sum tbl#="row > cell:nth-child(2)"></sum>
      <!-- or? -->
      <sum sel@="tbl# > row > cell:nth-child(2)"></sum>
    </cell>
    <cell></cell>
  </row>
</div>
```
````
