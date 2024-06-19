
import puppeteer from 'puppeteer';
import { VisualDiff } from '@brightspace-ui/visual-diff';

describe('ou-filter', () => {

	const visualDiff = new VisualDiff('ou-filter', import.meta.url, { tolerance: 0.1 });

	let browser, page;

	before(async() => {
		browser = await puppeteer.launch();
		page = await visualDiff.createPage(browser);
		await page.setViewport({
			width: 1275,
			height: 700,
			deviceScaleFactor: 1
		});
		await page.goto(
			`${visualDiff.getBaseUrl()}/test/visual-diff/d2l-labs-ou-filter.visual-diff.html`,
			{ waitUntil: ['networkidle0', 'load'] }
		);
		await new Promise(res => setTimeout(res, 300));
		await page.bringToFront();
	});

	after(() => browser.close());

	async function expandDepartment1Node(page) {
		const options = { delay: 10 };

		// open tree
		await page.keyboard.press('Tab');
		await page.keyboard.press('Space', options);

		// expand Faculty 1
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');
		await page.keyboard.press('Enter', options);

		// expand Department 1
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');
		await page.keyboard.press('Enter', options);
	}

	it('Desktop', async function() {
		await expandDepartment1Node(page);
		await new Promise(res => setTimeout(res, 300));
		const rect = await visualDiff.getRect(page, 'body');
		await visualDiff.screenshotAndCompare(page, this.test.fullTitle(), { clip: rect });
	});

	it('Mobile', async function() {
		await page.setViewport({
			width: 320,
			height: 700,
			deviceScaleFactor: 1
		});
		const rect = await visualDiff.getRect(page, 'body');
		await visualDiff.screenshotAndCompare(page, this.test.fullTitle(), { clip: rect });
	});

});

