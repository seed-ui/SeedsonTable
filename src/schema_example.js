module.exports = function (handsontable, Handsontable) {
  function smallValidator(query, callback) {
    callback(Math.abs(parseInt(query)) < 10);
  }

  const wordValidator = /^[A-Za-z ]+$/;

  function negativeValueRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.TextRenderer.apply(this, arguments);

    // if row contains negative number
    if (parseInt(value, 10) < 0) {
      td.style.color = 'red';
    }

    if (value == null || value === '') {
      td.style.background = '#eee';
    }
  }

  return {
    columns: [
      {data: "id", dataLabel: "ID", type :"numeric"},
      {data: "name", dataLabel: "名前", placeholder: "名前"},
      {data: "comment", dataLabel: "コメント", placeholder: "comment", validator: wordValidator},
      {data: "x", placeholder: "0", type: "numeric", validator: smallValidator},
      {data: "y", placeholder: "0", type: "numeric", renderer: negativeValueRenderer},
      {data: "rate", dataLabel: "レート", placeholder: "0.0", type: "numeric", format: "0,0.0"},
      {data: "start_at", type: "date", dateFormat: "YYYY-MM-DD HH:mm:ss +0900", correctFormat: true},
      {data: "end_at", type: "date", dateFormat: "YYYY-MM-DD HH:mm:ss +0900", correctFormat: true},
      {data: "check_time", type: "time", dateFormat: "hh.mm.ss a", correctFormat: true},
      {data: "kind", type: "dropdown", source: ["one", "many", "many_through"]},
      {data: "target", type: "autocomplete", strict: false, allowInvalid: true, source: ["sakura", "kero", "mikage"]},
      {data: "visible", type: "checkbox"},
      {
        data: "user_id",
        type: 'handsontable',
        handsontable: {
          colHeaders: ['id', 'name', 'age'],
          autoColumnSize: true,
          data: [
            {id: 1, name: "shiori", age: 18},
            {id: 2, name: "saori", age: 18},
          ],
          getValue: function() {
            var selection = this.getSelected();

            return this.getSourceDataAtRow(selection[0]).id;
          },
        }
      },
      {data: "top_dir", type: "dropdown", source: require("fs").readdirSync("/")},
    ],
    fixedColumnsLeft: 2,
  };
};
