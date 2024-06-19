import { aTimeout, expect, fixture, html, oneEvent, runConstructor } from '@brightspace-ui/testing';
import { restore, spy } from 'sinon';
import { OuFilterDataManager } from '../ou-filter.js';
import { Tree } from '../tree-filter.js';

async function waitForTree(el) {
	await aTimeout(50);
	const selector = el.shadowRoot.querySelector('d2l-labs-tree-filter');
	await selector.treeUpdateComplete;
}

class TestOuFilterDataManager extends OuFilterDataManager {

	constructor(data) {
		super();

		this._data = data;
	}

	get orgUnitTree() {
		return this._data.orgUnitTree;
	}

	get selectedSemesterIds() {
		return this._data.selectedSemesterIds;
	}
}

describe('d2l-labs-ou-filter', () => {

	const data = {
		orgUnitTree: new Tree({
			nodes: [
				{	Id: 1, Name: 'root', Type: 0, Parents: [0] },
				{	Id: 2, Name: 'node', Type: 3, Parents: [1] }
			],
			selectedIds: [2]
		}),
		selectedSemesterIds: [2, 17, 19]
	};
	const dataManager = new TestOuFilterDataManager(data);

	let setAncestorFilterSpy;
	beforeEach(() => {
		setAncestorFilterSpy = spy(data.orgUnitTree, 'setAncestorFilter');
	});

	afterEach(() => restore());

	describe('constructor', () => {
		it('should construct', () => {
			runConstructor('d2l-labs-ou-filter');
		});
	});

	describe('accessibility', () => {
		it('should pass all axe tests', async() => {
			const el = await fixture(html`<d2l-labs-ou-filter .dataManager="${dataManager}"></d2l-labs-ou-filter>`);
			await expect(el).to.be.accessible();
		});
	});

	describe('render', () => {
		it('should render a tree-filter with the org-unit tree', async() => {
			const el = await fixture(html`<d2l-labs-ou-filter .dataManager="${dataManager}"></d2l-labs-ou-filter>`);
			await aTimeout(50);
			const selector = el.shadowRoot.querySelector('d2l-labs-tree-filter');
			expect(selector.tree).to.equal(data.orgUnitTree);
			expect(setAncestorFilterSpy).to.be.calledOnce;
			expect(setAncestorFilterSpy).to.be.calledWith(data.selectedSemesterIds);
		});
	});

	describe('selection', () => {
		it('should return selected nodes', async() => {
			const el = await fixture(html`<d2l-labs-ou-filter .dataManager="${dataManager}"></d2l-labs-ou-filter>`);
			await waitForTree(el);
			expect(el.selected).to.deep.equal([2]);
		});
	});

	describe('events', () => {
		it('should fire d2l-labs-ou-filter-change on selection change', async() => {
			const el = await fixture(html`<d2l-labs-ou-filter .dataManager="${dataManager}"></d2l-labs-ou-filter>`);
			await waitForTree(el);

			const listener = oneEvent(el, 'd2l-labs-ou-filter-change');
			const childCheckbox = el.shadowRoot.querySelector('d2l-labs-tree-filter')
				.shadowRoot.querySelectorAll('d2l-labs-tree-selector-node')[0] // a child node
				.shadowRoot.querySelector('d2l-input-checkbox');

			childCheckbox.simulateClick();
			const event = await listener;

			expect(event.type).to.equal('d2l-labs-ou-filter-change');
			expect(event.target).to.equal(el);
		});
	});
});
