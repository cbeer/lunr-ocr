import lunr from "lunr";

console.log("Reloaded");
const parseAlto = function (builder) {
  const tokenizer = function (obj, metadata) {
    window.metadata = metadata;
    const xml = new DOMParser().parseFromString(obj, "text/xml");
    window.data = xml;
    const strings = xml.getElementsByTagName("String");
    const tokens = [];

    for (const el of strings) {
      const tokenMetadata = lunr.utils.clone(metadata) || {};
      tokenMetadata.id = el.getAttribute("ID");
      tokenMetadata.position = {
        x: parseInt(el.getAttribute("HPOS"), 10),
        y: parseInt(el.getAttribute("VPOS"), 10),
        w: parseInt(el.getAttribute("WIDTH"), 10),
        h: parseInt(el.getAttribute("HEIGHT"), 10),
      };
      const content = el.getAttribute("CONTENT");
      const token = lunr.utils.asString(content).toLowerCase();
      tokens.push(new lunr.Token(token, tokenMetadata));
    }

    return tokens;
  };

  // Register the pipeline function so the index can be serialised
  // lunr.Pipeline.registerFunction(tokenizer, 'parseAltoTokenizer')

  // Add the pipeline function to both the indexing pipeline and the
  // searching pipeline
  builder.tokenizer = tokenizer;
};

var builder = new lunr.Builder();
var index;

builder.pipeline.add(lunr.trimmer, lunr.stopWordFilter, lunr.stemmer);

builder.searchPipeline.add(lunr.stemmer);

builder.ref("page");
builder.field("text");
builder.use(parseAlto);
builder.metadataWhitelist = ["id", "position"];

fetch("https://purl.stanford.edu/gv383xk1375.xml")
  .then((resp) => resp.text())
  .then((text) => new DOMParser().parseFromString(text, "text/xml"))
  .then((purl) => {
    const urls = [];
    const druid = purl
      .getElementsByTagName("publicObject")[0]
      .getAttribute("id");
    for (const file of purl.getElementsByTagName("file")) {
      if (file.getAttribute("role") === "transcription")
        urls.push(
          "https://stacks.stanford.edu/file/" +
            druid +
            "/" +
            file.getAttribute("id")
        );
    }

    Promise.all(
      urls.map((url) => {
        return fetch(url)
          .then((resp) => resp.text())
          .then((body) => {
            builder.add({ page: url, text: body });
          });
      })
    ).then(() => {
      index = builder.build();
      window.index = index;
    });
  });
