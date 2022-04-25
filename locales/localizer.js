// see https://docs.dev.d2l/index.php/Oslo
import { getLocalizeOverrideResources } from '@brightspace-ui/core/helpers/getLocalizeResources.js';
import { LocalizeMixin } from '@brightspace-ui/core/mixins/localize-mixin';

// copied from BrightspaceUI/core's LocalizeCoreElement, with modifications
export const Localizer = superclass => class extends LocalizeMixin(superclass) {

	/**
	 * @param {string[]} langs - contains locales and languages in order of preference
	 * e.g. ['fr-fr', 'fr', 'en-us', 'en']
	 */
	static async getLocalizeResources(langs) {
		function getCollectionName() {
			// must be "name" from package.json, then backslash, then "name" from *.serge.json
			return '@brightspace-ui-labs/ou-filter\\ou-filter';
		}

		let translations;
		// always load in English translations, so we have something to default to
		const enTranslations = await import('./en.js');

		try {
			// not sure why for await..of syntax is required here.
			// In debugger langs looks like a regular array, but maybe it's really an async iterable under the hood
			for await (const lang of langs) {
				switch (lang) {
					case 'ar':
						translations = await import('./ar.js');
						break;
					case 'cy-gb':
					case 'cy':
						translations = await import('./cy.js');
						break;
					case 'da':
						translations = await import('./da.js');
						break;
					case 'de':
						translations = await import('./de.js');
						break;
					case 'en':
						translations = await import('./en.js');
						break;
					case 'es':
						translations = await import('./es.js');
						break;
					case 'es-es':
						translations = await import('./es-es.js');
						break;
					case 'fr':
						translations = await import('./fr.js');
						break;
					case 'fr-fr':
						translations = await import('./fr-fr.js');
						break;
					case 'fr-on':
					case 'fr-ON':
						translations = await import('./fr-ON.js');
						break;
					case 'hi':
						translations = await import('./hi.js');
						break;
					case 'ja':
						translations = await import('./ja.js');
						break;
					case 'ko':
						translations = await import('./ko.js');
						break;
					case 'nl':
						translations = await import('./nl.js');
						break;
					case 'pt':
						translations = await import('./pt.js');
						break;
					case 'sv':
						translations = await import('./sv.js');
						break;
					case 'tr':
						translations = await import('./tr.js');
						break;
					case 'zh-tw':
						translations = await import('./zh-tw.js');
						break;
					case 'zh':
						translations = await import('./zh.js');
						break;
				}

				if (translations && translations.default) {
					return await getLocalizeOverrideResources(
						lang,
						Object.assign(enTranslations.default, translations.default),
						getCollectionName
					);
				}
			}

			return await getLocalizeOverrideResources(
				'en',
				enTranslations.default,
				getCollectionName
			);

		} catch (err) {
			// can happen if the langterms file for a language doesn't exist
			return await getLocalizeOverrideResources(
				'en',
				enTranslations.default,
				getCollectionName
			);
		}
	}
};
