
import puppeteer from 'puppeteer';
import { VisualDiff } from '@brightspace-ui/visual-diff';

['ltr', 'rtl'].forEach(dir => {
	describe.only(`ou-filter-select-all ${dir}`, () => {

		const visualDiff = new VisualDiff(`ou-filter-select-all-${dir}`, import.meta.url, { tolerance: 0.1 });

		let browser, page;

		before(async() => {
			browser = await puppeteer.launch({ headless: true }); // { headless: false } - useful for debugging
			page = await visualDiff.createPage(browser);
		});

		after(() => browser.close());

		beforeEach(async() => {
			await page.goto(
				`${visualDiff.getBaseUrl()}/test/visual-diff/d2l-labs-ou-filter.visual-diff.html#select-all-ui=1;dir=${dir}`,
				{ waitUntil: ['networkidle0', 'load'] }
			);
			await page.reload();
			await new Promise(res => setTimeout(res, 300));
			await page.bringToFront();
		});

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
			await page.keyboard.press('Tab');
			await page.keyboard.press('Enter', options);

			// expand Department 1
			await page.keyboard.press('Tab');
			await page.keyboard.press('Tab');
			await page.keyboard.press('Enter', options);
		}

		it('Desktop', async function() {
			await page.setViewport({
				width: 600,
				height: 700,
				deviceScaleFactor: 2
			});
			await expandDepartment1Node(page);
			const rect = await visualDiff.getRect(page, 'body');
			await visualDiff.screenshotAndCompare(page, this.test.fullTitle(), { clip: rect });
		});

		it('Mobile', async function() {
			await page.setViewport({
				width: 370,
				height: 700,
				deviceScaleFactor: 2
			});
			await expandDepartment1Node(page);
			const rect = await visualDiff.getRect(page, 'body');
			await visualDiff.screenshotAndCompare(page, this.test.fullTitle(), { clip: rect });
		});

	});
});
