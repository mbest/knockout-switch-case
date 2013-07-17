// KEY.SUBKEY BINDING plugin for Knockout http://knockoutjs.com/
// (c) Michael Best
// License: MIT (http://www.opensource.org/licenses/mit-license.php)
// Version 0.1.1

(function(ko, undefined) {

function findPropertyName(obj, equals) {
    for (var a in obj)
        if (obj.hasOwnProperty(a) && obj[a] === equals)
            return a;
}

// Support a short-hand syntax of "key.subkey: value". The "key.subkey" binding
// handler will be created as needed but can also be created manually using
// ko.getBindingHandler.
var keySubkeyMatch = /([^\.]+)\.(.+)/, keySubkeyBindingDivider = '.';
function makeKeySubkeyBindingHandler(bindingKey) {
    var match = bindingKey.match(keySubkeyMatch);
    if (match) {
        var baseKey = match[1],
            baseHandler = ko.bindingHandlers[baseKey];
        if (baseHandler) {
            var subKey = match[2],
                makeSubHandler = baseHandler.makeSubkeyHandler || makeDefaultKeySubkeyHandler,
                subHandler = makeSubHandler.call(baseHandler, baseKey, subKey, bindingKey);
            ko.bindingHandlers[bindingKey] = subHandler;
            if (ko.bindingFreedom && !ko.bindingFreedom.isExcluded(baseKey))
                ko.bindingFreedom.include(bindingKey);
            return subHandler;
        }
    }
}

// Create a binding handler that translates a binding of "binding: value" to
// "basekey: {subkey: value}". Compatible with these default bindings: event, attr, css, style.
function makeDefaultKeySubkeyHandler(baseKey, subKey, bindingKey) {
    var subHandler = ko.utils.extend({}, this);
    function setHandlerFunction(funcName) {
        if (subHandler[funcName]) {
            subHandler[funcName] = function(element, valueAccessor) {
                function subValueAccessor() {
                    var result = {};
                    result[subKey] = valueAccessor();
                    return result;
                }
                var args = Array.prototype.slice.call(arguments, 0);
                args[1] = subValueAccessor;
                return ko.bindingHandlers[baseKey][funcName].apply(this, args);
            };
        }
    }
    // Set new init and update functions that wrap the originals
    setHandlerFunction('init');
    setHandlerFunction('update');
    // Clear any preprocess function since precossing of the new binding would need to be different
    if (subHandler.preprocess)
        subHandler.preprocess = null;
    if (ko.virtualElements.allowedBindings[baseKey])
        ko.virtualElements.allowedBindings[bindingKey] = true;
    return subHandler;
}

// Find any bindings of the form x.y, and for each one, ensure we have a parameterized binding handler to match
function makeKeySubkeyBindingHandlers(parsedBindings) {
    if (parsedBindings) {
        for (var key in parsedBindings) {
            if (parsedBindings.hasOwnProperty(key) && !ko.bindingHandlers[key]) {
                makeKeySubkeyBindingHandler(key);
            }
        }
    }
    return parsedBindings;
}

if (ko.version[0] < 3) {
    // Process any bindings accessed through ko.bindingProvider by wrapping the getBindings function
    var oldGetBindings = ko.bindingProvider.instance.getBindings;
    ko.bindingProvider.instance.getBindings = function(node, bindingContext) {
        return makeKeySubkeyBindingHandlers(oldGetBindings.call(this, node, bindingContext));
    };

    // Process any bindings accessed through string-based templates by wrapping the applyBindingsToNode function
    var oldApplyToNode = ko.applyBindingsToNode,
        koApplyToNodeName = findPropertyName(ko, oldApplyToNode);
    ko.applyBindingsToNode = ko[koApplyToNodeName] = function(node, bindings, viewModel) {
        oldApplyToNode(node, makeKeySubkeyBindingHandlers(bindings), viewModel);
    };
}

// You can use ko.getBindingHandler to manually create key.subkey bindings
var oldGetHandler = ko.getBindingHandler || function(bindingKey) { return ko.bindingHandlers[bindingKey] };
ko.getBindingHandler = function(bindingKey) {
    return oldGetHandler(bindingKey) || makeKeySubkeyBindingHandler(bindingKey);
};

// Export plugin function to manually set up bindings
ko.keySubkeyBinding = {
    makeHandler: makeKeySubkeyBindingHandler
};

})(ko);
