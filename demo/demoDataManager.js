import { action, decorate, observable } from 'mobx';
import { COURSE_OFFERING, Tree } from '../tree-filter';
import { OuFilterDataManager } from '../ou-filter';
// import { createNaryTree } from './util.js';

const orgUnitChildrenCache = new Map();
function fetchCachedChildren() {
	return orgUnitChildrenCache;
}

const OU_TYPES = {
	ORG: 1,
	DEPT: 2,
	COURSE: 3,
	FAC: 7,
	SEM: 25
};

/* eslint-disable no-console */
export class DemoDataManager extends OuFilterDataManager {

	constructor() {
		super();
		this._orgUnitTree = new Tree({});
	}

	loadData() {
		const lastSearchResults = null;
		const orgUnits = [
			{ Id: 1, Name: 'Course 1', Type: OU_TYPES.COURSE, Parents: [3, 4], IsActive: false },
			{ Id: 2, Name: 'Course 2', Type: OU_TYPES.COURSE, Parents: [3, 10], IsActive: true },
			{ Id: 6, Name: 'Course 3 has a surprisingly long name, but nonetheless this kind of thing is bound to happen sometimes and we do need to design for it. Is that not so?', Type: OU_TYPES.COURSE, Parents: [7, 4], IsActive: true },
			{ Id: 8, Name: 'ZCourse 4', Type: OU_TYPES.COURSE, Parents: [5], IsActive: false },
			{ Id: 3, Name: 'Department 1', Type: OU_TYPES.DEPT, Parents: [5], IsActive: false },
			{ Id: 7, Name: 'Department 2 has a longer name', Type: OU_TYPES.DEPT, Parents: [5], IsActive: false },
			{ Id: 4, Name: 'Semester 1', Type: OU_TYPES.SEM, Parents: [6606], IsActive: false },
			{ Id: 10, Name: 'Semester 2', Type: OU_TYPES.SEM, Parents: [6606], IsActive: false },
			{ Id: 5, Name: 'Faculty 1 - children loaded on first load', Type: OU_TYPES.FAC, Parents: [6606], IsActive: false },
			{ Id: 9, Name: 'Faculty 2 - children loaded on open', Type: OU_TYPES.FAC, Parents: [6606, 10], IsActive: false },
			{ Id: 6606, Name: 'Dev', Type: OU_TYPES.ORG, Parents: [0], IsActive: false }
		];
		const isOrgUnitsTruncated = true;

		this._orgUnitTree = new Tree({
			// add in any nodes from the most recent search; otherwise
			// the search will blink out and come back, and also drop any "load more" results
			nodes: lastSearchResults ? [...orgUnits, ...lastSearchResults] : orgUnits,
			leafTypes: [COURSE_OFFERING],
			invisibleTypes: [OU_TYPES.SEM],
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

		// for perf testing
		// this._orgUnitTree = createNaryTree(5, 5000);
	}

	get orgUnitTree() {
		return this._orgUnitTree;
	}

	// the method called only when Tree.isDynamic === true
	async fetchRelevantChildren(id, bookmark) {
		console.log(`fetchRelevantChildren ${id}, ${bookmark}`);

		let results;
		// one case for each child in "Faculty 2 - children loaded on open" (id 9)
		switch (id) {
			case 9:
				if (bookmark !== 'orgUnit-9') {
					results = { PagingInfo: { HasMoreItems: true, Bookmark: 'orgUnit-9' }, Items: [
						{ Id: 20, Name: 'Department 3', Type: OU_TYPES.DEPT, Parents: [9], IsActive: false }
					] };
				} else {
					results = { PagingInfo: { HasMoreItems: false, Bookmark: null }, Items: [
						{ Id: 30, Name: 'Department 4', Type: OU_TYPES.DEPT, Parents: [9], IsActive: false }
					] };
				}
				break;
			case 20:
				results = { PagingInfo: { HasMoreItems: false, Bookmark: null }, Items: [
					{ Id: 21, Name: 'Department 3 Course 1', Type: OU_TYPES.COURSE, Parents: [20], IsActive: false },
					{ Id: 22, Name: 'Department 3 Course 2', Type: OU_TYPES.COURSE, Parents: [20], IsActive: false }
				] };
				break;
			case 30:
				results = { PagingInfo: { HasMoreItems: false, Bookmark: null }, Items: [
					{ Id: 31, Name: 'Department 3 Course 1', Type: OU_TYPES.COURSE, Parents: [20], IsActive: false }
				] };
				break;
			default:
				// no-op: return object with no children
				return await super.fetchRelevantChildren(id, bookmark);
		}

		// example of handling cache
		if (!orgUnitChildrenCache.has(id)) {
			orgUnitChildrenCache.set(id, results);
		} else {
			const cached = orgUnitChildrenCache.get(id);
			cached.PagingInfo = results.PagingInfo;
			cached.Items.push(...results.Items);
		}

		// return result in 2 sec to show loading spinner
		return await new Promise(resolve => setTimeout(() => resolve(results), 2000));
	}

	// the method called only when Tree.isDynamic === true
	async orgUnitSearch(searchString, bookmark) {
		console.log(`orgUnitSearch ${searchString}, ${bookmark}`);

		return await super.orgUnitSearch(searchString, bookmark);
	}
}

decorate(DemoDataManager, {
	_orgUnitTree: observable,
	loadData: action
});
