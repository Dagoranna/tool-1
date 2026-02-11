import GraphemeSplitter from "./grapheme-splitter.min.js";
import {
  NAMED_ENTITIES_BY_NUMBERS,
  NAMED_ENTITIES_BY_NAMES,
} from "./namespace.js";

const stringFromCharCode = String.fromCharCode;
if (!String.fromCodePoint) {
  (function () {
    var defineProperty = (function () {
      // IE 8 only supports `Object.defineProperty` on DOM elements
      try {
        var object = {};
        var $defineProperty = Object.defineProperty;
        var result = $defineProperty(object, object, object) && $defineProperty;
      } catch (error) {}
      return result;
    })();
    var floor = Math.floor;
    var fromCodePoint = function (_) {
      var MAX_SIZE = 0x4000;
      var codeUnits = [];
      var highSurrogate;
      var lowSurrogate;
      var index = -1;
      var length = arguments.length;
      if (!length) {
        return "";
      }
      var result = "";
      while (++index < length) {
        var codePoint = Number(arguments[index]);
        if (
          !isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
          codePoint < 0 || // not a valid Unicode code point
          codePoint > 0x10ffff || // not a valid Unicode code point
          floor(codePoint) != codePoint // not an integer
        ) {
          throw RangeError("Invalid code point: " + codePoint);
        }
        if (codePoint <= 0xffff) {
          // BMP code point
          codeUnits.push(codePoint);
        } else {
          // Astral code point; split in surrogate halves
          // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
          codePoint -= 0x10000;
          highSurrogate = (codePoint >> 10) + 0xd800;
          lowSurrogate = (codePoint % 0x400) + 0xdc00;
          codeUnits.push(highSurrogate, lowSurrogate);
        }
        if (index + 1 == length || codeUnits.length > MAX_SIZE) {
          result += stringFromCharCode.apply(null, codeUnits);
          codeUnits.length = 0;
        }
      }
      return result;
    };
    if (defineProperty) {
      defineProperty(String, "fromCodePoint", {
        value: fromCodePoint,
        configurable: true,
        writable: true,
      });
    } else {
      String.fromCodePoint = fromCodePoint;
    }
  })();
}

function createByte(codePoint, shift) {
  return stringFromCharCode(((codePoint >> shift) & 0x3f) | 0x80);
}

function encodeCodePoint(codePoint) {
  if ((codePoint & 0xffffff80) === 0) return stringFromCharCode(codePoint);
  let symbol = "";
  if ((codePoint & 0xfffff800) === 0) {
    symbol = stringFromCharCode(((codePoint >> 6) & 0x1f) | 0xc0);
  } else if ((codePoint & 0xffff0000) === 0) {
    symbol = stringFromCharCode(((codePoint >> 12) & 0x0f) | 0xe0);
    symbol += createByte(codePoint, 6);
  } else if ((codePoint & 0xffe00000) === 0) {
    symbol = stringFromCharCode(((codePoint >> 18) & 0x07) | 0xf0);
    symbol += createByte(codePoint, 12);
    symbol += createByte(codePoint, 6);
  }
  symbol += stringFromCharCode((codePoint & 0x3f) | 0x80);
  return symbol;
}

var byteCount = 0;
var byteIndex = 0;
var byteArray = [];

function ucs2encode(array) {
  var length = array.length;
  var index = -1;
  var value;
  var output = "";
  while (++index < length) {
    value = array[index];
    if (value > 0xffff) {
      value -= 0x10000;
      output += stringFromCharCode(((value >>> 10) & 0x3ff) | 0xd800);
      value = 0xdc00 | (value & 0x3ff);
    }
    output += stringFromCharCode(value);
  }
  return output;
}

function ucs2decode(str) {
  const output = [];
  let counter = 0;
  while (counter < str.length) {
    let value = str.charCodeAt(counter++);
    if (value >= 0xd800 && value <= 0xdbff && counter < str.length) {
      let extra = str.charCodeAt(counter++);
      if ((extra & 0xfc00) === 0xdc00) {
        value = ((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000;
      } else {
        counter--;
      }
    }
    output.push(value);
  }
  return output;
}

function readContinuationByte() {
  if (byteIndex >= byteCount) {
    throw Error("Invalid byte index");
  }

  let continuationByte = byteArray[byteIndex] & 0xff;
  byteIndex++;

  if ((continuationByte & 0xc0) == 0x80) {
    return continuationByte & 0x3f;
  }

  // If we end up here, it's not a continuation byte
  throw Error("Invalid continuation byte");
}

function decodeSymbol() {
  let byte1;
  let byte2;
  let byte3;
  let byte4;
  let codePoint;

  function checkScalarValue(codePoint) {
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
      throw Error(
        "Lone surrogate U+" +
          codePoint.toString(16).toUpperCase() +
          " is not a scalar value",
      );
    }
  }

  if (byteIndex > byteCount) {
    return Error("Invalid byte index");
  }

  if (byteIndex == byteCount) {
    return false;
  }

  // Read first byte
  byte1 = byteArray[byteIndex] & 0xff;
  byteIndex++;

  // 1-byte sequence (no continuation bytes)
  if ((byte1 & 0x80) == 0) {
    return byte1;
  }

  // 2-byte sequence
  if ((byte1 & 0xe0) == 0xc0) {
    byte2 = readContinuationByte();
    codePoint = ((byte1 & 0x1f) << 6) | byte2;
    if (codePoint >= 0x80) {
      return codePoint;
    } else {
      throw Error("Invalid continuation byte");
    }
  }

  // 3-byte sequence (may include unpaired surrogates)
  if ((byte1 & 0xf0) == 0xe0) {
    byte2 = readContinuationByte();
    byte3 = readContinuationByte();
    codePoint = ((byte1 & 0x0f) << 12) | (byte2 << 6) | byte3;
    if (codePoint >= 0x0800) {
      checkScalarValue(codePoint);
      return codePoint;
    } else {
      throw Error("Invalid continuation byte");
    }
  }

  // 4-byte sequence
  if ((byte1 & 0xf8) == 0xf0) {
    byte2 = readContinuationByte();
    byte3 = readContinuationByte();
    byte4 = readContinuationByte();
    codePoint =
      ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
    if (codePoint >= 0x010000 && codePoint <= 0x10ffff) {
      return codePoint;
    }
  }

  throw Error("Invalid UTF-8 detected");
}

function utf8encode(string) {
  var codePoints = EXTENSION.utils.ucs2decode(string);
  var length = codePoints.length;
  var index = -1;
  var codePoint;
  var byteString = "";
  while (++index < length) {
    codePoint = codePoints[index];
    byteString += encodeCodePoint(codePoint);
  }
  return byteString;
}

function utf8decode(byteString) {
  byteArray = EXTENSION.utils.ucs2decode(byteString);
  byteCount = byteArray.length;
  byteIndex = 0;
  const codePoints = [];
  let tmp;
  while ((tmp = decodeSymbol()) !== false) {
    codePoints.push(tmp);
  }
  return EXTENSION.utils.ucs2encode(codePoints);
}

function stringCodeOf(string) {
  var code = [];
  for (var i = 0; i < string.length; i++) {
    var parsed = EXTENSION.utils.codePointAt(string, i);
    code.push(parsed.code);

    if (parsed.skipAhead) i++;
  }

  return code;
}

function codePointAt(string, index) {
  var size = string.length;
  var first = string.charCodeAt(index);
  var second;
  if (first >= 0xd800 && first <= 0xdbff && size > index + 1) {
    second = string.charCodeAt(index + 1);
    if (second >= 0xdc00 && second <= 0xdfff) {
      return {
        code: (first - 0xd800) * 0x400 + second - 0xdc00 + 0x10000,
        skipAhead: true,
      };
    }
  }

  return {
    code: first,
    skipAhead: false,
  };
}

function utf8ToCodePoints(bytes) {
  var codePoints = [];

  function bin(x) {
    return parseInt(x, 2);
  }

  for (var i = 0; i < bytes.length; ) {
    var byte = bytes[i];
    if ((byte & bin("11110000")) == bin("11110000")) {
      // Four byte UTF8
      var byte4 = bytes[i];
      var byte3 = bytes[i + 1];
      var byte2 = bytes[i + 2];
      var byte1 = bytes[i + 3];

      var codePoint =
        ((byte4 & bin("00000111")) << 18) |
        ((byte3 & bin("00111111")) << 12) |
        ((byte2 & bin("00111111")) << 6) |
        (byte1 & bin("00111111"));

      //console.log(4, codePoint.toString(2));

      i += 4;
    } else if ((byte & bin("11100000")) == bin("11100000")) {
      // Three byte UTF8
      var byte3 = bytes[i];
      var byte2 = bytes[i + 1];
      var byte1 = bytes[i + 2];

      var codePoint =
        ((byte3 & bin("00001111")) << 12) |
        ((byte2 & bin("00111111")) << 6) |
        (byte1 & bin("00111111"));

      //console.log(3, codePoint.toString(2));

      i += 3;
    } else if ((byte & bin("11000000")) == bin("11000000")) {
      // Two byte UTF8
      var byte2 = bytes[i];
      var byte1 = bytes[i + 1];

      var codePoint =
        ((byte2 & bin("00011111")) << 6) | (byte1 & bin("00111111"));

      //console.log(2, codePoint.toString(2));

      i += 2;
    } else if ((byte & 0x80) == 0) {
      // Single byte UTF8

      var codePoint = byte;

      //console.log(1, codePoint.toString(2));

      i += 1;
    } else {
      return "Unrecognized byte at position " + (i + 1);
    }

    codePoints.push(codePoint);
  }

  return codePoints;
}

//URL Encode
//1 option: params.encodeNonSpec = "Encode Non-special Characters"
export function urlEncodeText(params) {
  const text = params.text || "";

  const notEncode = params.encodeNonSpec
    ? ""
    : "*+-./0123456789@ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";

  const chars = splitIntoGraphemes(text);
  const output = [];

  function utf8Encode(string) {
    const codePoints = EXTENSION.utils.ucs2decode(string);
    let utf8Str = "";
    for (let i = 0; i < codePoints.length; i++) {
      utf8Str += encodeCodePoint(codePoints[i]);
    }
    return utf8Str;
  }

  function splitIntoGraphemes(str) {
    const splitter = new GraphemeSplitter();
    return splitter.splitGraphemes(str);
  }

  function bytesToUrlEncoding(str) {
    let urlEncoded = "";
    for (let i = 0; i < str.length; i++) {
      const byte = str.charCodeAt(i).toString(16).padStart(2, "0");
      urlEncoded += "%" + byte;
    }
    return urlEncoded.toUpperCase();
  }

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const shouldEncode = notEncode.indexOf(char) < 0;
    if (shouldEncode) {
      output.push(bytesToUrlEncoding(utf8Encode(char)));
    } else {
      output.push(char);
    }
  }

  return output.join("");
}

//URL Decode
//no options
export function urlDecodeText(params) {
  return decodeURIComponent(params.text);
}

//Base 64 Encode
//2 options: params.split (chunks enabled?) and params.splitSize
export function textToBase64(params) {
  function split_in_blocks(str, size) {
    var match = str.match(new RegExp(".{1," + size + "}", "gm"));
    if (!match) return "";
    return match.join("\n");
  }

  function text_to_base64(str) {
    return btoa(
      encodeURIComponent(str).replace(
        /%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
          return String.fromCharCode(parseInt(p1, 16));
        },
      ),
    );
  }

  const text = params?.text || "";
  const split = params?.split || false;
  const splitSize = parseInt(params?.splitSize, 10) || 76;

  let base64 = text_to_base64(text);
  if (split) {
    base64 = split_in_blocks(base64, splitSize);
  }

  return base64;
}

//Base 64 Decode
//no options
export function base64ToText(params) {
  function base64_to_text(str) {
    try {
      return decodeURIComponent(
        atob(str)
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join(""),
      );
    } catch (e) {
      if (e instanceof DOMException) {
        return "Can't Convert: Base64 is encoded incorrectly.";
      } else if (e instanceof URIError) {
        return "Can't Convert: this Base64 is invalid.";
      }
      return "Can't Convert";
    }
  }

  let base64 = params.text;
  if (/^data:.+?,/.test(base64)) {
    base64 = base64.replace(/^data:.+?,/, "");
  }

  return base64_to_text(base64);
}

//HTML Escape
//4 options:
//params.escapeAllChars (or only reserved)
//params.useDecimalBases (or hexadecimal)
//params.printNameReferences (if exists)
//params.preserveLineBreaks (leave newlines untouched)

export function textToHtmlEntities(params) {
  const entities = [];
  const text = params.text;
  const hex = !params.useDecimalBases;
  const allowNamed = params.printNameReferences;
  const ignoreNewlines = params.preserveLineBreaks;
  const specialSymbolsOnly = params.escapeSpecialOnly;

  const specialChars = [
    "'".charCodeAt(0),
    '"'.charCodeAt(0),
    "<".charCodeAt(0),
    ">".charCodeAt(0),
    "&".charCodeAt(0),
  ];
  const newLineCode = "\n".charCodeAt(0);
  const codes = EXTENSION.utils.stringCodeOf(text);
  for (let i = 0; i < codes.length; i++) {
    let code = codes[i];
    if (specialSymbolsOnly) {
      if (specialChars.indexOf(code) < 0) {
        entities.push(String.fromCodePoint(code));
        continue;
      }
    }
    if (ignoreNewlines) {
      if (code == newLineCode) {
        entities.push("\n");
        continue;
      }
    }
    if (allowNamed && NAMED_ENTITIES_BY_NUMBERS[code]) {
      entities.push(NAMED_ENTITIES_BY_NUMBERS[code]);
    } else if (hex) {
      entities.push(`&#${code.toString(16)};`);
    } else {
      entities.push(`&#${code.toString(10)};`);
    }
  }

  return entities.join("");
}

//HTML Unescape
//no options
export function htmlEntitiesToText(params) {
  const alphaIndex = {};
  const charIndex = {};
  const str = params.text;

  var i = NAMED_ENTITIES_BY_NAMES.length;
  var _results = [];

  while (i--) {
    var e = NAMED_ENTITIES_BY_NAMES[i];
    var alpha = e[0];
    var chars = e[1];
    var chr = chars[0];
    var addChar =
      chr < 32 ||
      chr > 126 ||
      chr === 62 ||
      chr === 60 ||
      chr === 38 ||
      chr === 34 ||
      chr === 39;
    var charInfo;
    if (addChar) {
      charInfo = charIndex[chr] = charIndex[chr] || {};
    }
    if (chars[1]) {
      var chr2 = chars[1];
      alphaIndex[alpha] = String.fromCharCode(chr) + String.fromCharCode(chr2);
      _results.push(addChar && (charInfo[chr2] = alpha));
    } else {
      alphaIndex[alpha] = String.fromCharCode(chr);
      _results.push(addChar && (charInfo[""] = alpha));
    }
  }

  if (!str || !str.length) {
    return "";
  }

  return str.replace(/&(#?[\w\d]+);?/g, function (s, entity) {
    var chr;

    if (entity.charAt(0) === "#") {
      var code =
        entity.charAt(1) === "x"
          ? parseInt(entity.substr(2).toLowerCase(), 16)
          : parseInt(entity.substr(1), 10);

      if (!isNaN(code) && code >= 0 && code <= 0xffff) {
        chr = String.fromCharCode(code);
      }
    } else {
      chr = alphaIndex[entity];
    }

    return chr || s;
  });
}

//HEX Encode
//2 options:
//params.spaces: Space between bytes
//params.prefix: Prepends bytes with 0x
export function textToHexadecimal(params) {
  const text = params.text;

  const bytes = [];
  const space = params.spaces ? " " : "";
  const prefix = params.prefix;

  for (var i = 0; i < text.length; i++) {
    var realBytes = unescape(encodeURIComponent(text[i]));
    for (var j = 0; j < realBytes.length; j++) {
      bytes.push(realBytes[j].charCodeAt(0));
    }
  }

  var converted = [];
  for (var i = 0; i < bytes.length; i++) {
    var byte = bytes[i].toString(16);
    if (prefix) byte = "0x" + byte;
    converted.push(byte);
  }

  return converted.join(space);
}

//HEX Decode
//no options
export function hexadecimalToText(params) {
  let hexadecimal = params.text;
  hexadecimal = hexadecimal.replace(/0x/g, "");
  hexadecimal = hexadecimal.replace(/\s+/g, " ");
  const bytes = hexadecimal.split(" ");
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i].length == 1) {
      bytes[i] = "0" + bytes[i];
    }
  }
  hexadecimal = bytes.join("");

  if (hexadecimal.length % 2 != 0) {
    return "Can't convert: Uneven number of hex characters.";
  }

  let ret = "";
  for (let i = 0; i < hexadecimal.length; i += 2) {
    ret += String.fromCharCode(parseInt(hexadecimal.substr(i, 2), 16));
  }

  try {
    ret = EXTENSION.utils.utf8decode(ret);
  } catch (e) {
    ret = "Can't convert: " + e.message;
  }

  return ret;
}

//ROT13 Encode/Decode
//no options
export function ROT13(params) {
  let str = params.text;

  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const regexLowercase = /[a-z]/;
  const regexUppercase = /[A-Z]/;
  const n = 13;
  const length = str.length; // note: no need to account for astral symbols

  let index = -1;
  let res = "";
  let character;
  let currentPosition;
  let shiftedPosition;
  while (++index < length) {
    character = str.charAt(index);
    if (regexLowercase.test(character)) {
      currentPosition = lowercase.indexOf(character);
      shiftedPosition = (currentPosition + n) % 26;
      res += lowercase.charAt(shiftedPosition);
    } else if (regexUppercase.test(character)) {
      currentPosition = uppercase.indexOf(character);
      shiftedPosition = (currentPosition + n) % 26;
      res += uppercase.charAt(shiftedPosition);
    } else {
      res += character;
    }
  }

  return res;
}

//Defang URL
//1 option:
//params.squareBrackets: brackets type [.] or (.)
export function defangURL(params) {
  let text = params.text;
  let dot = params.squareBrackets ? "[.]" : "(.)";

  const urlRegex = /https?:\/\/[^\s]+/gi;

  return text.replace(urlRegex, (url) => {
    return url
      .replace(/^https:/i, "hxxps:")
      .replace(/^http:/i, "hxxp:")
      .replace(/^(hxxps?:\/\/)([^\/]+)/i, (match) => {
        return match.replace(/\./g, dot);
      });
  });
}

//Refang URL
//no options
export function refangURL(params) {
  let text = params.text;

  const urlRegex = /hxxps?:\/\/[^\s]+/gi;

  return text.replace(urlRegex, (url) => {
    return url
      .replace(/^hxxps:/i, "https:")
      .replace(/^hxxp:/i, "http:")
      .replace(/\[\.\]|\(\.\)/g, ".");
  });
}

//Unicode to Code Points
//3 options:
// params.separator14,
// params.codePointBase14,
// params.customBase14,
export function unicodeToCodePoints(params) {
  console.log("unicodeToCodePoints (14)");
  function addPadding(num, pad) {
    var str = num.toString();
    while (str.length < pad) {
      str = "0" + str;
    }
    return str;
  }

  const text = params.text;

  var bytes = [];
  var encoded = EXTENSION.utils.utf8encode(text);
  for (var i = 0; i < encoded.length; i++) {
    var byte = encoded[i].charCodeAt(0);
    bytes.push(byte);
  }

  var codePoints = EXTENSION.utils.utf8ToCodePoints(bytes);

  var baseStr = params.codePointBase14;
  if (baseStr == "custom") {
    outputBase = params.customBase14;
  } else if (baseStr == "binary") {
    outputBase = 2;
  } else if (baseStr == "octal") {
    outputBase = 8;
  } else if (baseStr == "decimal") {
    outputBase = 10;
  } else if (baseStr == "hexadecimal" || baseStr == "hexadecimal-u-xxxx") {
    outputBase = 16;
  }

  var realCodePoints = [];
  for (var i = 0; i < codePoints.length; i++) {
    var codePoint = codePoints[i].toString(outputBase);
    if (baseStr == "hexadecimal-u-xxxx") {
      codePoint = "U+" + addPadding(codePoint, 4).toUpperCase();
    }
    realCodePoints.push(codePoint);
  }

  return realCodePoints.join(params.separator14);
}

//Code Points to Unicode
//3 options:
// params.separator15,
// params.codePointBase15,
// params.customBase15,
export function codePointsToUnicode(params) {
  const text = params.text;
  var base = params.codePointBase15;
  var codePoints = [];

  if (base == "binary") {
    codePoints = text.match(/([01]+)/gi);
    base = 2;
  } else if (base == "octal") {
    codePoints = text.match(/([0-7]+)/gi);
    base = 8;
  } else if (base == "decimal") {
    codePoints = text.match(/([0-9]+)/gi);
    base = 10;
  } else if (base == "hexadecimal") {
    codePoints = text.match(/([0-9a-f]+)/gi);
    base = 16;
  } else if (base == "custom") {
    const customBase = params.customBase15.trim();

    if (customBase === "") {
      return "No custom input base was specified.";
    }

    base = Number(customBase);
    if (!Number.isInteger(base) || base < 2 || base > 36) {
      return "You specified an invalid custom input base. Valid bases are from 2 to 36.";
    }

    var base36Alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
    var customBaseChars = base36Alphabet.slice(0, base);
    var customBaseRegex = "([" + customBaseChars + "]+)";
    var rx = new RegExp(customBaseRegex, "ig");

    codePoints = text.match(rx);
  }

  var chars = [];

  if (codePoints !== null) {
    for (var i = 0; i < codePoints.length; i++) {
      try {
        chars.push(String.fromCodePoint(parseInt(codePoints[i], base)));
      } catch (e) {
        if (e instanceof RangeError) {
          chars.push("\uFFFD"); // символ замены �
        } else {
          throw e;
        }
      }
    }

    return chars.join(params.separator15);
  } else {
    return "";
  }
}

//Slugify String
//2 options:
//multiline16
//lowercase16
export function convertToSlug(params) {
  function slugify(text, lowercase) {
    if (lowercase) {
      return text
        .toLowerCase()
        .replace(/'/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "");
    } else {
      return text
        .replace(/'/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "");
    }
  }

  const text = params.text;
  const lowercase = params.lowercase16;
  const multiline = params.multiline16;

  if (text.length == 0) return "";

  if (multiline) {
    var lines = text.split(/(\n+)/);
    var output = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.trim().length == 0) {
        output.push(line);
      } else {
        output.push(slugify(line, lowercase));
      }
    }
    return output.join("");
  } else {
    return slugify(text, lowercase);
  }
}

export default {
  urlEncodeText,
  urlDecodeText,
  textToBase64,
  base64ToText,
  textToHtmlEntities,
  htmlEntitiesToText,
  textToHexadecimal,
  hexadecimalToText,
  ROT13,
  refangURL,
  refangURL,
  unicodeToCodePoints,
  codePointsToUnicode,
  convertToSlug,
};
