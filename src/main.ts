import "metro-dist/js/metro.js";
import {Seedsontable, SeedsonData, DataRow, DataComments} from "seedsontable";
import * as Handsontable from "handsontable";

import * as jsyaml from "js-yaml";
import {FileSystemObject} from "fso";
import * as $ from "jquery";

import {remote as electron} from "electron";

interface SheetInfo {
  name: string;
  table: Seedsontable;
  seedData: SeedsonData;
}

type SheetsOrder = string[];

const data = Array.from(Array(5000).keys()).map((id) =>
  [id, "aaa", "2015-01-01 11:11:11", "2015-01-01 11:11:11", "tit", "yes", true]
);

let quitConfirmed = false;

class SeedsonTableUI {
  static current: SeedsonTableUI;

  hasChange = false;
  currentSheet?: SheetInfo;
  sheets: SheetInfo[] = [];
  dataDir?: FileSystemObject;

  static saveInitial() {
    const filePath = electron.dialog.showSaveDialog({
      title: "保存",
      buttonLabel: "保存",
      defaultPath: (SeedsonTableUI.current.dataDir || new FileSystemObject("dummy")).parent().toString(),
      filters: [
        {name: "SeedsonTableLocalファイル", extensions: ["stld"]},
      ],
    });
    if (filePath) SeedsonTableUI.saveInitialData(filePath.replace(/(?:\.stld)?$/, ".stld"));
  }

  static saveInitialData(entryPath: string) {
    const entryFile = new FileSystemObject(entryPath);
    const dataDir = new FileSystemObject(entryPath.replace(/\.stld$/, ""));
    if (entryFile.existsSync() || dataDir.existsSync()) {
      $.Notify({
        type: 'error',
        caption: 'エラー',
        content: "指定された場所には既にデータが存在します",
      });
      return;
    }
    entryFile.writeFileSync("");
    dataDir.mkdirSync();
    SeedsonTableUI.current.openData(entryPath);
  }

  undo = () => this.currentSheet && this.currentSheet.table.undoRedo.undo();

  redo = () => this.currentSheet && this.currentSheet.table.undoRedo.redo();

  open = () => {
    const filePath = electron.dialog.showOpenDialog({
      title: "開く",
      buttonLabel: "開く",
      properties: ["openFile"],
      filters: [
        {name: "SeedsonTableLocalファイル", extensions: ["stld"]},
        {name: "全てのファイル", extensions: ["*"]},
      ],
    });
    if (filePath) {
      if (this.hasChange) {
        const answer = electron.dialog.showMessageBox({
          type: "warning",
          title: "保存しますか？",
          message: "保存されていないデータは失われます",
          buttons: ["保存する", "保存しない", "操作をキャンセル"],
          cancelId: -1,
        });
        if (answer === 0) {
          this.saveData();
        } else if (answer !== 1) {
          return;
        }
      }
      this.openData(filePath[0]);
    }
  }

  openData = (entryPath: string) => {
    this.deleteAllSheets();
    this.hasChange = false;
    // try {
      this.dataDir = new FileSystemObject(entryPath.replace(/\.stld$/, ""));
      const sheetsOrderFile = this.dataDir.new("sheets.yml");
      // tODO
      const sheetsOrder: SheetsOrder = sheetsOrderFile.existsSync() ? jsyaml.safeLoad(sheetsOrderFile.readFileSync({encoding: "utf8"})) : [];
      const sheetsDir = this.dataDir.new("sheets");
      const sheetNames = sheetsDir.existsSync() ? sheetsDir.readdirSync() : [];
      for (const sheetName of sheetNames) this.openSheet(sheetName);
      if (this.sheets.length) this.selectSheet(this.sheets[0].name);
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
      type: "success",
      caption: "開く",
      content: "完了しました",
    });
  }

  private openSheet(sheetName: string) {
    if (!this.dataDir) throw new Error("no data dir");
    const sheetsDir = this.dataDir.new("sheets");
    const sheetDir = sheetsDir.new(sheetName);
    const schemaFile = sheetDir.new("schema.js");
    const dataDir = sheetDir.new("data");
    const commentsDir = sheetDir.new("comments");
    const schema = eval("require(schemaFile.toString())")(this, Handsontable); // for webpack
    const data: DataRow[] = [];
    if (dataDir.existsSync()) {
      for (const dataFile of dataDir.childrenSync()) {
        data.push(jsyaml.safeLoad(dataFile.readFileSync({encoding: "utf8"})));
      }
    }
    const comments: DataComments = {};
    if (commentsDir.existsSync()) {
      for (const commentsFile of commentsDir.childrenSync()) {
        const _comments = jsyaml.safeLoad(commentsFile.readFileSync({encoding: "utf8"}));
        for (const row of Object.keys(_comments)) {
          for (const prop of Object.keys(_comments[row])) {
            if (!comments[row]) comments[row] = {};
            comments[row][prop] = _comments[row][prop];
          }
        }
      }
    }
    const seedData = new SeedsonData(schema.columns, data.concat({} as any), comments);
    this.createSheet(sheetName, seedData, schema);
  }

  saveData = () => {
    if (!this.dataDir) return;
    const sheetsDir = this.dataDir.new("sheets");
    this.sheets.forEach((sheet) => {
      const sheetDir = sheetsDir.new(sheet.name);
      const dataDir = sheetDir.new("data");
      const commentsDir = sheetDir.new("comments");
      // data
      const data = sheet.seedData.contentData();
      console.log(data);
      if (!dataDir.existsSync()) dataDir.mkdirSync();
      const existsDataFileNames: {[fileName: string]: true} = {};
      for (const fileName of dataDir.readdirSync()) existsDataFileNames[fileName] = true;
      for (const row of data) {
        const fileName = `${row.id}.yml`;
        dataDir.new(fileName).writeFileSync(jsyaml.dump(row));
        delete existsDataFileNames[fileName];
      }
      for (const fileName of Object.keys(existsDataFileNames)) dataDir.new(fileName).unlinkSync();
      // comments
      const comments = sheet.seedData.comments;
      if (!commentsDir.existsSync()) commentsDir.mkdirSync();
      const existsCommentsFileNames: {[fileName: string]: true} = {};
      for (const fileName of commentsDir.readdirSync()) existsCommentsFileNames[fileName] = true;
      for (const row of Object.keys(comments)) {
        for (const prop of Object.keys(comments[row])) {
          const fileName = `${row}-${prop}.yml`;
          commentsDir.new(fileName).writeFileSync(jsyaml.dump({[row]: {[prop]: comments[row][prop]}}));
          delete existsCommentsFileNames[fileName];
        }
      }
      for (const fileName of Object.keys(existsCommentsFileNames)) commentsDir.new(fileName).unlinkSync();
    });
    this.hasChange = false;
    $.Notify({
      type: "success",
      caption: "保存",
      content: "完了しました",
    });
  }

  saveNewSheet() {
    const sheetName = $("#new-sheet-name").val();
    if (!sheetName) {
      $.Notify({
        type: 'error',
        caption: 'エラー',
        content: "シート名が正しくありません",
      });
      return;
    }
    SeedsonTableUI.current.saveNewSheetData(sheetName.toString());
    $("#new-sheet-name").val("");
  }

  saveNewSheetData(sheetName: string) {
    if (!this.dataDir) {
      $.Notify({
        type: 'error',
        caption: 'エラー',
        content: "ブックが開かれていません",
      });
      return;
    }
    const sheetsDir = this.dataDir.new("sheets");
    if (!sheetsDir.existsSync()) sheetsDir.mkdirSync();
    const sheetDir = sheetsDir.new(sheetName);
    if (sheetDir.existsSync()) {
      $.Notify({
        type: 'error',
        caption: 'エラー',
        content: "同名のシートが既に存在します",
      });
      return;
    }
    sheetDir.mkdirSync();
    const schemaFile = sheetDir.new("schema.js");
    const schema = new FileSystemObject(__dirname + "/schema_example.js").readFileSync();
    schemaFile.writeFileSync(schema);
    this.openSheet(sheetName);
    this.selectSheet(sheetName);
    $.Notify({
      type: "success",
      caption: "新規シート作成",
      content: "完了しました",
    });
  }

  exportZip = () => {
    $.Notify({
      type: "success",
      caption: "ZIPにして出力",
      content: "完了しました",
    });
  }

  exportXlsx = () => {
    $.Notify({
      type: "success",
      caption: "Excelとして出力",
      content: "完了しました",
    });
  }

  createSheet(name: string, seedData: SeedsonData, options: Handsontable.Options) {
    const sheetId = `sheet-${name}`;
    const sheetTabId = `sheet-tab-${name}`;
    $("#sheets").append(`<div class="sheet" id="${sheetId}"></div>`);
    $("#tabs").append(
      $(`<li></li>`).append(
        $(`<a href="#" id="${sheetTabId}">${name}</a>`).click(
          () => this.selectSheet(name)
        )
      )
    );
    const container = document.getElementById(sheetId) as Element;
    const table = new Seedsontable(container, seedData, options);
    table.addHook("afterChange", () => { this.hasChange = true; });
    table.addHook("afterCreateRow", () => { this.hasChange = true; });
    table.addHook("afterRemoveRow", () => { this.hasChange = true; });
    table.addHook("afterInit", () => {
      // afterInitのあとに初期のcreateRowが走るようなのでやむなく
      setTimeout(table.clearUndo, 400);
    });
    table.init();
    this.sheets.push({name, table, seedData});
  }

  selectSheet(name: string) {
    $("#sheets > div").hide();
    $("#tabs > li").removeClass("active");
    this.currentSheet = this.sheets.find((sheet) => sheet.name === name);
    const sheet_id = `sheet-${name}`;
    const sheet_tab_id = `sheet-tab-${name}`;
    $(`#${sheet_id}`).show();
    $(`#${sheet_tab_id}`).parent().addClass("active");
  }

  deleteAllSheets() {
    this.dataDir = undefined;
    this.sheets.forEach((sheet) => {
      sheet.table.destroy();
    });
    $("#sheets > div").remove();
    $("#tabs li").remove();
    this.sheets = [];
    this.currentSheet = undefined;
    this.hasChange = false;
  }

  insertRowAbove = () => {
    if (!this.currentSheet) return;
    const table = this.currentSheet.table;
    const [startRow, startCol, endRow, endCol] = table.getSelected() || [];
    if (startRow != null) table.alter("insert_row", startRow);
  }

  insertRowBelow = () => {
    if (!this.currentSheet) return;
    const table = this.currentSheet.table;
    const [startRow, startCol, endRow, endCol] = table.getSelected() || [];
    if (endRow != null) table.alter("insert_row", endRow + 1);
  }

  removeRow = () => {
    if (!this.currentSheet) return;
    const table = this.currentSheet.table;
    const [startRow, startCol, endRow, endCol] = table.getSelected() || [];
    if (endRow == null) return;
    const amount = endRow - startRow + 1;
    table.alter("remove_row", startRow, amount);
  }

  showComment = () => {
    if (!this.currentSheet) return;
    const table = this.currentSheet.table;
    const [row, col] = table.getSelected() || [];
    if (row != null && col != null) {
      const comments = table.getPlugin("comments");
      comments.showAtCell(row, col);
      // comments.editor.focus();
    }
  }

  removeComment = () => {
    if (!this.currentSheet) return;
    const table = this.currentSheet.table;
    const [row, col] = table.getSelected() || [];
    if (row != null && col != null) table.getPlugin("comments").removeCommentAtCell(row, col);
  }

  search = () => {
    if (!this.currentSheet) return;
    const table = this.currentSheet.table;
    const word = $("#command-search-input").val();
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
}

SeedsonTableUI.current = new SeedsonTableUI();

window.onload = () => {
  // ホーム
  $("#command-undo").click(SeedsonTableUI.current.undo);
  $("#command-redo").click(SeedsonTableUI.current.redo);
  $("#command-open").click(SeedsonTableUI.current.open);
  $("#command-save").click(SeedsonTableUI.current.saveData);
  $("#command-export-zip").click(SeedsonTableUI.current.exportZip);
  $("#command-export-xlsx").click(SeedsonTableUI.current.exportXlsx);
  $("#command-insert-row-above").click(SeedsonTableUI.current.insertRowAbove);
  $("#command-insert-row-below").click(SeedsonTableUI.current.insertRowBelow);
  $("#command-remove-row").click(SeedsonTableUI.current.removeRow);
  $("#command-show-comment").click(SeedsonTableUI.current.showComment);
  $("#command-remove-comment").click(SeedsonTableUI.current.removeComment);
  $("#command-search-input").keydown((event) => {
    if (event.keyCode === 13) SeedsonTableUI.current.search();
  });
  $("#command-search-button").click(SeedsonTableUI.current.search);
  // 管理
  $("#command-save-initial").click(SeedsonTableUI.saveInitial);
  $("#new-sheet-name").keydown((event) => {
    if (event.keyCode === 13) SeedsonTableUI.current.saveNewSheet();
  });
  $("#command-dialog-new-sheet").click(() => {
    if (!SeedsonTableUI.current.dataDir) {
      $.Notify({
        type: 'error',
        caption: 'エラー',
        content: "ブックが開かれていません",
      });
      return;
    }
    $("#new-sheet-name").val("");
    metroDialog.open('#dialog-new-sheet');
  });
  $("#command-save-new-sheet").click(SeedsonTableUI.current.saveNewSheet);

  // closing
  window.onbeforeunload = (event) => {
    if (SeedsonTableUI.current.hasChange && !quitConfirmed) {
      $("#new-sheet-name").val("");
      metroDialog.open("#dialog-quit");
      return false;
    }
  };
  $("#command-close-confirm").click(() => {
    quitConfirmed = true;
    window.close();
  });

  $(window).on("keydown", (event) => {
    const ctrlDown = (event.ctrlKey || event.metaKey) && !event.altKey;
    if (ctrlDown) {
      if (event.keyCode === 83) { // ctrl+S
        SeedsonTableUI.current.saveData();
      } else if (event.keyCode === 82) { // ctrl+R
        electron.BrowserWindow.getFocusedWindow().reload();
      } else if (event.keyCode === 68) { // ctrl+D
        electron.BrowserWindow.getFocusedWindow().toggleDevTools();
      }
    }
  });
};

const data = Array.from(Array(5000).keys()).map((id) =>
  [id, "aaa", "2015-01-01 11:11:11", "2015-01-01 11:11:11", "tit", "yes", true]
);

const columns = [
  {data: "id", dataLabel: "ID", type :"numeric", placeholder: "0"},
  {data: "name", dataLabel: "名前", version: "4.1.0"},
  {data: "start_at", type: "date", dateFormat: "YYYY-MM-DD HH:mm:ss", correctFormat: true},
  {data: "end_at", type: "date", dateFormat: "YYYY-MM-DD HH:mm:ss", correctFormat: true},
  {data: "title"},
  {data: "type", type: "dropdown", source: ["yes", "no"]},
  {data: "publish", type: "checkbox"},
];

const seedData = SeedsonData.fromArray(columns, data);

// window.onload = function() {
  // app.entry_path = 'src';
  // create_sheet('dates', seedData);
  // app.has_change = false;
  // app.current_sheet = app.sheets[0];
// };
