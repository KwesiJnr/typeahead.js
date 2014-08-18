/*
 * typeahead.js
 * https://github.com/twitter/typeahead.js
 * Copyright 2013-2014 Twitter, Inc. and other contributors; Licensed MIT
 */

var Dataset = (function() {
  'use strict';

  var keys;

  keys = {
    val: 'tt-selectable-display',
    obj: 'tt-selectable-object'
  };

  // constructor
  // -----------

  function Dataset(o, www) {
    o = o || {};
    o.templates = o.templates || {};

    if (!o.source) {
      $.error('missing source');
    }

    if (o.name && !isValidName(o.name)) {
      $.error('invalid dataset name: ' + o.name);
    }

    www.mixin(this);

    this.highlight = !!o.highlight;
    this.name = o.name || _.getUniqueId();

    this.source = o.source;
    this.displayFn = getDisplayFn(o.display || o.displayKey);
    this.templates = getTemplates(o.templates, this.displayFn);

    // TODO: comment
    this.expectAsyncResults = this.source.length > 1;

    this.$el = $(this.html.dataset.replace('%CLASS%', this.name));
  }

  // static methods
  // --------------

  Dataset.extractData = function extractData(el) {
    var $el = $(el);

    if ($el.data(keys.obj)) {
      return {
        val: $el.data(keys.val) || '',
        obj: $el.data(keys.obj) || null
      };
    }

    return null;
  };

  // instance methods
  // ----------------

  _.mixin(Dataset.prototype, EventEmitter, {

    // ### private

    _overwrite: function overwrite(query, results) {
      this.$el.empty();
      results = results || [];

      if (results.length) {
        this.$el.html(this._getResultsHtml(query, results));
      }

      else if (this.expectAsyncResults && this.templates.pending) {
        // TODO: render pending temlate
      }

      else if (!this.expectAsyncResults && this.templates.notFound) {
        // TODO: render empty temlate
      }

      this.trigger('rendered', this.name, results);
    },

    _append: function append(query, results) {
      results = results || [];

      // TODO: remove pending template if shown
      if (results.length) {
        this.$el.append(this._getResultsHtml(query, results));
      }

      else if (this.templates.notFound) {
        // TODO: render empty temlate
      }

      this.trigger('rendered', this.name, results);
    },

    _getResultsHtml: function getResultsHtml(query, results) {
      var that = this, fragment;

      fragment = document.createDocumentFragment();
      _.each(results, function getResultNode(result) {
        var $el;

        $el = $(that.html.result)
        .append(that.templates.result(result))
        .data(keys.val, that.displayFn(result))
        .data(keys.obj, result);

        fragment.appendChild($el[0]);
      });

      this.highlight && highlight({
        className: this.classes.highlight,
        node: fragment,
        pattern: query
      });

      return fragment;
    },

    // ### public

    getRoot: function getRoot() {
      return this.$el;
    },

    update: function update(query) {
      var that = this, canceled = false, results;

      // cancel possible pending update
      this.cancel();

      this.cancel = function cancel() {
        canceled = true;
        that.cancel = $.noop;
        that.expectAsyncResults && that.trigger('asyncCanceled', query);
      };

      results = this.source(query, append);
      this._overwrite(query, results);

      this.expectAsyncResults && this.trigger('asyncRequested', query);

      function append(results) {
        // if the update has been canceled or if the query has changed
        // do not render the results as they've become outdated
        if (!canceled) {
          that.cancel = $.noop;
          that._append(query, results);
          that.expectAsyncResults && that.trigger('asyncReceived', query);
        }
      }
    },

    // cancel function gets set in #update
    cancel: $.noop,

    clear: function clear() {
      this.cancel();
      this.$el.empty();
      this.trigger('rendered');
    },

    isEmpty: function isEmpty() {
      return this.$el.is(':empty');
    },

    destroy: function destroy() {
      this.$el = null;
    }
  });

  return Dataset;

  // helper functions
  // ----------------

  function getDisplayFn(display) {
    display = display || 'value';

    return _.isFunction(display) ? display : displayFn;

    function displayFn(obj) { return obj[display]; }
  }

  function getTemplates(templates, displayFn) {
    return {
      empty: templates.empty && _.templatify(templates.empty),
      header: templates.header && _.templatify(templates.header),
      footer: templates.footer && _.templatify(templates.footer),
      result: templates.result || resultTemplate
    };

    function resultTemplate(context) {
      return '<p>' + displayFn(context) + '</p>';
    }
  }

  function isValidName(str) {
    // dashes, underscores, letters, and numbers
    return (/^[_a-zA-Z0-9-]+$/).test(str);
  }
})();
