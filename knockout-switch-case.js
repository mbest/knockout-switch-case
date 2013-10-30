// SWITCH/CASE binding for Knockout http://knockoutjs.com/
// (c) Michael Best
// License: MIT (http://www.opensource.org/licenses/mit-license.php)
// Version 2.0.0

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['knockout'], factory);
    } else {
        // Browser globals
        factory(root.ko);
    }
}(this, function(ko) {

var undefined;

if (!ko.virtualElements)
    throw Error('Switch-case requires at least Knockout 2.1');

var virtualElements = ko.virtualElements;
var bindingFlags = ko.bindingFlags || {};
var bindingRewriteValidators = ko.bindingRewriteValidators || ko.jsonExpressionRewriting.bindingRewriteValidators;

var defaultvalue = {};
ko.bindingHandlers['switch'] = {
    flags: bindingFlags.contentBind | bindingFlags.canUseVirtual | bindingFlags.noValue,
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var switchSkipNextArray = [],
            switchBindings = {
                // these properties are internal
                $switchSkipNextArray: switchSkipNextArray,
                $switchValueAccessor: valueAccessor,
                $switchDefault: ko.observable(true),
                // these properties are public
                $default: defaultvalue,
                $else: defaultvalue
            },
            contexts = [];

        // Update $value in each context when it changes
        ko.computed(function() {
            var value = ko.utils.unwrapObservable(valueAccessor());
            switchBindings.$value = value;
            ko.utils.arrayForEach(contexts, function(context) {
                context.$value = value;
            });
        }, null, {disposeWhenNodeIsRemoved: element});

        // Each child element gets a new binding context so it can set its own $switchIndex property.
        // The other properties will be shared since they're objects.
        var node, nextInQueue = virtualElements.firstChild(element);
        while (node = nextInQueue) {
            nextInQueue = virtualElements.nextSibling(node);
            switch (node.nodeType) {
            case 1: case 8:
                var newContext = bindingContext.extend(switchBindings);
                // Set initial value of context.$switchIndex to undefined
                newContext.$switchIndex = undefined;
                ko.applyBindings(newContext, node);
                contexts.push(newContext);
                break;
            }
        }

        return { controlsDescendantBindings: true };
    },
    preprocess: function(value) {
        return value || 'true';
    }
};
bindingRewriteValidators['switch'] = false; // Can't rewrite control flow bindings
virtualElements.allowedBindings['switch'] = true;

function checkCase(value, bindingContext) {
    // Check value and determine result:
    //  If the control value is boolean, the result is the matching truthiness of the value
    //  If value is boolean, the result is the value (allows expressions instead of just simple matching)
    //  If value is an array, the result is true if the control value matches (strict) an item in the array
    //  Otherwise, the result is true if value matches the control value (loose)
    var switchValue = ko.utils.unwrapObservable(bindingContext.$switchValueAccessor());
    return (typeof switchValue == 'boolean')
        ? (value ? switchValue : !switchValue)
        : (typeof value == 'boolean')
            ? value
            : (value instanceof Array)
                ? (ko.utils.arrayIndexOf(value, switchValue) !== -1)
                : (value == switchValue);
}

function checkNotCase(value, bindingContext) {
    return !checkCase(value, bindingContext);
}

function defaultMakeValueAccessor(ifValue) {
    return function() { return ifValue };
}

function makeCaseHandler(binding, isNot, makeValueAccessor) {
    var checkFunction = isNot ? checkNotCase : checkCase;
    binding || (binding = 'if');
    makeValueAccessor || (makeValueAccessor = defaultMakeValueAccessor);

    return {
        // Inherit flags from the binding we're wrapping
        flags: ko.bindingHandlers[binding].flags,

        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            if (!bindingContext.$switchSkipNextArray)
                throw Error("case binding must only be used with a switch binding");
            if (bindingContext.$switchIndex !== undefined)
                throw Error("case binding cannot be nested");
            // Initialize $switchIndex and push a new observable to $switchSkipNextArray
            bindingContext.$switchIndex = bindingContext.$switchSkipNextArray.push(ko.observable(false)) - 1;
            // Call init()
            if (ko.bindingHandlers[binding].init)
                return ko.bindingHandlers[binding].init(element, function(){ return {}; }, allBindings, viewModel, bindingContext);
        },

        update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var index = bindingContext.$switchIndex,
                isLast = (index === bindingContext.$switchSkipNextArray.length - 1),
                result, skipNext, noDefault;

            if (index && bindingContext.$switchSkipNextArray[index-1]()) {
                // An earlier case binding matched: skip this one (and subsequent ones)
                result = false;
                skipNext = true;
            } else {
                var value = ko.utils.unwrapObservable(valueAccessor());
                if (value === bindingContext.$else) {
                    // If value is the special object $else, the result depends on the other case values.
                    // If we're the last *case* item, the value must be true. $switchDefault will get
                    // updated to *true* below, but that won't necessarily update us because it would
                    // require a recursive update.
                    result = bindingContext.$switchDefault() || isLast;
                    skipNext = false;
                } else {
                    // If result is true, we will skip the subsequent cases (and any default cases)
                    noDefault = skipNext = result = checkFunction(value, bindingContext);
                }
            }
            // Call update() with calculated value
            ko.bindingHandlers[binding].update(element,
                makeValueAccessor(result), allBindings, viewModel, bindingContext);

            // Update the observable "skip next" value; if the value is changed, this will update the
            // subsequent case item.
            bindingContext.$switchSkipNextArray[index](skipNext);

            // Update $switchDefault to false if a non-default case item has matched.
            // Update it to true if we're the last item and none of items have matched.
            // (Initially, every item will be the last, but it doesn't matter.)
            if (noDefault)
                bindingContext.$switchDefault(false);
            else if (!skipNext && isLast)
                bindingContext.$switchDefault(true);
        }
    };
}

ko.bindingHandlers['case'] = makeCaseHandler('if');
bindingRewriteValidators['case'] = false; // Can't rewrite control flow bindings
virtualElements.allowedBindings['case'] = true;

ko.bindingHandlers['casenot'] = makeCaseHandler('if', true /*isNot*/);
bindingRewriteValidators['casenot'] = false; // Can't rewrite control flow bindings
virtualElements.allowedBindings['casenot'] = true;

// Support dynamically creating new case binding when using key.subkey plugin
function makeSubkeyHandler(baseKey, subKey, bindingKey) {
    if (virtualElements.allowedBindings[subKey])
        virtualElements.allowedBindings[bindingKey] = true;
    return makeCaseHandler(subKey, baseKey === 'casenot');
}
function getNamespacedHandler(bindingName, namespace, bindingKey) {
    return makeSubkeyHandler(namespace, bindingName, bindingKey);
}
// Compatibility with Key.subkey plugin
ko.bindingHandlers['case'].makeSubkeyHandler = makeSubkeyHandler
ko.bindingHandlers['casenot'].makeSubkeyHandler = makeSubkeyHandler;
// Compatibility with Punches plugin
ko.bindingHandlers['case'].getNamespacedHandler = getNamespacedHandler;
ko.bindingHandlers['casenot'].getNamespacedHandler = getNamespacedHandler;

ko.bindingHandlers['case.visible'] = makeCaseHandler('visible');
ko.bindingHandlers['casenot.visible'] = makeCaseHandler('visible', true /*isNot*/);

ko.bindingHandlers['switch'].makeCaseHandler = makeCaseHandler;

}));
