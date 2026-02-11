import "./tool-css.css";
import { extensionDivID, activeDecoderObj } from "./config.js";
import { HtmlElement } from "./libs/html-component.js";
import utils from "./libs/utils.js";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

const activeDecoder = "decoder_5";

var panel = null;
var inputsWrapper = null;

var inputField = null;
var outputField = null;
var optionsWrapper = null;

function init() {
  panel = HtmlElement.getById(extensionDivID);

  inputsWrapper = HtmlElement.create({
    type: "div",
    classes: "ext-0x03-inputs-wrapper",
    id: "ext-0x03-inputs-wrapper",
  }).appendTo(panel);

  HtmlElement.create({
    type: "div",
    styles: {
      "font-size": "16px",
      "font-weight": "bold",
      "text-align": "center",
      margin: "6px",
    },
    value: activeDecoderObj.name,
  }).appendTo(inputsWrapper);

  HtmlElement.create({
    type: "div",
    classes: "ext-0x03-inputs-title-wrapper",
    id: "ext-0x03-input-title-wrapper",
  })
    .addChild({
      type: "div",
      classes: "ext-0x03-main-text",
      id: "ext-0x03-main-input-name",
      value: activeDecoderObj.from,
    })
    .appendTo(inputsWrapper);

  inputField = HtmlElement.create({
    type: "textarea",
    id: "ext-0x03-input-textarea",
    classes: "brwl-0x03-input ext-0x03-textarea-field",
    events: {
      blur: (e) => {
        outputField.setValue(decoderProcessing(activeDecoder, e.target.value));
      },
    },
  }).appendTo(inputsWrapper);

  HtmlElement.create({
    type: "div",
    classes: "ext-0x03-inputs-title-wrapper",
    id: "ext-0x03-output-title-wrapper",
  })
    .addChild({
      type: "div",
      classes: "ext-0x03-main-text",
      id: "ext-0x03-main-output-name",
      value: activeDecoderObj.to,
    })
    .appendTo(inputsWrapper);

  outputField = HtmlElement.create({
    type: "textarea",
    id: "ext-0x03-output-textarea",
    classes: "brwl-0x03-input ext-0x03-textarea-field",
  }).appendTo(inputsWrapper);

  optionsWrapper = HtmlElement.create({
    type: "div",
    id: "ext-0x03-options-wrapper",
    classes: "ext-0x03-options-wrapper",
  }).appendTo(inputsWrapper);

  drawOptions(activeDecoderObj);
}

function drawOptions(item) {
  const bigSeparator = HtmlElement.create({
    type: "div",
    classes: "ext-0x03-options-separator",
    styles: {
      "margin-bottom": "12px",
    },
  });

  const smallSeparator = HtmlElement.create({
    type: "div",
    classes: "ext-0x03-options-separator",
    styles: {
      "margin-bottom": "0px",
    },
  });

  const decoderElem = HtmlElement.create({
    type: "div",
    id: `ext-0x03-options-${item.id}`,
    attrs: {
      "data-decoder": item.id,
    },
    styles: {
      display: activeDecoder === item.id ? "flex" : "none",
    },
    classes: "ext-0x03-options-separate",
  }).appendTo(optionsWrapper);

  if (item.options) {
    item.options.forEach((group, index) => {
      const groupName = group.group.toLowerCase().replace(/[ -]/g, "_");
      group.buttons.forEach((button) => {
        let currentElem;
        switch (button.type) {
          case "checkbox":
            currentElem = HtmlElement.create({
              type: "div",
              classes: "ext-0x03-checkbox",
            })
              .addChildWithLabel({
                type: "input",
                attrs: {
                  type: "checkbox",
                  name: `ext-0x03-${item.id}-${groupName}`,
                },
                events: {
                  change: () => decodeInputToOutput(),
                },
                id: `ext-0x03-${item.id}-${button.name}`,
                classes: "ext-0x03-checkbox__input",
                value: button.value,
                label_value: button.label,
                label_classes: "ext-0x03-checkbox__label",
              })
              .appendTo(decoderElem);

            if (button.tooltip) {
              currentElem.setAttr("data-tooltip", button.tooltip);
            }

            decoderElem.append(smallSeparator.clone());

            if (button.comment) {
              decoderElem
                .addAndReturnChild({
                  type: "div",
                  classes: "ext-0x03-text__supporting",
                })
                .addChild({
                  type: "span",
                  value: button.comment,
                });

              decoderElem.append(smallSeparator.clone());
            }

            break;
          case "radio":
            currentElem = HtmlElement.create({
              type: "div",
              classes: "ext-0x03-radio",
            })
              .addChildWithLabel({
                type: "input",
                attrs: {
                  type: "radio",
                  name: `ext-0x03-${item.id}-${groupName}`,
                },
                events: {
                  change: () => decodeInputToOutput(),
                },
                id: `ext-0x03-${item.id}-${button.name}`,
                classes: "ext-0x03-radio__input",
                value: button.value,
                label_value: button.label,
                label_classes: "ext-0x03-radio__label",
              })
              .appendTo(decoderElem);

            if (button.tooltip) {
              currentElem.setAttr("data-tooltip", button.tooltip);
            }

            decoderElem.append(smallSeparator.clone());

            if (button.comment) {
              decoderElem
                .addAndReturnChild({
                  type: "div",
                  classes: "ext-0x03-text__supporting",
                })
                .addChild({
                  type: "span",
                  value: button.comment,
                });

              decoderElem.append(smallSeparator.clone());
            }

            break;
          case "text":
            currentElem = HtmlElement.create({
              type: "div",
              classes: "ext-0x03-text-field",
            })
              .addChild({
                type: "input",
                events: {
                  change: () => decodeInputToOutput(),
                },
                id: `ext-0x03-${item.id}-${button.name}`,
                name: `ext-0x03-${item.id}-${groupName}`,
                classes: "ext-0x03-text-field__input",
                attrs: {
                  placeholder: " ",
                },
                value: button.value,
              })
              .appendTo(decoderElem);

            if (button.tooltip) {
              currentElem.setAttr("data-tooltip", button.tooltip);
            }

            HtmlElement.create({
              type: "label",
              classes: "ext-0x03-text-field__input__placeholder",
              attrs: {
                for: `ext-0x03-${item.id}-${button.name}`,
              },
            })
              .addChild({
                type: "div",
                classes: "ext-0x03-text-field__input__placeholder__label",
                value: button.label,
              })
              .appendTo(currentElem);

            decoderElem.append(smallSeparator.clone());

            if (button.comment) {
              decoderElem
                .addAndReturnChild({
                  type: "div",
                  classes: "ext-0x03-text__supporting",
                })
                .addChild({
                  type: "span",
                  value: button.comment,
                });

              decoderElem.append(smallSeparator.clone());
            }
            break;
          case "select":
            currentElem = HtmlElement.create({
              type: "div",
              classes: "ext-0x03-oco-select",
            }).appendTo(decoderElem);

            const selectElem = HtmlElement.create({
              type: "select",
              id: `ext-0x03-${item.id}-${button.name}`,
              classes: "ext-0x03-oco-select__select",
              attrs: {
                name: `ext-0x03-${groupName}-${button.name}`,
              },
              events: {
                change: () => decodeInputToOutput(),
              },
            }).appendTo(currentElem);

            if (button.optgroups_list) {
              button.optgroups_list.forEach((optgroup) => {
                const optgroupElem = HtmlElement.create({
                  type: "optgroup",
                  attrs: {
                    label: optgroup.name,
                  },
                }).appendTo(selectElem);

                if (optgroup.options_list) {
                  optgroup.options_list.forEach((option) => {
                    const optionElem = HtmlElement.create({
                      type: "option",
                      attrs: {
                        label: option.label,
                      },
                      value: option.value,
                    }).appendTo(optgroupElem);
                  });
                }
              });
            }

            selectElem.setValue(button.value || "");

            if (button.comment) {
              decoderElem
                .addAndReturnChild({
                  type: "div",
                  classes: "ext-0x03-text__supporting",
                })
                .addChild({
                  type: "span",
                  value: button.comment,
                });

              decoderElem.append(smallSeparator.clone());
            }
        }
      });
      if (index < item.options.length - 1)
        decoderElem.append(bigSeparator.clone());
    });
  }
}

function decodeInputToOutput() {
  if (document.getElementById("ext-0x03-input-textarea")?.value) {
    outputField.setValue(
      decoderProcessing(
        activeDecoder,
        document.getElementById("ext-0x03-input-textarea").value,
      ),
    );
  }
}

function decoderProcessing(decoderId, text) {
  let output = "";
  switch (decoderId) {
    case "decoder_1":
      const encodeNonSpec = document.getElementById(
        "ext-0x03-decoder_1-encode-all-chars",
      ).checked;
      output = utils.urlEncodeText({
        encodeNonSpec,
        text,
      });
      break;
    case "decoder_2":
      output = utils.urlDecodeText({ text });
      break;
    case "decoder_3":
      const split = document.getElementById(
        "ext-0x03-decoder_3-base64-split",
      ).checked;
      const splitSize = document.getElementById(
        "ext-0x03-decoder_3-base64-split-length",
      ).value;
      output = utils.textToBase64({ text, split, splitSize });
      break;
    case "decoder_4":
      output = utils.base64ToText({ text });
      break;
    case "decoder_5":
      const escapeSpecialOnly = document.getElementById(
        "ext-0x03-decoder_5-special-symbols",
      ).checked;
      const useDecimalBases = document.getElementById(
        "ext-0x03-decoder_5-decimal",
      ).checked;
      const printNameReferences = document.getElementById(
        "ext-0x03-decoder_5-named",
      ).checked;
      const preserveLineBreaks = document.getElementById(
        "ext-0x03-decoder_5-ignore-newlines",
      ).checked;
      output = utils.textToHtmlEntities({
        text,
        escapeSpecialOnly,
        useDecimalBases,
        printNameReferences,
        preserveLineBreaks,
      });
      break;
    case "decoder_6":
      output = utils.htmlEntitiesToText({ text });
      break;
    case "decoder_7":
      const spaces = document.getElementById(
        "ext-0x03-decoder_7-byte-spacing",
      ).checked;
      const prefix = document.getElementById(
        "ext-0x03-decoder_7-byte-prefix",
      ).checked;
      output = utils.textToHexadecimal({ text, spaces, prefix });
      break;
    case "decoder_8":
      output = utils.hexadecimalToText({ text });
      break;
    case "decoder_9":
      output = utils.ROT13({ text });
      break;
    case "decoder_10":
      const squareBrackets = document.getElementById(
        "ext-0x03-decoder_10-square-brackets",
      ).checked;
      output = utils.defangURL({ text, squareBrackets });
      break;
    case "decoder_11":
      output = utils.refangURL({ text });
      break;
    case "decoder_12":
      output = text.toLowerCase();
      break;
    case "decoder_13":
      output = text.toUpperCase();
      break;
    case "decoder_14":
      const separator14 = document.getElementById(
        "ext-0x03-decoder_14-separator",
      ).value;
      const codePointBase14 = document.getElementById(
        "ext-0x03-decoder_14-base",
      ).value;
      const customBase14 = document.getElementById(
        "ext-0x03-decoder_14-custom-base",
      ).value;

      output = utils.unicodeToCodePoints({
        text,
        separator14,
        codePointBase14,
        customBase14,
      });
      break;

    case "decoder_15":
      const separator15 = document.getElementById(
        "ext-0x03-decoder_15-separator",
      ).value;
      const codePointBase15 = document.getElementById(
        "ext-0x03-decoder_15-base",
      ).value;
      const customBase15 = document.getElementById(
        "ext-0x03-decoder_15-custom-base",
      ).value;

      output = utils.codePointsToUnicode({
        text,
        separator15,
        codePointBase15,
        customBase15,
      });
      break;

    case "decoder_16":
      const multiline16 = document.getElementById(
        "ext-0x03-decoder_16-multiline",
      ).checked;
      const lowercase16 = document.getElementById(
        "ext-0x03-decoder_16-lowercase",
      ).checked;

      output = utils.convertToSlug({
        text,
        multiline16,
        lowercase16,
      });
      break;
  }

  return output;
}
