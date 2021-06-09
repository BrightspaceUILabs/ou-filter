import '../tree-selector-node';

import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import { runConstructor } from '@brightspace-ui/core/tools/constructor-test-helper.js';

function getOpenControl(el) {
	return el.shadowRoot.querySelector('.d2l-labs-tree-selector-node-open-control');
}

function getCheckbox(el) {
	return el.shadowRoot.querySelector('d2l-input-checkbox');
}

function getSubtree(el) {
	return el.shadowRoot.querySelector('.d2l-labs-tree-selector-node-subtree');
}

describe('d2l-labs-tree-selector-node', () => {
	describe('constructor', () => {
		it('should construct', () => {
			runConstructor('d2l-labs-tree-selector-node');
		});
	});

	describe('accessibility', () => {
		it('should pass all axe tests', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector-node name="some node"></d2l-labs-tree-selector-node>`);
			await expect(el).to.be.accessible();
		});

		it('should pass all axe tests with nesting', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector-node
				name="top"
				data-id="1234"
				openable
				open
				indent-level="1"
				parent-name="root"
			>
				<d2l-labs-tree-selector-node
					name="child1"
					data-id="2345"
					indent-level="2"
					parent-name="top"
				></d2l-labs-tree-selector-node>
				<d2l-labs-tree-selector-node
					name="child2"
					data-id="3456"
					openable
					indent-level="2"
					parent-name="top"
				></d2l-labs-tree-selector-node>
			</d2l-labs-tree-selector-node>`);
			await expect(el).to.be.accessible();
		});
	});

	describe('render', () => {
		it('should render a non-openable node without a dropdown control', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector-node name="leaf"></d2l-labs-tree-selector-node>`);
			expect(getOpenControl(el)).to.not.exist;
		});

		it('should render with a dropdown control if openable', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector-node name="node" openable></d2l-labs-tree-selector-node>`);
			expect(getOpenControl(el)).to.exist;
		});

		it('should render as not selected', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector-node name="node" selected-state="none"></d2l-labs-tree-selector-node>`);
			expect(getCheckbox(el).checked).to.be.false;
			expect(getCheckbox(el).indeterminate).to.be.false;
		});

		it('should render as indeterminate', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector-node name="node" selected-state="indeterminate"></d2l-labs-tree-selector-node>`);
			expect(getCheckbox(el).checked).to.be.false;
			expect(getCheckbox(el).indeterminate).to.be.true;
		});

		it('should render as checked if explicit', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector-node name="node" selected-state="explicit"></d2l-labs-tree-selector-node>`);
			expect(getCheckbox(el).checked).to.be.true;
			expect(getCheckbox(el).indeterminate).to.be.false;
		});

		it('should render as closed by default', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector-node name="node" openable></d2l-labs-tree-selector-node>`);
			expect(getSubtree(el).hidden).to.be.true;
		});

		it('should render as open if specified', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector-node name="node" openable open></d2l-labs-tree-selector-node>`);
			expect(getSubtree(el).hidden).to.be.false;
		});
	});

	describe('events', () => {
		async function expectEvent(eventType, el, click, expectedDetail) {
			const listener = oneEvent(el, eventType);
			click();
			const event = await listener;
			expect(event.type).to.equal(eventType);
			expect(event.target).to.equal(el);
			expect(event.detail).to.deep.equal(expectedDetail);
		}

		it('should fire d2l-labs-tree-selector-node-select on selection', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector-node name="node" data-id="321"></d2l-labs-tree-selector-node>`);
			await expectEvent('d2l-labs-tree-selector-node-select', el, () => getCheckbox(el).simulateClick(), {
				id: 321,
				isSelected: true
			});
		});

		it('should fire d2l-labs-tree-selector-change on deselection', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector-node name="node" selected-state="explicit" data-id="23"></d2l-labs-tree-selector-node>`);
			await expectEvent('d2l-labs-tree-selector-node-select', el, () => getCheckbox(el).simulateClick(), {
				id: 23,
				isSelected: false
			});
		});

		it('should fire d2l-labs-tree-selector-change on selection from indeterminate', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector-node name="node" selected-state="indeterminate" data-id="1"></d2l-labs-tree-selector-node>`);
			await expectEvent('d2l-labs-tree-selector-node-select', el, () => getCheckbox(el).simulateClick(), {
				id: 1,
				isSelected: true
			});
		});

		it('should fire d2l-labs-tree-selector-node-open on open click when closed', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector-node name="node" data-id="9" openable></d2l-labs-tree-selector-node>`);
			await expectEvent('d2l-labs-tree-selector-node-open', el, () => getOpenControl(el).click(), {
				id: 9,
				isOpen: true
			});
		});

		it('should fire d2l-labs-tree-selector-node-open on open click when open', async() => {
			const el = await fixture(html`<d2l-labs-tree-selector-node name="node" data-id="8" openable open></d2l-labs-tree-selector-node>`);
			await expectEvent('d2l-labs-tree-selector-node-open', el, () => getOpenControl(el).click(), {
				id: 8,
				isOpen: false
			});
		});
	});
});
