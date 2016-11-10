export default class FirebasePaginator {

  constructor(ref, options = {}) {
    this.pageSize = options.pageSize ? parseInt(options.pageSize, 10) : 10;
    this.isFinite = options.finite ? options.finite : false;
    this.auth = options.auth;
    this.fbRef = ref;
    this.events = {};
    this.initialize();
  }

  // Events
  listen(callback) {
    this.allEventHandler = callback;
  }

  fire(eventName, payload) {
    if (typeof this.allEventHandler === 'function') {
      this.allEventHandler.call(this, eventName, payload);
    }

    if (this.events[eventName] && this.events[eventName].queue) {
      var queue = this.events[eventName].queue.reverse();
      var i = queue.length;
      while (i--) {
        if (typeof queue[i] === 'function') {
          queue[i].call(this, payload);
        }
      }
    }
  }

  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = {
        queue: []
      };
    }
    this.events[eventName].queue.push(callback);
  }

  off(eventName, callback) {
    if (this.events[eventName] && this.events[eventName].queue) {
      var queue = this.events[eventName].queue;
      var i = queue.length;
      while (i--) {
        if (queue[i] === callback) {
          queue.splice(i, 1);
        }
      }
    }
  }

  once(eventName, callback) {
    return new Promise( (resolve, reject) => {
      var handler = (payload) => {
        this.off(eventName, handler);
        if (typeof callback === 'function') {
          try {
            resolve(callback.call(this, payload));
          } catch (e) {
            reject(e);
          }
        } else {
          resolve(payload);
        }
      };
      this.on(eventName, handler);
    });

  }

  initialize() {
    /*
    *  Pagination can be finite or infinite. Infinite pagination is the default.
    */
    if (!this.isFinite) { // infinite pagination

      const setPage =  (cursor, isForward, isLastPage) => {

        this.ref = this.fbRef.orderByKey();

        // If there it's forward pagination, use limitToFirst(pageSize + 1) and startAt(theLastKey)
        if (isForward) { // forward pagination
          this.ref = this.ref.limitToFirst(this.pageSize + 1);
          if (cursor) { // check for forward cursor
            this.ref = this.ref.startAt(cursor);
          }
        } else { // previous pagination
          this.ref = this.ref.limitToLast(this.pageSize + 1);
          if (cursor) { // check for previous cursor
            this.ref = this.ref.endAt(cursor);
          }
        }

        return this.ref.once('value')
          .then( (snap) => {
            var keys = [];
            var collection = {};
            cursor = undefined;

            snap.forEach( (childSnap) => {
              keys.push(childSnap.key);
              if (!cursor) {
                cursor = childSnap.key;
              }
              collection[childSnap.key] = childSnap.val();
            });

            if (keys.length === this.pageSize + 1) {
              if (isLastPage) {
                delete collection[keys[keys.length - 1]];
              } else {
                delete collection[keys[0]];
              }
            } else if (isForward) {
              return setPage(); // force a reset if forward pagination overruns the last result
            } else {
              return setPage(undefined, true, true);
            }

            this.snap = snap;
            this.keys = keys;
            this.isLastPage = isLastPage || false;
            this.collection = collection;
            this.cursor = cursor;

            this.fire('value', snap);
            if (this.isLastPage) {
              this.fire('isLastPage');
            }
            return this;
          });
      };

      setPage()
        .then( () => {
          this.fire('ready', this);
        }); // bootstrap the list

      this.reset = () => {
        return setPage()
          .then( () => {
            return this.fire('reset');
          });
      };

      this.previous = () => {
        return setPage(this.cursor)
          .then( () => {
            return this.fire('previous');
          });
      };

      this.next = () => {
        // console.log("calling next");
        var cursor;
        if (this.keys && this.keys.length) {
          cursor = this.keys[this.keys.length - 1];
        }
        return setPage(cursor, true)
          .then( () => {
            return this.fire('next');
          });
      };

    } else { // finite pagination
    
      let queryPath = this.fbRef.toString() + '.json?shallow=true';
      
      if (this.auth) {
        queryPath += '&auth=' + this.auth;
      }
      var getKeys = function () {
        return new Promise( (resolve, reject) => {
          var request = new XMLHttpRequest();
          request.onreadystatechange = function () {
            if (request.readyState === 4) {
              var response = JSON.parse(request.responseText);
              if (request.status === 200) {
                resolve(Object.keys(response));
              } else {
                reject(response);
              }
            }
          };
          request.open('GET', queryPath, true);
          request.send();
        });
      };

      this.goToPage = (pageNumber) => {
        pageNumber = Math.min(this.pageCount, Math.max(1, parseInt(pageNumber,10)));
        this.page = this.pages[pageNumber];
        this.pageNumber = pageNumber;
        this.isLastPage = pageNumber === Object.keys(this.pages).length;
        this.ref = this.fbRef.orderByKey().limitToLast(this.pageSize).endAt(this.page.endKey);

        return this.ref.once('value')
          .then( (snap) => {
            var collection = snap.val();
            var keys = [];

            snap.forEach(function (childSnap) {
              keys.push(childSnap.key);
            });

            this.snap = snap;
            this.keys = keys;
            this.collection = collection;

            this.fire('value', snap);
            if (this.isLastPage) {
              this.fire('isLastPage');
            }
            return this;
          });
      };

      this.reset = () => {
        return getKeys()
          .then( (keys) => {
            var orderedKeys = keys.sort();
            var keysLength = orderedKeys.length;
            var cursors = [];

            for (var i = keysLength; i > 0; i -= this.pageSize) {
              cursors.push({
                fromStart: {
                  startRecord: i - this.pageSize + 1,
                  endRecord: i
                },
                fromEnd: {
                  startRecord: keysLength - i + 1,
                  endRecord: keysLength - i + this.pageSize
                },
                endKey: keys[i - 1]
              });
            }

            var cursorsLength = cursors.length;
            var k = cursorsLength;
            var pages = {};
            while (k--) {
              cursors[k].pageNumber = k + 1;
              pages[k + 1] = cursors[k];
            }
            this.pageCount = cursorsLength;
            this.pages = pages;

            return pages;
          })
          .catch(function (err) {
            console.log('finite reset pagination error', err);
          });
      };

      this.reset() // Refresh keys and go to first page.
        .then( () => {
          return this.goToPage(1);
        })
        .then( () => {
          this.fire('ready', this);
        });

      this.previous = function () {
        return this.goToPage(Math.min(this.pageCount, this.pageNumber + 1))
          .then( () => {
            return this.fire('previous');
          });
      };

      this.next = function () {
        return this.goToPage(Math.max(1, this.pageNumber - 1))
          .then( () => {
            return this.fire('next');
          });
      };

    }

  }

}
