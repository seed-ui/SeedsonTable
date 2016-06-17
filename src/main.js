const {Seedsontable, SeedsonData} = seedsontable;

import jsyaml from 'js-yaml';
import fso from 'fso';

import {remote as electron} from 'electron';

const app = {
  has_change: false,
  current_sheet: null,
  sheets: [],
  entry_path: null,
};

$(() => {
  $('#command-undo').click(() => {
    if (!app.current_sheet) return;
    app.current_sheet.table.undoRedo.undo();
  });
  $('#command-redo').click(() => {
    if (!app.current_sheet) return;
    app.current_sheet.table.undoRedo.redo();
  });
  $('#command-open').click(() => {
    const file_path = electron.dialog.showOpenDialog({
      title: "開く",
      buttonLabel: "開く",
      properties: ['openFile'],
      filters: [
        {name: 'SeedsonTableLocalファイル', extensions: ['stld']},
        {name: '全てのファイル', extensions: ['*']},
      ],
    });
    if (file_path) {
      if (app.has_change) {
        const answer = electron.dialog.showMessageBox({
          type: 'warning',
          title: '保存しますか？',
          message: '保存されていないデータは失われます',
          buttons: ['保存する', '保存しない', '操作をキャンセル'],
          cancelId: -1,
        });
        if (answer == 0) {
          save_data();
        } else if (answer != 1) {
          return;
        }
      }
      open_data(file_path[0]);
    }
  });
  $('#command-save').click(() => save_data());
  $('#command-export-zip').click(() => export_zip());
  $('#command-export-xlsx').click(() => export_xlsx());
  $('#command-insert-row-above').click(() => {
    if (!app.current_sheet) return;
    const table = app.current_sheet.table;
    const [startRow, startCol, endRow, endCol] = table.getSelected() || [];
    if (startRow != null) table.alter('insert_row', startRow);
  });
  $('#command-insert-row-below').click(() => {
    if (!app.current_sheet) return;
    const table = app.current_sheet.table;
    const [startRow, startCol, endRow, endCol] = table.getSelected() || [];
    if (endRow != null) table.alter('insert_row', endRow + 1);
  });
  $('#command-remove-row').click(() => {
    if (!app.current_sheet) return;
    const table = app.current_sheet.table;
    const [startRow, startCol, endRow, endCol] = table.getSelected() || [];
    if (endRow == null) return;
    const amount = endRow - startRow + 1;
    table.alter('remove_row', startRow, amount);
  });
  $('#command-show-comment').click(() => {
    if (!app.current_sheet) return;
    const table = app.current_sheet.table;
    const [row, col] = table.getSelected() || [];
    if (row != null && col != null) {
      const comments = table.getPlugin('comments');
      comments.showAtCell(row, col);
      // comments.editor.focus();
    }
  });
  $('#command-remove-comment').click(() => {
    if (!app.current_sheet) return;
    const table = app.current_sheet.table;
    const [row, col] = table.getSelected() || [];
    if (row != null && col != null) table.getPlugin('comments').removeCommentAtCell(row, col);
  });

  function search() {
    if (!app.current_sheet) return;
    const table = app.current_sheet.table;
    const word = $('#command-search-input').val();
    const result = table.search.query(word);
    table.render();
    console.log(result);
    if (!result.length) return;
    const [startRow, startCol, endRow, endCol] = table.getSelected() || [];
    let nextCell;
    if (startRow == null) {
      nextCell = result[0];
    } else {
      nextCell = result.find((cell) => cell.row > startRow || (cell.row === startRow && cell.col > startCol)) || result[0];
    }
    table.selectCell(nextCell.row, nextCell.col, nextCell.row, nextCell.col, true, false);
    // table.scrollViewportTo(nextCell.row, nextCell.col);
  }
  $('#command-search-input').keydown((event) => {
    if (event.keyCode === 13) search();
  });
  $('#command-search-button').click(search);

  window.onbeforeunload = (event) => {
    if (app.has_change && !app.quit_confirmed) {
      showMetroDialog('#dialog-quit');
      return false;
    }
  };
  $('#command-close-confirm').click(() => {
    app.quit_confirmed = true;
    window.close();
  });
  $('#command-close-cancel').click(() => hideMetroDialog('#dialog-quit'));

  $(window).on('keydown', (event) => {
    const ctrlDown = (event.ctrlKey || event.metaKey) && !event.altKey;
    if (ctrlDown) {
      if (event.keyCode === 83) { // Ctrl+S
        save_data();
      } else if (event.keyCode === 82) { // Ctrl+R
        electron.BrowserWindow.getFocusedWindow().reload();
      } else if (event.keyCode === 68) { // Ctrl+D
        electron.BrowserWindow.getFocusedWindow().toggleDevTools();
      }
    }
  });
});

function open_data(entry_path) {
  // try {
    const data_dir = fso.new(entry_path.replace(/\.stld$/, ''));
    const sheets_order_file = data_dir.new('sheets.yml');
    // TODO
    const sheets_order = sheets_order_file.existsSync() ? jsyaml.safeLoad(sheets_order_file.readFileSync({encoding: 'utf8'})) : [];
    const sheets_dir = data_dir.new('sheets');
    const sheets_dir_files = sheets_dir.readdirSync();
    const sheet_names = sheets_dir_files
      .filter((filename) => filename.match(/\.schema\.js$/))
      .map((filename) => filename.replace(/\.schema\.js$/, ''));
    const sheets = sheet_names.map((name) => {
      const schema_file = sheets_dir.new(`${name}.schema.js`);
      const data_file = sheets_dir.new(`${name}.data.yml`);
      const comments_file = sheets_dir.new(`${name}.comments.yml`);
      const schema = require(schema_file.path);
      const data = data_file.existsSync() ? jsyaml.safeLoad(data_file.readFileSync({encoding: 'utf8'})) : undefined;
      const comments = comments_file.existsSync() ? jsyaml.safeLoad(comments_file.readFileSync({encoding: 'utf8'})) : undefined;
      const seedData = new SeedsonData(schema.columns, data, comments);
      return {name, seedData};
    });
    delete_all_sheets();
    sheets.forEach((sheet) => create_sheet(sheet.name, sheet.seedData));
    app.has_change = false;
    app.entry_path = data_dir.path;
    select_sheet(sheets[0].name);
  // } catch(error) {
  //   $.Notify({
  //     type: 'error',
  //     caption: '開くエラー',
  //     content: error.message,
  //   });
  //   throw error;
  //   return;
  // }
  $.Notify({
    type: 'success',
    caption: '開く',
    content: '完了しました',
  });
}

function save_data() {
  const sheets_dir = fso.new(app.entry_path).new('sheets');
  app.sheets.forEach((sheet) => {
    const data = sheet.seedData.contentData();
    const yaml = jsyaml.safeDump(data);
    sheets_dir.new(`${sheet.name}.data.yml`).writeFileSync(yaml);
  });
  app.has_change = false;
  $.Notify({
    type: 'success',
    caption: '保存',
    content: '完了しました',
  });
}

function export_zip() {
  $.Notify({
    type: 'success',
    caption: 'ZIPにして出力',
    content: '完了しました',
  });
}

function export_xlsx() {
  $.Notify({
    type: 'success',
    caption: 'Excelとして出力',
    content: '完了しました',
  });
}

function create_sheet(name, seedData) {
  const sheet_id = `sheet-${name}`;
  const sheet_tab_id = `sheet-tab-${name}`;
  $('#sheets').append(`<div class="sheet" id="${sheet_id}"></div>`);
  $('#tabs').append(
    $(`<li></li>`).append(
      $(`<a href="#" id="${sheet_tab_id}">${name}</a>`).click(
        () => select_sheet(name)
      )
    )
  );
  const container = document.getElementById(sheet_id);
  const table = new Seedsontable(container, seedData);
  table.addHook('afterChange', () => { app.has_change = true; });
  table.addHook('afterCreateRow', () => { app.has_change = true; });
  table.addHook('afterRemoveRow', () => { app.has_change = true; });
  table.addHook('afterInit', () => {
    // afterInitのあとに初期のcreateRowが走るようなのでやむなく
    setTimeout(table.clearUndo, 400);
  });
  table.init();
  app.sheets.push({name, table, seedData});
}

function select_sheet(name) {
  $('#sheets > div').hide();
  console.log(name);
  app.current_sheet = app.sheets.find((sheet) => sheet.name === name);
  const sheet_id = `sheet-${name}`;
  const sheet_tab_id = `sheet-tab-${name}`;
  $(`#${sheet_id}`).show();
  $(`#${sheet_tab_id}`).parent().addClass('active');
}

function delete_all_sheets() {
  app.entry_path = null;
  app.sheets.forEach((sheet) => {
    sheet.table.destroy();
  });
  $('#sheets > div').remove();
  $('#tabs li').remove();
  app.sheets = [];
  app.current_sheet = null;
  app.has_change = false;
}

const data = Array.from(Array(5000).keys()).map((id) =>
  [id, "aaa", "2015-01-01 11:11:11", "2015-01-01 11:11:11", "tit", "yes", true]
);

const columns = [
  {data: 'id', dataLabel: 'ID', type :'numeric', placeholder: '0'},
  {data: 'name', dataLabel: '名前', version: '4.1.0'},
  {data: 'start_at', type: 'date', dateFormat: 'YYYY-MM-DD HH:mm:ss', correctFormat: true},
  {data: 'end_at', type: 'date', dateFormat: 'YYYY-MM-DD HH:mm:ss', correctFormat: true},
  {data: 'title'},
  {data: 'type', type: 'dropdown', source: ['yes', 'no']},
  {data: 'publish', type: 'checkbox'},
];

const seedData = SeedsonData.fromArray(columns, data);

window.onload = function() {
  // app.entry_path = 'src';
  // create_sheet('dates', seedData);
  // app.has_change = false;
  // app.current_sheet = app.sheets[0];
};

/*
 * persistentState
 */

/*
 * join
 * change
 * commit
 */
