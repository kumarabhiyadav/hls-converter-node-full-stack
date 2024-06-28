import Datastore from 'nedb';

class DataStore {
  private static instance: Datastore | null = null;

  public static getInstance(): Datastore {
    if (this.instance) {
      return this.instance;
    }
    this.instance = new Datastore({ filename: 'datastore.db', autoload: true ,timestampData:true});
    return this.instance;
  }
}

export default DataStore;