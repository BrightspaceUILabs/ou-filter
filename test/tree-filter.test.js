import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import { runConstructor } from '@brightspace-ui/core/tools/constructor-test-helper.js';
import { Tree } from '../tree-filter';

const mockOuTypes = {
	organization: 0,
	department: 1,
	course: 2,
	courseOffering: 3,
	semester: 5
};

function assertSetsAreEqual(setA, setB) {
	expect([...setA].sort()).to.deep.equal([...setB].sort());
}

describe('Tree', () => {

	const nodes = [
		[-100, 'edge case', null, null],
		[6606, 'Org', mockOuTypes.organization, [0]],
		[1001, 'Department 1', mockOuTypes.department, [6606]],
		[1002, 'Department 2', mockOuTypes.department, [6606]],
		[1003, 'Department 3', mockOuTypes.department, [6606]],

		[2, 'Course 2', mockOuTypes.course, [1001]],
		[1, 'Course 1', mockOuTypes.course, [1001]],
		[3, 'Course 3', mockOuTypes.course, [1001, 1002]], // part of 2 departments
		[4, null, mockOuTypes.course, [1003]],

		[11, 'Semester 1', mockOuTypes.semester, [6606]],
		[12, 'Semester 2', mockOuTypes.semester, [6606]],
		[13, 'Semester 3', mockOuTypes.semester, [6606]],

		[111, 'Course 1 / Semester 1', mockOuTypes.courseOffering, [1, 11]],
		[112, 'Course 1 / Semester 2', mockOuTypes.courseOffering, [1, 12]],
		[211, 'Course 2 / Semester 1', mockOuTypes.courseOffering, [2, 11]],
		[312, 'Course 3 / Semester 2', mockOuTypes.courseOffering, [3, 12]]
	];
	const selectedIds = [111, 1003];
	const leafTypes = [mockOuTypes.courseOffering];
	const invisibleTypes = [mockOuTypes.semester];

	let dynamicTree;
	let staticTree;
	beforeEach(() => {
		dynamicTree = new Tree({ nodes, selectedIds, leafTypes, invisibleTypes, isDynamic: true });
		staticTree = new Tree({ nodes, selectedIds, leafTypes, invisibleTypes, isDynamic: false });
	});

	describe('constructor', () => {
		it('should accept missing selectedIds and oldTree', () => {
			new Tree({ nodes: [[10, 'Faculty 2', 7, [6607]]], leafTypes: [3] });
		});

		it('should build a default tree', () => {
			new Tree({});
		});
	});

	describe('ids', () => {
		it('should return all node ids', () => {
			expect(dynamicTree.ids.sort()).to.deep.equal(nodes.map(x => x[0]).sort());
		});
	});

	describe('open, setOpen, isOpen', () => {
		it('should list open node ids', () => {
			dynamicTree.setOpen(2, true);
			dynamicTree.setOpen(112, true);
			dynamicTree.setOpen(1001, true);
			expect(dynamicTree.open.sort()).to.deep.equal([1001, 112, 2]);
		});

		it('should remove closed nodes from the list', () => {
			dynamicTree.setOpen(2, true);
			dynamicTree.setOpen(112, true);
			dynamicTree.setOpen(1001, true);
			dynamicTree.setOpen(112, false);
			expect(dynamicTree.open.sort()).to.deep.equal([1001, 2]);
		});

		it('should copy open state from old tree', () => {
			dynamicTree.setOpen(1, true);
			dynamicTree.setOpen(211, true);
			const newTree = new Tree({ nodes, oldTree: dynamicTree });
			expect(newTree.open.sort()).to.deep.equal([1, 211]);
		});

		it('should indicate an open node', () => {
			dynamicTree.setOpen(211, true);
			expect(dynamicTree.isOpen(211)).to.be.true;
		});

		it('should indicate a closed node', () => {
			expect(dynamicTree.isOpen(211)).to.be.false;
		});

		it('should indicate that an unknown node is closed', () => {
			expect(dynamicTree.isOpen(427224)).to.be.false;
		});
	});

	describe('rootId', () => {
		it('should return node with parent 0', () => {
			expect(dynamicTree.rootId).to.equal(6606);
		});
	});

	describe('selected, setSelected, and getState', () => {
		it('should return expected selection', () => {
			expect(dynamicTree.selected.sort()).to.deep.equal([1003, 111]);
		});

		it.skip('should return expected selection given multiple parents of some nodes', () => {
			// NOTE
			// This test would fail, because the algorithm walks down the tree through indeterminate nodes until
			// it finds all explicitly selected descendants - but this means if there is more than one
			// path to a node, it can appear twice or it can appear along with an ancestor.
			// This has only very minor performance implications, so for simplicity this behaviour
			// is allowed.
			const tree = new Tree({ nodes, invisibleTypes, selectedIds: [111, 1002] });
			expect(tree.selected.sort()).to.deep.equal([1002, 111]);
		});

		it('should clear selection', () => {
			dynamicTree.clearSelection();
			expect(dynamicTree.selected).to.be.empty;
		});

		it('should set selected nodes', () => {
			const tree = new Tree({ nodes, invisibleTypes });
			tree.setSelected(111, true);
			tree.setSelected(1003, true);
			expect(tree.selected.sort()).to.deep.equal([1003, 111]);
		});

		it('should mark a parent indeterminate if some children are selected', () => {
			expect(dynamicTree.getState(1)).to.equal('indeterminate');
		});

		it('should mark a parent explicit if all children are selected', () => {
			staticTree.setSelected(112, true);
			expect(staticTree.getState(1)).to.equal('explicit');
		});

		it('should mark a parent indeterminate if all children are selected but the parent is not populated', () => {
			dynamicTree.setSelected(112, true);
			expect(dynamicTree.getState(1)).to.equal('indeterminate');
		});

		it('should mark a parent explicit if all children are selected and the parent is populated', () => {
			dynamicTree._populated.add(1); // quick fake addChildren()
			dynamicTree.setSelected(112, true);
			expect(dynamicTree.getState(1)).to.equal('explicit');
		});

		it('should mark an ancestor explicit if all descendants are selected', () => {
			staticTree.setSelected(2, true);
			staticTree.setSelected(112, true);
			staticTree.setSelected(312, true);
			expect(staticTree.getState(1001)).to.equal('explicit');
		});

		it('should mark children explicit if their parent is selected', () => {
			expect(dynamicTree.getState(4)).to.equal('explicit');
		});

		it('should change a parent from explicit to none if all children are deselected', () => {
			dynamicTree.setSelected(4, false);
			expect(dynamicTree.getState(1003)).to.equal('none');
		});

		it('should change a parent from explicit to indeterminate if some children are deselected', () => {
			dynamicTree.setSelected(1, true);
			dynamicTree.setSelected(111, false);
			expect(dynamicTree.getState(1)).to.equal('indeterminate');
		});

		it('should return none as state for unknown node', () => {
			expect(dynamicTree.getState('2323523')).to.equal('none');
		});
	});

	describe('addNodes and isPopulated', () => {
		it('should report isPopulated as false after initialization of a dynamic tree', () => {
			expect(dynamicTree.isPopulated(1001)).to.be.false;
			expect(dynamicTree.isPopulated(4)).to.be.false;
		});

		it('should report isPopulated as true after initialization of static tree', () => {
			expect(staticTree.isPopulated(1001)).to.be.true;
			expect(staticTree.isPopulated(4)).to.be.true;
		});

		[true, false].forEach(hasBookmark => {
			it(`should add the given nodes ${hasBookmark ? 'with a bookmark' : ''}`, () => {
				dynamicTree.addNodes(
					1001,
					[[991, 'new1', mockOuTypes.course], [992, 'new2', mockOuTypes.courseOffering]],
					hasBookmark,
					'bookmark'
				);

				expect(dynamicTree.getName(991)).to.equal('new1');
				expect(dynamicTree.getName(992)).to.equal('new2');
				expect(dynamicTree.getType(991)).to.equal(mockOuTypes.course);
				expect(dynamicTree.getType(992)).to.equal(mockOuTypes.courseOffering);
				expect(dynamicTree.isOpenable(991)).to.be.true;
				expect(dynamicTree.isOpenable(992)).to.be.false;

				expect(dynamicTree.hasMore(1001)).to.equal(hasBookmark);
				if (hasBookmark) expect(dynamicTree.getBookmark(1001)).to.equal('bookmark');
			});

			it(`should add the given nodes ${hasBookmark ? 'with a bookmark' : ''} (constructor)`, () => {
				const tree = new Tree({ nodes, selectedIds, leafTypes, invisibleTypes, isDynamic: true,
					extraChildren: new Map([
						[1001, {
							Items: [[991, 'new1', mockOuTypes.course], [992, 'new2', mockOuTypes.courseOffering]],
							PagingInfo: { HasMoreItems: hasBookmark, Bookmark: 'bookmark' }
						}]
					])
				});

				expect(tree.getName(991)).to.equal('new1');
				expect(tree.getName(992)).to.equal('new2');
				expect(tree.getType(991)).to.equal(mockOuTypes.course);
				expect(tree.getType(992)).to.equal(mockOuTypes.courseOffering);
				expect(tree.isOpenable(991)).to.be.true;
				expect(tree.isOpenable(992)).to.be.false;

				expect(tree.hasMore(1001)).to.equal(hasBookmark);
				if (hasBookmark) expect(tree.getBookmark(1001)).to.equal('bookmark');
			});
		});

		it('should turn off loading for the parent node', () => {
			dynamicTree.setLoading(1001);
			expect(dynamicTree.isLoading(1001)).to.be.true;

			dynamicTree.addNodes(1001, [[991, 'new1', mockOuTypes.course]]);

			expect(dynamicTree.isLoading(1001)).to.be.false;
		});

		it('should add the nodes to a previously childless parent', () => {
			dynamicTree.addNodes(4, [[991, 'new1', mockOuTypes.course], [992, 'new2', mockOuTypes.courseOffering]]);
			expect([...dynamicTree.getChildIds(4)].sort()).to.deep.equal([991, 992]);
			expect(dynamicTree.isPopulated(4)).to.be.true;
		});

		it('should add the nodes to root (possible corner case)', () => {
			dynamicTree.addNodes(6606, [[991, 'new1', mockOuTypes.course], [992, 'new2', mockOuTypes.courseOffering]]);
			expect([...dynamicTree.getChildIds(6606)].sort()).to.deep.equal([1001, 1002, 1003, 11, 12, 13, 991, 992]);
			expect(dynamicTree.isPopulated(6606)).to.be.true;
		});

		it('should merge with existing children', () => {
			dynamicTree.addNodes(1001, [[991, 'new1', mockOuTypes.course], [2 /* already a child */, 'new2', mockOuTypes.courseOffering]]);
			expect([...dynamicTree.getChildIds(1001)].sort()).to.deep.equal([1, 2, 3, 991]);
			expect(dynamicTree.isPopulated(1001)).to.be.true;
		});

		it('should accept an empty array', () => {
			dynamicTree.addNodes(4, []);
			expect(dynamicTree.getChildIds(4)).to.deep.equal([]);
			expect(dynamicTree.isPopulated(4)).to.be.true;
		});

		it('should make new children visible', () => {
			dynamicTree.addNodes(1001, [[991, 'bnew1', mockOuTypes.course], [992, 'anew2', mockOuTypes.courseOffering]]);
			expect(dynamicTree.getChildIdsForDisplay(1001)).to.deep.equal([992, 991, 1, 2, 3]);
		});

		it('should select new nodes if the parent is selected', () => {
			dynamicTree.addNodes(1003, [[991, 'new1', mockOuTypes.course], [992, 'new2', mockOuTypes.courseOffering]]);
			expect(dynamicTree.getState(991)).to.equal('explicit');
			expect(dynamicTree.getState(992)).to.equal('explicit');
		});

		it('should select new nodes if the parent is selected (constructor)', () => {
			const tree = new Tree({ nodes, selectedIds, leafTypes, invisibleTypes, isDynamic: true,
				extraChildren: new Map([
					[1003, {
						Items: [[991, 'new1', mockOuTypes.course], [992, 'new2', mockOuTypes.courseOffering]],
						PagingInfo: { HasMoreItems: true, Bookmark: '992' }
					}]
				])
			});
			expect(tree.getState(991)).to.equal('explicit');
			expect(tree.getState(992)).to.equal('explicit');
		});

		it('should not select new nodes if the parent is partially selected', () => {
			dynamicTree.addNodes(1001, [[991, 'new1', mockOuTypes.course], [992, 'new2', mockOuTypes.courseOffering]]);
			expect(dynamicTree.getState(991)).to.equal('none');
			expect(dynamicTree.getState(992)).to.equal('none');
		});

		it('should not select new nodes if the parent is not selected', () => {
			dynamicTree.addNodes(1002, [[991, 'new1', mockOuTypes.course], [992, 'new2', mockOuTypes.courseOffering]]);
			expect(dynamicTree.getState(991)).to.equal('none');
			expect(dynamicTree.getState(992)).to.equal('none');
		});

		it('should set the parent of new nodes', () => {
			dynamicTree.addNodes(1001, [[991, 'new1', mockOuTypes.course], [992, 'new2', mockOuTypes.courseOffering]]);
			expect(dynamicTree.getParentIds(991)).to.deep.equal([1001]);
			expect(dynamicTree.getParentIds(992)).to.deep.equal([1001]);
		});

		it('should add the new parent to existing nodes', () => {
			dynamicTree.addNodes(1001, [[4, 'already a child of 1003', mockOuTypes.course], [992, 'new2', mockOuTypes.courseOffering]]);
			expect([...dynamicTree.getParentIds(4)].sort()).to.deep.equal([1001, 1003]);
			expect(dynamicTree.getParentIds(992)).to.deep.equal([1001]);
		});

		it('should report the correct ancestors for a new node', () => {
			dynamicTree.addNodes(3, [[991, 'new1', mockOuTypes.course], [992, 'new2', mockOuTypes.courseOffering]]);
			assertSetsAreEqual(dynamicTree.getAncestorIds(991), new Set([1001, 1002, 3, 6606, 991]));
		});

		it('should report the correct ancestors for descendants of a node with a new parent', () => {
			dynamicTree.addNodes(1003, [[1, 'already a child of 1001', mockOuTypes.course], [992, 'new2', mockOuTypes.courseOffering]]);
			assertSetsAreEqual(dynamicTree.getAncestorIds(1), new Set([1, 1001, 1003, 6606]));
			assertSetsAreEqual(dynamicTree.getAncestorIds(112), new Set([112, 1, 1001, 1003, 12, 6606]));
		});
	});

	describe('addTree', () => {
		const searchResults = [
			[6606, 'Org', mockOuTypes.organization, [0]],
			[1002, 'Department 2', mockOuTypes.department, [6606]],
			[1003, 'Department 3', mockOuTypes.department, [6606]],

			[3, 'Course 3', mockOuTypes.course, [1001, 1002]], // already present
			[94, 'Course 5', mockOuTypes.course, [1003, 1002]], // new

			[11, 'Semester 1', mockOuTypes.semester, [6606]],

			[511, 'Course 5 / Semester 1', mockOuTypes.courseOffering, [94, 11]], // new
			[113, 'Course 1 / Semester 3', mockOuTypes.courseOffering, [1, 13]] // new, not selected
		];
		it('should add the given nodes', () => {
			dynamicTree.addTree(searchResults);

			expect(dynamicTree.getName(94)).to.equal('Course 5');
			expect(dynamicTree.getName(511)).to.equal('Course 5 / Semester 1');
			expect(dynamicTree.getType(94)).to.equal(mockOuTypes.course);
			expect(dynamicTree.getType(511)).to.equal(mockOuTypes.courseOffering);
			expect(dynamicTree.isOpenable(94)).to.be.true;
			expect(dynamicTree.isOpenable(511)).to.be.false;
		});

		it('should not mark parents as populated', () => {
			dynamicTree.addTree(searchResults);
			expect(dynamicTree.isPopulated(1003)).to.be.false;
			expect(dynamicTree.isPopulated(94)).to.be.false;
		});

		it('should update children', () => {
			dynamicTree.addTree(searchResults);
			expect(dynamicTree.getChildIdsForDisplay(1003)).to.deep.equal([4, 94]);
			expect(dynamicTree.getChildIdsForDisplay(94)).to.deep.equal([511]);
		});

		it('should select based on parent state', () => {
			// 1003 was selected, but not 1002
			// because 94 is child of both, it will be selected, and 1002 will be partially selected
			expect(dynamicTree.getState(1002)).to.equal('none');
			dynamicTree.addTree(searchResults);
			expect(dynamicTree.getState(94)).to.equal('indeterminate'); // because it may have other children
			expect(dynamicTree.getState(511)).to.equal('explicit');
			expect(dynamicTree.getState(113)).to.equal('none');
			expect(dynamicTree.getState(1002)).to.equal('indeterminate');
		});

		it('should report the correct ancestors for a new node', () => {
			dynamicTree.addTree(searchResults);
			expect([...dynamicTree.getAncestorIds(511)].sort()).to.deep.equal([1002, 1003, 11, 511, 6606, 94]);
		});
	});

	describe('getAncestorIds', () => {
		it('builds the ancestors map correctly', () => {
			const expectedAncestorsMap = {
				6606: [6606],
				1001: [1001, 6606],
				1002: [1002, 6606],
				1003: [1003, 6606],
				1: [1, 1001, 6606],
				2: [2, 1001, 6606],
				3: [3, 1001, 1002, 6606],
				4: [4, 1003, 6606],
				11: [11, 6606],
				12: [12, 6606],
				13: [13, 6606],
				111: [111, 1, 11, 1001, 6606],
				112: [112, 1, 12, 1001, 6606],
				211: [211, 2, 11, 1001, 6606],
				312: [312, 3, 12, 1001, 1002, 6606]
			};

			Object.keys(expectedAncestorsMap).forEach((id) => {
				const expectedAncestors = new Set(expectedAncestorsMap[id]);
				const actualAncestors = dynamicTree.getAncestorIds(Number(id));
				assertSetsAreEqual(actualAncestors, expectedAncestors);
			});
		});

		it('should not throw if an org unit has no parents', () => {
			new Tree({ nodes: [
				[6606, 'Org', mockOuTypes.organization, [0]],
				[1001, 'Department 1', mockOuTypes.department, null],
				[1002, 'Department 2', mockOuTypes.department, [6606]]
			] });
		});

		it('returns [id] if an orgUnit was not in the map', () => {
			assertSetsAreEqual(dynamicTree.getAncestorIds(12345), new Set([12345]));
		});

		it('returns an empty set for id 0', () => {
			assertSetsAreEqual(dynamicTree.getAncestorIds(0), new Set());
		});
	});

	describe('getChildIdsForDisplay and setAncestorFilter', () => {
		it('returns sorted children', () => {
			expect(dynamicTree.getChildIdsForDisplay(1001)).to.deep.equal([1, 2, 3]);
		});

		it('returns empty if the node had no children on initialization', () => {
			expect(dynamicTree.getChildIdsForDisplay(4)).to.deep.equal([]);
		});

		it('excludes nodes of invisible type', () => {
			expect(dynamicTree.getChildIdsForDisplay(6606)).to.deep.equal([1001, 1002, 1003 /* semesters omitted */]);
		});

		it('ignores ancestor filter on dynamic tree', () => {
			dynamicTree.setAncestorFilter([12]);
			expect(dynamicTree.getChildIdsForDisplay(1)).to.deep.equal([111, 112]);
		});

		it('lists leaf nodes only if they match the ancestor filter', () => {
			staticTree.setAncestorFilter([12]);
			expect(staticTree.getChildIdsForDisplay(1)).to.deep.equal([112]);
		});

		it('lists non-leaf nodes only if they contain leaf nodes matching the ancestor filter', () => {
			staticTree.setAncestorFilter([12]);
			expect(staticTree.getChildIdsForDisplay(1001)).to.deep.equal([1, 3]);
		});

		it('applies ancestor filter from constructor', () => {
			const tree = new Tree({ nodes, invisibleTypes, ancestorIds: [12] });
			expect(tree.getChildIdsForDisplay(1001)).to.deep.equal([1, 3]);
		});

		it('clears the ancestor filter when given an empty list', () => {
			const tree = new Tree({ nodes, invisibleTypes, ancestorIds: [12] });
			tree.setAncestorFilter([]);
			expect(tree.getChildIdsForDisplay(1001)).to.deep.equal([1, 2, 3]);
		});

		it('clears the ancestor filter when given null', () => {
			const tree = new Tree({ nodes, invisibleTypes, ancestorIds: [12] });
			tree.setAncestorFilter(null);
			expect(tree.getChildIdsForDisplay(1001)).to.deep.equal([1, 2, 3]);
		});
	});

	describe('getName', () => {
		it('returns the node name', () => {
			expect(dynamicTree.getName(1)).to.equal('Course 1');
		});

		it('returns an empty string if the node has no name', () => {
			expect(dynamicTree.getName(4)).to.equal('');
		});

		it('returns an empty string for unknown nodes', () => {
			expect(dynamicTree.getName(864343)).to.equal('');
		});
	});

	describe('getParentIds', () => {
		it('returns the parent ids', () => {
			expect([...dynamicTree.getParentIds(3)].sort()).to.deep.equal([1001, 1002]);
		});

		it('returns an empty array if the node has no parents', () => {
			expect(dynamicTree.getParentIds(-100)).to.deep.equal([]);
		});

		it('returns an empty array if the node is unknown', () => {
			expect(dynamicTree.getParentIds(864343)).to.deep.equal([]);
		});
	});

	describe('getType', () => {
		it('returns the node type', () => {
			expect(dynamicTree.getType(1)).to.equal(mockOuTypes.course);
		});

		it('returns 0 if the node has no type', () => {
			expect(dynamicTree.getType(-100)).to.equal(0);
		});

		it('returns 0 for unknown nodes', () => {
			expect(dynamicTree.getType(73548)).to.equal(0);
		});
	});

	describe('hasAncestorsInList', () => {
		it('returns false if passed in orgUnit is not in the ancestors list', () => {
			expect(dynamicTree.hasAncestorsInList(12345, [6606])).to.be.false;
		});

		it('returns false if orgUnit is not in the list to check', () => {
			expect(dynamicTree.hasAncestorsInList(1001, [1002, 1003])).to.be.false;
		});

		it('returns false if orgUnit has no ancestors in the list to check', () => {
			expect(dynamicTree.hasAncestorsInList(1, [1002, 1003])).to.be.false;
		});

		it('returns true if orgUnit is in the list to check', () => {
			expect(dynamicTree.hasAncestorsInList(1001, [1001, 1002])).to.be.true;
		});

		it('returns true if orgUnit has ancestors in the list to check', () => {
			expect(dynamicTree.hasAncestorsInList(1, [1001, 1002])).to.be.true;
		});
	});

	describe('isOpenable', () => {
		it('should return true for a node that is not a leaf type', () => {
			expect(dynamicTree.isOpenable(1)).to.be.true;
		});

		it('should return false for a node that is a leaf type', () => {
			expect(dynamicTree.isOpenable(111)).to.be.false;
		});

		it('should return some boolean if the node is unknown (no error)', () => {
			expect(dynamicTree.isOpenable(2352235)).to.be.a('Boolean');
		});
	});

	describe('pruning', () => {
		const singleDepartmentNodes = [
			[6606, 'Org', mockOuTypes.organization, [0]],
			[1001, 'Department 1', mockOuTypes.department, [6606]],

			[2, 'Course 2', mockOuTypes.course, [1001]],
			[1, 'Course 1', mockOuTypes.course, [1001]],

			[11, 'Semester 1', mockOuTypes.semester, [6606]],
			[12, 'Semester 2', mockOuTypes.semester, [6606]],

			[111, 'Course 1 / Semester 1', mockOuTypes.courseOffering, [1, 11]],
			[211, 'Course 2 / Semester 1', mockOuTypes.courseOffering, [2, 12]]
		];

		const singleCourseNodes = [
			[6606, 'Org', mockOuTypes.organization, [0]],
			[1001, 'Department 1', mockOuTypes.department, [6606]],

			[1, 'Course 1', mockOuTypes.course, [1001]],

			[11, 'Semester 1', mockOuTypes.semester, [6606]],
			[12, 'Semester 2', mockOuTypes.semester, [6606]],

			[111, 'Course 1 / Semester 1', mockOuTypes.courseOffering, [1, 11]],
			[112, 'Course 1 / Semester 2', mockOuTypes.courseOffering, [1, 12]]
		];

		const singleCourseOfferingNodes = [
			[6606, 'Org', mockOuTypes.organization, [0]],
			[1001, 'Department 1', mockOuTypes.department, [6606]],

			[1, 'Course 1', mockOuTypes.course, [1001]],

			[11, 'Semester 1', mockOuTypes.semester, [6606]],
			[12, 'Semester 2', mockOuTypes.semester, [6606]],

			[111, 'Course 1 / Semester 1', mockOuTypes.courseOffering, [1, 11]]
		];

		describe('getChildIdsForDisplay', () => {
			it('should return non-pruned children', () => {
				expect(staticTree.getChildIdsForDisplay(6606)).to.deep.equal([1001, 1002, 1003]);

				let tree = new Tree({ nodes: singleDepartmentNodes, selectedIds, leafTypes, invisibleTypes, isDynamic: false });
				expect(tree.getChildIdsForDisplay(6606)).to.deep.equal([1, 2]);

				tree = new Tree({ nodes: singleCourseNodes, selectedIds, leafTypes, invisibleTypes, isDynamic: false });
				expect(tree.getChildIdsForDisplay(6606)).to.deep.equal([111, 112]);

				tree = new Tree({ nodes: singleCourseOfferingNodes, selectedIds, leafTypes, invisibleTypes, isDynamic: false });
				expect(tree.getChildIdsForDisplay(6606)).to.deep.equal([111]);
			});

			it('should skip pruning for a dynamic tree', () => {
				const tree = new Tree({ nodes: singleCourseOfferingNodes, selectedIds, leafTypes, invisibleTypes, isDynamic: true });
				expect(tree.getChildIdsForDisplay(6606)).to.deep.equal([1001]);
			});

			it('should return non-pruned children for filtered part of the tree', () => {
				const tree = new Tree({ nodes: singleDepartmentNodes, selectedIds, leafTypes, invisibleTypes, isDynamic: false });
				tree.setAncestorFilter([12]);
				expect(tree.getChildIdsForDisplay(6606)).to.deep.equal([211]);
			});
		});

		describe('search', () => {
			it('should return pruned nodes as well', async() => {
				const tree = new Tree({ nodes: singleCourseOfferingNodes, selectedIds, leafTypes, invisibleTypes, isDynamic: false });
				expect(tree.getMatchingIds('1')).to.deep.equal([1001, 111, 1]);
			});
		});
	});
});

describe('d2l-insights-tree-filter', () => {
	let el;
	function node(id, element = el) {
		return element.shadowRoot.querySelector(`d2l-insights-tree-selector-node[data-id="${id}"]`);
	}

	async function buildElementUnderTest(isDynamic, childHandler) {
		const tree = new Tree({
			nodes: [
				[1, 'Course 1', 3, [3, 4]],
				[2, 'Course 2', 3, [3, 4]],
				[3, 'Department 1', 2, [5]],
				[5, 'Faculty 1', 7, [6607]],
				[6, 'Course 3', 3, [7, 4]],
				[7, 'Department 2', 2, [5]],
				[8, 'Course 4', 3, [5]],
				[9, 'Course 5', 3, [5]],
				[10, 'Faculty 2', 7, [6607]],
				[6607, 'Dev', 1, [0]]
			],
			selectedIds: [1, 2, 7],
			leafTypes: [3],
			isDynamic
		});

		const el = await fixture(
			html`<d2l-insights-tree-filter
				opener-text="filter"
				opener-text-selected="filter with selections"
				@d2l-insights-tree-filter-request-children="${childHandler}"
				.tree="${tree}"
			></d2l-insights-tree-filter>`
		);
		await el.treeUpdateComplete;

		return el;
	}

	beforeEach(async() => {
		el = await buildElementUnderTest(false);
		el.tree.setOpen(5, true);
		el.tree.setOpen(7, true);
		await el.treeUpdateComplete;
	});

	describe('constructor', () => {
		it('should construct', () => {
			runConstructor('d2l-insights-tree-selector-node');
		});
	});

	describe('accessibility', () => {
		it('should pass all axe tests', async() => {
			await expect(el).to.be.accessible();
		});
	});

	describe('render', () => {
		it('should render with opener-text if no items are selected', async() => {
			const treeWithNoSelections = new Tree({ nodes: [
				[1, 'Course 1', 3, [3], [], 'none', false],
				[3, 'Department 1', 2, [5], [1], 'none', false],
				[5, 'Faculty 1', 7, [6607], [3], 'none', false],
				[6607, 'Dev', 1, [0], [5], 'none', false]
			], selectedIds: [], leafTypes: [3] });

			el = await fixture(
				html`<d2l-insights-tree-filter
				opener-text="filter"
				opener-text-selected="filter with selections"
				.tree="${treeWithNoSelections}"
			></d2l-insights-tree-filter>`
			);
			await el.treeUpdateComplete;

			const treeSelector = el.shadowRoot.querySelector('d2l-insights-tree-selector');
			expect(treeSelector.name).to.equal('filter');
		});

		it('should render with opener-text-selected if any items are selected', () => {
			const treeSelector = el.shadowRoot.querySelector('d2l-insights-tree-selector');
			expect(treeSelector.name).to.equal('filter with selections');
		});

		it('should render with opener-text-selected if all items are deselected but initial selections are not reset', async() => {
			const treeSelector = el.shadowRoot.querySelector('d2l-insights-tree-selector');
			node(3).simulateCheckboxClick();
			await el.treeUpdateComplete;

			node(7).simulateCheckboxClick();
			await el.treeUpdateComplete;

			expect(el.selected).to.deep.equal([]);
			expect(treeSelector.name).to.equal('filter with selections');
		});

		// NB: visual diffs should be the main check on the expected layout
		it('should render nodes closed by default', async() => {
			expect(node(3).isOpen).to.be.false;
		});

		it('should render nodes open if specified', async() => {
			expect(node(5).isOpen).to.be.true;
		});

		it('should render as selected: children of selected nodes and nodes with all children selected', async() => {
			const selectedNodes = el.shadowRoot.querySelectorAll('d2l-insights-tree-selector-node[selected-state="explicit"]');
			// NB: 1 and 2 are dot rendered at all because their parent is closed
			expect([...selectedNodes].map(x => x.dataId).sort()).to.deep.equal([3, 6, 7]);
		});

		it('should render as indeterminate nodes with some but not all children selected', async() => {
			const indeterminateNodes = el.shadowRoot.querySelectorAll('d2l-insights-tree-selector-node[selected-state="indeterminate"]');
			expect([...indeterminateNodes].map(x => x.dataId).sort()).to.deep.equal([5]);
		});

		it('should correctly mark level and parent name', async() => {
			expect(node(5).indentLevel).to.equal(1);
			expect(node(5).parentName).to.equal('root');

			expect(node(3).indentLevel).to.equal(2);
			expect(node(3).parentName).to.equal('Faculty 1');

			expect(node(6).indentLevel).to.equal(3);
			expect(node(6).parentName).to.equal('Department 2');
		});
	});

	describe('open and close', () => {
		it('should open a node on click', async() => {
			node(3).simulateArrowClick();
			await el.treeUpdateComplete;
			expect(node(3).isOpen).to.be.true;
		});

		it('should close on click', async() => {
			node(7).simulateArrowClick();
			await el.treeUpdateComplete;
			expect(node(7).isOpen).to.be.false;
		});

		it('should maintain open state of children', async() => {
			// Faculty 1 and Department 2 are open to start; close Department 1 then open again; Department 2 should still be open
			node(5).simulateArrowClick();
			await el.treeUpdateComplete;
			node(5).simulateArrowClick();
			await el.treeUpdateComplete;
			expect(node(3).isOpen).to.be.false;
			expect(node(7).isOpen).to.be.true;
		});

		it('should return the list of open node ids', async() => {
			node(3).simulateArrowClick();
			await el.treeUpdateComplete;
			expect(el.tree.open.sort()).to.deep.equal([3, 5, 7]);
		});
	});

	describe('selection', () => {
		it('should return selected nodes', async() => {
			expect(el.selected.sort()).to.deep.equal([3, 7]);
		});

		it('should select', async() => {
			node(9).simulateCheckboxClick();
			await el.treeUpdateComplete;
			expect(el.selected.sort()).to.deep.equal([3, 7, 9]);
		});

		it('should replace descendants in selection when ancestor selected', async() => {
			node(5).simulateCheckboxClick();
			await el.treeUpdateComplete;
			expect(el.selected.sort()).to.deep.equal([5]);
		});

		it('should deselect', async() => {
			node(7).simulateCheckboxClick();
			await el.treeUpdateComplete;
			expect(el.selected.sort()).to.deep.equal([3]);
		});

		it('should select parent when all children selected', async() => {
			node(8).simulateCheckboxClick();
			node(9).simulateCheckboxClick();
			await el.treeUpdateComplete;
			expect(el.selected.sort()).to.deep.equal([5]);
		});

		it('should select all other children if a node was selected and one child is deselected', async() => {
			node(5).simulateCheckboxClick();
			await el.treeUpdateComplete;
			// open dept 1 so that course 1 gets rendered - then deselect course 1
			node(3).simulateArrowClick();
			await el.treeUpdateComplete;
			node(1).simulateCheckboxClick();
			await el.treeUpdateComplete;
			expect(el.selected.sort()).to.deep.equal([2, 7, 8, 9]);
		});
	});

	describe('search', () => {
		it('should render search results', async() => {
			el.searchString = '1'; // matches Course 1, Department 1, and Faculty 1 - as well as Faculty 2 (Id: 10)
			await el.treeUpdateComplete;
			const selector = el.shadowRoot.querySelector('d2l-insights-tree-selector');
			expect(selector.isSearch).to.be.true;

			const resultNodes = el.shadowRoot.querySelectorAll('d2l-insights-tree-selector-node[slot="search-results"]');
			expect(resultNodes.length).to.equal(4);
			expect([...resultNodes].map(x => x.dataId).sort()).to.deep.equal([1, 10, 3, 5]);
		});

		it('should clear search results', async() => {
			el.searchString = '1';
			await el.treeUpdateComplete;
			el.searchString = '';
			await el.treeUpdateComplete;

			const selector = el.shadowRoot.querySelector('d2l-insights-tree-selector');
			expect(selector.isSearch).to.be.false;

			const resultNodes = el.shadowRoot.querySelectorAll('d2l-insights-tree-selector-node[slot="search-results"]');
			expect(resultNodes.length).to.equal(0);
		});

		it('should handle a search event', async() => {
			const selector = el.shadowRoot.querySelector('d2l-insights-tree-selector');
			selector.simulateSearch('forastring');
			await el.treeUpdateComplete;
			expect(el.searchString).to.equal('forastring');
		});

		it('should add dynamic search results', async() => {
			el.searchString = 'asdf'; // get into search mode
			el.addSearchResults([[9876, 'asdf', mockOuTypes.courseOffering, [6606]]], false);
			await el.treeUpdateComplete;

			const resultNodes = el.shadowRoot.querySelectorAll('d2l-insights-tree-selector-node[slot="search-results"]');
			expect(resultNodes.length).to.equal(1);
			expect([...resultNodes].map(x => x.dataId).sort()).to.deep.equal([9876]);
		});
	});

	describe('events', () => {
		async function expectEvent(id) {
			const listener = oneEvent(el, 'd2l-insights-tree-filter-select');
			node(id).simulateCheckboxClick();
			const event = await listener;
			expect(event.type).to.equal('d2l-insights-tree-filter-select');
			expect(event.target).to.equal(el);
		}

		it('should fire d2l-insights-tree-filter-select on selection', async() => {
			await expectEvent(9);
		});

		it('should fire d2l-insights-tree-filter-select on selection from indeterminate', async() => {
			await expectEvent(5);
		});

		it('should fire d2l-insights-tree-selector-change on deselection', async() => {
			await expectEvent(3);
		});

		it('should clear and fire d2l-insights-tree-filter-select on clear', async() => {
			const listener = oneEvent(el, 'd2l-insights-tree-filter-select');
			const selector = el.shadowRoot.querySelector('d2l-insights-tree-selector');
			const button = selector.shadowRoot.querySelector('d2l-dropdown-content d2l-button-subtle');
			button.click();
			const event = await listener;
			expect(event.type).to.equal('d2l-insights-tree-filter-select');
			expect(event.target).to.equal(el);
			expect(el.tree.selected).to.be.empty;
		});

		it('should immediately fire d2l-insights-tree-filter-request-children for root of dynamic tree', async() => {
			let isCalled = false;
			let calledWithId = -1;
			await buildElementUnderTest(true, event => {
				isCalled = true;
				calledWithId = event.detail.id;
			});
			expect(isCalled).to.be.true;
			expect(calledWithId).to.equal(6607);
		});

		it('should fire d2l-insights-tree-filter-request-children on open in dynamic tree', async() => {
			const el = await buildElementUnderTest(true, event => {
				// fill in some children so opening node 5 doesn't trigger another call for root
				event.target.tree.addNodes(event.detail.id, [[event.detail.id === 6607 ? 5 : 123, 'dynamic child', 2, []]]);
			});
			const listener = oneEvent(el, 'd2l-insights-tree-filter-request-children');
			node(5, el).simulateArrowClick();
			const event = await listener;
			expect(event.type).to.equal('d2l-insights-tree-filter-request-children');
			expect(event.target).to.equal(el);
			expect(event.detail.id).to.equal(5);
		});

		it('should fire d2l-insights-tree-filter-search on search in dynamic tree', async() => {
			el.tree._populated = new Set(); // shortcut to make tree dynamic
			const listener = oneEvent(el, 'd2l-insights-tree-filter-search');
			const filter = el.shadowRoot.querySelector('d2l-insights-tree-selector');
			filter.simulateSearch('asdf');
			const event = await listener;
			expect(event.type).to.equal('d2l-insights-tree-filter-search');
			expect(event.target).to.equal(el);
			expect(event.detail.searchString).to.equal('asdf');
			expect(event.detail.bookmark).to.not.exist;
		});

		it('should fire d2l-insights-tree-filter-search on click of load more button', async() => {
			el.searchString = 'asdf'; // get into search mode
			el.addSearchResults([[9876, 'asdf', mockOuTypes.courseOffering, [6606]]], true, 'bookmark');
			await el.treeUpdateComplete;

			const resultNodes = el.shadowRoot.querySelectorAll('d2l-button[slot="search-results"]');
			expect(resultNodes.length).to.equal(1);

			const listener = oneEvent(el, 'd2l-insights-tree-filter-search');
			resultNodes[0].click();
			const event = await listener;
			expect(event.type).to.equal('d2l-insights-tree-filter-search');
			expect(event.target).to.equal(el);
			expect(event.detail.searchString).to.equal('asdf');
			expect(event.detail.bookmark).to.equal('bookmark');
		});
	});
});
