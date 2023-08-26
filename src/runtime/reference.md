# Hyper Language Reference

## Examples

### "Wrapping" definitions (slots)

```html
<h#>Hello</h#>
<!-- result -->
(empty)
```

```html
<h#>Hello</h#>
<h></h>
<!-- result -->
<h>Hello</h>
```

```html
<h></h>
<!-- result -->
(error: undefined `h`)
```

### "Unwrapping" definitions (vars)

```html
<h$>Hello</h$>
<!-- result -->
(empty)
```

```html
<h$>Hello</h$>
<h></h>
<!-- result -->
Hello
```

```html
<h></h>
<!-- result -->
(error: undefined `h`)
```

### Definition mutation

```html
<h$>Hello</h$>
<h></h>
<!-- Hello -->
<mut h>Bye</mut>
<h></h>
<!-- Bye -->
```

### Self-applied definitions

```html
<foo# !>Wrapped</foo#>
<bar$ !>Unwrapped</bar$>
<!-- result -->
<foo>Wrapped</foo>
Unwrapped
```

### HTML tags

```html
<h1>Hello</h1>
<!-- result -->
<h1>Hello</h1>
```

```html
<h1#>
  <p>Hello</p>
</h1#>
<!-- result -->
(no error)
```

```html
<h1#>
  <p>Hello</p>
</h1#>
<h1></h1>
<h1>Bye</h1>
<!-- result -->
<h1><p>Hello</p></h1>
<h1>Bye</h1>
```

```html
<h1$>
  <p>Hello</p>
</h1$>
<!-- result -->
(error: standard HTML tags cannot be used as inline definitions (consider using
slots instead #))
```

### Structure definition

Possible options:

- `[strict]`

```html
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

### Applier

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
  <div class="b-red"></div>
  <div class="b-red"></div>
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
