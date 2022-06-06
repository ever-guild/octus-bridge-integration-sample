module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "commonjs": true,
        "node": true,

    },
    "extends": [
        "eslint:recommended",
        "plugin:react/recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaFeatures": {
          "jsx": true,
          "arrowFunctions": true,
          "destructuring": true,
          "modules": true,
          "templateStrings": true
        },
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "plugins": [
      'react',
      'react-hooks',
      'unused-imports',
      "@typescript-eslint"
    ],
    "rules": {
    }
}
