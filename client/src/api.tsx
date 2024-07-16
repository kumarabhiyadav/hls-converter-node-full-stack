export const domain = "http://175.111.97.105:8080";
export const wsdomain = "ws://175.111.97.105:8080";

// export const domain = "http://localhost:8080";
// export const wsdomain = "ws://localhost:8080";



export const endpoint = {
  createWebSocketForFile: "/create-web-socket-for-file",
  history: "/history",
};

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
};

export const getBucketName = (key: string): string => {
  switch (key) {
    case "bebu":
      return bucketNames.bebu;
    case "abethu":
      return bucketNames.abethu;
    case "bhoju":
      return bucketNames.bhoju;
    case "chorchuri":
      return bucketNames.chorchuri;
    case "cineuns":
      return bucketNames.cineuns;
    case "kannadaflix":
      return bucketNames.kannadaflix;
    case "keeflix":
      return bucketNames.keeflix;
    case "kidullan":
      return bucketNames.kidullan;
    case "kooku":
      return bucketNames.kooku;
    case "olaple":
      return bucketNames.olaple;
    case "rokkt":
      return bucketNames.rokkt;
    case "sonadoll":
      return bucketNames.sonadoll;
    case "ubeetu":
      return bucketNames.ubeetu;
    default:
      throw new Error(`Bucket name not found for key: ${key}`);
  }
};

export const getMediaURL = (key: string): string => {
  let url = `https://media1.${key}`;

  switch (key) {
    case "bebu":
      url += ".app";
      break;

    case "bhoju":
      url += ".app";
      break;

    case "rokkt":
      url += ".tv";

      break;

    case "kooku":
      url += ".online";

      break;

    default:
      url += ".com";
      break;
  }

  return url;
};
