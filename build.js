const StyleDictionaryPackage = require("style-dictionary");

StyleDictionaryPackage.registerTransform({
  name: "sizes/rem",
  type: "value",
  matcher: function (prop) {
    return ["fontSize", "space"].includes(prop.attributes.category);
  },
  transformer: function (prop) {
    return parseFloat(prop.original.value) / 16 + "rem";
  },
});

StyleDictionaryPackage.registerTransform({
  name: "sizes/px",
  type: "value",
  matcher: function (prop) {
    return ["radius", "borderWidth"].includes(prop.attributes.category);
  },
  transformer: function (prop) {
    return parseFloat(prop.original.value) + "px";
  },
});

StyleDictionaryPackage.registerTransform({
  name: "sizes/percentage-to-decimal",
  type: "value",
  matcher: function (prop) {
    return ["lineHeight", "opacity"].includes(prop.attributes.category);
  },
  transformer: function (prop) {
    return parseFloat(prop.original.value.replace("%", "")) / 100;
  },
});

// sohne has strange weights!
StyleDictionaryPackage.registerTransform({
  name: "fonts/sohne-weights",
  type: "value",
  matcher: function (prop) {
    return ["fontWeight"].includes(prop.attributes.category);
  },
  transformer: function (prop) {
    const weights = {
      Buch: 400,
      Kräftig: 500,
      Halbfett: 600,
      Dreiviertelfett: 700,
    };
    return weights[prop.original.value] || 400;
  },
});

const StyleDictionary = StyleDictionaryPackage.extend({
  source: ["tokens/**/*.json"],
  platforms: {
    css: {
      transforms: [
        "attribute/cti",
        "name/cti/kebab",
        "sizes/px",
        "sizes/rem",
        "sizes/percentage-to-decimal",
        "fonts/sohne-weights",
      ],
      transformGroup: "css",
      buildPath: "output/",
      files: [
        {
          destination: "global.css",
          format: "css/variables",
          filter: (token) => {
            return token.isSource && token.type !== "typography";
          },
        },
      ],
    },
  },
}).buildAllPlatforms();

["light", "dark"].forEach((theme) => {
  StyleDictionaryPackage.extend({
    source: [`tokens/${theme}.json`],
    include: ["tokens/global.json"],
    platforms: {
      css: {
        transformGroup: "css",
        buildPath: "output/",
        files: [
          {
            destination: `${theme}.css`,
            format: "css/variables",
            filter: (token) => {
              return token.isSource;
            },
            options: {
              outputReferences: true,
            },
          },
        ],
      },
    },
  }).buildAllPlatforms();
});
