import { promises as fs } from 'fs';
import { resolve } from 'path';
import fetch from 'node-fetch';

const langs = ['fr', 'en'];
const apiUrl = 'https://api.guildwars2.com/v2/';
const padding = 200;

langs.map(async lang => {
	const stateFilepath = resolve(lang, 'state.json');
	const states = await fs.readFile(stateFilepath).then(JSON.parse).catch(console.error);
	console.log(`Current state for ${lang}`, states);
	const jobs = Object.entries(states).map(async ([endpoint, state]) => {
		return fetch(`${apiUrl}${endpoint}?page_size=${padding}&page=${state.page}&lang=${lang}`)
			.then(async res => {
				const data = await res.json();
				const lastPage = res.headers.get('x-page-total');
				const lastSavedId = state.last_id;
				const dataToSave = [];
				let idToSave = false;
				for (let i = 0, imax = data.length ; i < imax ; i++) {
					const current = data[i];
					// TODO: this condition doesn't work with achievements, since entries are not ordered by ids
					if (current.id <= lastSavedId) continue;
					dataToSave.push(`${JSON.stringify(current.name)},${current.id}`);
					idToSave = current.id;
				}
				if (dataToSave.length) {
					console.log(`Adding ${dataToSave.length} entries in ${lang}/${endpoint}.csv`);
					await fs.appendFile(resolve(lang, `${endpoint}.csv`), `${dataToSave.join('\n')}\n`).catch(console.error);
					state.last_id = idToSave;
				} else {
					console.log(`No new entries to add to ${lang}/${endpoint}.csv`);
				}
				if (lastPage > state.page) state.page++;
			}).catch(console.error);
	});
	await Promise.all(jobs);
	console.log(`Saving state in ${stateFilepath}`)
	await fs.writeFile(stateFilepath, JSON.stringify(states));
});