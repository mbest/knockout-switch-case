// If used with the non-debug version, ko.virtualElements isn't exported
if (!ko.virtualElements)
    ko.virtualElements = {
        allowedBindings: [],
        nextSibling: function(node) { return node.nextSibling; }
    };
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
        var value = ko.utils.unwrapObservable(valueAccessor());
        var node, nextInQueue = nodesArray[0],
            self = ko.bindingHandlers['switch'],
            switchSkipNextArray = [],
            switchBindings = {
                $switchIndex: undefined,
                $switchSkipNextArray: switchSkipNextArray,
                $switchValueAccessor: valueAccessor,
                '$default': self.defaultvalue,
                '$else': self.defaultvalue,
                '$value': value
            };
        while (node = nextInQueue) {
            nextInQueue = ko.virtualElements.nextSibling(node);
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
        var index = bindingContext.$switchIndex;
        if (index && bindingContext.$switchSkipNextArray[index-1]()) {
            // an earlier case binding matched; so skip this one (and subsequent ones)
            bindingContext.$switchSkipNextArray[index](true);
            return false;
        } else {
            // Check value and determine result:
            //  If value is the special object $else, the result is always true (should always be the last case)
            //  If the control value is boolean, the result is the matching truthiness of the value
            //  If value is boolean, the result is the value (allows expressions instead of just simple matching)
            //  If value is an array, the result is true if the control value matches (strict) an item in the array
            //  Otherwise, the result is true if value matches the control value (loose)
            var value = ko.utils.unwrapObservable(valueAccessor()), result = true;
            if (value !== bindingContext['$else']) {
                var switchValue = ko.utils.unwrapObservable(bindingContext.$switchValueAccessor());
                result = (typeof switchValue == 'boolean')
                    ? (value ? switchValue : !switchValue)
                    : (typeof value == 'boolean')
                        ? value
                        : (value instanceof Array)
                            ? (ko.utils.arrayIndexOf(value, switchValue) !== -1)
                            : (value == switchValue);
            }
            bindingContext.$switchSkipNextArray[index](result); // skip the subsequent cases if result is true
            return result;
        }
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
        var self = self = ko.bindingHandlers['case'];
        // call template update() with calculated value for 'if'
        return ko.bindingHandlers['template']['update'](element, 
            self.makeTemplateValueAccessor(self.checkCase(valueAccessor, bindingContext)), 
            allBindingsAccessor, viewModel, bindingContext);
    }
};
ko.jsonExpressionRewriting.bindingRewriteValidators['case'] = false; // Can't rewrite control flow bindings
ko.virtualElements.allowedBindings['case'] = true;
