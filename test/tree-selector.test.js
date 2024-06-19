import '../tree-selector.js';

import { aTimeout, expect, fixture, html, oneEvent, runConstructor } from '@brightspace-ui/testing';

function isVisible(searchResults) {
	return window.getComputedStyle(searchResults).getPropertyValue('display') !== 'none';
}

describe('d2l-labs-tree-selector', () => {
	describe('constructor', () => {
		it('should construct', () => {
			runConstructor('d2l-labs-tree-selector');
		});
	});

	describe('accessibility', () => {
		it('should pass all axe tests', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector name="choose!"></d2l-labs-tree-selector>`);
			await aTimeout(50);
			await expect(el).to.be.accessible();
		});
	});

	describe('render', () => {
		it('should render a dropbdown with the given name', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector name="choose!"></d2l-labs-tree-selector>`);
			await aTimeout(50);
			expect(el.shadowRoot.querySelector('d2l-dropdown-button-subtle').getAttribute('text')).to.equal('choose!');
		});

		it('should have slots for tree and search-results', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector name="choose!">
					<d2l-labs-tree-selector-node name="shown" slot="tree"></d2l-labs-tree-selector-node>
					<d2l-labs-tree-selector-node name="found" slot="search-results"></d2l-labs-tree-selector-node>
				</d2l-labs-tree-selector>`);
			await aTimeout(50);
			const treeSlot = el.shadowRoot.querySelector('slot[name=tree]');
			expect(treeSlot.assignedNodes({ flatten: false }).map(x => x.name)).to.deep.equal(['shown']);
			const searchSlot = el.shadowRoot.querySelector('slot[name=search-results]');
			expect(searchSlot.assignedNodes({ flatten: false }).map(x => x.name)).to.deep.equal(['found']);
		});

		it('should show tree and hide search results by default', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector name="choose!"></d2l-labs-tree-selector>`);
			await aTimeout(50);
			const searchResults = el.shadowRoot.querySelector('.d2l-labs-tree-selector-search-results');
			expect(isVisible(searchResults)).to.be.false;
			const tree = el.shadowRoot.querySelector('.d2l-labs-tree-selector-tree');
			expect(isVisible(tree)).to.be.true;
		});

		it('should show tree and hide search results when searching', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector name="choose!" search></d2l-labs-tree-selector>`);
			await aTimeout(50);
			const searchResults = el.shadowRoot.querySelector('.d2l-labs-tree-selector-search-results');
			await new Promise(res => setTimeout(res, 30));
			expect(isVisible(searchResults)).to.be.true;
			const tree = el.shadowRoot.querySelector('.d2l-labs-tree-selector-tree');
			expect(isVisible(tree)).to.be.false;
		});
	});

	describe('events', () => {
		it('should fire d2l-labs-tree-selector-search on search input', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector name="choose!"></d2l-labs-tree-selector>`);
			await aTimeout(50);
			const listener = oneEvent(el, 'd2l-labs-tree-selector-search');
			const search = el.shadowRoot.querySelector('d2l-input-search');
			search.value = 'asdf';
			search.search();
			const event = await listener;
			expect(event.type).to.equal('d2l-labs-tree-selector-search');
			expect(event.target).to.equal(el);
			expect(event.detail).to.deep.equal({
				value: 'asdf'
			});
		});

		it('should fire d2l-labs-tree-selector-clear on Clear', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector name="choose!" selected></d2l-labs-tree-selector>`);
			await aTimeout(50);
			const listener = oneEvent(el, 'd2l-labs-tree-selector-clear');
			const button = el.shadowRoot.querySelector('d2l-dropdown-content d2l-button-subtle');
			button.click();
			const event = await listener;
			expect(event.type).to.equal('d2l-labs-tree-selector-clear');
			expect(event.target).to.equal(el);
		});

		it('should fire d2l-labs-tree-selector-select-all on Select all', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector name="choose!" selected select-all-ui></d2l-labs-tree-selector>`);
			await aTimeout(50);
			const listener = oneEvent(el, 'd2l-labs-tree-selector-select-all');
			const button = el.shadowRoot.querySelector('.d2l-labs-tree-selector-select-all');
			button.click();
			const event = await listener;
			expect(event.type).to.equal('d2l-labs-tree-selector-select-all');
			expect(event.target).to.equal(el);
		});
	});
});
