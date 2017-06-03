# vdf-extra

A fork of [RJacksonm1](https://github.com/RJacksonm1)'s [vdf](https://github.com/RJacksonm1/node-vdf) with with '#base' support, error handling and more options.

Tests can be executed with `npm test`.

## Methods
### parse(string : String, options: Object)
Parses a VDF string and returns an object.

Options:

* getBaseFile : **Function** - Function that will be called to each #base element
  * filePath : **String** - #base value
  * _Returns_ **Promise\<String\>**
* mergeRoots : **Boolean** - If false, returns object with KV file root element
* handleMultipleKeys : **Boolean** - If true, than if KV key occurs multiple times it's values will be to Array
* parseUnquotedStrings : **Boolean** - If true, parser wil handle unquoted tokens
* _Returns_ **Object** or **Promise\<Object\>**

### stringify(obj : Object, indentLength : Number, indent : String, tabSize : Number)
Dumps an object to a VDF string.
