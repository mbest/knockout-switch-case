**SWITCH/CASE** bindings for [Knockout](http://knockoutjs.com/)

*Knockout* includes only the `if` and `ifnot` bindings for control flow. The `switch` and `case` bindings provide a flexible and powerful control flow mechanism that can simplify your code.

Let's start with some examples. Here we want to display a different message based on a status value:

```html
<div data-bind="switch: orderStatus">
    <div data-bind="case: 'shipped'">
        Your order has been shipped. Your tracking number is <span data-bind="text: trackingNumber"></span>.
    </div>
    <div data-bind="case: 'pending'">
        Your order is being processed. Please be patient.
    </div>
    <div data-bind="case: 'incomplete'">
        Your order could not be processed. Please go back and complete the missing data.
    </div>
    <div data-bind="case: $default">
        Please call customer service to determine the status of your order.
    </div>
</div>
```

Here's an equivalent example using source data values:

```html
<div data-bind="switch: true">
    <div data-bind="case: trackingNumber">
        Your order has been shipped. Your tracking number is <span data-bind="text: trackingNumber"></span>.
    </div>
    <div data-bind="case: isReady">
        Your order is being processed. Please be patient.
    </div>
    <div data-bind="casenot: isComplete">
        Your order could not be processed. Please go back and complete the missing data.
    </div>
    <div data-bind="case: $else">
        Your order could not be processed. Please go back and complete the missing data.
    </div>
</div>
```

A *switch* block can contain any number of *case* blocks. No more than one *case* block will be used. The contents of the remaining blocks will be cleared. Both `switch` and `case` take a single parameter. In most cases the values of the two parameters are matched against each other to determine which case block to use. The first block (top-down) to match is used; subsequent blocks are cleared. Here, in detail, is how the values are matched:

1. If the *case* value is the special value `$else` or `$default`, the block is used (if no previous blocks were used).
1. If the *switch* value is boolean (`true` or `false`), each *case* value's "truthiness" is matched against the *switch* value.
1. If the *case* value is boolean (and the *switch* value is not boolean), the *case* value is used as is. The special variable `$value` can be used in a *case* expression to refer to the *switch* value. The block will be used if the expression is true.
1. If the *case* value is an array, the block will be used if the *switch* value matches (strict) an item in the array.
1. Otherwise, the block will be used if the *case* value matches the *switch* value (loose comparison).

If you want a block to be used based on the parameter not matching, you can use the `casenot` binding. This works similarly to `case`, except that the result of the value matching is reversed.

Here are some more examples. This example demonstrates items 1, 3, 4, and 5 above and uses container-less bindings:

```html
<!-- ko switch: somevalue -->
<!-- ko case: 'foo' -->
    Value is foo
<!-- /ko -->
<!-- ko case: 'bar' -->
    Value is bar
<!-- /ko -->
<!-- ko case: ['baz', 'qux'] -->
    Value is either baz or qux
<!-- /ko -->
<!-- ko case: $value.length == 3 -->
    Value is a three-letter word
<!-- /ko -->
<!-- ko case: $default -->
    Value doesn't match
<!-- /ko -->
<!-- /ko -->
```

This example demonstrates item 2 (also see the second example above):

```html
<!-- ko switch: isReady -->
    <p data-bind="case: true">You are ready!</p>
    <p data-bind="case: false">You are not ready!</p>
<!-- /ko -->
```

If you have any questions, feel free to contact me:

Michael Best
https://github.com/mbest/
mbest@dasya.com
