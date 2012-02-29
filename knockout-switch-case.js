(function() {
// If used with the non-debug version, ko.virtualElements isn't exported
if (!ko.virtualElements)
    ko.virtualElements = { allowedBindings: ko.allowedVirtualElementBindings };
if (!ko.nativeTemplateEngine.instance)
    ko.nativeTemplateEngine.instance = new ko.nativeTemplateEngine();
if (!ko.bindingRewriteValidators)
    ko.bindingRewriteValidators = ko.jsonExpressionRewriting.bindingRewriteValidators;
if (!ko.bindingFlags)
    ko.bindingFlags = {};

var defaultvalue = {}, initSwitchNodes, bindSwitchNodes;
if (ko.virtualElements.firstChild) {
    initSwitchNodes = function() {};
    bindSwitchNodes = function(element, bindingContext, switchBindings) {
        var node, nextInQueue = ko.virtualElements.firstChild(element);
        while (node = nextInQueue) {
            nextInQueue = ko.virtualElements.nextSibling(node);
            switch (node.nodeType) {
            case 1: case 8:
                var newContext = bindingContext['extend'](switchBindings);
                ko.applyBindings(newContext, node);
                break;
            }
        }
    };
} else {
    initSwitchNodes = function(element) {
        // template.init extracts the child elements into an anonymousTemplate
        ko.bindingHandlers['template']['init'](element, function(){ return {}; });
        // add the copied nodes back in
        var nodesArray = ko.nativeTemplateEngine.instance['renderTemplateSource'](new ko.templateSources.anonymousTemplate(element));
        var endCommentNode = null, parent = element;
        if (element.nodeType == 8)
            endCommentNode = element.nextSibling, parent = element.parentNode;
        for (var i = 0, j = nodesArray.length; i < j; i++)
            parent.insertBefore(nodesArray[i], endCommentNode);
        return nodesArray;
    };
    bindSwitchNodes = function(element, bindingContext, switchBindings, nodesArray) {
        // node loop logic copied from src/templating.js
        var parent = nodesArray.length ? nodesArray[0].parentNode : null;
        for (var i = 0, n = nodesArray.length; i < n; i++) {
            var node = nodesArray[i];
            if (node.parentNode !== parent) // Skip anything that has been removed during binding
                continue;
            switch (node.nodeType) {
            case 1: case 8:
                var newContext = ko.utils.extend(ko.utils.extend(new bindingContext.constructor(), bindingContext), switchBindings);
                ko.applyBindings(newContext, node);
                break;
            }
        }
    };
}

ko.bindingHandlers['switch'] = {
    'flags': ko.bindingFlags.contentBind | ko.bindingFlags.canUseVirtual,
    'init': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var nodesArray = initSwitchNodes(element);
        var value = ko.utils.unwrapObservable(valueAccessor()),
            switchSkipNextArray = [],
            switchBindings = {
                $switchIndex: undefined,
                $switchSkipNextArray: switchSkipNextArray,
                $switchValueAccessor: valueAccessor,
                '$default': defaultvalue,
                '$else': defaultvalue,
                '$value': value
            };
        // Each child element gets a new binding context so it has it's own $switchIndex property.
        // The other properties are shared since they're objects.
        bindSwitchNodes(element, bindingContext, switchBindings, nodesArray);
        return { 'controlsDescendantBindings': true };
    }
};
ko.bindingRewriteValidators['switch'] = false; // Can't rewrite control flow bindings
ko.virtualElements.allowedBindings['switch'] = true;

function checkCase(valueAccessor, bindingContext) {
    // Check value and determine result:
    //  If value is the special object $else, the result is always true (should always be the last case)
    //  If the control value is boolean, the result is the matching truthiness of the value
    //  If value is boolean, the result is the value (allows expressions instead of just simple matching)
    //  If value is an array, the result is true if the control value matches (strict) an item in the array
    //  Otherwise, the result is true if value matches the control value (loose)
    var value = ko.utils.unwrapObservable(valueAccessor());
    if (value === bindingContext['$else']) {
        return true;
    }
    var switchValue = ko.utils.unwrapObservable(bindingContext.$switchValueAccessor());
    return (typeof switchValue == 'boolean')
        ? (value ? switchValue : !switchValue)
        : (typeof value == 'boolean')
            ? value
            : (value instanceof Array)
                ? (ko.utils.arrayIndexOf(value, switchValue) !== -1)
                : (value == switchValue);
}

function checkNotCase(valueAccessor, bindingContext) {
    return !checkCase(valueAccessor, bindingContext);
}

function makeTemplateValueAccessor(ifValue) {
    return function() { return { 'if': ifValue, 'templateEngine': ko.nativeTemplateEngine.instance } };
}

function makeOtherValueAccessor(ifValue) {
    return function() { return ifValue };
}

function makeCaseHandler(binding, isNot, makeValueAccessor) {
    var checkFunction = isNot ? checkNotCase : checkCase;
    binding = binding || 'template';
    makeValueAccessor = makeValueAccessor || (binding == 'template' ?  makeTemplateValueAccessor : makeOtherValueAccessor);

    return {
    'flags': ko.bindingHandlers[binding]['flags'] ^ ko.bindingFlags.contentSet,
    'init': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        if (!bindingContext.$switchSkipNextArray)
            throw Error("case binding must only be used with a switch binding");
        if (bindingContext.$switchIndex !== undefined)
            throw Error("case binding cannot be nested");
        // initialize $switchIndex and push a new observable to $switchSkipNextArray
        bindingContext.$switchIndex = bindingContext.$switchSkipNextArray.length;
        bindingContext.$switchSkipNextArray.push(ko.observable(false));
        // call init()
        if (ko.bindingHandlers[binding]['init'])
            return ko.bindingHandlers[binding]['init'](element, function(){ return {}; });
    },
    'update': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var index = bindingContext.$switchIndex, result, skipNext;
        if (index && bindingContext.$switchSkipNextArray[index-1]()) {
            // an earlier case binding matched; so skip this one (and subsequent ones)
            result = false;
            skipNext = true;
        } else {
            // if result is true, will skip the subsequent cases
            skipNext = result = checkFunction(valueAccessor, bindingContext);
        }
        // call template update() with calculated value for 'if'
        ko.bindingHandlers[binding]['update'](element,
            makeValueAccessor(result), allBindingsAccessor, viewModel, bindingContext);
        bindingContext.$switchSkipNextArray[index](skipNext);
    }
    };
}

ko.bindingHandlers['case'] = makeCaseHandler('template');
ko.bindingRewriteValidators['case'] = false; // Can't rewrite control flow bindings
ko.virtualElements.allowedBindings['case'] = true;

ko.bindingHandlers['casenot'] = makeCaseHandler('template', true);
ko.bindingRewriteValidators['casenot'] = false; // Can't rewrite control flow bindings
ko.virtualElements.allowedBindings['casenot'] = true;

ko.bindingHandlers['case.visible'] = makeCaseHandler('visible');
ko.bindingHandlers['case.hidden'] = makeCaseHandler('visible', true);

ko.bindingHandlers['switch']['makeCaseHandler'] = makeCaseHandler;

})();
