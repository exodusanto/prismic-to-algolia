const Algolia = require("./Algolia");
const PrismicApi = require("prismic-javascript");
const Prismic = require("./Prismic");

class Sync {

  constructor(config){
    this.config = config;
    this.prismic = null;
  }

  /**
   * Call this function after fetch and clear
   */
  singleCallback(indexName, content, callback){

    if (content.constructor !== Array) {
      content = [content];
    }

    callback && callback(content);

    new Algolia(this.config.algolia, indexName)
      .indexData(content)
      .then(() => {
        console.log(`Indexed on: ${indexName}`);
      })
      .catch(console.error);
  }

  /**
   * Fetch from Prismic with predicates and options
   */
  singleFetch(predicates, options){
    return new Promise((resolve) => {
      this.prismic.getResults(predicates, options)
        .then((content) => resolve(content))
        .catch((error) => console.error(error));
    });
  }

  /**
   * Sync all data and clear
   */
  sync(prismicQuery, indexName, fields = {}, callback){
    new Promise((resolve) => {
      PrismicApi.api(this.config.prismic.host).then( api => {
        this.prismic = new Prismic(api, fields);
        let content = [];

        if(Array.isArray(prismicQuery.langs)){
          let langs = prismicQuery.langs;
          let promises = [];

          langs.forEach( lang => {
            let options = prismicQuery.options || {};
            options["lang"] = lang;

            promises.push(this.singleFetch(prismicQuery.predicates, options));
          });

          Promise.all(promises).then( contentLang => {
            contentLang.forEach(singleLang => {
              if(singleLang.length)
                content.push(...singleLang);
            });
            this.singleCallback(indexName, content, callback);
            resolve();
          });
        }else{
          this.singleFetch(prismicQuery.predicates, prismicQuery.options).then(content => {
            this.singleCallback(indexName, content, callback);
            resolve();
          });
        }

      });
    });
  }
}

/**
 * Exports
 * @type {Class}
 */
module.exports = Sync;