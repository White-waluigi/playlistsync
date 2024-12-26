//Setup express with Same Origin Policy

//import yargs
import yargs from 'yargs';

import {openDB,resetDB} from './db.js';
import {startServer} from './server.js';
import {startWorker} from './syncWorker.js';



async function main(){
	const argv = yargs(process.argv.slice(2)).argv;
	const db = await openDB();
	if(argv.resetDB){
		await resetDB(db);
		console.log('Database reset');
		return
	}
	await startServer(db);
	await startWorker(db);
}

main();



