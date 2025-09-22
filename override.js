import { promises as fs } from 'fs';
import { resolve } from 'path';
import fetch from 'node-fetch';

const langs = ['fr', 'en', 'de'];
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
            const current = {};
            const currentIds = Object.keys(current);
            let toFetch = [];
            const chunkCount = Math.ceil(ids / padding);

            for (let i = 0 ; i < chunkCount ; i++) {
                toFetch = ids.slice(i * padding, (i + 1) * padding);

                if (toFetch.length) {
                    return fetch(`${apiUrl}${endpoint}?ids=${toFetch.join(',')}&lang=${lang}`)
                        .then(async res => {
                            const data = await res.json();
                            for (let i = 0, imax = data.length ; i < imax ; i++) {
                                const { id, name } = data[i];
                                current[id] = name;
                            }
                        });
                }
            }
            await fs.writeFile(
                resolve(lang, `${sanitizedEndpoint}.json`), 
                JSON.stringify(current));
            await fs.writeFile(
                resolve(lang, `${sanitizedEndpoint}.csv`), 
                Object.entries(current).map(([id, name]) => `${JSON.stringify(name)},${id}`).join('\n'));
        }));
    }));

};

run();
