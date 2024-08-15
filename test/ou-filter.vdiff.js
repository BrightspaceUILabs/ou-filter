
import { action, decorate, observable } from 'mobx';
import { COURSE_OFFERING, Tree } from '../../tree-filter.js';
import { expect, fixture, html, oneEvent, sendKeysElem } from '@brightspace-ui/testing';
import { OuFilterDataManager } from '../../ou-filter.js';

function fetchCachedChildren() {
	return new Map();
}

class DemoDataManager extends OuFilterDataManager {

	constructor() {
		super();
		this._orgUnitTree = new Tree({});
	}

	get orgUnitTree() {
		return this._orgUnitTree;
	}

	loadData() {
		const lastSearchResults = null;
		const semesterTypeId = 25;
		const orgUnits = [
			{ Id: 1, Name: 'Course 1', Type: 3, Parents: [3, 4], IsActive: false },
			{ Id: 2, Name: 'Course 2', Type: 3, Parents: [3, 10], IsActive: true },
			{ Id: 6, Name: 'Course 3 has a surprisingly long name, but nonetheless this kind of thing is bound to happen sometimes and we do need to design for it. Is that not so?', Type: 3, Parents: [7, 4], IsActive: true },
			{ Id: 8, Name: 'ZCourse 4', Type: 3, Parents: [5], IsActive: false },
			{ Id: 3, Name: 'Department 1', Type: 2, Parents: [5], IsActive: false },
			{ Id: 7, Name: 'Department 2 has a longer name', Type: 2, Parents: [5], IsActive: false },
			{ Id: 4, Name: 'Semester 1', Type: 25, Parents: [6606], IsActive: false },
			{ Id: 10, Name: 'Semester 2', Type: 25, Parents: [6606], IsActive: false },
			{ Id: 5, Name: 'Faculty 1', Type: 7, Parents: [6606], IsActive: false },
			{ Id: 9, Name: 'Faculty 2', Type: 7, Parents: [6606, 10], IsActive: false },
			{ Id: 6606, Name: 'Dev', Type: 1, Parents: [0], IsActive: false }
		];
		const isOrgUnitsTruncated = false;

		this._orgUnitTree = new Tree({
			// add in any nodes from the most recent search; otherwise
			// the search will blink out and come back, and also drop any "load more" results
			nodes: lastSearchResults ? [...orgUnits, ...lastSearchResults] : orgUnits,
			leafTypes: [COURSE_OFFERING],
			invisibleTypes: [semesterTypeId],
			selectedIds: [1],
			ancestorIds: [],
			oldTree: this.orgUnitTree,
			isDynamic: isOrgUnitsTruncated,
			// preload the tree with any children queries we've already run: otherwise parts of the
			// tree blink out and then come back as they are loaded again
			extraChildren: isOrgUnitsTruncated ?
				fetchCachedChildren() || new Map() :
				null
		});
	}

}
decorate(DemoDataManager, {
	_orgUnitTree: observable,
	loadData: action
});

class EmptyDataManager extends OuFilterDataManager {
	constructor() {
		super();
		this._orgUnitTree = new Tree({});
	}

	get orgUnitTree() {
		return this._orgUnitTree;
	}

	loadData() {
		const semesterTypeId = 25;
		const isOrgUnitsTruncated = false;

		this._orgUnitTree = new Tree({
			nodes: [],
			leafTypes: [COURSE_OFFERING],
			invisibleTypes: [semesterTypeId],
			selectedIds: [],
			ancestorIds: [],
			oldTree: this.orgUnitTree,
			isDynamic: isOrgUnitsTruncated,
			extraChildren: null
		});
	}
}
decorate(EmptyDataManager, {
	_orgUnitTree: observable,
	loadData: action
});

async function openFilter(elem) {
	const treeSelector = elem
		.shadowRoot.querySelector('d2l-labs-tree-filter')
		.shadowRoot.querySelector('d2l-labs-tree-selector');
	const openButton = treeSelector.shadowRoot.querySelector('d2l-dropdown-button-subtle');

	// open tree
	sendKeysElem(openButton, 'press', 'Enter');
	await oneEvent(elem, 'd2l-dropdown-open');
	return treeSelector;
}

async function expandDepartment1Node(elem) {

	const treeSelector = await openFilter(elem);

	// Prevents test flake that sometimes occurs when waiting for the dropdown to open and render
	await new Promise(resolve => setTimeout(resolve, 200));

	// expand Faculty 1
	const faculty1Node = treeSelector.querySelector('d2l-labs-tree-selector-node[name="Faculty 1 (Id: 5)"]');
	await sendKeysElem(
		faculty1Node.shadowRoot.querySelector('.d2l-labs-tree-selector-node-open-control'),
		'press',
		'Enter'
	);
	await new Promise(resolve => setTimeout(resolve, 200));

	// expand Department 1
	const department1Node = treeSelector.querySelector('d2l-labs-tree-selector-node[name="Department 1 (Id: 3)"]');
	await sendKeysElem(
		department1Node.shadowRoot.querySelector('.d2l-labs-tree-selector-node-open-control'),
		'press',
		'Enter'
	);
	await new Promise(resolve => setTimeout(resolve, 200));

}

describe('ou-filter', () => {

	let dataManager, emptyDataManager;
	beforeEach(async() => {
		dataManager = new DemoDataManager();
		dataManager.loadData();
		emptyDataManager = new EmptyDataManager();
		emptyDataManager.loadData();
	});

	it('Desktop', async() => {
		const elem = await fixture(
			html`<d2l-labs-ou-filter .dataManager=${dataManager}></d2l-labs-ou-filter>`
		);
		await expandDepartment1Node(elem);
		await expect(elem).to.be.golden();
	});

	it('Desktop - Disabled', async() => {
		const elem = await fixture(
			html`<d2l-labs-ou-filter disabled .dataManager=${dataManager}></d2l-labs-ou-filter>`
		);
		await expect(elem).to.be.golden();
	});

	it('Mobile', async() => {
		const elem = await fixture(
			html`<d2l-labs-ou-filter .dataManager=${dataManager}></d2l-labs-ou-filter>`,
			{ viewport: { width: 320 } }
		);
		await expandDepartment1Node(elem);
		await expect(elem).to.be.golden();
	});

	it('Mobile - Disabled', async() => {
		const elem = await fixture(
			html`<d2l-labs-ou-filter disabled .dataManager=${dataManager}></d2l-labs-ou-filter>`,
			{ viewport: { width: 320 } }
		);
		await expect(elem).to.be.golden();
	});

	['ltr', 'rtl'].forEach(dir => {
		describe(`select-all ${dir}`, () => {

			it('Desktop', async() => {
				const elem = await fixture(
					html`<d2l-labs-ou-filter .dataManager=${dataManager} select-all-ui></d2l-labs-ou-filter>`,
					{ rtl: dir === 'rtl' }
				);
				await expandDepartment1Node(elem);
				await expect(elem).to.be.golden();
			});

			it('Mobile', async() => {
				const elem = await fixture(
					html`<d2l-labs-ou-filter .dataManager=${dataManager} select-all-ui></d2l-labs-ou-filter>`,
					{
						rtl: dir === 'rtl',
						viewport: { width: 320 }
					}
				);
				await expandDepartment1Node(elem);
				await expect(elem).to.be.golden();
			});

		});

		describe(`empty ${dir}`, () => {
			it('Desktop', async() => {
				const elem = await fixture(
					html`<d2l-labs-ou-filter .dataManager=${emptyDataManager}></d2l-labs-ou-filter>`,
					{ rtl: dir === 'rtl' }
				);
				await openFilter(elem);
				await expect(elem).to.be.golden();
			});

			it('Mobile', async() => {
				const elem = await fixture(
					html`<d2l-labs-ou-filter .dataManager=${emptyDataManager}></d2l-labs-ou-filter>`,
					{
						rtl: dir === 'rtl',
						viewport: { width: 320 }
					}
				);
				await openFilter(elem);
				await expect(elem).to.be.golden();
			});
		});
	});

});

