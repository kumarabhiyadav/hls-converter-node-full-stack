export const bucketNames = {
    bebu: "bebu-content-new-live",
    abethu: "abethu-content",
    bhoju: "bhoju-content",
    chorchuri: "chorchuri-content",
    cineuns: "cineuns-content",

    kannadaflix: "kannadflix-content",
    keeflix: "keeflix-content",
    kidullan: "kidullan-content",
    kooku: "kooku-content",

    olaple: "olaple-content",
    rokkt: "rokkt-content-new-live",
    sonadoll: "sonadoll-content",
    ubeetu: "ubeetu-content",


}

export const dbnames = {
    bebu: "bebu_admin",
    abethu: "abethu_admin",
    bhoju: "bhoju_admin",
    chorchuri: "chorchuri_admin",
    cineuns: "cineuns_admin",
    kannadaflix: "kannadaflix_admin",
    keeflix: "keeflix_admin",
    kidullan: "kidullan_admin",
    kooku: "kooku_admin",
    olaple: "olaple_admin",
    rokkt: "rokkt_admin",
    sonadoll: "sonadoll_admin",
    ubeetu: "ubeetu_admin",

}

export const getDBName = (key: string): string => {
    switch (key) {
      case 'bebu':
        return dbnames.bebu;
      case 'abethu':
        return dbnames.abethu;
      case 'bhoju':
        return dbnames.bhoju;
      case 'chorchuri':
        return dbnames.chorchuri;
      case 'cineuns':
        return dbnames.cineuns;
      case 'kannadaflix':
        return dbnames.kannadaflix;
      case 'keeflix':
        return dbnames.keeflix;
      case 'kidullan':
        return dbnames.kidullan;
      case 'kooku':
        return dbnames.kooku;
      case 'olaple':
        return dbnames.olaple;
      case 'rokkt':
        return dbnames.rokkt;
      case 'sonadoll':
        return dbnames.sonadoll;
      case 'ubeetu':
        return dbnames.ubeetu;
      default:
        throw new Error(`Database name not found for key: ${key}`);
    }
  };


  export const getBucketName = (key: string): string => {
    switch (key) {
      case 'bebu':
        return bucketNames.bebu;
      case 'abethu':
        return bucketNames.abethu;
      case 'bhoju':
        return bucketNames.bhoju;
      case 'chorchuri':
        return bucketNames.chorchuri;
      case 'cineuns':
        return bucketNames.cineuns;
      case 'kannadaflix':
        return bucketNames.kannadaflix;
      case 'keeflix':
        return bucketNames.keeflix;
      case 'kidullan':
        return bucketNames.kidullan;
      case 'kooku':
        return bucketNames.kooku;
      case 'olaple':
        return bucketNames.olaple;
      case 'rokkt':
        return bucketNames.rokkt;
      case 'sonadoll':
        return bucketNames.sonadoll;
      case 'ubeetu':
        return bucketNames.ubeetu;
      default:
        throw new Error(`Bucket name not found for key: ${key}`);
    }
  };

