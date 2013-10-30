describe('Binding: Switch/Case', function() {
    beforeEach(jasmine.prepareTestNode);

    it('Should display only matching case block with observable switch value (containerless bindings)', function() {
        testNode.innerHTML = "xxx<!-- ko switch: somevalue --><!-- ko case: 1 -->Value is 1<!-- /ko --><!-- ko case: 2 -->Value is 2<!-- /ko --><!-- /ko -->";
        var value = ko.observable(1);
        ko.applyBindings({ somevalue: value }, testNode);
        // initially matches case 1
        expect(testNode).toContainText("xxxValue is 1");
        // change value so it matches case 2
        value(2);
        expect(testNode).toContainText("xxxValue is 2");
    });

    it('Should display only matching case block with observable switch value (normal bindings)', function() {
        testNode.innerHTML = "<div data-bind='switch: somevalue'><div data-bind='case: 1'>Value is 1</div><div data-bind='case: 2'>Value is 2</div></div>";
        var value = ko.observable(1);
        ko.applyBindings({ somevalue: value }, testNode);
        // initially matches case 1
        expect(testNode).toContainText("Value is 1");
        // change value so it matches case 2
        value(2);
        expect(testNode).toContainText("Value is 2");
    });

    it('Should be able to show and hide elements using \'case.visible\'', function() {
        testNode.innerHTML = "xxx<!--ko switch: somevalue--><div data-bind='case.visible: 1'>Value is 1</div><div data-bind='case.visible: 2'>Value is 2</div><!--/ko-->";
        var value = ko.observable(1);
        ko.applyBindings({ somevalue: value }, testNode);
        // initially matches case 1
        expect(testNode.childNodes[2].style.display).toEqual("");
        expect(testNode.childNodes[3].style.display).toEqual("none");
        // change value so it matches case 2
        value(2);
        expect(testNode.childNodes[2].style.display).toEqual("none");
        expect(testNode.childNodes[3].style.display).toEqual("");
    });

    it('Should be able to show and hide elements using \'casenot.visible\'', function() {
        testNode.innerHTML = "xxx<!--ko switch: somevalue--><div data-bind='casenot.visible: 1'>Value is 1</div><div data-bind='casenot.visible: 2'>Value is 2</div><!--/ko-->";
        var value = ko.observable(1);
        ko.applyBindings({ somevalue: value }, testNode);
        // initially matches case 1
        expect(testNode.childNodes[2].style.display).toEqual("none");
        expect(testNode.childNodes[3].style.display).toEqual("");

        // change value so it matches case 2
        value(2);
        expect(testNode.childNodes[2].style.display).toEqual("");
        expect(testNode.childNodes[3].style.display).toEqual("none");
    });

    it('Should display only matching case block with observable switch and case value', function() {
        testNode.innerHTML = "xxx<!-- ko switch: somevalue --><!-- ko case: case1 -->Value is 1<!-- /ko --><!-- ko case: case2 -->Value is 2<!-- /ko --><!-- /ko -->";
        var value = ko.observable('us'), case1 = ko.observable('you'), case2 = ko.observable('them');
        ko.applyBindings({ somevalue: value, case1: case1, case2: case2 }, testNode);
        // initially matches no cases
        expect(testNode).toContainText("xxx");
        // change case 1 so it matches value
        case1('us');
        expect(testNode).toContainText("xxxValue is 1");
        // change value so it matches case 2
        value('them');
        expect(testNode).toContainText("xxxValue is 2");
        // change case 1 so it matches value (both cases match, but only first one is used)
        case1('them');
        expect(testNode).toContainText("xxxValue is 1");
    });

    it('Should display only matching case block with default case (using $default as first case)', function() {
        testNode.innerHTML = "xxx<!-- ko switch: somevalue --><!-- ko case: $default -->Default case<!-- /ko --><!-- ko case: 1 -->Value is 1<!-- /ko --><!-- /ko -->";
        var value = ko.observable(0);
        ko.applyBindings({ somevalue: value }, testNode);
        // initially matches default value
        expect(testNode).toContainText("xxxDefault case");
        // change value so it matches case 1
        value(1);
        expect(testNode).toContainText("xxxValue is 1");
    });

    it('Should display only matching case block with array case', function() {
        testNode.innerHTML = "xxx<!-- ko switch: somevalue --><!-- ko case: 1 -->Value is 1<!-- /ko --><!-- ko case: [2,3] -->Value is 2 or 3<!-- /ko --><!-- /ko -->";
        var value = ko.observable(0);
        ko.applyBindings({ somevalue: value }, testNode);
        // initially matches no value
        expect(testNode).toContainText("xxx");
        // change value so it matches second case
        value(3);
        expect(testNode).toContainText("xxxValue is 2 or 3");
    });

    it('Should be able to use $value variable to match in case binding', function() {
        testNode.innerHTML = "xxx<!-- ko switch: somevalue --><!-- ko case: 1 -->Value is 1<!-- /ko --><!-- ko case: $value < 5 -->Value is less than 5<!-- /ko --><!-- /ko -->";
        var value = ko.observable(4);
        ko.applyBindings({ somevalue: value }, testNode);
        // initially matches second case
        expect(testNode).toContainText("xxxValue is less than 5");
        // change value so it matches first case
        value(1);
        expect(testNode).toContainText("xxxValue is 1");
        // change value so it matches none of the cases
        value(10);
        expect(testNode).toContainText("xxx");
    });

    it('Should display first true case block with default case (using $else)', function() {
        testNode.innerHTML = "xxx<!-- ko switch: true --><!-- ko case: somevalue -->Somevalue is true<!-- /ko --><!-- ko case: func() -->Func is true<!-- /ko --><!-- ko case: $else -->Default case<!-- /ko --><!-- /ko -->";
        var value = ko.observable(0), funcValue = ko.observable(0);
        ko.applyBindings({ somevalue: value, func: function() { return funcValue();} }, testNode);
        // initially matches default value
        expect(testNode).toContainText("xxxDefault case");
        // change funcValue so it's true
        funcValue(1);
        expect(testNode).toContainText("xxxFunc is true");
        // change value so it's true
        value(1);
        expect(testNode).toContainText("xxxSomevalue is true");
    });

    it('Should match all default cases if none others match and no default cases if there\'s a match', function() {
        testNode.innerHTML = "xxx<!--ko switch: somevalue-->"+
                "<!--ko case: $default-->default 1<!--/ko-->"+
                "<!--ko case: 1-->matches 1<!--/ko-->"+
                "<!--ko case: $default-->default 2<!--/ko-->"+
                "<!--ko case: 2-->matches 2<!--/ko-->"+
                "<!--ko case: $default-->default 3<!--/ko-->"+
            "<!--/ko-->";
        var value = ko.observable(0);
        ko.applyBindings({ somevalue: value }, testNode);
        // initially matches no value
        expect(testNode).toContainText("xxxdefault 1default 2default 3");
        // change value so it matches first case
        value(1);
        expect(testNode).toContainText("xxxmatches 1");
        // change value so it matches second case
        value(2);
        expect(testNode).toContainText("xxxmatches 2");
        // change value so it matches no cases
        value(3);
        expect(testNode).toContainText("xxxdefault 1default 2default 3");
    });

    it('Should support nested switch/case', function() {
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
        expect(testNode).toContainText("Value is you");
    });

    it('Should match truthy cases if control value is boolean true', function() {
        testNode.innerHTML = "xxx<!-- ko switch: true --><!-- ko case: 'abc' -->Value matched<!-- /ko --><!-- ko case: $else -->Value didn't match<!-- /ko --><!-- /ko -->";
        ko.applyBindings({}, testNode);
        expect(testNode).toContainText("xxxValue matched");
    });

    it('Should not match thruthy cases if control value is boolean false', function() {
        testNode.innerHTML = "xxx<!-- ko switch: false --><!-- ko case: 'abc' -->Value matched<!-- /ko --><!-- ko case: $else -->Value didn't match<!-- /ko --><!-- /ko -->";
        ko.applyBindings({}, testNode);
        expect(testNode).toContainText("xxxValue didn't match");
    });

    it('casenot should work the reverse of case', function() {
        testNode.innerHTML = "<div data-bind='switch: somevalue'><div data-bind='casenot: 1'>Value is not 1</div><div data-bind='casenot: 2'>Value is not 2</div></div>";
        var value = ko.observable(1);
        ko.applyBindings({ somevalue: value }, testNode);
        // initially matches case 2
        expect(testNode).toContainText("Value is not 2");
        // change value so it matches case 1
        value(2);
        expect(testNode).toContainText("Value is not 1");
    });

    it('Bindings in containerless switch in templates should be bound only once', function() {
        var initCalls = 0;
        ko.bindingHandlers.test = {
            init: function (element, valueAccessor) { initCalls++; }
        };
        testNode.innerHTML = "<div data-bind='template: {\"if\":true}'>xxx<!-- ko switch: true --><span data-bind='test: true'></span><!-- /ko --></div>";
        ko.applyBindings({}, testNode);
        expect(initCalls).toEqual(1);
    });

    it('Should display nodes without a case binding within a switch', function() {
        testNode.innerHTML = "<div data-bind='switch: 0'><div>Some text</div><div data-bind='case: 1'>Value is 1</div></div>";
        ko.applyBindings({}, testNode);
        // Will just contain the outer text
        expect(testNode).toContainText("Some text");
    });

    it('Should not allow case without switch', function() {
        var threw = false;
        testNode.innerHTML = "<input data-bind='case:0' />";
        try { ko.applyBindings({}, testNode); } catch (ex) { threw = true; }
        expect(threw).toEqual(true);
    });

    it('Should not allow nested case binding', function() {
        var threw = false;
        testNode.innerHTML = "<div data-bind='switch: 0'><div data-bind='case: 0'>Value is 0<div data-bind='case: 1'>Value is 1</div></div></div>";
        try { ko.applyBindings({}, testNode); } catch (ex) { threw = true; }
        expect(threw).toEqual(true);
    });

    if (ko.version >= "3.0.0") {
        it('Should support switch binding without a value in Knockout 3.x', function() {
            testNode.innerHTML = "<div data-bind='switch'><!-- ko case: 'abc' -->Value matched<!-- /ko --><!-- ko case: $else -->Value didn't match<!-- /ko --></div>";
            ko.applyBindings({}, testNode);
            // Switch binding defaults to "true", so the first truthy value matches
            expect(testNode).toContainText("Value matched");
        });

        it('Should work with observable view models in Knockout 3.x', function() {
            testNode.innerHTML = "<div data-bind='switch: somevalue'><div data-bind='case: 1'>Value is 1</div><div data-bind='case: $value < 5'>Value is less than 5</div></div>";
            var value = ko.observable(4), vm = ko.observable({ somevalue: value });
            ko.applyBindings(vm, testNode);
            // initially matches second case
            expect(testNode).toContainText("Value is less than 5");
            // change value so it matches first case (using direct observable)
            value(1);
            expect(testNode).toContainText("Value is 1");
            // change value so it matches no cases (using viewmodel observable)
            vm({ somevalue: 10 });
            expect(testNode).toContainText("");
        });
    }

    if (ko.keySubkeyBinding || ko.punches) {
        it('Should be able to use case.* if plugin is included', function() {
            testNode.innerHTML = "xxx<!--ko switch: somevalue--><input data-bind='case.enable: [1,2]'/><input data-bind='casenot.enable: 3'/><!--/ko-->";
            var value = ko.observable(1);
            ko.applyBindings({ somevalue: value }, testNode);

            // matches first case
            expect(!testNode.childNodes[2].disabled).toEqual(true);
            expect(!testNode.childNodes[3].disabled).toEqual(false);

            // still matches first case
            value(2);
            expect(!testNode.childNodes[2].disabled).toEqual(true);
            expect(!testNode.childNodes[3].disabled).toEqual(false);

            // matches no cases
            value(3);
            expect(!testNode.childNodes[2].disabled).toEqual(false);
            expect(!testNode.childNodes[3].disabled).toEqual(false);

            // matches second case
            value(4);
            expect(!testNode.childNodes[2].disabled).toEqual(false);
            expect(!testNode.childNodes[3].disabled).toEqual(true);
        });
    }
});
