# [SeedsonTable](https://github.com/seed-ui/SeedsonTable)

[![Dependency Status](https://david-dm.org/seed-ui/seedsontable.js.svg)](https://david-dm.org/seed-ui/seedsontable.js)
[![devDependency Status](https://david-dm.org/seed-ui/seedsontable.js/dev-status.svg)](https://david-dm.org/seed-ui/seedsontable.js#info=devDependencies)

[handsontable](https://github.com/handsontable/handsontable)を利用してseedデータを入力できる表計算?ソフト

## Install

[Releases](https://github.com/seed-ui/SeedsonTable/releases)から該当する環境のZIPを落として解凍し、好きな場所に置く。

`.stld`ファイルを関連付けておくと便利。

## Usage

### Bookの作成

まずBookを作ります。

Bookは下記のような構成をしたファイル群です。Gitフレンドリなようにそれぞれファイルが分かれています。

```
/- book.stld (Windows関連付け用の空ファイル)
|- book/- sheets.yml (シート並び順指定ファイル)
       |- sheets/- sheet1.schema.js    (sheet1シートのスキーマ)
                |- sheet1.data.yml     (sheet1シートのデータ)
                |- sheet1.comments.yml (sheet1シートのコメント)
                |- sheet2.schema.js
                |...
```

上記のうちデータ、コメントファイル以外のものを最初に用意してやります。

1. book_name.stldという空ファイルをつくり、book_nameディレクトリを作ります。
2. sheetsフォルダを作り、sheet1_name.schema.jsを作ります。
3. 必要ならさらにシートのスキーマを足して、オプションでsheets.ymlを書きます。

#### sheet_name.schema.js

以下のようなものです。

```javascript
module.exports = {
  columns: [
    {data: 'id', dataLabel: 'ID', type :'numeric', placeholder: '0'},
    {data: 'name', dataLabel: '名前', version: '4.1.0'},
    {data: 'start_at', type: 'date', dateFormat: 'YYYY-MM-DD HH:mm:ss', correctFormat: true},
    {data: 'end_at', type: 'date', dateFormat: 'YYYY-MM-DD HH:mm:ss', correctFormat: true},
    {data: 'type', type: 'dropdown', source: ['yes', 'no']},
    {data: 'publish', type: 'checkbox'},
  ],
};
```

dataがカラム名、dataLabelがカラム表示名です。versionは省略可能で、そのカラムが追加されるseedのバージョンです。

dataLabelとversionは独自のプロパティですが、その他のオプションは[handsontableのhelp](https://docs.handsontable.com/pro/1.4.1/tutorial-cell-types.html)をご覧ください。

### 編集

ブックを作り終わったらSeedsonTableを開いてbook_name.stldを開いてください。
編集ができます。

## Build

```
npm i
bower i
gulp
electron web
```

## License

This is released under [MIT License](http://narazaka.net/license/MIT?2016).
