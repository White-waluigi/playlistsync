import Database from 'better-sqlite3';
//import async fs
import fs from 'fs';
import path from 'path';


// 1. Open (or create) the database file:
//

export async function openDB(){

	let dbName='sync.db';
	let fileDidExist = true;

	//if file does not exist, it will be created
	if(!fs.existsSync(dbName)){
		console.log("Database file does not exist");
		fileDidExist = false;
	}
	


	let options = {
		readonly: false,
		fileMustExist: false,
		timeout: 500
	};

	const db = new Database(dbName,options);
	db.pragma('journal_mode = WAL');

	if(!fileDidExist){
		await resetDB(db);
	}


	return db;
}
//
export async function resetDB(db){
	console.log("********** Resetting Database **********");
	// ascii snowman yay
	db.exec('DROP TABLE IF EXISTS synclog');
	db.exec('DROP TABLE IF EXISTS songs');
	db.exec('DROP TABLE IF EXISTS playlists');

	db.exec('CREATE TABLE playlists (id text primary key, name text, fetched boolean default false)');
	db.exec('CREATE TABLE songs (id text primary key, title text, completed boolean default false, unavailable default false, playlist_id text, FOREIGN KEY(playlist_id) REFERENCES playlists(id))');

	db.exec('CREATE TABLE synclog (id integer primary key autoincrement, message text, created_at timestamp default current_timestamp)');

	console.log("Database reset complete");


}
