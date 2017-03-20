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
	
		var thing = mutator.decorator.decorate(new typeA(), {});
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
			return {success:true,result:args};

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
				
		done();
    });
	
    it('grows a seed ', (done) => {
	
		//create a seed and then decorate it with a few layers
		var thing = new mutator.seed('root');
		
		function simpleDec(decorated, iplus1, iplus2)
		{ 
			this.pos = i; 
			this.posplus1 = iplus1; 
			this.posplus2 = iplus2;
		}
		
		for(var i=0;i<10;i++)
			thing = thing.decorateNew(simpleDec, i+1, i+2);
		
		for(var i=9;i>0;i--)
			expect(thing.getFromOuter(9-i).pos).to.equal(i);
		
		thing.doAsInstanceOf(mutator.seed, function(layer)
		{
			expect(layer.__decorated).to.equal(undefined);
		}); 
		
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
		
		
		done();
    });	
});
