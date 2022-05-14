const StyleDictionaryPackage = require("style-dictionary");

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
    return hexToHSL(prop.original.value);
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

const StyleDictionary = StyleDictionaryPackage.extend({
  source: ["tokens/global.json"],
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

["light", "dark", "yellow"].forEach((theme) => {
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
              selector: `[data-theme="${theme}"]`,
              outputReferences: true,
            },
          },
        ],
      },
    },
  }).buildAllPlatforms();
});

// https://css-tricks.com/converting-color-spaces-in-javascript/
function hexToHSL(H) {
  // Convert hex to RGB first
  let r = 0,
    g = 0,
    b = 0;
  if (H.length == 4) {
    r = "0x" + H[1] + H[1];
    g = "0x" + H[2] + H[2];
    b = "0x" + H[3] + H[3];
  } else if (H.length == 7) {
    r = "0x" + H[1] + H[2];
    g = "0x" + H[3] + H[4];
    b = "0x" + H[5] + H[6];
  }
  // Then to HSL
  r /= 255;
  g /= 255;
  b /= 255;
  let cmin = Math.min(r, g, b),
    cmax = Math.max(r, g, b),
    delta = cmax - cmin,
    h = 0,
    s = 0,
    l = 0;

  if (delta == 0) h = 0;
  else if (cmax == r) h = ((g - b) / delta) % 6;
  else if (cmax == g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);

  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return h + "," + s + "%," + l + "%";
}
