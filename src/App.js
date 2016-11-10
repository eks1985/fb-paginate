import React, { Component } from 'react';
import * as firebase from 'firebase';
import FirebasePaginator from './firebase-paginator';
// import {v4} from 'node-uuid';

class App extends Component {

  constructor() {
    super();
    this.state = {items: []};
    this.paginator = {};
    this.listRef = undefined;
    this.rootRef = undefined;
    this.stress = [];
  }

  componentDidMount() {

  	const firebaseConfig = {
      apiKey: "AIzaSyABTLxF4qyRqOqt5uwZcxILnioqrNuaswA",
      authDomain: "paginator-3d586.firebaseapp.com",
      databaseURL: "https://paginator-3d586.firebaseio.com",
      storageBucket: "paginator-3d586.appspot.com",
      messagingSenderId: "646327630223"
  	};

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const database = firebase.database();
    this.listRef = database.ref('list');
    this.rootRef = database.ref();

    if (auth.currentUser === null) {
      auth.signInWithEmailAndPassword('ya.kefimov@yandex.ru', 'kernel');
    }

    auth.onAuthStateChanged((authData) => {
			if (authData) {
			  this.paginator = new FirebasePaginator(this.listRef, {auth: '8ce5cEkArJpFNlD6tK4I8G76k0zcWfV228imPpzF', finite: true});
        this.paginator.reset()
        .then( () => {
          this.setState({ items: this.paginator.collection || {} });
        });
			}
		});
		
		// stress test
		// for (var i = 0;  i < 1000000; i += 1 ) {
		//   this.stress.push(v4());
		// }
		
		// console.log(this.stress);

  }

  handleNext() {
    this.paginator.next()
    .then( () => {
      this.setState({ items: this.paginator.collection});
    });
  }

  handlePrev() {
    this.paginator.previous()
    .then( () => {
      this.setState({ items: this.paginator.collection});
    });
  }

  handleReset() {
    this.paginator.reset()
    .then( () => {
      this.setState({ items: this.paginator.collection});
    });
  }
  
  handleResetFinite() {
    this.paginator.goToPage(1)
    .then( () => {
      this.setState({ items: this.paginator.collection});
    });
  }

  handlePush() {
    // for (var i = 1; i < 101; i++) {
    //   this.listRef.push(i);
    // }
    this.rootRef.update({"foo": ""});
  }


  render() {
    
    const { pageNumber, pageCount, isLastPage } = this.paginator;

    return (
      <div className="App">
        <button onClick={this.handleNext.bind(this)} disabled={pageNumber === 1}>{'<--'}</button>
        <button onClick={this.handlePrev.bind(this)} disabled={isLastPage}>{'-->'}</button>
        <input 
          type="text" 
          style={{width: "25px"}}
          onChange={
            (e) => {
              // console.log(e.target.value);
              this.paginator.goToPage(e.target.value)
              .then( () => {
                this.setState({ items: this.paginator.collection});
              });
            }
          }
        >
        </input>
        {/* <button onClick={this.handleReset.bind(this)}>Reset</button> */}
        <button onClick={this.handleResetFinite.bind(this)}>Reset</button>
        { pageNumber && <span>{pageNumber}/{pageCount}</span>}
        {
          Object.keys(this.state.items).map( key => {
            return <div key={key}>{this.state.items[key]}</div>;
          })
        }
        <button onClick={this.handlePush.bind(this)}>Push</button>
      </div>
    );
  }
}

export default App;
