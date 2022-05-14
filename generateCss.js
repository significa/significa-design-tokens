const StyleDictionaryPackage = require("style-dictionary");
const tinyColor = require("tinycolor2");
const tokens = require("./tokens.json");

const sets = Object.keys(tokens).filter((key) => key !== "$themes");

/**
 * This custom formatter will pick up colors and return two rules:
 * - color-hsl: The 3 HSL values of the color in the format h,s%,l%
 * - color: using the hsl value above in the format --color: var(--color-hsl);
 *
 * This way we can use directly the color, or add opacity to it if needed:
 * .foo {
 *   color: var(--primary);
 * }
 *
 * .bar {
 *   color: hsl(var(--primary-hsl), var(--opacity-medium));
 * }
 */
StyleDictionaryPackage.registerFormat({
  name: "css/variables",
  formatter: function ({ dictionary, options }) {
    const props = dictionary.allProperties.reduce((acc, prop) => {
      const isColor = prop.type === "color";
      let name = prop.name;

      if (isColor) {
        name = `${prop.name}-hsl`;
      }

      if (dictionary.usesReference(prop.original.value)) {
        const refs = dictionary.getReferences(prop.original.value);

        refs.forEach((ref) => {
          if (ref.value && ref.name) {
            acc.push(`  --${name}: var(--${ref.name});`);
          }
        });
      } else {
        acc.push(`  --${name}: ${prop.value};`);
      }

      if (isColor) {
        acc.push(`  --${prop.name}: hsl(var(--${name}));`);
      }

      return acc;
    }, []);

    return `${options.selector || ":root"} {\n` + props.join("\n") + `\n}`;
  },
});

// converts colors from HEX to HSL (#FFFFFF -> 0,0%,100%)
StyleDictionaryPackage.registerTransform({
  name: "color/customHSL",
  type: "value",
  matcher: function (prop) {
    return ["color"].includes(prop.attributes.category);
  },
  transformer: function (prop) {
    const { h, s, l } = tinyColor(prop.original.value).toHsl();

    return `${Math.round(h)}, ${(s * 100).toFixed(1)}%, ${(l * 100).toFixed(
      1
    )}%`;
  },
});

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

StyleDictionaryPackage.registerTransform({
  name: "fonts/system-stack",
  type: "value",
  matcher: function (prop) {
    return (
      (["fontFamily"].includes(prop.attributes.category) &&
        prop.name === "font-family-sans") ||
      prop.name === "font-family-serif" ||
      prop.name === "font-family-mono"
    );
  },
  transformer: function (prop) {
    const families = {
      "font-family-sans":
        "-apple-system, BlinkMacSystemFont, avenir next, avenir, segoe ui, helvetica neue, helvetica, Ubuntu, roboto, noto, arial, sans-serif",
      "font-family-serif":
        "Iowan Old Style, Apple Garamond, Baskerville, Times New Roman, Droid Serif, Times, Source Serif Pro, serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol",
      "font-family-mono":
        "Menlo, Consolas, Monaco, Liberation Mono, Lucida Console, monospace",
    };

    return `'${prop.original.value}', ${families[prop.name]}`;
  },
});

sets.forEach((theme) => {
  StyleDictionaryPackage.extend({
    source: [`tokens/${theme}.json`],
    include: ["tokens/global.json"],
    platforms: {
      css: {
        transforms: [
          "attribute/cti",
          "name/cti/kebab",
          "color/customHSL",
          "sizes/px",
          "sizes/rem",
          "sizes/percentage-to-decimal",
          "fonts/sohne-weights",
          "fonts/system-stack",
        ],
        transformGroup: "css",
        buildPath: "output/",
        files: [
          {
            destination: `${theme}.css`,
            format: "css/variables",
            filter: (token) => {
              return token.isSource && token.type !== "typography";
            },
            options: {
              selector:
                theme === "global"
                  ? ":root"
                  : `[data-theme="${theme}"], .${theme}-theme`,
              outputReferences: true,
            },
          },
        ],
      },
    },
  }).buildAllPlatforms();
});
