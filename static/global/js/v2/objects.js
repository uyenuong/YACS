//////////////////////////////// Class object ////////////////////////////////
// Based on john resig's simple javascript inheritance
(function(window, $, undefined){
var initializing = false;

window.Class = function (){};
window.Class.extend = function(attributes){
	var _super = this.prototype;

	initializing = true;
	var prototype = new this;
	initializing = false;

	// copy attributes over to the new class
	for (var name in attributes){
		prototype[name] = ($.isFunction(_super[name]) && $.isFunction(attributes[name])) ?
			(function(name, fn){
				return function(){
					var tmp = this._super;
					this._super = _super[name];
					var ret = fn.apply(this, arguments);
					this._super = tmp;
					return ret;
				};
			})(name, attributes[name]) :
			attributes[name];
	}

	function Class(){
		if (!initializing && this.init)
			this.init.apply(this, arguments);
	};
	Class.prototype = prototype;
	Class.prototype.constructor = Class;
	Class.extend = arguments.callee;
	return Class;
};

//////////////////////////////// Utility functions ////////////////////////////////
window.Utils = {
  integer: function(i){ return parseInt(i, 10); },
  getCookie: function(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
      var cookies = document.cookie.split(';');
      for (var i = 0; i < cookies.length; i++) {
        var cookie = jQuery.trim(cookies[i]);
        // Does this cookie string begin with the name we want?
        if (cookie.substring(0, name.length + 1) == (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  },
  CSRFToken: function(){
    return Utils.getCookie('csrftoken');
  },
  sendMessage: function(obj, method, args){
    return obj && obj[method] && obj[method].apply(context || obj, args || []);
  },
  keys: function(obj){
    var accum = [];
    for(var name in obj) accum.push(name);
    return accum;
  },
  values: function(obj){
    var accum = [];
    for(var name in obj) accum.push(obj[name]);
    return accum;
  }
}

})(window, jQuery);

//////////////////////////////// Core functions ////////////////////////////////
function assert(bool, message){
  if (!bool)
    throw message || "Assertion failed";
}

///////////////////////////////////////////////////
// global hooks

// modify ajax requests to use csrf token for local POST requests
// taken from https://docs.djangoproject.com/en/dev/ref/contrib/csrf/
$(document).ajaxSend(function(event, xhr, settings) {
    function sameOrigin(url) {
        // url could be relative or scheme relative or absolute
        var host = document.location.host; // host + port
        var protocol = document.location.protocol;
        var sr_origin = '//' + host;
        var origin = protocol + sr_origin;
        // Allow absolute or scheme relative URLs to same origin
        return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
            (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
            // or any other URL that isn't scheme relative or absolute i.e relative.
            !(/^(\/\/|http:|https:).*/.test(url));
    }
    function safeMethod(method) {
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }

    if (!safeMethod(settings.type) && sameOrigin(settings.url)) {
        xhr.setRequestHeader("X-CSRFToken", Utils.CSRFToken());
    }
});

//////////////////////////////// Extensions ////////////////////////////////
$.extend(Function.prototype, {
    // Returns a function with specified function context
	bind: function(obj){
		return (function(self){
			return function(){ return self.apply(obj, arguments); };
		})(this);
	},
    // function composition
    comp: function(){
      return (function(self, args){
        var a = args.slice(0); // clone() isn't defined yet
        return function(){ return self.apply(this, a.pushArray(arguments)); }
      })(this, Array.fromIterable(arguments));
    }
});


$.extend(jQuery.fn, {
  checked: function(){
    var checkboxes = this.filter('input[type=checkbox], input[type=radio]');
    if (arguments.length < 1)
      return checkboxes.attr('checked') !== undefined;
    else
      (arguments[0] ? checkboxes.attr('checked', 'checked') : checkboxes.removeAttr('checked'));
    return this;
  }
});

$.extend(String.prototype, {
    contains: function(str){ return this.indexOf(str) >= 0; },
    format: function(){
      if (arguments.length < 1)
        return this;
      // process like named argument (names pair up with object properties)
      if (arguments.length === 1 && $.type(arguments[0]) === 'object'){
        var obj = arguments[0];
        return this.replace(/{{ *([a-zA-Z0-9_-]+) *}}/g, function(match, identifer){
          return typeof obj[identifer] !== 'undefined' ? obj[identifer] : match;
        });
      }
      // process as numbered arguments (names pair up with argument indices)
      var args = arguments;
      return this.replace(/{{ *(\d+) *}}/g, function(match, index){
        return typeof args[index] !== 'undefined' ? args[index] : match;
      });
    },
    isBlank: function(){
      return this.trim() === '';
    },
	startsWith: function(str){
		return this.indexOf(str) === 0;
	},
	endsWith: function(str){
		return this.indexOf(str) === this.length - str.length;
	},
	trim: function(){
		return $.trim(this);
	}
});

$.extend(Array, {
  fromIterable: function(it){
    try {
      return Array.prototype.slice.call(it);
    }
    catch(err){
      var collection = new this;
      for (var i=0, l=it.length; i<l; i++)
        collection.push(it[i]);
      return collection;
    }
  }
});

$.extend(Array.prototype, {
    clone: Array.prototype.slice,
	contains: function(value){
		for(var i=0, l=this.length; i<l; i++)
			if (this[i] === value)
              return true;
        return false;
    },
    each: function(fn){
      for(var i=0, l=this.length; i<l; i++){
        var ret = fn.call(this[i], this[i], i);
        if (ret === 'continue') continue;
        if (ret === 'break') break;
      }
      return this;
    },
    // like each, except performs operations asynchronously
    // returns an array of all the timers.
    // Normal break & continue mechanisms do not work with this.
    asyncEach: function(fn, options){
      var opt = $.extend({
        delay: 10
      }, options);
      var accum = [];
      for(var i=0, l=this.length; i<l; i++){
        accum.push(setTimeout((function(value, index){
          return function(){ fn.call(value, value, index); };
        })(this[i], i), opt.delay * i));
      }
      return accum;
    },
	map: function(fn){
		var accum = [];
        this.each(function(val, i){ accum.push(fn.call(val, val, i)); });
		return accum;
	},
	filter: function(fn){
		var accum = [];
		for(var i=0, l=this.length; i<l; i++){
			if(fn.call(this[i], this[i], i))
				accum.push(this[i]);
		}
		return accum;
	},
    pushUnique: function(value){
      if (!this.contains(value))
        return this.push(value) || true;
      return false;
    },
    pushArray: function(arr){
      for(var i=0, l=arr.length; i<l; i++)
        this.push(arr[i]);
      return this;
    },
    unique: function(){
      var items = this.slice(0);
      items.sort();
      var prev = undefined;
      for (var i=items.length - 1; i>= 0; i--){
        if(prev === items[i])
          items.splice(i, 1);
        prev = items[i];
      }
      return items;
    },
    excludeFrom: function(items){
      var items = items.unique();
      return this.unique().filter(function(val){
        return !items.contains(val);
      });
    },
    removeItem: function(value){
      var success = false;
      for(var i=this.length-1; i>=0; i--){
        if (this[i] === value){
          this.splice(i, 1);
          success = true;
        }
      }
      return success;
    }
});

//////////////////////////////// Helper Objects ////////////////////////////////
var Inspector = Class.extend({
  init: function(obj){
    this.obj = obj;
  },
  getProperties: function(){
    if (this.obj === undefined) return [];
    var names = [];
    for(var name in this.obj)
      names.push(name);
    return names;
  },
  getOwnProperties: function(){
    var obj = this.obj;
    return this.getProperties().filter(function(value){
      return obj.hasOwnProperty(value);
    });
  }
});

var Fuse = Class.extend({
	timer: null,
	options: {
		delay: 200,
		trigger: function(){},
		cancelled: function(){}
	},
	init: function(options){
		this.options = $.extend({}, this.options, options);
	},
	start: function(delay){
		this.stop();
		var self = this;
		this.timer = setTimeout(function(){
			self.trigger();
		}, delay !== undefined ? delay : this.options.delay);
	},
	stop: function(suppressCancelEvent){
		if (this.timer){
			clearTimeout(this.timer);
			this.timer = null;
			if (!suppressCancelEvent)
				this.options.cancelled.call(this);
		}
	},
	trigger: function(){
		this.options.trigger.call(this);
		this.timer = null;
	}
});

// handles the associated events for showing activity indicators
// to the user (aka - we're busy doing something)
var ActivityResponder = Class.extend({
  options: {
    show: null,
    hide: null
  },
  _currentState: false,
  init: function(options){
    $.extend(this.options, options);
  },
  _show: function(){
    $.isFunction(this.options.show) ? this.options.show() : $.noop();
  },
  _hide: function(){
    $.isFunction(this.options.hide) ? this.options.hide() : $.noop();
  },
  show: function(){
    if (this._currentState) return;
    this._show();
    this._currentState = true;
    return this;
  },
  hide: function(){
    if (!this._currentState) return;
    this._hide();
    this._currentState = false;
    return this;
  },
  setVisibility: function(value){
    value ? this.show() : this.hide();
    return this;
  },
  isVisible: function(){ return this._currentState; }
});


// Provides a basic abstraction layer from the storage system
// Keys can only be strings and values have to be serializable.
// The default serialize & deserialize functions are JSON.stringify
// and $.parseJSON.
//
// This base implementation uses localStorage when possible and
// falls back to sessionStorage. Due to the extra library,
// all grade-A browsers (as defined by YUI), should support
// sessionStorage.
var Storage = Class.extend({
  options: {
    autoload: true,
    keyFormat: 'net.jeffhui.{{ type }}.{{ key }}',
    serialize: JSON.stringify,
    store: null,
    deserialize: $.parseJSON
  },
  keys: [],
  init: function(options){
    $.extend(this.options, options);
    if (this.options.autoload) this.load();
  },
  _getStore: function(){
    if (this.options.store)
      return this.options.store;
    if (window.localStorage) return window.localStorage;
    return window.sessionStorage;
  },
  _set: function(key, string){
    this._getStore().setItem(key, string);
  },
  _get: function(key){
    return this._getStore().getItem(key);
  },
  _remove: function(key){
    return this._getStore().removeItem(key);
  },
  _deserialize: function(string){
    return this.options.deserialize(string);
  },
  _serialize: function(obj){
    return this.options.serialize(obj);
  },
  _save: function(){
    // save internal information to storage
    this._set(this.getFullKey('keys', {isPrivate: true}));
  },
  load: function(){
    var raw = this._get(this._getFullKey('keys', {isPrivate: true}));
    this.keys = this._deserialize(raw);
  },
  _getFullKey: function(key, options){
    // private is used to indicate properties set used
    // by this storage system
    var opt = $.extend({
      isPrivate: false
    }, options);

    return this.options.keyFormat.format({
      type: opt.isPrivate ? 'private' : 'public',
      key: key
    });
  },
  set: function(key, value){
    assert($.type(key) === 'string', 'key must be a string.');
    var fullKey = this._getFullKey(key);
    this._set(fullKey, this._serialize(value));
    this._save();
  },
  get: function(key){
    assert($.type(key) === 'string', 'key must be a string.');
    var fullKey = this._getFullKey(key);
    return this._deserialize(this._get(fullKey));
  },
  contains: function(key){
    return this.keys.contains(key);
  },
  clear: function(){
    var self = this;
    this.keys.each(function(key){
      var fullKey = self._getFullKey(key);
      self._remove(fullKey);
    });
    this._save();
  }
});


//////////////////////////////// Realtime Search ////////////////////////////////

var RealtimeForm = Class.extend({
	options: {
		updateElement: $(),
		success: function(value){ this.html(value); },
		error: function(){ console.error('failed realtime form:', arguments); },
		complete: $.noop,
        activityResponder: null,
		dataType: undefined,
		url: null,
		method: null,
		cache: false,
		additionalPOST: '',
		additionalGET: '',
		suppressFormSubmit: false,
		triggerDelay: 200,
		customHandler: null
	},
	init: function(form, options){
		this.options = $.extend({}, this.options, options);
		this.form = $(form);
		this.fuse = new Fuse({
			delay: this.options.triggerDelay,
			trigger: this.sendRequest.bind(this),
			cancelled: this.stopRequest.bind(this)
		});
		this.attachEvents();
	},
    _asQueryString: function(obj){
      var type = $.type(obj);
      if (type === 'object')
        return $.param(obj);
      if (type === 'string')
        return obj
      return String(obj);
    },
	getURL: function(){
      var base = this.options['url'] || this.form.attr('action'),
          postfix = base.contains('?') ? '&' : '?',
          querystr = this.getFormMethod() !== 'GET' ? this._asQueryString(this.options.additionalGET) : '';
      return base + (querystr.isBlank() ? '' : postfix + querystr);
	},
    getFormMethod: function(){
      var m = this.form.attr('method');
      return m && m.toUpperCase();
    },
	getMethod: function(){
      return (this.options['method'] || this.getFormMethod()).toUpperCase();
	},
	getMethodData: function(){
		var formMethod = this.form.attr('method').toUpperCase(),
			type = this.getMethod().toUpperCase();
		if(['GET', 'POST'].contains(type)){
			var data = (type == formMethod ? this.form.serialize() : ''),
              params = {
                GET: this.options.additionalGET,
                POST: this.options.additionalPOST
              }[type];
            var paramsType = typeof params;
            if (paramsType === 'object')
              return data + '&' + $.param(params);
            if (paramsType === 'string' && !params.isBlank())
              return data + '&' + params;
            return data;
		} else throw "Invalid method type";
	},
	stopRequest: function(){
		if(this.request){
			this.request.abort();
			this.request = null;
		}
	},
	sendRequest: function(){
		var self = this;
		console.log('send', this.getURL(), this.getMethodData());
		self.request = $.ajax({
			url: this.getURL(),
			type: this.getMethod(),
			data: this.getMethodData(),
			dataType: this.options.dataType,
			cache: this.options.cache,
			success: function(){
				var $el = $(self.options.updateElement);
				self.options.success.apply($el, arguments);
			},
			error: function(){
				self.options.error.apply(this, arguments);
			},
			complete: function(){
				self.request = null;
				self.options.complete.apply(self, arguments);
				self.hideActivityIndicator();
			}
		});
	},
	initiateRequest: function(){
		this.showActivityIndicator();
		// call custom hook which can override the default behavior if necessary
		if (this.options.customHandler){
			if (this.options.customHandler(this.form, this.fuse))
				this.hideActivityIndicator();
		} else {
			this.fuse.start();
		}
	},
	formSubmitted: function(evt){
		if (this.options.suppressFormSubmit){
			this.initiateRequest();
		}
		return !this.options.suppressFormSubmit;
	},
	changed: function(evt){
		console.log(evt.type, evt);
		this.initiateRequest();
	},
	showActivityIndicator: function(){
      Utils.sendMessage(this.options.activityResponder, 'show');
	},
	hideActivityIndicator: function(){
      Utils.sendMessage(this.options.activityResponder, 'hide');
	},
	keyDownSelector: 'input[type=text], input[type=search], textarea',
	detachEvents: function(){
		if (this.options.suppressFormSubmit && this._formSubmitted)
			this.form.unbind('submit', this._formSubmit);

		if (this._changed){
			var self = this;
			this.form.find('input, textarea, select').each(function(){
				var $el = $(this);
				if ($el.is(self.keyDownSelector))
					$el.unbind('keyup', self._changed);
				if (this._formSubmitted && $el.is('input[type=search]'))
					$el.unbind('search', self._formSubmitted);
				$el.unbind('change', self._changed);
			});
		}
		if (this._formSubmitted){
			this.form.submit(this._formSubmit);
		}
	},
	attachEvents: function(){
		this.detachEvents();
		var self = this;
		this._changed = this.changed.bind(this);
		this.form.find('input, textarea, select').each(function(){
			var $el = $(this);
			if ($el.is(self.keyDownSelector))
				$el.keyup(self._changed);
			if ($el.is('input[type=search]'))
				$el.bind('search', self._changed);
			$el.bind('change', self._changed);
		});

		if (this.options.suppressFormSubmit){
			this._formSubmitted = this.formSubmitted.bind(this);
			this.form.submit(this._formSubmit);
		}
	}
});

//////////////////////////////// Course Selection ////////////////////////////////
var Conflicts = Class.extend({
  options: {
  },
  init: function(options){
    this.options = $.extend({}, this.options, options);
  }
});

var Selection = Class.extend({
  options: {
    course_id_format: 'selected_course_{{ cid }}',
    section_id_format: 'selected_course_{{ cid }}_{{ crn }}',
    checkbox_selector: '.course input[type=checkbox]',
    storage: new Storage(),
    storageKey: 'crns',
    autoload: true
  },
  init: function(options){
    this.crns = {};
    this.options = $.extend({}, this.options, options);
    if(this.options.autoload)
      this.load();
  },
  // returns object of course data
  _processCourseElement: function(el){
    var $el = $(el);
    var isNotBlank = function(){ return !this.isBlank(); };
    return {
      id: Utils.integer($el.attr('data-cid')),
      CRNs: $el.attr('data-crns').split(',').filter(isNotBlank).map(Utils.integer),
      fullCRNs: $el.attr('data-crns-full').split(',').filter(isNotBlank).map(Utils.integer)
    };
  },
  // returns an object for section data
  _processSectionElement: function(el){
    var $el = $(el);
    return {
      course_id: Utils.integer($el.attr('data-cid')),
      crn: Utils.integer($el.attr('data-crn'))
    };
  },
  _trigger: function(names, obj){
    var $self = $(this);
    for(var i=0, l=names.length; i<l; i++){
      $self.trigger(names[i], obj);
    }
  },
  _isCourseElement: function(el){
    return $(el).attr('data-crns-full') !== undefined;
  },
  _add: function(course_id, crn){
    this.crns[course_id] || (this.crns[course_id] = []);
    if (!this.crns[course_id].pushUnique(crn)) return false;
    this._trigger(['changed', 'changed:item'], {type: 'added', cid: course_id, crn: crn});
    return true;
  },
  addCourse: function(course_elem){
    var obj = this._processCourseElement(course_elem),
      crns = obj.CRNs.excludeFrom(obj.fullCRNs),
      added = false;
    for (var i=0, l=crns.length; i<l; i++)
      added = this._add(obj.id, crns[i]) || added;
    // if none were added (because all were full), explicitly add all sections
    if (!added){
      for (var i=0, l=obj.CRNs.length; i<l; i++)
        this._add(obj.id, obj.CRNs[i]);
    }
    this._trigger(['added', 'added:course'], {type: 'course', cid: obj.course_id});
    return added;
  },
  addSection: function(section_elem){
    var obj = this._processSectionElement(section_elem);
    var result = this._add(obj.course_id, obj.crn);
    this._trigger(['added', 'added:section'], {type: 'section', cid: obj.course_id, crn: obj.crn});
    return result;
  },
  add: function(course_or_section_elem){
    if (this._isCourseElement(course_or_section_elem))
      this.addCourse(course_or_section_elem);
    else
      this.addSection(course_or_section_elem);
  },
  _remove: function(course_id, crn){
    if (!(this.crns[course_id] && this.crns[course_id].removeItem(crn))) return;
    if (!this.crns[course_id].length)
      delete this.crns[course_id];
    this._trigger(['changed', 'changed:item'], {type: 'removed', cid: course_id, crn: crn});
  },
  removeCourse: function(course_elem){
    var obj = this._processCourseElement(course_elem);
    for (var i=0, l=obj.CRNs.length; i<l; i++)
      this._remove(obj.id, obj.CRNs[i]);
    this._trigger(['removed', 'removed:course'], {type: 'course', cid: obj.course_id});
  },
  removeSection: function(section_elem){
    var obj = this._processSectionElement(section_elem);
    this._remove(obj.course_id, obj.crn);
    this._trigger(['removed', 'removed:section'], {type: 'section', cid: obj.course_id, crn: obj.crn});
  },
  remove: function(course_or_section_elem){
    if (this._isCourseElement(course_or_section_elem))
      this.removeCourse(course_or_section_elem);
    else
      this.removeSection(course_or_section_elem);
  },
  toQueryString: function(){
    var parameters = {};
    var self = this;
    $.each(this.crns, function(cid, crns){
      parameters[self.options.course_id_format.format({cid: cid})] = "checked";
      crns.each(function(crn){
        parameters[self.options.section_id_format.format({cid: cid, crn: crn})] = "checked";
      });
    });
    return parameters;
  },
  save: function(){
    assert(this.options.storage, 'Storage must be defined in options to save');
    this.options.storage.set(this.options.storageKey, this.crns);
    this._trigger(['save'], this);
  },
  load: function(){
    assert(this.options.storage, 'Storage must be defined in options to load');
    this.set(this.options.storage.get(this.options.storageKey) || {});
    this._trigger(['load'], this);
    return this;
  },
  set: function(selected_crns){
    this.crns = $.extend({}, selected_crns);
    return this;
  },
  getCourseIds: function(){
    return new Inspector(this.crns).getOwnProperties().map(Utils.integer);
  },
  _getCourseElem: function(course_id){
    return $('#' + this.options.course_id_format.format({cid: course_id}));
  },
  _getSectionElem: function(course_id, crn){
    return $('#' + this.options.section_id_format.format({cid: course_id, crn: crn}));
  },
  refresh: function(){
    // update DOM to reflect selection
    $(this.options.checkbox_selector).checked(false); // this can be a bottleneck if there's enough elements
    var self = this;
    this.getCourseIds().each(function(cid){
      var crns = self.crns[cid];
      if (crns && crns.length){
        var $course = self._getCourseElem(cid).checked(true);
        self.crns[cid].each(function(crn){
          self._getSectionElem(cid, crn).checked(true);
        });
      }
    });
  }
});

//////////////////////////////// Scheduling ////////////////////////////////

// based on underscore's templating system
var Template = Class.extend({
  options: {
    string: null,
    selector: null,
    context: null,
    evaluate: /<%([\s\S]+?)%>/g,
    interpolate: /<%=([\s\S]+?)%>/g,
    escape: /<%-([\s\S]+?)%>/g,
    noMatch: /.^/
  },
  init: function(options){
    this.options = $.extend({}, this.options, options || {});
    assert(this.options.string || this.options.selector, 'string or selector option must be given.');
  },
  extendContext: function(context){
    this.options.context = $.extend({}, this.options.context || {}, context || {});
    return this;
  },
  _getContext: function(context){
    return $.extend({}, this.options.context, context || {});
  },
  _getString: function(){
    return this.options.string || $(this.options.selector).html();
  },
  _escapeHTML: function(string){
    return (''+string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g,'&#x2F;');
  },
  render: function(context){
    var data = this._getContext(context),
        opt = this.options,
        noMatch = this.options.noMatch;
    var tmpl = 'var __p=[],print=function(){__p.push.apply(__p,arguments);};' +
    'with(obj||{}){__p.push(\'' +
    this._getString().replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(opt.escape || noMatch, function(match, code) {
        return "',escapeHTML(" + code.replace(/\\'/g, "'") + "),'";
      })
      .replace(opt.interpolate || noMatch, function(match, code) {
        return "'," + code.replace(/\\'/g, "'") + ",'";
      })
      .replace(opt.evaluate || noMatch, function(match, code) {
        return "');" + code.replace(/\\'/g, "'")
                      .replace(/[\r\n\t]/g, ' ')
                      .replace(/\\\\/g, '\\') + ";__p.push('";
      })
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')
      + "');}return __p.join('');";
    var func = new Function('obj', 'escapeHTML', tmpl);
    return func(data, this._escapeHTML);
  }
});

var FunctionsContext = {
  time_parts: function(timestr){
    var parts = timestr.split(':'), // hour:min:sec
      i = Utils.integer;
    return {
      hour: i(parts[0]),
      minute: i(parts[1]),
      second: i(parts[2])
    };
  },
  time_to_seconds: function(timestr){
    var parts = FunctionsContext.time_parts(timestr); // hour:min:sec
    return parts.hour * 3600 + parts.minute * 60 + parts.second;
  },
  get_crns: Utils.values,
  create_color_map: function(schedule, maxcolors){
    var color_map = {},
      maxcolors = maxcolors || 9;
    Utils.keys(schedule).each(function(cid, i){
      color_map[cid] = (i % maxcolors) + 1;
    });
    return color_map;
  },
  humanize_time: function(timestr){
    var parts = timestr.split(':'),
        hour = parseInt(parts[0], 10),
        minutes = parseInt(parts[1], 10),
        apm = 'am';
    if (hour === 0){
      hour = 12;
    } else if (hour > 12){
      apm = 'pm';
      hour = hour - 12;
    } else if (hour === 12){
      apm = 'pm';
    }
    if (minutes !== 0)
      return hour + ":" + (minutes < 10 ? '0' : '') + minutes + apm;
    return hour + apm;
  },
  humanize_hour: function(hour){
    var apm = 'am';
    if (hour == 0) hour = 12;
    else if (hour >= 12) apm = 'pm';
    if (hour > 12) hour = hour - 12;
    return hour + " " + apm;
  },
  get_period_offset: function(period, height){
    var start = FunctionsContext.time_parts(period.start_time),
        time = start.minute * 60 + start.second;
    return time / 3600.0 * height;
  },
  get_period_height: function(period, height){
    var time = FunctionsContext.time_to_seconds(period.end_time) - time_to_seconds(period.start_time);
    //return 25 // 30 min time block
    //return 41.666666667 // 50 min time block
    return time / 3600.0 * height;
  }
};

var ScheduleUI = Class.extend({
  options: {
    selection: null, // object of course_id => crns
    target: '#schedules',
    schedulesURL: null,
    scheduleTemplate: null,
    thumbnailTemplate: null,
    noSchedulesTemplate: null,
    tooManyCRNsTemplate: null,
    periodHeight: 30,
    thumbnailPeriodHeight: 30
  },
  init: function(options){
    $.extend(this.options, options);
    assert(this.options.selection, 'selection option must be specified');
    assert(this.options.scheduleTemplate, 'scheduleTemplate option must be specified');
    assert(this.options.thumbnailTemplate, 'thumbnailTemplate option must be specified');
    assert(this.options.noSchedulesTemplate, 'noSchedulesTemplate option must be specified');
    assert(this.options.tooManyCRNsTemplate, 'tooManyCRNsTemplate  option must be specified');
    this.options.scheduleTemplate.extendContext(FunctionsContext);
    this.options.thumbnailTemplate.extendContext(FunctionsContext);
    this.options.noSchedulesTemplate.extendContext(FunctionsContext);
    this.options.tooManyCRNsTemplate.extendContext(FunctionsContext);
  },
  fetchSchedules: function(){
    var self = this;
    $.ajax(this.options.schedulesURL, {
      type: 'GET',
      dataType: 'json',
      success: function(json){
        if(json.schedules && json.schedules.length)
          self.render_schedules(json);
        else
          self.render_no_schedules();
      },
      error: function(xhr, status){
        // TODO: show a custom error page
        if(xhr.status === 403){
          self.render_too_many_crns();
        } else {
          //alert('Failed to get schedules... (are you connected to the internet?)');
          // TODO: log to the server (if we can)
          console.error('Failed to save to schedules: ' + xhr.status);
        }
      }
    });
    return this;
  },
  render_too_many_crns: function(){
    $(this.options.target).html(this.options.tooManyCRNsTemplate.render());
  },
  render_no_schedules: function(){
    $(this.options.target).html(this.options.noSchedulesTemplate.render({}));
  },
  render_schedules: function(json){
    var FC = FunctionsContext, self = this;
    var contextExtensions = {
      color_map: FC.create_color_map(json.schedules[0]),
      get_period_height: function(){
        return FC.get_period_height(period, this.is_thumbnail ? thumbnail_period_height : period_height);
      },
      get_period_offset: function(){
        return FC.get_period_offset(period, this.is_thumbnail ? thumbnail_period_height : period_height);
      }
    };
    this.options.scheduleTemplate.extendContext(contextExtensions);
    this.options.thumbnailTemplate.extendContext(contextExtensions);
    $(this.options.target).html('');

    var selected_schedule = get_schedule_id_from_state();
    json.schedules.asyncEach(function(schedule, i){
      var context = {
        sid: i + 1,
        schedule: schedule,
        is_thumbnail: false
      };
      var frag = $(self.scheduleTemplate.render(context));
      context.is_thumbnail = true;
      var thumb = $(self.thumbnailTemplate.render(context));
      if (i !== selected_schedule) {
        frag.hide();
        //thumb.hide(); // TOOD: show if thumbnail mode
      } else {
        thumb.addClass('selected');
      }
      $('#schedules').append(frag);
      $('#thumbnails').append(thumb);
      console.log('rendering ' + (i+1) + ' of ' + context.schedules.length);
    });
  }
});