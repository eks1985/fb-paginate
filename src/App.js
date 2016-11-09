import React, { Component } from 'react';
import * as firebase from 'firebase';
import './App.css';
import FirebasePaginator from './firebase-paginator';

class App extends Component {

  componentDidMount() {
    
  	const firebaseConfig = {
  		apiKey: "AIzaSyCR5P2_teSEEUyTjQEL2vyw8iw2OU49ypU",
      authDomain: "notes-26e3d.firebaseapp.com",
      databaseURL: "https://notes-26e3d.firebaseio.com",
      storageBucket: "notes-26e3d.appspot.com",
      messagingSenderId: "434444757860"
  	};

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const database = firebase.database();
    const booksRef = database.ref('cards');
    
    // auth.signInAnonymously();
    
    auth.onAuthStateChanged((authData) => {
			if (authData) {
			  let paginator = new FirebasePaginator(booksRef, {auth: '5C3ZUOm60mk8fsKehdYohthHeZZji9A9VXGEnoir'});  
			  //console.log(paginator.collection);
			 // console.log(paginator.next);
			  
			  paginator.listen(function (eventName, eventPayload) {
          console.log(`Fired ${eventName} with the following payload: `, eventPayload);
        });
			  
			  paginator.next()
        .then(function() {
          console.log('paginated forward, collection', paginator.collection);
        });
			  
			 // console.log(paginator.once);
			 
			 //paginator.once('value', () => {
			 //  console.log(123);
			 //});

      // paginator.listen(() => {
      //   console.log("event happened");
      // });  
			  
			 // paginator.once('value', (data) => {
			 //     console.log(data);
			 // });
			 //paginator.listen(function (eventName, eventPayload) {
    //     console(`Fired ${eventName} with the following payload: `, eventPayload);
    //   });
			 // console.log(paginator);
			 
      // var handler = function() {
      //   let collection = paginator.collection();
      //   console.log(collection);
      // };
      
      // paginator.on('value', handler);
			 
			 
			 
			} else {
			}
		});
		
  }


  render() {
    
    return (
      <div className="App">
        <div className="App-header">
          <h2>Welcome to React</h2>
        </div>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>
      </div>
    );
  }
}

export default App;
