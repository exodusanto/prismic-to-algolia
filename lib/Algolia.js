const algoliasearch = require('algoliasearch');

class Algolia {

  constructor (config, index) {
    let indexName = (config.indexPrefix || '') + index;

    this.client = algoliasearch(config.applicationId, config.apiKey);
    this.index = this.client.initIndex(indexName);
    this.index.getSettings((err, content) => {
      if(typeof content === "undefined") return;
      let searchableAttributes = content.searchableAttributes || [];

      if(searchableAttributes.indexOf('id') === -1) 
        searchableAttributes.push('id');
      if(searchableAttributes.indexOf('uid') === -1) 
        searchableAttributes.push('uid');
      if(searchableAttributes.indexOf('locale') === -1) 
        searchableAttributes.push('locale');

      if(searchableAttributes.length !== content.searchableAttributes)
          this.index.setSettings({
          searchableAttributes: searchableAttributes
      });
    });
    this.indexName = indexName;
  }

  /**
   * Index any data for a specific type. Update and create.
   */
  indexData (data) {
    return new Promise((resolve) => {
      let newObjects = [];
      let existingObjects = [];

      Promise.resolve(
        this._getElementsPromise(data)
      ).then((results) => {
        results.forEach((result) => {
          if (result.exists) {
            existingObjects.push(result.entry);
          } else {
            newObjects.push(result.entry);
          }
        });
      })
      .then(() => {
        this._indexObjects(newObjects, existingObjects, resolve);
      })
      .catch(error => console.error(error));
    });
  }

  /**
   * For each element, that should be indexed, we need to know if it exists or not
   */
  _getElementsPromise (data) {
    let queries = data.map((element) => {
      return `${element.id} ${element.locale}`;
    });

    return new Promise((resolve) => {
      this._getObjects(queries)
        .then(results => {
          results = results.results.map((result, index) => {
            let entry = data[index];

            if (result.hits && result.hits[0] && result.hits[0].objectID) {
              entry.objectID = result.hits[0].objectID;
            }

            return {
              exists: result.nbHits > 0,
              entry
            };
          });

          return resolve(results);
        })
        .catch((error) =>{
          console.error(error);
        });
    });
  }

  /**
   * Index all objects in Algolia by updating and creating them
   */
  _indexObjects (newObjects, existingObjects, resolve) {
    return Promise.all([
      this._addObjects(newObjects),
      this._updateObjects(existingObjects)
    ]).then((data) => {
      let objects = this._getMergedObjects(data);

      resolve(objects);
    })
    .catch(error => console.error(error));
  }

  /**
   * Merge two object arrays
   */
  _getMergedObjects (data) {
    let objects = [];

    data.forEach((element) => {
      objects = objects.concat(element.objectIDs);
    });

    return objects;
  }

  /**
   * Get the full index
   */
  _getIndex () {
    return new Promise((resolve) => {
      this.index.search({
        query: '',
        hitsPerPage: 100
      }, (error, results) => {
        if (error || (results && results.hits.length === 0)) {
          return console.error(error);
        }

        return resolve(results);
      });
    });
  }

  /**
   * Get an object from the index by its id attribute
   */
  _getObjectById (id, locale) {
    return new Promise((resolve) => {
      this.index.search({
        query: `${id} ${locale}`,
        restrictSearchableAttributes: ['id', 'locale']
      }, (error, results) => {
        if (error) {
          return console.error(error);
        }

        return resolve(results);
      });
    });
  }

  /**
   * Get a objects from the index by its id attribute
   */
  _getObjects (queries) {
    queries = queries.map((query) => {
      return {
        indexName: this.indexName,
        query,
        params: {
          restrictSearchableAttributes: ['id', 'uid', 'locale']
        }
      };
    });

    return new Promise((resolve) => {
      this.client.search(queries, (error, results) => {
        if (error) {
          return console.error(error);
        }

        return resolve(results);
      });
    });
  }

  /**
   * Add new objects to the index
   */
  _addObjects (objects) {
    if (objects.length === 0) {
      return {
        objectIDs: []
      };
    }

    return new Promise((resolve) => {
      this.index.addObjects(objects, (error, content) => {
        if (error) {
          return console.error(error);
        }

        return resolve(content);
      });
    });
  }

  /**
   * Update existing objects in the index
   */
  _updateObjects (objects) {
    if (objects.length === 0) {
      return {
        objectIDs: []
      };
    }

    return new Promise((resolve) => {
      this.index.saveObjects(objects, (error, content) => {
        if (error) {
          return console.error(error);
        }

        return resolve(content);
      });
    });
  }

}

module.exports = Algolia;