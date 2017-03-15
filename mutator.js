(function () {

	const jsmeta = require("d__jsmeta");
	const validators = jsmeta.validators;
	
	/* adds behaviour to a thing */
	const Extender = 
	{
		/* copies members from source to target */
		addBehaviour : function(targetObj, sourceObj,/* expects array of members to ignore*/ excludeList)
		{   
			"use strict";
			validators.validateNotNullOrUndefined(sourceObj);
			validators.validateNotNullOrUndefined(targetObj);

			if(excludeList && Array.isArray(excludeList) == false)
				throw "exclusion array expected";
			
			for(var p in sourceObj)
			{
				if(excludeList)
					if(p in excludeList)
						continue;
				
				var member = sourceObj[p];
				var memberName = p;
				
				//remove any prior implementations
				if(p in targetObj)
					delete targetObj[p];
				
				//replace
				targetObj[p] = member;
			}
		},
		/* removes members from target using source as the list*/
		removeBehaviour : function (targetObj, sourceObj,  /* expects array of members to ignore*/ excludeList)
		{   
			"use strict";
			validators.validateNotNullOrUndefined(sourceObj);
			validators.validateNotNullOrUndefined(targetObj);
		
			if(excludeList && Array.isArray(excludeList) == false)
				throw "exclusion array expected";
			
			for(var p in sourceObj)
			{
				if(excludeList)
					if(p in excludeList)
						continue;
				
				if(p in targetObj)
					delete targetObj[p];
			}
		}
	};

	(function(){
		//lock it down
		Object.freeze(Extender); 
	})();
		
		
	const Decorator = 
	{
		/*
			Design Note: Uses a "structural decoration", ie. a decoration that references the decorated thing via a member, __decorated, rather than a private var, or a member with another name.  This facilitates extension as we have a known member, __decorated, that can be referenced by extending objects.  
		*/
		
		/* 
			given a decorator (ie. outermost thing), we give it a __decorated member and extend decorator with passthru decorated functionality.
			
			Notes:
				-if a decorator is not provided a blank object is created.
				-by default the decorator doesn't need to know anything about decorated, and can absorb its functionality via wrapping
				-if the member already exists on the decorator, it is assumed to be correctly implemented, and it is not wrapped
		*/
		decorate : function(/*if empty uses empty object*/decorator, decorated,/* expects array of members to ignore*/ excludeList)
		{   
			"use strict";
			validators.validateNotNullOrUndefined(decorated);

			decorator = decorator || {};
			
			decorator.__decorated = decorated;
			
			//if we're decorating a primitive, there is no implementation to copy over
			if(jsmeta.isPrimitive(decorated))
				return decorator;
			
			//construct the wrapped member
			for(var p in decorated)
			{
				var member = decorated[p];
				var memberName = p;

				//skip out filters
				if(memberName == "__decorated")
					continue;
				
				if(excludeList)
					if(p in excludeList)
						continue;
				
				//if the decorator has the member already, assume it's intentional
				if(jsmeta.hasMembers(decorator, memberName))
					continue;
				
				//wrap
				if (jsmeta.isFunction(member)) {
					
					var sig = jsmeta.getFunctionRawSignature(member);

					//build a new function to wrap the original with the same signature
					var newFnText = "newFn = " + sig + 
					"         { " + 
					"var args = arguments;" + 
					"var fn = this['__decorated']." + memberName + ";" +
					"return fn.apply(this['__decorated'], args);" +
					"};"
					
					var newFn = null;
					//console.log(newFnText);
					eval(newFnText); //compile it

					Object.defineProperty(decorator, memberName, 
					{
						value: newFn,
						enumerable:true,
						configurable:true
					});
				}
				else{
					//copy the property over

					var evalText = "Object.defineProperty(decorator,'" + 
						memberName + "'," + 
						"{" +
							"get: function()"+
							"{" +
								"return this['__decorated']." + memberName + ";" +    
							"}," +
							"set: function(val)" +
							"{" +
								"this['__decorated']." + memberName + " = val;" + 
							"}," +
							"enumerable:true,configurable:true" +
						"}" +
					");";
					//console.log(evalText);
					eval(evalText);
				}

			}
		
			return decorator;
		},
		/* removes a decoration layer*/
		undecorate : function(decorator)
		{
			"use strict";
			validators.validateNotNullOrUndefined(decorator);
			
			if(!decorator.__decorated)
				return decorator;
			
			return decorator.__decorated;
		},
		walk : function(decorator, /*expects a function(layer) return true to stop walk*/ visitorFn)
		{
			"use strict";
			validators.validateNotNullOrUndefined(decorator);
			validators.validateIsFunction(visitorFn);
			
			var rv = null;
			
			var item = decorator;
			while(!jsmeta.isNullOrUndefined(item))
			{	
				if(visitorFn(item))
				{
					rv = item;
					break;
				}
				item = item.__decorated;
			}
			return rv;
		},
		/*walks decorated chain until meets instanceof type*/
		asInstanceOf : function(decorator, /*expects a constructor function*/ type)
		{
			"use strict";
			validators.validateNotNullOrUndefined(decorator);
			
			var rv = null;
			
			var item = decorator;
			while(!jsmeta.isNullOrUndefined(item))
			{	
				if(item instanceof type)
				{
					rv = item;
					break;
				}
				item = item.__decorated;
			}
			return rv;
		},
		/*does doFn on asInstanceOf type*/
		doAsInstanceOf : function(decorator, /*expects a constructor function*/ type, /*expects a function(type) */ doFn)
		{
			"use strict";
			validators.validateNotNullOrUndefined(decorator);
			validators.validateIsFunction(doFn);
			
			var as = Decorator.asInstanceOf(decorator, type);
			if(!jsmeta.isNullOrUndefined(as))
				doFn(as);
			
			return decorator;
		},
		/*validates if the decoration has a decorated that is the same as expectedDecorated, and has the same signatures*/
		validateDecoration : function(decoration, expectedDecorated,/* expects array of members to ignore*/ excludeList)
		{    
			"use strict";
			validators.validateNotNullOrUndefined(decoration);
			validators.validateNotNullOrUndefined(expectedDecorated);
			
			//validate there is a decorator member that is the same as item
			var decorated = decoration["__decorated"]; 
			validators.validateNotNullOrUndefined(decorated);
			
			if(decorated !== expectedDecorated)
				throw "invalid decorated";
			
			//validate the old item's signature is the same as the new item
			var finalExcludeList = ["__decorated"];
			
			if(!jsmeta.isNullOrUndefined(excludeList))
				finalExcludeList.concat(excludeList);
			
			if(!jsmeta.isPrimitive(expectedDecorated))
			{
				validators.assert(function(){
					return jsmeta.hasSameObjectSignaturesAsTemplate(expectedDecorated, decoration, finalExcludeList);
				});
			}
		} 
	};
	(function(){
		//lock it down
		Object.freeze(Decorator); 
	})();

	/* 
		class that decorates a thing such that all member calls are hooked both before and after the decorated call.
		
		preDecoratingFn is a validation/scrub hook that happens before the decorated call is made.  
			-expects function(memberName, decorator, args)
				-args is an array of argument values
				-returns 
				{
					success:true/false, //false will stop the decorated call
					newArgs:scrubbed value of the args     
				}
		
		postDecoratingFn is a post-call validation/scrub
			-expects function(memberName, decorator, args, rv)
				-args is an array of argument values
				-rv is the result of the decorated call
				-returns scrubbed return value
		
	*/
	const CrossCuttingDecorator = {
		decorate : function(decorated, 
		/*function(memberName, decorator, args) returns { success : true/false, newArgs: }*/ preDecoratingFn,
		/*function(memberName, decorator, args, rv) returns newRv*/ postDecoratingFn, 
		/* expects array of members to ignore*/ decoratedExcludeList)
		{
			"use strict";
			validators.validateNotNullOrUndefined(decorated);

			var decorator = 
			{
				__decorated : decorated
			};
				
			/* the function that all wrapped members (ie. methods, gets/sets) invoke */
			var _crossCuttingFn = function(memberName, decorator, args)
			{
				var decorated = decorator.__decorated;
				var member = decorated[memberName];
				
				if (typeof member === 'function') {

					//run the pre function to scrub the args
					var preRv = { success: true, newArgs: args};
					if(!jsmeta.isNullOrUndefined(preDecoratingFn))
						preRv = preDecoratingFn(memberName, decorator, args);
					
					//if the scrub indicates continuing, run the function
					if(preRv !== undefined && preRv !== null && preRv.success)
					{
						//run the function
						var rv = member.apply(decorated, preRv.newArgs);

						//run the post function to scrub the rv
						if(!jsmeta.isNullOrUndefined(postDecoratingFn))
						{
							var newRv = postDecoratingFn(memberName, decorator, preRv.newArgs, rv);
							return newRv;
						}
						else
						{
							return rv;
						}
					}
				}
				else
				{
					if(args === null)
					{
						//it's a get
						
						//run the pre function
						var preRv = { success: true, newArgs: null};
						if(!jsmeta.isNullOrUndefined(preDecoratingFn))
							 preRv = preDecoratingFn(memberName, decorator, null);
						
						//get is allowed?
						if(preRv !== undefined && preRv !== null && preRv.success)
						{
							//get the value
							var rv = decorated[memberName];

							//run the post function
							if(!jsmeta.isNullOrUndefined(postDecoratingFn))
							{
								var newRv = postDecoratingFn(memberName, decorator, preRv.newArgs, rv);
								return newRv;
							}

							return rv;
						}
					}
					else
					{
						//it's a set
					
						//run the pre function to scrub the set value
						var preRv = { success: true, newArgs: args};
						if(!jsmeta.isNullOrUndefined(preDecoratingFn))
							preRv = preDecoratingFn(memberName, decorator, args);
					
						//we're allowed to set?
						if(preRv !== undefined && preRv !== null && preRv.success)
						{
							//set the value
							decorated[memberName] = args;
							
							//run the post function
							if(!jsmeta.isNullOrUndefined(postDecoratingFn))
							{
								postDecoratingFn(memberName, decorator, preRv.newArgs, null);
							}
						}
					}
				}
			};
			
			var newDecoratedExcludeList = ["__decorated"];
			if(!jsmeta.isNullOrUndefined(decoratedExcludeList))
				newDecoratedExcludeList.concat(decoratedExcludeList);
			
			//construct the wrapped member
			for(var p in decorated)
			{
				var member = decorated[p];
				var memberName = p;

				if(p in newDecoratedExcludeList)
					continue;
				
				if (typeof member === 'function') {

					var sig = jsmeta.getFunctionRawSignature(member);

					//build a new function to wrap the original with the same signature
					var newFnText = sig + 
					"         { " + 
					"var args = arguments;" + 
					"return _crossCuttingFn('" + memberName + "',this,args);" +
					"};"
					var newFn = null;
					newFnText = "newFn = " + newFnText;
					//console.log(newFnText);

					eval(newFnText); //compile it

					Object.defineProperty(decorator, memberName, 
					{
						enumerable:true,
						configurable : false, 
						writable : false,
						value: newFn
					});
				}
				else{
					//copy the property over
					
					var evalText = "Object.defineProperty(decorator,'" + 
						memberName + "'," + 
						"{" +
							"get: function()"+
							"{" +
								"return _crossCuttingFn('" + memberName + "', this, null);" +    
							"}," +
							"set: function(val)" +
							"{" +
								"_crossCuttingFn('" + memberName + "', this, val);" + 
							"}," +
							"enumerable:true, configurable : false" +
						"}" +
					");";
					//console.log(evalText);
					eval(evalText);
				}
			}
			return decorator;
		}
	};
	(function(){
		//lock it down
		Object.freeze(CrossCuttingDecorator);
	})();

	const SelfDecoratingBehaviour =
	{
		//the behaviour we mixin
		template : 
		{
			outer : null,
			walkLayers : function(/*expects visitor function return true to stop walk*/ visitorFn)
			{
				return Decorator.walk(this.outer, visitorFn);
			},
			getFromOuter : function(positionFromOuter)
			{
				validators.validateNotNullOrUndefined(positionFromOuter);
				validators.assert(function(){return positionFromOuter >= 0;});
				
				var rv = null;
				
				var i=0;
				rv = this.walkLayers(function(layer)
					{
						if(i == positionFromOuter)
							return true;
						
						i++;
						return false;
					});
					
				return rv;
			},
			decorate : function(decorator)
			{
				var rv = Decorator.decorate(decorator, this.outer);
				
				//percolate outer thru the decoration
				rv.walkLayers(function(layer)
				{
					if(layer.outer)
						layer.outer = rv;
					
					return false;
				});
				
				return rv;
			},
			decorateNew : function(/*expects function type declaration that expects an arg of something to decorate */ fn)
			{
				validators.validateNotNullOrUndefined(fn);
				validators.validateIsFunction(fn);
				
				var args = [this.outer].concat(Array.prototype.slice.call(arguments));
				
				function newCall(fn)
				{
					return new (Function.prototype.bind.apply(fn, args));
				};
				
				//create decorator object
				var decorator = newCall(fn);
			
				return this.decorate(decorator);
			},
			undecorate : function()
			{
				var rv = Decorator.undecorate(this.outer);
							
				//percolate outer thru the decoration
				rv.walkLayers(function(layer)
				{
					if(layer.outer)
						layer.outer = rv;
					
					return false;
				});

				return rv;
			},
			//walks the decorated chain looking for a layer that's an instance of the specified type
			asInstanceOf : function(/*expects constructor function*/ type)
			{
				//walk from the top down
				return Decorator.asInstanceOf(this.outer, type);
			},
			//peforms an action as the specified asInstanceOf 
			doAsInstanceOf : function(/*expects constructor function*/ type, /*expects a function(type) */ doFn)
			{
				Decorator.doAsInstanceOf(this.outer,type, doFn);
				return this.outer;
			},
			//performs an action as the outer decoration
			doAs : function(/*expects a function(outerDecoration)*/ doFn)
			{
				doFn(this.outer);	
				return this.outer;
			}
		},
		//extends obj with SelfDecoratingBehaviour 
		give : function(obj)
		{		
			validators.validateNotNullOrUndefined(obj);
			
			Extender.addBehaviour(obj, SelfDecoratingBehaviour.template);
			obj.outer = obj;
			
			return obj;
		}
	};	

	//a thing that grows/mutates using the mutations above
	function Seed(core)
	{
		SelfDecoratingBehaviour.give(this);	
		
		//private 
		var __self = this;
		var __core = core;
		
		//publics
		Object.defineProperty(__self, "core", 
			{ 
				get : function() {return  __core;},
				enumerable: true,
				configurable: false
			}
		);
	}

	(function(){
		
		Seed.new = function(core){return new Seed(core);}
		
		//lock it down
		Object.freeze(Seed);
	})();
	
	//wire up the exports
	var mutator =
	{
		extender : Extender,
		decorator : Decorator,
		crossCuttingDecorator : CrossCuttingDecorator,
		seed : Seed
	};	
	
	// Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = mutator;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return mutator;
        });
    }
    // included directly via <script> tag
    else {
        this.mutator = mutator;
    }
	
})();
	
