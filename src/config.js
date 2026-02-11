export const extensionDivID = "toolplace-1";
export const activeDecoderObj = {
  id: "decoder_5",
  name: "HTML Escape",
  url: "html-encode-string",
  from: "Input String",
  to: "HTML-escaped String",
  options: [
    {
      group: "HTML-escaping Mode",
      buttons: [
        {
          label: "Escape Reserved HTML Chars",
          tooltip: "Escape only reserved HTML symbols in a string.",
          name: "special-symbols",
          type: "radio",
          value: true,
        },
        {
          label: "Escape All Chars",
          tooltip:
            "Escape absolutely all symbols in a string to HTML entities.",
          name: "all-symbols",
          type: "radio",
          value: false,
        },
      ],
    },
    {
      group: "Numerical References",
      buttons: [
        {
          label: "Use Decimal Base",
          tooltip: "Convert every string character to base-10 (decimal) base.",
          name: "decimal",
          type: "radio",
          value: true,
        },
        {
          label: "Use Hexadecimal Base",
          tooltip: "Convert every string character to base-16 (hexadec) base.",
          name: "hex",
          type: "radio",
          value: false,
        },
      ],
    },
    {
      group: "Name References and Line Breaks",
      buttons: [
        {
          label: "Print Name References",
          comment:
            "Display HTML abbreviations for special chars (if it exists).",
          name: "named",
          type: "checkbox",
          value: true,
        },
        {
          label: "Preserve Line Breaks",
          comment: "Leave newlines untouched after HTML-escaping.",
          name: "ignore-newlines",
          type: "checkbox",
          value: true,
        },
      ],
    },
  ],
};
