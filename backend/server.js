import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import {openDB,resetDB} from './db.js'


export async function startServer(db){

	const app = express();
	app.use(cors());
	app.use(express.json());


	app.get('/api/playlists', async (req, res) => {
		try{
			const playlists = db.prepare(`
			SELECT playlists.*, SUM(CASE WHEN songs.completed THEN 1 ELSE 0 END) as completed,SUM(CASE WHEN songs.unavailable THEN 1 ELSE 0 END) as unavailable, COUNT(songs.id) as total
			FROM playlists
			LEFT JOIN songs ON songs.playlist_id = playlists.id
			GROUP BY playlists.id
			ORDER BY playlists.name
		`).all();



			res.json(playlists);

		}catch(e){
			console.error(e);
			res.status(500).send('Error loading playlists');
		}
	});

	app.post('/api/playlists', async (req, res) => {
		try{
			const playlist = req.body;
			//check if playlist is valid youtube url (must contain at least 10 alphanumeric characters)
			if(!playlist.id.match(/[a-zA-Z0-9]{10,}/)){
				res.status(400).send('Invalid playlist url');
				return;
			}


			db.prepare('INSERT INTO playlists (id) VALUES (?)').run(playlist.id);
			res.json(playlist);
		}catch(e){
			console.error(e);
			res.status(500).send('Error adding playlist');
		}
	});


	app.get('/api/logs', async (req, res) => {
		try{
			const logs = db.prepare('SELECT *,unixepoch(created_at) as created_at  FROM synclog ORDER BY created_at DESC LIMIT 200').all();
			res.json(logs);
		}catch(e){
			console.error(e);
			res.status(500).send('Error loading logs');
		}
	})

	//serve react app
	app.use(express.static('public'));

	//start server
	const port = process.env.PORT || 3000;
	app.listen(port, () => {
		console.log(`Server listening at http://localhost:${port}`);
	});

}
