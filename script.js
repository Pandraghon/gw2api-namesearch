import { promises as fs } from 'fs';
import { resolve } from 'path';
import fetch from 'node-fetch';

const langs = ['fr', 'en'];
const apiUrl = 'https://api.guildwars2.com/v2/';
const padding = 200;

const run = async () => {

    const endpoints = await fs.readFile('endpoints.json').then(JSON.parse).catch(console.error);

    await Promise.all(endpoints.map(async endpoint => {
        // Fetch ids from API
        const ids = await fetch(`${apiUrl}${endpoint}`).then(res => res.json());
        const sanitizedEndpoint = endpoint.replace(/\//g, '_');

        // Update names
        return Promise.all(langs.map(async lang => {
            const current = (await fs.readFile(resolve(lang, `${sanitizedEndpoint}.json`)).then(JSON.parse).catch(console.error)) || {};
            const currentIds = Object.keys(current);
            const toFetch = [];

            for (let i = 0, imax = ids.length ; i < imax && toFetch.length < padding ; i++) {
                const id = ids[i];
                if (currentIds.indexOf(`${id}`) === -1) toFetch.push(id);
            }

            if (toFetch.length) {
                return fetch(`${apiUrl}${endpoint}?ids=${toFetch.join(',')}&lang=${lang}`)
                    .then(async res => {
                        const data = await res.json();
                        for (let i = 0, imax = data.length ; i < imax ; i++) {
                            const { id, name } = data[i];
                            current[id] = name;
                        }
                        console.log(`[${lang}] ${data.length} records added for ${endpoint}`);
                        await fs.writeFile(resolve(lang, `${sanitizedEndpoint}.json`), JSON.stringify(current));
                        await fs.writeFile(resolve(lang, `${sanitizedEndpoint}.csv`), Object.entries(current).map(([id, name]) => `${JSON.stringify(name)},${id}`).join('\n'));
                    });
            }
        }));
    }));

};

run();