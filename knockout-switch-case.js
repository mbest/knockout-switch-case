// If used with the non-debug version, ko.virtualElements isn't exported
if (!ko.virtualElements)
    ko.virtualElements = { allowedBindings: ko.allowedVirtualElementBindings };
if (!ko.nativeTemplateEngine.instance)
    ko.nativeTemplateEngine.instance = new ko.nativeTemplateEngine();

ko.bindingHandlers['switch'] = {
    defaultvalue: {},
    'init': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        // template.init extracts the child elements into an anonymousTemplate
        ko.bindingHandlers['template']['init'](element, function(){ return {}; });
        // add the copied nodes back in
        var nodesArray = ko.nativeTemplateEngine.instance['renderTemplateSource'](new ko.templateSources.anonymousTemplate(element));
        if (element.nodeType == 8) {
            var endCommentNode = element.nextSibling, parent = element.parentNode;
            for (var i = 0, j = nodesArray.length; i < j; i++)
                parent.insertBefore(nodesArray[i], endCommentNode);
        } else {
            for (var i = 0, j = nodesArray.length; i < j; i++)
                element.appendChild(nodesArray[i]);
        }
        var value = ko.utils.unwrapObservable(valueAccessor()),
            switchSkipNextArray = [],
            switchBindings = {
                $switchIndex: undefined,
                $switchSkipNextArray: switchSkipNextArray,
                $switchValueAccessor: valueAccessor,
                '$default': this.defaultvalue,
                '$else': this.defaultvalue,
                '$value': value
            };
        // node loop logic copied from src/templating.js
        var parent = nodesArray.length ? nodesArray[0].parentNode : null;
        for (var i = 0, n = nodesArray.length; i < n; i++) {
            var node = nodesArray[i];
            if (node.parentNode !== parent) // Skip anything that has been removed during binding
                continue;
            switch (node.nodeType) {
            case 1: case 8:
                // Each child element gets a new binding context so it has it's own $switchIndex property.
                // The other properties are shared since they're objects.
                var newContext = ko.utils.extend(ko.utils.extend(new bindingContext.constructor(), bindingContext), switchBindings);
                ko.applyBindings(newContext, node);
                break;
            }
        }
        return { 'controlsDescendantBindings': true };
    }
};
ko.jsonExpressionRewriting.bindingRewriteValidators['switch'] = false; // Can't rewrite control flow bindings
ko.virtualElements.allowedBindings['switch'] = true;

ko.bindingHandlers['case'] = {
    checkCase: function(valueAccessor, bindingContext) {
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
    },
    makeTemplateValueAccessor: function(ifValue) {
        return function() { return { 'if': ifValue, 'templateEngine': ko.nativeTemplateEngine.instance } };
    },
    'init': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        if (!bindingContext.$switchSkipNextArray)
            throw "case binding must only be used with a switch binding";
        if (bindingContext.$switchIndex !== undefined)
            throw "case binding cannot be nested";
        // initialize $switchIndex and push a new observable to $switchSkipNextArray
        bindingContext.$switchIndex = bindingContext.$switchSkipNextArray.length;
        bindingContext.$switchSkipNextArray.push(ko.observable(false));
        // call template init() to initialize template
        return ko.bindingHandlers['template']['init'](element, function(){ return {}; });
    },
    'update': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var index = bindingContext.$switchIndex, result, skipNext;
        if (index && bindingContext.$switchSkipNextArray[index-1]()) {
            // an earlier case binding matched; so skip this one (and subsequent ones)
            result = false;
            skipNext = true;
        } else {
            // if result is true, will skip the subsequent cases
            skipNext = result = this.checkCase(valueAccessor, bindingContext);
        }
        // call template update() with calculated value for 'if'
        ko.bindingHandlers['template']['update'](element,
            this.makeTemplateValueAccessor(result), allBindingsAccessor, viewModel, bindingContext);
        bindingContext.$switchSkipNextArray[index](skipNext);
    }
};
ko.jsonExpressionRewriting.bindingRewriteValidators['case'] = false; // Can't rewrite control flow bindings
ko.virtualElements.allowedBindings['case'] = true;

ko.bindingHandlers['casenot'] = ko.utils.extend({}, ko.bindingHandlers['case']);
ko.bindingHandlers['casenot'].checkCase = function(valueAccessor, bindingContext) {
    return !ko.bindingHandlers['case'].checkCase.call(this, valueAccessor, bindingContext);
}

ko.jsonExpressionRewriting.bindingRewriteValidators['casenot'] = false; // Can't rewrite control flow bindings
ko.virtualElements.allowedBindings['casenot'] = true;

// bind functions to objects so we can use 'this' inside
ko.bindingHandlers['switch']['init'] = ko.bindingHandlers['switch']['init'].bind(ko.bindingHandlers['switch']);
ko.bindingHandlers['case']['update'] = ko.bindingHandlers['case']['update'].bind(ko.bindingHandlers['case']);
ko.bindingHandlers['casenot']['update'] = ko.bindingHandlers['casenot']['update'].bind(ko.bindingHandlers['casenot']);
