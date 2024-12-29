// Call system function
import {exec} from 'child_process';
import {spawn} from 'child_process';
import chalk from 'chalk';

export async function startWorker(db){
	await startLoop(db);
}

async function startLoop(db) {
	console.log('Starting worker loop');

	let a=false
	while(true){

		a=!a;
		console.log(a?'...':'---');


		try{
			await nextProcess(db);
		}catch(e){
			console.error(e); console.error('Trying again in 4 seconds');
			await new Promise(resolve => setTimeout(resolve, 4000));
		}
	}
}


class VidoeUnavailableError extends Error{
	constructor(message){
		super(message);
		this.name = 'VidoeUnavailableError';
	}
}
async function runProcess(name, args, cwd = '.') {
	return await new Promise((resolve, reject) => {

		let logAccumulator = '';
		let outAccumulator = '';

		const process = spawn(name, args, { cwd, shell: true });


		process.stdout.on('data', (data) => {
			console.log(chalk.yellow(data.toString()));
			logAccumulator += data.toString();
			outAccumulator += data.toString();

			//process.stdout.write(data.toString());
		});



		process.stderr.on('data', (data) => {
			console.log(chalk.cyan(data.toString()));
			logAccumulator += data.toString();
			/*
			const output = data.toString();
			process.stderr.write(output);
			if (output.includes('Video unavailable')) {
				reject(new VideoUnavailableError(output));
				process.kill(); // Terminate the process if this specific error occurs
			}
			*/
		});

		process.on('error', (error) => {

			console.log(chalk.red("error: "+error.toString()));
			logAccumulator += error.toString();
			reject(error);
		});

		process.on('close', (code) => {
			console.log(chalk.green(`child process exited with code ${code}`));

			if (code !== 0) {
				if(logAccumulator.includes('Video unavailable')){
					reject(new VidoeUnavailableError(logAccumulator));
				}

				reject(new Error(`Process exited with code ${code}`));
			} else {
				resolve(outAccumulator);
			}
		});
	});
}

async function processSong(db,id){
	//get song title
	//yt-dlp --simulate --print "%(title)s" https://www.youtube.com/watch?v=

	const args = [
		'--simulate',
		'--print',
		'"%(title)s"',
		`https://www.youtube.com/watch?v=${id}`
	];

	let title=db.prepare('SELECT title FROM songs WHERE id = ?').get(id).title;
	if(!title){

		try{
			title = await runProcess('yt-dlp',args);
		}catch(e){

			db.prepare('INSERT INTO synclog (message) VALUES (?)').run('Failure to identify title for '+id);
			throw e;

		}
		console.log('Processing :',title);

		db.prepare('UPDATE songs SET title = ? WHERE id = ?').run(title,id);
		db.prepare('INSERT INTO synclog (message) VALUES (?)').run('Successfully identified title for '+title+' ('+id+')');
	}

	//download song

	//mkdir if not exists
	await runProcess('mkdir',['-p','./archive']);
	await runProcess('mkdir',['-p','./archive/'+id]);

	const downloadArgs = [
		'-o',
		'--extract-audio',
		//'"./archive/'+id+'/%(title)s.%(ext)s"',
		'https://www.youtube.com/watch?v='+id
	];

	try{
		console.log("********************");
		await runProcess('yt-dlp',downloadArgs,'./archive/'+id);
	}catch(e){

		console.log("###############");
		console.log({e});
		if(e instanceof VidoeUnavailableError){
			db.prepare('UPDATE songs SET unavailable = true, completed = true WHERE id = ?').run(id);
			db.prepare('INSERT INTO synclog (message) VALUES (?)').run('Video unavailable '+id);
			return;
		}

		db.prepare('INSERT INTO synclog (message) VALUES (?)').run('Failure to download '+title+' ('+id+')');
		throw e;
	}

	//set processed to true
	db.prepare('UPDATE songs SET completed = true WHERE id = ?').run(id);

	db.prepare('INSERT INTO synclog (message) VALUES (?)').run('Successfully downloaded '+title+' ('+id+')');



}

async function processPlaylist(db,id){

	try{

		let playlistName = db.prepare('SELECT name FROM playlists WHERE id = ?').get(id).name;

		if(!playlistName){

			//yt-dlp https://youtube.com/playlist?list=PLpeFO20OwBF7iEECy0biLfP34s0j-8wzk -I 1:1 --skip-download --no-warning --print playlist_title
			const args = [
				'https://youtube.com/playlist?list='+id,
				'-I',
				'1:1',
				'--skip-download',
				'--no-warning',
				'--print',
				'playlist_title'
			];

			console.log('Figuring out playlist name:',id);
			try{
				playlistName = await runProcess('yt-dlp',args);
			}catch(e){
				db.prepare('INSERT INTO synclog (message) VALUES (?)').run('Failure to identify playlist name for '+id);
				throw e;
			}

			console.log('Processing playlist:',playlistName);

			db.prepare('UPDATE playlists SET name = ? WHERE id = ?').run(playlistName,id);
			db.prepare('INSERT INTO synclog (message) VALUES (?)').run('Successfully identified playlist name for '+id);
		}


		//load all song ids
		const args = [
			'--get-id',
			'--flat-playlist',
			'https://www.youtube.com/playlist?list='+id
		];

		const songIds = await runProcess('yt-dlp',args);
		const ids = songIds.split('\n').filter(x => x);
		console.log('Processing playlist:',ids);

		console.log('Adding ',ids.length,' songs to database');
		for(const vid of ids){
			db.prepare('INSERT OR IGNORE INTO songs (id,playlist_id) VALUES (?,?)').run(vid,id);
		}
		db.prepare('UPDATE playlists SET fetched = true WHERE id = ?').run(id);

		db.prepare('INSERT INTO synclog (message) VALUES (?)').run('Successfully Scraped playlist '+playlistName);

	}catch(e){
		db.prepare('INSERT INTO synclog (message) VALUES (?)').run('Failure to process playlist '+id);
		throw e;
	}
}

async function nextProcess(db){
	console.log('Checking for work in playlists');
	const playlist = db.prepare('SELECT * FROM playlists WHERE fetched = false ORDER BY RANDOM() LIMIT 1').get();
	if(playlist){
		await processPlaylist(db,playlist.id);
		return;
	}


	console.log('Checking for work in songs');
	const song = db.prepare('SELECT * FROM songs WHERE completed = false ORDER BY RANDOM() LIMIT 1').get();


	if(song){
		await processSong(db,song.id);
		return;
	}


	db.prepare('INSERT INTO synclog (message) VALUES (?)').run('No work to do');
	console.log('No work to do');
	await new Promise(resolve => setTimeout(resolve, 4000));
}
