function prepareTestNode() {
    var existingNode = document.getElementById("testNode");
    if (existingNode != null)
        existingNode.parentNode.removeChild(existingNode);
    testNode = document.createElement("div");
    testNode.id = "testNode";
    document.body.appendChild(testNode);
}

describe('Binding: Switch/Case', {
    before_each: prepareTestNode,

    'Should display only matching case block with observable switch value (containerless bindings)': function() {
        testNode.innerHTML = "xxx<!-- ko switch: somevalue --><!-- ko case: 1 -->Value is 1<!-- /ko --><!-- ko case: 2 -->Value is 2<!-- /ko --><!-- /ko -->";
        var value = ko.observable(1);
        ko.applyBindings({ somevalue: value }, testNode);
        // initially matches case 1
        value_of(testNode).should_contain_text("xxxValue is 1");
        // change value so it matches case 2
        value(2);
        value_of(testNode).should_contain_text("xxxValue is 2");
    },

    'Should display only matching case block with observable switch value (normal bindings)': function() {
        testNode.innerHTML = "<div data-bind='switch: somevalue'><div data-bind='case: 1'>Value is 1</div><div data-bind='case: 2'>Value is 2</div></div>";
        var value = ko.observable(1);
        ko.applyBindings({ somevalue: value }, testNode);
        // initially matches case 1
        value_of(testNode).should_contain_text("Value is 1");
        // change value so it matches case 2
        value(2);
        value_of(testNode).should_contain_text("Value is 2");
    },

    'Should display only matching case block with observable switch and case value': function() {
        testNode.innerHTML = "xxx<!-- ko switch: somevalue --><!-- ko case: case1 -->Value is 1<!-- /ko --><!-- ko case: case2 -->Value is 2<!-- /ko --><!-- /ko -->";
        var value = ko.observable('us'), case1 = ko.observable('you'), case2 = ko.observable('them');
        ko.applyBindings({ somevalue: value, case1: case1, case2: case2 }, testNode);
        // initially matches no cases
        value_of(testNode).should_contain_text("xxx");
        // change case 1 so it matches value
        case1('us');
        value_of(testNode).should_contain_text("xxxValue is 1");
        // change value so it matches case 2
        value('them');
        value_of(testNode).should_contain_text("xxxValue is 2");
        // change case 1 so it matches value (both cases match, but only first one is used)
        case1('them');
        value_of(testNode).should_contain_text("xxxValue is 1");
    },

    'Should display only matching case block with default case (using $default)': function() {
        testNode.innerHTML = "xxx<!-- ko switch: somevalue --><!-- ko case: 1 -->Value is 1<!-- /ko --><!-- ko case: $default -->Default case<!-- /ko --><!-- /ko -->";
        var value = ko.observable(0);
        ko.applyBindings({ somevalue: value }, testNode);
        // initially matches default value
        value_of(testNode).should_contain_text("xxxDefault case");
        // change value so it matches case 1
        value(1);
        value_of(testNode).should_contain_text("xxxValue is 1");
    },

    'Should display only matching case block with array case': function() {
        testNode.innerHTML = "xxx<!-- ko switch: somevalue --><!-- ko case: 1 -->Value is 1<!-- /ko --><!-- ko case: [2,3] -->Value is 2 or 3<!-- /ko --><!-- /ko -->";
        var value = ko.observable(0);
        ko.applyBindings({ somevalue: value }, testNode);
        // initially matches no value
        value_of(testNode).should_contain_text("xxx");
        // change value so it matches second case 
        value(3);
        value_of(testNode).should_contain_text("xxxValue is 2 or 3");
    },

    'Should be able to use $value variable to match in case binding': function() {
        testNode.innerHTML = "xxx<!-- ko switch: somevalue --><!-- ko case: 1 -->Value is 1<!-- /ko --><!-- ko case: $value < 5 -->Value is less than 5<!-- /ko --><!-- /ko -->";
        var value = ko.observable(4);
        ko.applyBindings({ somevalue: value }, testNode);
        // initially matches second case
        value_of(testNode).should_contain_text("xxxValue is less than 5");
        // change value so it matches first case 
        value(1);
        value_of(testNode).should_contain_text("xxxValue is 1");
    },

    'Should display first true case block with default case (using $else)': function() {
        testNode.innerHTML = "xxx<!-- ko switch: true --><!-- ko case: somevalue -->Somevalue is true<!-- /ko --><!-- ko case: func() -->Func is true<!-- /ko --><!-- ko case: $else -->Default case<!-- /ko --><!-- /ko -->";
        var value = ko.observable(0), funcValue = ko.observable(0);
        ko.applyBindings({ somevalue: value, func: function() { return funcValue();} }, testNode);
        // initially matches default value
        value_of(testNode).should_contain_text("xxxDefault case");
        // change funcValue so it's true
        funcValue(1);
        value_of(testNode).should_contain_text("xxxFunc is true");
        // change value so it's true
        value(1);
        value_of(testNode).should_contain_text("xxxSomevalue is true");
    },
    
    'Should support nested switch/case': function() {
        testNode.innerHTML = 
            "<div data-bind='switch: 1'>"+
                "<div data-bind='case: 1'>"+
                    "<div data-bind='switch: \"you\"'>"+
                        "<div data-bind='case: \"us\"'>Value is us</div>"+
                        "<div data-bind='case: \"you\"'>Value is you</div>"+
                    "</div>"+
                "</div>"+
                "<div data-bind='case: 2'>Value is 2</div>"+
            "</div>";
        var value = ko.observable(1);
        ko.applyBindings({ somevalue: value }, testNode);
        // initially matches case 1 and case you
        value_of(testNode).should_contain_text("Value is you");
    },

    'Should match truthy cases if control value is boolean true': function() {
        testNode.innerHTML = "xxx<!-- ko switch: true --><!-- ko case: 'abc' -->Value matched<!-- /ko --><!-- ko case: $else -->Value didn't match<!-- /ko --><!-- /ko -->";
        ko.applyBindings({}, testNode);
        value_of(testNode).should_contain_text("xxxValue matched");
    },

    'Should not match thruthy cases if control value is boolean false': function() {
        testNode.innerHTML = "xxx<!-- ko switch: false --><!-- ko case: 'abc' -->Value matched<!-- /ko --><!-- ko case: $else -->Value didn't match<!-- /ko --><!-- /ko -->";
        ko.applyBindings({}, testNode);
        value_of(testNode).should_contain_text("xxxValue didn't match");
    },

    'Bindings in containerless switch in templates should be bound only once': function() {
        var initCalls = 0;
        ko.bindingHandlers.test = {
            init: function (element, valueAccessor) { initCalls++; }
        };
        testNode.innerHTML = "<div data-bind='template: {\"if\":true}'>xxx<!-- ko switch: true --><span data-bind='test: true'></span><!-- /ko --></div>";
        ko.applyBindings({}, testNode);
        value_of(initCalls).should_be(1);
    },

    'Should display nodes without a case binding within a switch': function() {
        testNode.innerHTML = "<div data-bind='switch: 0'><div>Some text</div><div data-bind='case: 1'>Value is 1</div></div>";
        ko.applyBindings({}, testNode);
        // Will just contain the outer text
        value_of(testNode).should_contain_text("Some text");
    },

    'Should not allow case without switch': function() {
        var threw = false;
        testNode.innerHTML = "<input data-bind='case:0' />";
        try { ko.applyBindings({}, testNode); } catch (ex) { threw = true; }
        value_of(threw).should_be(true);
    },

    'Should not allow nested case binding': function() {
        var threw = false;
        testNode.innerHTML = "<div data-bind='switch: 0'><div data-bind='case: 0'>Value is 0<div data-bind='case: 1'>Value is 1</div></div></div>";
        try { ko.applyBindings({}, testNode); } catch (ex) { threw = true; }
        value_of(threw).should_be(true);
    }
});
