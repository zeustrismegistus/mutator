const Code = require('code');
const Lab = require('lab');
const lab = exports.lab = Lab.script();

const describe = lab.describe;
const it = lab.it;
const before = lab.before;
const after = lab.after;
const expect = Code.expect;

var jsmeta = require('d__jsmeta');
var mutator = require('./../mutator.js');


describe('using mutator', () => {

	var builder;

    before((done) => {
        done();
    });

    after((done) => {
        done();
    });

    it('extends some stuff ', (done) => {
	
		var testObj = {
			propA : 'A',
			propB : 'B',
			testFn : function testFn_fake(a,b,c,d){

				//do nothing
				var rv = a + b +c +d;
				return rv;
			}
		};
		var target = {};
		mutator.extender.addBehaviour(target, testObj);
		expect(jsmeta.hasSameObjectSignaturesAsTemplate(testObj,target)).to.equal(true);
		mutator.extender.removeBehaviour(target, testObj);
		expect(jsmeta.hasSameObjectSignaturesAsTemplate(testObj,target)).to.equal(false);
		
		var notCopy = {};
		mutator.extender.addBehaviour(notCopy, testObj, ['testFn']);
		expect(jsmeta.hasSameObjectSignaturesAsTemplate(testObj,notCopy)).to.equal(false);
		
		expect(function(){return mutator.extender.addBehaviour({propA:'a'}, testObj, {});}).to.throw(Error, "exclusion array expected");
		expect(mutator.extender.addBehaviour({propA:'a'}, testObj).propA).to.equal('A');

		expect(function(){return mutator.extender.removeBehaviour({propA:'a'}, testObj, {});}).to.throw(Error, "exclusion array expected");
		expect(mutator.extender.removeBehaviour({propA:'a'}, testObj, ['propA']).propA).to.equal('a');
		
		done();
    });

    it('decorates some stuff ', (done) => {
	
		var testObj = {
			propA : 'A',
			propB : 'B',
			testFn : function testFn_fake(a,b,c,d){

				//do nothing
				var rv = a + b +c +d;
				return rv;
			}
		};
		testObj["testFn2"] = function testFn2_fake() 
		{ 
			//do nothing
		};

		var TestObjTester = 
		{
			test :  function(obj)
			{
				expect(obj.propA).to.equal('A');
				expect(obj.propB).to.equal('B');
				expect(jsmeta.hasFunctionArgNames(obj.testFn, ['a','b','c','d'])).to.equal(true);
				expect(obj.testFn('a1','b1','c1','d1')).to.equal('a1b1c1d1');
				expect(jsmeta.hasMembers(obj, 'testFn2')).to.equal(true);
			}
		};
		
		var target = mutator.decorator.decorate({}, testObj);
		TestObjTester.test(testObj);
		TestObjTester.test(target);
		
		//do edges
		var target2 = mutator.decorator.decorate(null, testObj);
		TestObjTester.test(target2);
		
		var target3= mutator.decorator.decorate(null, testObj, ['propA']);
		expect(target3.propA).to.equal(undefined);
		
		//undecorate
		expect(function(){return mutator.decorator.undecorate();}).to.throw(Error, "undefined");
		expect(function(){return mutator.decorator.undecorate(null);}).to.throw(Error, "null");
		
		var target3undecorated = mutator.decorator.undecorate(target3);
		var target3undecoratedtwice = mutator.decorator.undecorate(target3undecorated);
		
		//walk 
		mutator.decorator.walk(target3, function(layer){return false;});
		
		//validate decoration
		mutator.decorator.validateDecoration(target, testObj);
		expect(function(){mutator.decorator.validateDecoration(target, {});}).to.throw(Error, "invalid decorated");
		mutator.decorator.validateDecoration(target, testObj, ['bogusProp']);
		
		var target4 = mutator.decorator.decorate({propA:'a'},7);
		mutator.decorator.validateDecoration(target4, 7);
		
		done();
    });

    it('stacks decoration ', (done) => {
		function typeA()
		{
			this.a = 'a';
		}
		function typeB()
		{
			this.a = 'B override a'
			this.b ='b';
		}
		function typeC()
		{
			this.c ='c';
		}
		function typeD()
		{
			this.a = 'D override a';
			this.readA = function(){return this.__decorated.a;};
			this.d = 'd';
		}
	
		var core = {core:'core'};
		var thing = mutator.decorator.decorate(new typeA(), core);
		expect(thing.a).to.equal('a');
		
		//decorate and preserve decorator
		thing = mutator.decorator.decorate(new typeB(), thing);
		expect(thing.a).to.equal('B override a');
		expect(thing.b).to.equal('b');
		
		//again
		thing = mutator.decorator.decorate(new typeA(), thing);
		expect(thing.a).to.equal('a');
		expect(thing.b).to.equal('b');
		
		thing = mutator.decorator.undecorate(thing);
		
		thing = mutator.decorator.decorate(new typeC(), thing);
		expect(thing.a).to.equal('B override a');
		expect(thing.b).to.equal('b');
		expect(thing.c).to.equal('c');
		
		thing = mutator.decorator.decorate(new typeD(), thing);
		expect(thing.a).to.equal('D override a');
		expect(thing.b).to.equal('b');
		expect(thing.c).to.equal('c');
		expect(thing.d).to.equal('d');
	
		//ok we have a decoration cake.  let's doAsInstanceOf
		mutator.decorator.doAsInstanceOf(thing, typeA, function(self){self.a = 'aa';}); //because typeA is at the bottom, this has no effect on the outer
		expect(thing.a).to.equal('D override a');
		
		mutator.decorator.doAsInstanceOf(thing, typeC, function(self){self.c = 'cc';});
		expect(thing.a).to.equal('D override a');
		expect(thing.c).to.equal('cc');
		
		mutator.decorator.doAsInstanceOf(thing, typeD, function(self){self.b = 'bb';});
		expect(thing.a).to.equal('D override a');
		expect(thing.readA()).to.equal('B override a');
		expect(thing.c).to.equal('cc');
		expect(thing.b).to.equal('bb');
		
		var core = mutator.decorator.asCore(thing);
		expect(core).to.equal(core);
		mutator.decorator.doAsCore(thing, function(self){expect(self.core).to.equal('core');});
		
		//edges
		var badCore = mutator.decorator.asCore({});
		expect(badCore).to.equal({});
		
		expect(function(){mutator.decorator.asCore(null);}).to.throw(Error, "null");
		
		var badDec = {a:'a', __decorated:null};
		var badDecCore = mutator.decorator.asCore(badDec);
		expect(badDecCore).to.equal(null);
		
		mutator.decorator.doAsCore(badDec, function(self){ throw new Error("kack");});
		
		done();
    });	

    it('cross cuts some stuff ', (done) => {
	
		"use strict";
		var ccDecObj = {};
		ccDecObj.a = "asdfads";
		ccDecObj.b = "adfasd";
		ccDecObj.fn = function(a,b,c){return "adsfads";};

		//spin up a little audit behaviour
		var ccDecObjPreAudit = [];
		var ccDecObjPostAudit = [];

		var ccDecObj2 = mutator.crossCuttingDecorator.decorate(ccDecObj,
		function(memberName, decorator, args){

			ccDecObjPreAudit.push(memberName);
			return mutator.crossCuttingDecorator.newScrubbedArgs(true, args);
		
		}, function(memberName, decorator, args, rv){

			ccDecObjPostAudit.push(memberName + '1');
			return "intercepted" + rv;
		});

		//validate the injected behaviour
		expect(ccDecObj2.a).to.equal("intercepted" + ccDecObj.a);
		expect(ccDecObjPreAudit[0]).to.equal("a")
		expect(ccDecObjPostAudit[0]).to.equal("a1")
		expect(ccDecObj2.b).to.equal("intercepted" + ccDecObj.b);
		expect(ccDecObjPreAudit[1]).to.equal("b")
		expect(ccDecObjPostAudit[1]).to.equal("b1")
		expect(ccDecObj2.fn()).to.equal("intercepted" + ccDecObj.fn());
		expect(ccDecObjPreAudit[2]).to.equal("fn")
		expect(ccDecObjPostAudit[2]).to.equal("fn1")
		
		//do sets
		ccDecObj2.a = 'newA';
		expect(ccDecObjPreAudit[3]).to.equal("a")
		expect(ccDecObjPostAudit[3]).to.equal("a1")
		
		//edges
		var passthruTarget = mutator.crossCuttingDecorator.decorate(ccDecObj);
		expect(passthruTarget.fn()).to.equal("adsfads");
		passthruTarget.a = 'newa';
		expect(passthruTarget.a).to.equal('newa');
		
		var passthruTarget2 = mutator.crossCuttingDecorator.decorate(ccDecObj, null, null, null);
		expect(passthruTarget2.fn()).to.equal("adsfads");
		passthruTarget2.a = 'new' + passthruTarget2.a;  //we're passthru decorating the core which we changed above
		expect(passthruTarget2.a).to.equal('newnewa');
		
		var passthruTarget3 = mutator.crossCuttingDecorator.decorate(ccDecObj, function(memberName, decorator, args){
			return mutator.crossCuttingDecorator.newScrubbedArgs(true, args);
			
		},function(memberName, decorator, args, rv)
		{
			return rv;
		}, ['bogusproperty']);
		expect(passthruTarget3.fn()).to.equal("adsfads");
		passthruTarget3.a = 'new' + passthruTarget3.a;  //we're passthru decorating the core which we changed above
		expect(passthruTarget3.a).to.equal('newnewnewa');
		
		var preNayTarget = mutator.crossCuttingDecorator.decorate(ccDecObj, function(memberName, decorator, args)
		{
			return mutator.crossCuttingDecorator.newScrubbedArgs(false, args);
		});
		expect(preNayTarget.fn()).to.equal(undefined);
		preNayTarget.a = 'new' + preNayTarget.a;  //we're passthru decorating the core which we changed above
		expect(preNayTarget.a).to.equal(undefined);
		
		var badPreNayTarget = mutator.crossCuttingDecorator.decorate(ccDecObj, function(memberName, decorator, args)
		{
			return null;
		});
		expect(badPreNayTarget.fn()).to.equal(undefined);
		badPreNayTarget.a = 'new' + badPreNayTarget.a;  //we're passthru decorating the core which we changed above
		expect(badPreNayTarget.a).to.equal(undefined);
		
		var postNayTarget = mutator.crossCuttingDecorator.decorate(ccDecObj, null, function(memberName, decorator, args, rv)
		{
			return undefined;
		});
		expect(postNayTarget.fn()).to.equal(undefined);
		postNayTarget.a = 'new' + postNayTarget.a;  //we're passthru decorating the core which we changed above
		expect(postNayTarget.a).to.equal(undefined);
		
		var partialPassthruTarget1 = mutator.crossCuttingDecorator.decorate(ccDecObj, function(memberName, decorator, args){
			return mutator.crossCuttingDecorator.newScrubbedArgs(true, args);
			
		},function(memberName, decorator, args, rv)
		{
			return rv;
		}, ['a']);
		expect(partialPassthruTarget1.fn()).to.equal("adsfads");
		expect(partialPassthruTarget1.a).to.equal(undefined);
		
		
		var target4 = mutator.crossCuttingDecorator.decorate(ccDecObj, function(memberName, decorator, args){}, null, null);
		target4.fn();
		target4.a = 'newa';
		
		var target5 = mutator.crossCuttingDecorator.decorate(ccDecObj, function(memberName, decorator, args){return mutator.crossCuttingDecorator	.newScrubbedArgs(true, null);}, null, null);
		target5.fn();
		target5.a = 'newa';
		
		var target6 = mutator.crossCuttingDecorator.decorate(ccDecObj, function(memberName, decorator, args){return mutator.crossCuttingDecorator	.newScrubbedArgs(false, args);}, null, null);
		target6.fn();
		target6.a = 'newa';
		
		var target7 = mutator.crossCuttingDecorator.decorate(ccDecObj, function(memberName, decorator, args){return mutator.crossCuttingDecorator	.newScrubbedArgs(false, args);}, function(memberName, decorator, args, rv){return null;}, null);	
		target7.fn();
		target7.a = 'newa';
		
		var target8 = mutator.crossCuttingDecorator.decorate(ccDecObj, function(memberName, decorator, args){return mutator.crossCuttingDecorator	.newScrubbedArgs(false, args);}, function(memberName, decorator, args, rv){return null;}, ['a', 'b', 'bogus']);		
		target8.fn();
		target8.a = 'newa';
		
		var target9 = mutator.crossCuttingDecorator.decorate(ccDecObj, function(memberName, decorator, args){return mutator.crossCuttingDecorator	.newScrubbedArgs(true, args);}, function(memberName, decorator, args, rv){return rv;}, ['a']);		
		target9.fn();
		target9.a = 'newa';
		target9.b = 'newb';
		
		done();
    });
	
    it('grows a seed ', (done) => {
	
		//create a seed and then decorate it with a few layers
		var thing = mutator.seed.new('root');
		
		function simpleDec(decorated, i, iplus1, iplus2)
		{ 
			this.pos = i; 
			this.posplus1 = iplus1; 
			this.posplus2 = iplus2;
		}
		
		for(var i=0;i<10;i++)
			thing.decorateNew(simpleDec, i, i+1, i+2);
		
		for(var i=9;i>0;i--)
			expect(thing.getFromOuter(9-i).pos).to.equal(i);
		
		thing.doAsInstanceOf(mutator.seed, function(layer)
		{
			expect(layer.__decorated).to.equal(undefined);
		}); 
		
		expect(thing.doAs(function(self){})).to.equal(thing);
		expect(thing.asInstanceOf(simpleDec).pos).to.equal(9);
		
		//syncOuter
		var syncObj = thing.syncOuter({});
		expect(syncObj.pos).to.equal(9);
		
		//undecorate
		thing.undecorate();
		expect(thing.asInstanceOf(simpleDec).pos).to.equal(8);
		
		syncObj = thing.syncOuter({});
		expect(syncObj.pos).to.equal(8);
		
		//core
		expect(thing.asCore()).to.equal('root');
		thing.doAsCore(function(self){expect(self).to.equal('root');});
		
		//edges
		var thing2 = mutator.seed.new('thing2').seal();
		thing2.outer.a = 'a';
		expect(thing2.outer.a).to.equal(undefined);
		
		var thing3 = mutator.seed.new('thing3').freeze();
		thing3.outer.a = 'a';
		expect(thing3.outer.a).to.equal(undefined);
		
		//face
 		function newThing(obj)
		{
			this.name = 'newthing';
			this.obj = obj;
		};
		
		var face = mutator.face.new(new newThing({a:1}));
		expect(face.name).to.equal('newthing');
		expect(face.obj.a).to.equal(1);
		face.__.decorate({b:'b'});
		face.syncFace();
		expect(face.b).to.equal('b');
		done();
    });	

	it('tests mutation dictionary', (done) => {
	
		//create a dictionary of mutations
		var dict = mutator.mutationDictionary.new();
		var now = new Date().getTime();
		
		
		dict.add("name", function(obj, name){obj.name = name; return obj;})
		.add("timestamp", function(obj, now) {obj.timestamp = now; return obj;})
		.add("incrementCount", function(obj) 
		{
			if(!obj.count)
				obj.count = 0;
			
			obj.count = obj.count + 1;
			return obj;
		});

		//test it out
		var testObj = { name: 'testObj'};
		
		dict.has("name", testObj, "newName");
		expect(testObj.name).to.equal("newName");
		
		dict.has("timestamp", testObj, now);
		expect(testObj.timestamp).to.equal(now);
		
		dict.has("incrementCount", testObj);
		expect(testObj.count).to.equal(1);
		
		dict.has("incrementCount", testObj);
		expect(testObj.count).to.equal(2);

		//serialize and test
		//note that closures are not serialized
		var data = dict.serialize();
		var dict2 = mutator.mutationDictionary.new().deserialize(data);
		
		var testObj2 = { name: 'testObj2'};
		 
		dict2.has("name", testObj2, "newName");
		expect(testObj2.name).to.equal("newName");
		
		dict2.has("timestamp", testObj2, now); 
		expect(testObj2.timestamp).to.equal(now);
		
		dict2.has("incrementCount", testObj2);
		expect(testObj2.count).to.equal(1);
		
		dict2.has("incrementCount", testObj2);
		expect(testObj2.count).to.equal(2);
		
		//edges
		expect(function(){dict.add("name", function(obj, name){obj.name2 = name; return obj;});}).to.throw(Error, "already defined");
		
		
		done();
    });	
});
