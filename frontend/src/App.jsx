import { useState,useEffect } from 'react'
import axios from 'axios'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import {Button} from 'react-bootstrap'
import {Form} from 'react-bootstrap'
import TimeAgo from 'javascript-time-ago'
import {ProgressBar} from 'react-bootstrap'
import en from 'javascript-time-ago/locale/en'
TimeAgo.addDefaultLocale(en)

// Create formatter (English).
const timeAgo = new TimeAgo('en-US')
import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css'

//const URL='http://yt.local/'
const URL=import.meta.env.MODE === 'development' ? 'http://localhost:3000/' : '/'


function PlayList({name, total,completed,id,unavailable}) {
	// Use Subgrid to align as table


	const playlistStyle = {
		display: 'grid', 
		gridColumn: '1 / -1', 
		gridTemplateColumns: 'subgrid'
	}
	
	let percentage = 0
	if(total> 0)
		percentage = (completed/ total) * 100

	if(!name){
		name = 'Processing... '+id
	}



	return (
		<div style={playlistStyle} className="border rounded p-2 bg-secondary">
			<div>{name}</div>
			<div className="d-flex flex-column justify-content-center">
				<ProgressBar now={percentage} label={`${percentage}%`} />
			</div>
			<div>{completed}/{total}({unavailable})</div>
		</div>
	)

}


function Log({message,created_at}) {
	// Use Subgrid to align as table
	const logStyle = {
		display: 'grid',
		gridColumn: '1 / -1',
		gridTemplateColumns: 'subgrid'
	}

	return (
		<div style={logStyle} className="border rounded p-2 bg-secondary">
			<div>{message}</div>
			<div>{timeAgo.format(new Date(created_at*1000))}</div>
		</div>
	)
}


function App() {
	const [playlists, setPlaylists] = useState([
		{
			name: "Loading...",
			totalVideos: 100,
			totalDownloaded: 0
		},
	])


	const [currentPlaylist, setCurrentPlaylist] = useState(null)
	const [log, setLog] = useState([])


	const mainGrid = {
		display: 'grid',
		gridTemplateAreas: `
			"input input"
			"list log"
		`,

		gridTemplateRows: 'auto 1fr',
		gridTemplateColumns: '4fr 1fr',
		gridGap: '10pt',
		width: '100%',
		height: '100%',
	}

	const listStyle={
		display: 'grid',
		gridTemplateColumns: 'auto 1fr auto',
		gridGap: '10pt',
		gridTemplateRows: 'auto',
		gridArea: 'list',
	}
	const logsStyle={
		display: 'grid',
		gridTemplateColumns: '1fr auto',
		gridGap: '10pt',
		gridTemplateRows: 'auto',
	}


	const loadPlaylists = () => {
		// fetch playlists
		axios.get(URL + 'api/playlists')
			.then(response => {
				setPlaylists(response.data)
			})
			.catch(error => {
				console.error(error)
				alert('Error loading playlists')
			})
	}


	const addPlaylist = () => {

		// add playlist
		axios.post(URL+'api/playlists', {id: currentPlaylist.trim()})
			.then(response => {
				loadPlaylists()
				setCurrentPlaylist(null)
			})
			.catch(error => {
				console.error(error)
				alert('Error adding playlist')
			})

	}
	const loadLogs = () => {
		// fetch logs
		axios.get(URL + 'api/logs')
			.then(response => {
				setLog(response.data)
			})
			.catch(error => {
				console.error(error)
				alert('Error loading logs')
			})
	}


	useEffect(() => {
		setInterval(loadPlaylists, 500)
		setInterval(loadLogs, 500)
	}, [])

	return (
		<div style={mainGrid}>
			<div className="d-flex flex-row" style={{gridArea: 'input'}}>
				<div className="flex-grow-1">
					<Form.Control type="text" placeholder="Enter URL" value={currentPlaylist} onChange={e => setCurrentPlaylist(e.target.value)} />
				</div>
				<div>
					<Button variant="primary" onClick={addPlaylist}>Add</Button>
				</div>
			</div>
			<div className="border rounded p-2" style={{gridArea: 'list'}}>
				<div style={listStyle}>
					{
						playlists?.length === 0 ? <div>No Playlists..</div> : (
						playlists.map((playlist, index) => (
							<PlayList key={index} {...playlist} />
						)))}
				</div>
			</div>

			<div style={{gridArea: 'log'}} className="border rounded p-2 overflow-auto">
				<div style={logsStyle}>
					{
						log?.length === 0 ? <div>No Logs..</div> : (
						log.map((log, index) => (
							<Log key={log.id} {...log} />
						)))
					}
				</div>
			</div>
		</div>
	)
}

export default App
