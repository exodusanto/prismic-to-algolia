const PrismicScout = require("prismic-scout");

class Prismic {
  
  constructor(api, fields = {}){
    this.api = api;
    this.fields = fields;

    this.scout = new PrismicScout(api);
  }

  getResults(predicates = "", options = {}){
    return new Promise((resolve) => {
      this.api.query(predicates, options)
        .then(({ results }) => {
          this.scout.retriveFromData(results, this.fields)
            .then( results => resolve(results));
        })
        .catch(error => console.error(error));
    });
  }
}

/**
 * Exports
 * @type {Class}
 */
module.exports = Prismic;