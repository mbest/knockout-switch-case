/**
 * @license SWITCH/CASE binding for tko (Knockout v4) https://tko.io/
 * (c) Michael Best
 * License: MIT (http://www.opensource.org/licenses/mit-license.php)
 * Version 3.0.0
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['knockout'], factory)
  } else {
    // Browser globals
    factory(root.ko)
  }
}(this, function (ko) {
  'use strict'

  if (parseInt(ko.version) < 4) { throw Error('Switch-case requires at least Knockout 4.0') }

  const $skipNextArray = Symbol('tko switch skip')
  const $valueAccessor = Symbol('tko switch value')
  const $matchedDefault = Symbol('tko switch matchedDefault')
  const $index = Symbol('tko switch index')
  const $negate = Symbol('tko case negate')
  const DEFAULT_VALUE = {}

  function checkCase (value, bindingContext) {
    // Check value and determine result:
    //  If the control value is boolean, the result is the matching truthiness of the value
    //  If value is boolean, the result is the value (allows expressions instead of just simple matching)
    //  If value is an array, the result is true if the control value matches (strict) an item in the array
    //  Otherwise, the result is true if value matches the control value (loose)
    const switchValue = ko.unwrap(bindingContext[$valueAccessor]())
    return (typeof switchValue === 'boolean')
      ? (value ? switchValue : !switchValue)
      : (typeof value === 'boolean')
          ? value
          : (value instanceof Array)
              ? (ko.utils.arrayIndexOf(value, switchValue) !== -1)
              : (value === switchValue)
  }

  class SwitchHandler extends ko.BindingHandler {
    constructor (params) {
      super(params)
      const { $element, valueAccessor, $context } = params

      const skipNextArray = []
      const matchedDefault = ko.observable(true)
      const contexts = []

      // Update $value in each context when it changes
      ko.computed(function () {
        const value = ko.unwrap(valueAccessor())
        ko.utils.arrayForEach(contexts, function (context) {
          context.$value = value
        })
      }, null, { disposeWhenNodeIsRemoved: $element })

      // Each child element gets a new binding context so it can set its own $index property.
      // The other properties will be shared since they're objects.
      let node, newContext
      let nextInQueue = ko.virtualElements.firstChild($element)
      while ((node = nextInQueue)) {
        nextInQueue = ko.virtualElements.nextSibling(node)
        switch (node.nodeType) {
          case 1: case 8:
            newContext = $context.extend(function () {
              this.$default = this.$else = DEFAULT_VALUE
              this[$skipNextArray] = skipNextArray
              this[$valueAccessor] = valueAccessor
              this[$matchedDefault] = matchedDefault
            })
            // Set initial value of context[$index] to undefined
            newContext[$index] = undefined
            ko.applyBindings(newContext, node)
            // Add the context to the list to be updated if this section contained a case binding
            if (newContext[$index] !== undefined) {
              contexts.push(newContext)
            }
            break
        }
      }
    }

    get controlsDescendants () { return true }

    static get allowVirtualElements () { return true }

    static preprocess (value) {
      return value || 'true'
    }
  }

  class CaseHandler extends ko.bindingHandlers.if {
    constructor (params) {
      const { $element, valueAccessor, $context } = params
      const negate = params[$negate]

      if (!$context[$skipNextArray]) {
        throw Error('case binding must only be used with a switch binding')
      }
      if ($context[$index] !== undefined) {
        throw Error('case binding cannot be nested')
      }

      const caseValue = ko.observable(false)
      params.valueAccessor = () => caseValue
      super(params)

      // Initialize $switchIndex and push a new observable to $switchSkipNextArray
      $context[$index] = $context[$skipNextArray].push(ko.observable(false)) - 1

      ko.computed(() => {
        const index = $context[$index]
        const isLast = (index === $context[$skipNextArray].length - 1)
        let result; let skipNext; let noDefault

        if (index && $context[$skipNextArray][index - 1]()) {
          // An earlier case binding matched: skip this one (and subsequent ones)
          result = false
          skipNext = true
        } else {
          const value = ko.unwrap(valueAccessor())
          if (value === DEFAULT_VALUE) {
            // If value is the special object $else, the result depends on the other case values.
            // If we're the last *case* item, the value must be true. $switchDefault will get
            // updated to *true* below, but that won't necessarily update us because it would
            // require a recursive update.
            result = $context[$matchedDefault]() || isLast
            skipNext = false
          } else {
            // If result is true, we will skip the subsequent cases (and any default cases)
            const res = checkCase(value, $context)
            noDefault = skipNext = result = negate ? !res : res
          }
        }

        // Set the observable used by the superclass
        caseValue(result)

        // Update the observable "skip next" value; if the value is changed, this will update the
        // subsequent case item.
        $context[$skipNextArray][index](skipNext)

        // Update $switchDefault to false if a non-default case item has matched.
        // Update it to true if we're the last item and none of items have matched.
        // (Initially, every item will be the last, but it doesn't matter.)
        if (noDefault) {
          $context[$matchedDefault](false)
        } else if (!skipNext && isLast) {
          $context[$matchedDefault](true)
        }
      },
      null, { disposeWhenNodeIsRemoved: $element })
    }
  }

  class CaseNotHandler extends CaseHandler {
    constructor (params) {
      params[$negate] = true
      super(params)
    }
  }

  SwitchHandler.registerAs('switch')
  CaseHandler.registerAs('case')
  CaseNotHandler.registerAs('casenot')

  // TODO: case.visible
}))
